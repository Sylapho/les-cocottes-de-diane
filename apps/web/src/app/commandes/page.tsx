import ArticleImage from '@/components/articles/article-image'
import CommandeStatusActions from '@/components/commandes/commande-status-actions'
import CommandeStatusBadge from '@/components/commandes/commande-status-badge'
import { getCommandes, type CommandeStatut } from '@/lib/api'
import {
  getProductionNeeds,
  getProductionNeedsByCommandeId,
  type ProductionNeed,
  type ProductionUrgency,
} from '@/lib/production-needs'
import Link from 'next/link'

const processingStatuses = new Set<CommandeStatut>([
  'nouvelle',
  'preparee',
  'paiement_a_verifier',
])

const urgencyLabels: Record<ProductionUrgency, string> = {
  urgent: 'Urgent',
  soon: 'Bientôt',
  planned: 'Planifié',
  unknown: 'Sans date',
}

const urgencyClasses: Record<ProductionUrgency, string> = {
  urgent: 'bg-red-100 text-red-800',
  soon: 'bg-orange-100 text-orange-800',
  planned: 'bg-blue-100 text-blue-800',
  unknown: 'bg-gray-100 text-gray-800',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value / 100)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Non précisée'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value)
}

function groupProductionNeedsByDate(needs: ProductionNeed[]) {
  const groups = new Map<
    string,
    {
      dueDate?: string | null
      dueDateKey: string
      needs: ProductionNeed[]
    }
  >()

  for (const need of needs) {
    const group = groups.get(need.dueDateKey) ?? {
      dueDate: need.dueDate,
      dueDateKey: need.dueDateKey,
      needs: [],
    }

    group.needs.push(need)
    groups.set(need.dueDateKey, group)
  }

  return Array.from(groups.values())
}

function getGroupTitle(group: {
  dueDate?: string | null
  dueDateKey: string
}) {
  return group.dueDateKey === 'unknown'
    ? 'Date de retrait non précisée'
    : formatDate(group.dueDate ?? group.dueDateKey)
}

function ProductionUrgencyBadge({ urgency }: { urgency: ProductionUrgency }) {
  return (
    <span
      className={`rounded px-2 py-1 text-xs font-semibold ${urgencyClasses[urgency]}`}
    >
      {urgencyLabels[urgency]}
    </span>
  )
}

