import { commandeStatusLabels } from '@/components/commandes/commande-status-badge'
import CommandesTable from '@/components/commandes/commandes-table'
import { FilterMenu } from '@/components/layout/filter-menu'
import {
  Callout,
  PageContainer,
  PageHeading,
  Panel,
} from '@/components/layout/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { PaginationSummary } from '@/components/ui/pagination'
import { getCommandes } from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import {
  buildCommandesHref,
  commandeStatuses,
  COMMANDES_PAGE_SIZE,
  filterCommandes,
  getCommandeCounts,
  getPickupPoints,
  paginate,
  parseCommandeListFilters,
  type CommandeListFilters,
  type CommandeTab,
} from '@/lib/commande-list'
import {
  canManageArticleProduction,
  canManageOrders,
  canManageStock,
  canViewOrders,
} from '@/lib/permissions'
import {
  getProductionNeeds,
  type ProductionNeed,
  type ProductionUrgency,
} from '@/lib/production-needs'
import Link from 'next/link'

type CommandesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const urgencyBadges: Record<
  ProductionUrgency,
  { label: string; variant: 'danger' | 'warning' | 'info' | 'neutral' }
> = {
  urgent: { label: 'Urgent', variant: 'danger' },
  soon: { label: 'Bientôt', variant: 'warning' },
  planned: { label: 'Planifié', variant: 'info' },
  unknown: { label: 'Sans date', variant: 'neutral' },
}

const dateOptions = [
  { value: '', label: 'Toutes les dates' },
  { value: 'today', label: 'Aujourd’hui' },
  { value: 'tomorrow', label: 'Demain' },
]

function formatQuantity(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(
    value,
  )
}

function formatDueDate(need: ProductionNeed) {
  if (need.dueDateKey === 'unknown') {
    return 'Retrait sans date'
  }

  return `Retrait le ${new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(new Date(need.dueDate ?? `${need.dueDateKey}T12:00:00.000Z`))}`
}

function getDateLabel(date: string) {
  return (
    dateOptions.find((option) => option.value === date)?.label ??
    (/^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
          new Date(`${date}T12:00:00.000Z`),
        )
      : 'Date')
  )
}

function hasActiveFilters(filters: CommandeListFilters) {
  return Boolean(
    filters.tab !== 'all' ||
      filters.statut ||
      filters.lieu ||
      filters.date ||
      filters.q,
  )
}

function SearchForm({ filters }: { filters: CommandeListFilters }) {
  return (
    <form
      action="/commandes"
      role="search"
      className="min-w-0 flex-1 basis-72"
    >
      {filters.tab !== 'all' ? (
        <input type="hidden" name="tab" value={filters.tab} />
      ) : null}
      {filters.statut ? (
        <input type="hidden" name="statut" value={filters.statut} />
      ) : null}
      {filters.lieu ? (
        <input type="hidden" name="lieu" value={filters.lieu} />
      ) : null}
      {filters.date ? (
        <input type="hidden" name="date" value={filters.date} />
      ) : null}
      <label htmlFor="commandes-search" className="sr-only">
        Rechercher une commande
      </label>
      <Input
        id="commandes-search"
        type="search"
        name="q"
        defaultValue={filters.q}
        placeholder="Rechercher une commande, un client ou un e-mail…"
      />
    </form>
  )
}

