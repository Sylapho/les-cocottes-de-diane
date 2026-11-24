import CommandeStatusBadge from '@/components/commandes/commande-status-badge'
import PreparationStatusActions from '@/components/commandes/preparation-status-actions'
import { FilterMenu } from '@/components/layout/filter-menu'
import {
  KeyFigures,
  PageContainer,
  PageHeading,
  Panel,
} from '@/components/layout/page-layout'
import PrintButton from '@/components/layout/print-button'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { getCommandes, type Commande } from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import { getSearchParam } from '@/lib/commande-list'
import { canManageOrders, canViewOrders } from '@/lib/permissions'
import {
  aggregatePreparationLines,
  getLocalDateKey,
  getPreparationCommandes,
  getPreparationDateOptions,
  getPreparationPickupPoints,
  groupPreparationCommandes,
  resolvePreparationDateSelection,
} from '@/lib/preparation'
import Link from 'next/link'

type PreparationPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(
    value,
  )
}

function formatShortDateKey(dateKey: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(`${dateKey}T12:00:00.000Z`))
}

function formatLongDateKey(dateKey: string) {
  if (dateKey === 'unknown') {
    return 'Date de retrait non précisée'
  }

  const label = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeZone: 'Europe/Paris',
  }).format(new Date(`${dateKey}T12:00:00.000Z`))

  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatPickupLine(commande: Commande, todayKey: string) {
  const key = getLocalDateKey(commande.dateRetrait)

  if (key === 'unknown') {
    return `Retrait sans date · ${commande.lieu}`
  }

  if (key === todayKey) {
    return `Retrait aujourd’hui · ${commande.lieu}`
  }

  return `Retrait le ${formatShortDateKey(key)} · ${commande.lieu}`
}