export default async function CommandesPage() {
  const commandes = await getCommandes()
  const commandesATraiter = commandes.filter((commande) =>
    processingStatuses.has(commande.statut),
  )
  const productionNeeds = getProductionNeeds(commandes)
  const productionNeedGroups = groupProductionNeedsByDate(productionNeeds)
  const productionNeedsByCommandeId =
    getProductionNeedsByCommandeId(productionNeeds)
  const totalProductionNeeds = productionNeeds.reduce(
    (total, need) => total + need.quantityToProduce,
    0,
  )
  const productIdsToProduce = new Set(
    productionNeeds.map((need) => need.articleId),
  )
  const urgentProductionNeeds = productionNeeds.filter(
    (need) => need.urgency === 'urgent',
  )

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Commandes en ligne</h1>
          <p className="mt-1 text-sm text-gray-600">
            Commandes passées par les clients depuis la future boutique publique.
          </p>
        </div>
      </div>

      <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Commandes à traiter
          </p>
          <p className="mt-1 text-2xl font-bold">{commandesATraiter.length}</p>
        </div>

        <div className="rounded border bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Produits à produire
          </p>
          <p className="mt-1 text-2xl font-bold">
            {productIdsToProduce.size}
          </p>
        </div>

        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Unités à produire
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-950">
            {formatQuantity(totalProductionNeeds)}
          </p>
        </div>

        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
            Besoins urgents
          </p>
          <p className="mt-1 text-2xl font-bold text-red-950">
            {urgentProductionNeeds.length}
          </p>
        </div>
      </section>

      {commandes.length === 0 ? (
        <section className="rounded border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Aucune commande</h2>
          <p className="mt-1 text-sm text-gray-600">
            Les commandes client apparaîtront ici quand la boutique publique
            sera branchée.
          </p>
        </section>
      ) : (
        <div className="grid gap-4">
          {productionNeedGroups.length > 0 ? (
            <section className="rounded border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-amber-950">
                    Production à prévoir
                  </h2>
                  <p className="mt-1 text-sm text-amber-800">
                    Le stock négatif est volontaire : il signale les
                    précommandes à produire ou à ajuster avant retrait.
                  </p>
                </div>
                <Link
                  href="/stock#lot-article"
                  className="rounded border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900"
                >
                  Ajouter un lot
                </Link>
              </div>

              <div className="mt-4 grid gap-4">
                {productionNeedGroups.map((group) => (
                  <section
                    key={group.dueDateKey}
                    className="rounded border border-amber-200 bg-white p-3"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-semibold text-gray-950">
                        {getGroupTitle(group)}
                      </h3>
                      <span className="text-sm text-gray-600">
                        {formatQuantity(
                          group.needs.reduce(
                            (total, need) => total + need.quantityToProduce,
                            0,
                          ),
                        )}{' '}
                        unité(s) à produire
                      </span>
                    </div>

                    <ul className="grid gap-3 md:grid-cols-2">
                      {group.needs.map((need) => (
                        <li
                          key={`${need.articleId}-${need.dueDateKey}`}
                          className="rounded border bg-gray-50 p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-950">
                                {need.articleNom}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                Stock actuel : {formatQuantity(need.stock)}
                              </p>
                            </div>
                            <ProductionUrgencyBadge urgency={need.urgency} />
                          </div>

                          <dl className="mt-3 grid gap-1 text-sm text-gray-700">
                            <div className="flex justify-between gap-4">
                              <dt>Commandé</dt>
                              <dd className="font-medium">
                                {formatQuantity(need.orderedQuantity)}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt>À produire</dt>
                              <dd className="font-bold text-amber-950">
                                {formatQuantity(need.quantityToProduce)}
                              </dd>
                            </div>
                          </dl>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                            <div className="flex flex-wrap gap-1 text-gray-600">
                              <span>Commandes liées :</span>
                              {need.commandeIds.map((commandeId) => (
                                <Link
                                  key={commandeId}
                                  href={`/commandes/${commandeId}`}
                                  className="font-medium text-gray-950 underline underline-offset-2"
                                >
                                  #{commandeId}
                                </Link>
                              ))}
                            </div>
                            <Link
                              href="/stock#lot-article"
                              className="rounded border px-2 py-1 text-xs font-medium"
                            >
                              Produire
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-4">
            {commandes.map((commande) => {
              const commandeProductionNeeds =
                productionNeedsByCommandeId.get(commande.id) ?? []

              return (
                <article
                  key={commande.id}
                  className="rounded border bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">
                          Commande #{commande.id}
                        </h2>
                        <CommandeStatusBadge statut={commande.statut} />
                        {commandeProductionNeeds.length > 0 ? (
                          <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                            Production requise
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {formatDateTime(commande.createdAt)}
                      </p>
                    </div>

                    <p className="text-xl font-bold">
                      {formatCurrency(commande.totalTtcCents)}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded bg-gray-50 p-3">
                      <h3 className="font-medium">Client</h3>
                      <dl className="mt-2 grid gap-1 text-sm text-gray-700">
                        <div className="flex justify-between gap-4">
                          <dt>Nom</dt>
                          <dd className="font-medium">{commande.nom}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>Email</dt>
                          <dd className="font-medium">{commande.email}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>Téléphone</dt>
                          <dd className="font-medium">
                            {commande.tel || '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>Retrait</dt>
                          <dd className="font-medium">{commande.lieu}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>Date souhaitée</dt>
                          <dd className="font-medium">
                            {formatDate(commande.dateRetrait)}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded bg-gray-50 p-3">
                      <h3 className="font-medium">Articles</h3>
                      <ul className="mt-2 grid gap-2 text-sm">
                        {commande.lignes.map((ligne) => (
                          <li
                            key={ligne.id}
                            className="flex items-center justify-between gap-4"
                          >
                            <span className="flex items-center gap-2">
                              <ArticleImage
                                article={ligne.article}
                                className="h-8 w-8 overflow-hidden rounded border bg-gray-100"
                              />
                              <span>
                                {ligne.article.nom} x{ligne.quantite}
                              </span>
                            </span>
                            <span className="font-medium">
                              {formatCurrency(
                                ligne.prixUnitCents * ligne.quantite,
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {commandeProductionNeeds.length > 0 ? (
                    <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-medium text-amber-950">
                          Production requise
                        </h3>
                        <p className="text-sm text-amber-900">
                          Retrait : {formatDate(commande.dateRetrait)}
                        </p>
                      </div>
                      <ul className="mt-2 grid gap-1 text-sm text-amber-900">
                        {commandeProductionNeeds.map((need) => (
                          <li
                            key={`${commande.id}-${need.articleId}-${need.dueDateKey}`}
                            className="flex flex-wrap items-center justify-between gap-2"
                          >
                            <span>
                              {need.articleNom} :{' '}
                              {formatQuantity(need.quantityToProduce)} à
                              produire
                            </span>
                            <ProductionUrgencyBadge urgency={need.urgency} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/commandes/${commande.id}`}
                        className="rounded border px-3 py-2 text-sm"
                      >
                        Voir détail
                      </Link>

                      <CommandeStatusActions
                        commandeId={commande.id}
                        statut={commande.statut}
                      />
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        </div>
      )}
    </main>
  )
}