function ProductionNeedsPanel({
  needs,
  canAddLot,
}: {
  needs: ProductionNeed[]
  canAddLot: boolean
}) {
  return (
    <Panel
      title="Production à prévoir"
      footer="Le stock négatif est volontaire : il signale les précommandes à produire ou à ajuster avant retrait."
    >
      <ul className="flex flex-col divide-y divide-border">
        {needs.map((need) => {
          const urgency = urgencyBadges[need.urgency]

          return (
            <li
              key={`${need.articleId}-${need.dueDateKey}`}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm leading-5 font-medium">
                  {formatQuantity(need.quantityToProduce)} × {need.articleNom}
                </p>
                <p className="text-xs leading-[17px] text-muted-foreground">
                  {formatDueDate(need)} · stock actuel{' '}
                  {formatQuantity(need.stock)} · commandes{' '}
                  {need.commandeIds.map((commandeId, index) => (
                    <span key={commandeId}>
                      {index > 0 ? ', ' : null}
                      <Link
                        href={`/commandes/${commandeId}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        #{commandeId}
                      </Link>
                    </span>
                  ))}
                </p>
              </div>
              <Badge variant={urgency.variant}>{urgency.label}</Badge>
            </li>
          )
        })}
      </ul>
      {canAddLot ? (
        <Button asChild variant="secondary" className="w-fit">
          <Link href="/stock#lot-article">Ajouter un lot</Link>
        </Button>
      ) : null}
    </Panel>
  )
}

export default async function CommandesPage({
  searchParams,
}: CommandesPageProps) {
  const session = await requireUiPermission(canViewOrders)
  const userCanManageOrders = canManageOrders(session.user)
  const userCanAddLot =
    canManageStock(session.user) || canManageArticleProduction(session.user)
  const params = searchParams ? await searchParams : {}
  const filters = parseCommandeListFilters(params)
  const commandes = await getCommandes()
  const counts = getCommandeCounts(commandes)
  const pickupPoints = getPickupPoints(commandes)
  const filteredCommandes = filterCommandes(commandes, filters)
  const pagination = paginate(
    filteredCommandes,
    filters.page,
    COMMANDES_PAGE_SIZE,
  )
  const productionNeeds = getProductionNeeds(commandes)
  const commandesAVerifier = commandes.filter(
    (commande) => commande.statut === 'paiement_a_verifier',
  )

  const tabs: { value: CommandeTab; label: string; count: number }[] = [
    { value: 'all', label: 'Toutes', count: counts.all },
    { value: 'to_prepare', label: 'À préparer', count: counts.toPrepare },
    { value: 'ready', label: 'Prêtes', count: counts.ready },
    { value: 'to_check', label: 'À vérifier', count: counts.toCheck },
  ]

  return (
    <PageContainer>
      <PageHeading
        context="Commandes"
        title="Commandes"
        description={
          userCanManageOrders
            ? 'Consultez les retraits et faites avancer les commandes.'
            : 'Mode consultation · lecture seule'
        }
      />

      {!userCanManageOrders ? (
        <Callout tone="info" title="Vous consultez les commandes">
          Votre rôle ne permet pas de changer les statuts ou de rembourser.
        </Callout>
      ) : null}

      <nav
        aria-label="Filtrer par état"
        className="-mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0"
      >
        {tabs.map((tab) => {
          const active = filters.tab === tab.value

          return (
            <Button
              key={tab.value}
              asChild
              variant={active ? 'default' : 'secondary'}
              className="shrink-0 px-6"
            >
              <Link
                href={buildCommandesHref(filters, { tab: tab.value })}
                aria-current={active ? 'page' : undefined}
              >
                {tab.label} · {tab.count}
              </Link>
            </Button>
          )
        })}
      </nav>

      <div className="flex flex-wrap gap-3">
        <SearchForm filters={filters} />
        <FilterMenu
          ariaLabel="Statut"
          label={
            filters.statut
              ? commandeStatusLabels[filters.statut]
              : 'Tous les statuts'
          }
          options={[
            {
              label: 'Tous les statuts',
              href: buildCommandesHref(filters, { statut: '' }),
              active: !filters.statut,
            },
            ...commandeStatuses.map((statut) => ({
              label: commandeStatusLabels[statut],
              href: buildCommandesHref(filters, { statut }),
              active: filters.statut === statut,
            })),
          ]}
        />
        <FilterMenu
          ariaLabel="Point de retrait"
          label={filters.lieu || 'Tous les retraits'}
          options={[
            {
              label: 'Tous les retraits',
              href: buildCommandesHref(filters, { lieu: '' }),
              active: !filters.lieu,
            },
            ...pickupPoints.map((lieu) => ({
              label: lieu,
              href: buildCommandesHref(filters, { lieu }),
              active: filters.lieu === lieu,
            })),
          ]}
        />
        <FilterMenu
          ariaLabel="Date de retrait"
          label={filters.date ? getDateLabel(filters.date) : 'Date'}
          options={dateOptions.map((option) => ({
            label: option.label,
            href: buildCommandesHref(filters, { date: option.value }),
            active: filters.date === option.value,
          }))}
        />
        {hasActiveFilters(filters) ? (
          <Button asChild variant="ghost">
            <Link href="/commandes">Réinitialiser</Link>
          </Button>
        ) : null}
      </div>

      {pagination.total > 0 ? (
        <>
          <CommandesTable commandes={pagination.items} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <PaginationSummary>
              {pagination.start}–{pagination.end} sur{' '}
              {pagination.total > 1
                ? `${pagination.total} commandes`
                : '1 commande'}
            </PaginationSummary>
            {pagination.pageCount > 1 ? (
              <nav aria-label="Pagination" className="flex gap-3">
                {pagination.page > 1 ? (
                  <Button asChild variant="secondary">
                    <Link
                      href={buildCommandesHref(filters, {
                        page: pagination.page - 1,
                      })}
                    >
                      <span aria-hidden="true">←</span> Précédent
                    </Link>
                  </Button>
                ) : (
                  <Button variant="secondary" disabled>
                    <span aria-hidden="true">←</span> Précédent
                  </Button>
                )}
                {pagination.page < pagination.pageCount ? (
                  <Button asChild variant="secondary">
                    <Link
                      href={buildCommandesHref(filters, {
                        page: pagination.page + 1,
                      })}
                    >
                      Suivant <span aria-hidden="true">→</span>
                    </Link>
                  </Button>
                ) : (
                  <Button variant="secondary" disabled>
                    Suivant <span aria-hidden="true">→</span>
                  </Button>
                )}
              </nav>
            ) : null}
          </div>
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {commandes.length === 0
                ? 'Aucune commande pour le moment'
                : 'Aucune commande ne correspond à ces filtres'}
            </EmptyTitle>
            <EmptyDescription>
              {commandes.length === 0
                ? 'Les commandes passées sur la boutique apparaîtront ici.'
                : 'Modifiez la recherche ou réinitialisez les filtres pour revoir toutes les commandes.'}
            </EmptyDescription>
          </EmptyHeader>
          {commandes.length > 0 ? (
            <EmptyContent>
              <Button asChild variant="secondary">
                <Link href="/commandes">Réinitialiser les filtres</Link>
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      )}

      {commandesAVerifier.length > 0 ? (
        <Callout
          tone="warning"
          title={
            commandesAVerifier.length > 1
              ? `${commandesAVerifier.length} paiements demandent votre attention`
              : 'Un paiement demande votre attention'
          }
          action={
            filters.tab !== 'to_check' ? (
              <Button asChild variant="secondary">
                <Link href={buildCommandesHref(filters, { tab: 'to_check' })}>
                  Voir les paiements à vérifier
                </Link>
              </Button>
            ) : null
          }
        >
          Vérifiez{' '}
          {commandesAVerifier.slice(0, 3).map((commande, index) => (
            <span key={commande.id}>
              {index > 0 ? ', ' : null}
              <Link
                href={`/commandes/${commande.id}`}
                className="font-medium underline underline-offset-2"
              >
                #{commande.id}
              </Link>
            </span>
          ))}
          {commandesAVerifier.length > 3 ? '…' : null} avant de préparer ou
          remettre la commande.
        </Callout>
      ) : null}

      {productionNeeds.length > 0 ? (
        <ProductionNeedsPanel needs={productionNeeds} canAddLot={userCanAddLot} />
      ) : null}
    </PageContainer>
  )
}