function getPreparationHref(date: string, pickupPoint: string) {
  const params = new URLSearchParams()

  if (date !== 'today') {
    params.set('date', date)
  }

  if (pickupPoint) {
    params.set('lieu', pickupPoint)
  }

  const query = params.toString()

  return query ? `/preparation?${query}` : '/preparation'
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

export default async function PreparationPage({
  searchParams,
}: PreparationPageProps) {
  const session = await requireUiPermission(canViewOrders)
  const userCanManageOrders = canManageOrders(session.user)
  const params = (await searchParams) ?? {}
  const selectedPickupPoint = getSearchParam(params, 'lieu')
  const dateOptions = getPreparationDateOptions()
  const selectedDate = resolvePreparationDateSelection(
    getSearchParam(params, 'date'),
  )
  const todayKey = dateOptions.today.dateKey ?? ''
  const commandes = await getCommandes()
  const pickupPoints = getPreparationPickupPoints(
    getPreparationCommandes(commandes, { dateKey: selectedDate.dateKey }),
  )
  const filteredCommandes = getPreparationCommandes(commandes, {
    dateKey: selectedDate.dateKey,
    pickupPoint: selectedPickupPoint,
  })
  const newCommandes = filteredCommandes.filter(
    (commande) => commande.statut === 'nouvelle',
  )
  const preparedCount = filteredCommandes.length - newCommandes.length
  const linesToPrepare = aggregatePreparationLines(newCommandes)
  const quantityToPrepare = linesToPrepare.reduce(
    (total, line) => total + line.quantity,
    0,
  )
  const dateGroups = groupPreparationCommandes(filteredCommandes)
  const showDateHeadings = !selectedDate.dateKey
  const dateLabel = selectedDate.dateKey
    ? `${selectedDate.label} · ${formatShortDateKey(selectedDate.dateKey)}`
    : selectedDate.label

  return (
    <PageContainer className="preparation-print-page">
      <PageHeading
        context="Préparation"
        title={
          selectedDate.value === 'today' ? 'Préparation du jour' : 'Préparation'
        }
        description="Une liste par point de retrait, un seul geste pour terminer."
      />

      <div className="flex flex-wrap gap-3 print:hidden">
        <FilterMenu
          variant="default"
          ariaLabel="Date de retrait"
          label={dateLabel}
          className="min-w-56"
          options={Object.values(dateOptions).map((option) => ({
            label: option.dateKey
              ? `${option.label} · ${formatShortDateKey(option.dateKey)}`
              : option.label,
            href: getPreparationHref(option.value, selectedPickupPoint),
            active: selectedDate.value === option.value,
          }))}
        />
        <FilterMenu
          ariaLabel="Point de retrait"
          label={selectedPickupPoint || 'Tous les retraits'}
          className="min-w-56"
          options={[
            {
              label: 'Tous les retraits',
              href: getPreparationHref(selectedDate.value, ''),
              active: !selectedPickupPoint,
            },
            ...pickupPoints.map((pickupPoint) => ({
              label: pickupPoint,
              href: getPreparationHref(selectedDate.value, pickupPoint),
              active: selectedPickupPoint === pickupPoint,
            })),
          ]}
        />
        <Button asChild variant="secondary" className="min-w-36">
          <PrintButton>Imprimer</PrintButton>
        </Button>
      </div>

      <p className="hidden text-sm print:block">
        {dateLabel}
        {selectedPickupPoint ? ` · ${selectedPickupPoint}` : ''}
      </p>

      <KeyFigures
        items={[
          {
            label: 'À préparer',
            value: newCommandes.length,
            detail: 'Commandes nouvelles',
          },
          {
            label: 'Préparées',
            value: preparedCount,
            detail: 'En attente de retrait',
          },
          {
            label: 'Articles à préparer',
            value: formatQuantity(quantityToPrepare),
            detail: 'Quantités cumulées',
          },
        ]}
        className="max-sm:[&>div:last-child]:col-span-2"
      />

      {filteredCommandes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Rien à préparer</EmptyTitle>
            <EmptyDescription>
              Aucune commande nouvelle ou préparée pour cette date et ce point
              de retrait.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="flex min-w-0 flex-col gap-6">
            {dateGroups.map((dateGroup) => (
              <section
                key={dateGroup.dateKey}
                aria-label={formatLongDateKey(dateGroup.dateKey)}
                className="flex flex-col gap-4"
              >
                {showDateHeadings ? (
                  <h2 className="text-lg leading-[26px] font-semibold">
                    {formatLongDateKey(dateGroup.dateKey)}
                  </h2>
                ) : null}

                {dateGroup.pickupGroups.map((pickupGroup) => (
                  <section
                    key={`${dateGroup.dateKey}-${pickupGroup.pickupPoint}`}
                    className="flex flex-col gap-4 print:break-inside-avoid"
                  >
                    <h3 className="text-sm leading-5 font-medium text-muted-foreground">
                      {pickupGroup.pickupPoint} ·{' '}
                      {plural(
                        pickupGroup.commandes.length,
                        'commande',
                        'commandes',
                      )}
                    </h3>

                    {pickupGroup.commandes.map((commande) => (
                      <article
                        key={commande.id}
                        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 print:break-inside-avoid"
                      >
                        <div className="flex flex-col gap-4">
                          <h4 className="text-lg leading-[26px] font-semibold">
                            <Link
                              href={`/commandes/${commande.id}`}
                              className="hover:underline"
                            >
                              #{commande.id} · {commande.nom}
                            </Link>
                          </h4>
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-xs leading-[17px] text-muted-foreground">
                              {formatPickupLine(commande, todayKey)}
                            </p>
                            {commande.statut === 'preparee' ? (
                              <CommandeStatusBadge statut={commande.statut} />
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <ul className="flex flex-col gap-2 text-sm leading-5">
                            {commande.lignes.map((ligne) => (
                              <li key={ligne.id}>
                                {formatQuantity(ligne.quantite)} ×{' '}
                                {ligne.article.nom}
                              </li>
                            ))}
                          </ul>
                          <div className="print:hidden">
                            <PreparationStatusActions
                              commandeId={commande.id}
                              statut={commande.statut}
                              canManage={userCanManageOrders}
                            />
                          </div>
                        </div>
                      </article>
                    ))}
                  </section>
                ))}
              </section>
            ))}
          </div>

          <Panel
            title="Total à préparer"
            footer="Pour les commandes nouvelles de la sélection."
            className="lg:sticky lg:top-6 print:break-inside-avoid"
          >
            {linesToPrepare.length > 0 ? (
              <ul className="flex flex-col divide-y divide-border">
                {linesToPrepare.map((line) => (
                  <li
                    key={line.articleId}
                    className="py-3 text-sm leading-5 first:pt-0"
                  >
                    {formatQuantity(line.quantity)} × {line.articleNom}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-5 text-muted-foreground">
                Toutes les commandes de la sélection sont déjà préparées.
              </p>
            )}
          </Panel>
        </div>
      )}
    </PageContainer>
  )
}
