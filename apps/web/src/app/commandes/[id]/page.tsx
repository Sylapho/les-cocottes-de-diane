import CommandeRefundsPanel from '@/components/commandes/commande-refunds-panel'
import CommandeStatusActions from '@/components/commandes/commande-status-actions'
import { commandeStatusLabels } from '@/components/commandes/commande-status-badge'
import {
  Callout,
  PageContainer,
  PageHeading,
  Panel,
} from '@/components/layout/page-layout'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getCommande,
  getCommandeRefunds,
  type CommandeStatutHistorique,
} from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import { formatOrderDateTime } from '@/lib/commande-list'
import { formatCurrencyFromCents } from '@/lib/money'
import {
  canManageOrders,
  canRefundOrders,
  canViewOrders,
} from '@/lib/permissions'
import { getLocalDateKey } from '@/lib/preparation'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

function formatCreatedAt(value: string) {
  const date = new Date(value)
  const day = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(date)
  const time = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(date)

  return `Créée le ${day} à ${time}`
}

function formatPickupSummary(value?: string | null) {
  if (!value) {
    return 'Date de retrait non précisée'
  }

  const now = new Date()
  const key = getLocalDateKey(value)

  if (key === getLocalDateKey(now)) {
    return 'Retrait aujourd’hui'
  }

  return `Retrait le ${new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))}`
}

function formatPickupDate(value?: string | null) {
  if (!value) {
    return 'Date non précisée'
  }

  const label = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))

  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(
    value,
  )
}

function getHistoryTitle(entry: CommandeStatutHistorique) {
  if (!entry.ancienStatut) {
    return `Commande enregistrée · ${commandeStatusLabels[entry.nouveauStatut]}`
  }

  return `${commandeStatusLabels[entry.ancienStatut]} → ${commandeStatusLabels[entry.nouveauStatut]}`
}

export default async function CommandeDetailPage({ params }: PageProps) {
  const session = await requireUiPermission(canViewOrders)
  const userCanManageOrders = canManageOrders(session.user)
  const userCanRefundOrders = canRefundOrders(session.user)
  const { id } = await params
  const commandeId = Number(id)

  if (!Number.isInteger(commandeId)) {
    notFound()
  }

  const [commande, refunds] = await Promise.all([
    getCommande(commandeId),
    getCommandeRefunds(commandeId),
  ])
  const itemCount = commande.lignes.reduce(
    (total, ligne) => total + ligne.quantite,
    0,
  )
  const productionLines = commande.lignes.filter(
    (ligne) => (ligne.productionQuantity ?? 0) > 0,
  )
  const historique = commande.historique ?? []

  return (
    <PageContainer>
      <PageHeading
        context="Commandes"
        contextHref="/commandes"
        title={`Commande #${commande.id}`}
        description={`${formatCreatedAt(commande.createdAt)} · ${formatPickupSummary(commande.dateRetrait)}`}
      />

      <CommandeStatusActions
        commandeId={commande.id}
        statut={commande.statut}
        canManage={userCanManageOrders}
      />

      {commande.statut === 'paiement_a_verifier' ? (
        <Callout tone="warning" title="Paiement à vérifier">
          Paiement reçu, mais le stock était insuffisant au moment de la
          commande. Vérifiez la commande avant de contacter le client.
        </Callout>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-full">Article</TableHead>
                <TableHead>Qté</TableHead>
                <TableHead>Prix unitaire</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commande.lignes.map((ligne) => (
                <TableRow key={ligne.id}>
                  <TableCell className="font-medium">
                    <span className="flex flex-wrap items-center gap-2">
                      {ligne.article.nom}
                      {(ligne.productionQuantity ?? 0) > 0 ? (
                        <Badge variant="warning">
                          {formatQuantity(ligne.productionQuantity ?? 0)} à
                          produire
                        </Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatQuantity(ligne.quantite)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatCurrencyFromCents(ligne.prixUnitCents)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatCurrencyFromCents(
                      ligne.prixUnitCents * ligne.quantite,
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Panel title="Récapitulatif">
            <dl className="flex flex-col gap-1">
              <dt className="text-xs leading-[17px] text-muted-foreground">
                Total TTC
              </dt>
              <dd className="text-sm leading-5 font-medium">
                {formatCurrencyFromCents(commande.totalTtcCents)}
              </dd>
            </dl>
            <CommandeRefundsPanel
              commandeId={commande.id}
              refunds={refunds}
              canRefund={userCanRefundOrders}
              paymentConfirmed={Boolean(commande.stripeId)}
            />
            {commande.stripeId ? (
              <p className="truncate text-xs leading-[17px] text-muted-foreground">
                Référence Stripe : {commande.stripeId}
              </p>
            ) : null}
          </Panel>

          <Panel
            title="Historique"
            footer="Les nouveaux changements apparaîtront ici."
          >
            {historique.length > 0 ? (
              <ol className="flex flex-col divide-y divide-border">
                {historique.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-1 py-3 first:pt-0"
                  >
                    <p className="text-sm leading-5 font-medium">
                      <time dateTime={entry.createdAt}>
                        {formatOrderDateTime(entry.createdAt)}
                      </time>{' '}
                      · {getHistoryTitle(entry)}
                    </p>
                    {entry.motif ? (
                      <p className="text-sm leading-5 text-muted-foreground">
                        Motif : {entry.motif}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm leading-5 text-muted-foreground">
                Aucun changement de statut enregistré.
              </p>
            )}
          </Panel>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Panel title="Client">
            <p className="text-sm leading-5 font-medium">{commande.nom}</p>
            <a
              href={`mailto:${commande.email}`}
              className="text-sm leading-5 break-all text-muted-foreground hover:text-foreground hover:underline"
            >
              {commande.email}
            </a>
            {commande.tel ? (
              <a
                href={`tel:${commande.tel}`}
                className="text-sm leading-5 text-muted-foreground hover:text-foreground hover:underline"
              >
                {commande.tel}
              </a>
            ) : (
              <p className="text-xs leading-[17px] text-muted-foreground">
                Téléphone non renseigné
              </p>
            )}
          </Panel>

          <Panel title="Retrait">
            <p className="text-sm leading-5 font-medium">{commande.lieu}</p>
            <p className="text-sm leading-5">
              {formatPickupDate(commande.dateRetrait)}
            </p>
          </Panel>

          {productionLines.length > 0 ? (
            <Callout tone="warning" title="Production requise">
              <p>
                Commande acceptée malgré un stock insuffisant. À produire ou
                ajuster avant retrait :
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {productionLines.map((ligne) => (
                  <li key={ligne.id}>
                    {formatQuantity(ligne.productionQuantity ?? 0)} ×{' '}
                    {ligne.article.nom}
                  </li>
                ))}
              </ul>
            </Callout>
          ) : null}
        </aside>
      </div>

      {userCanManageOrders && commande.statut === 'nouvelle' ? (
        <Callout tone="info" title="Avant de marquer préparée">
          Vérifiez les {itemCount > 1 ? `${itemCount} articles` : 'articles'}{' '}
          et les quantités. Cette action fait passer la commande de nouvelle à
          préparée.
        </Callout>
      ) : null}
    </PageContainer>
  )
}
