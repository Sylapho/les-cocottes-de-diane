import CommandeStatusActions from '@/components/commandes/commande-status-actions'
import ArticleImage from '@/components/articles/article-image'
import { getCommandes, type CommandeStatut } from '@/lib/api'

const statusLabels: Record<CommandeStatut, string> = {
  nouvelle: 'Nouvelle',
  preparee: 'Preparee',
  traitee: 'Traitee',
  annulee: 'Annulee',
}

const statusClasses: Record<CommandeStatut, string> = {
  nouvelle: 'bg-amber-100 text-amber-800',
  preparee: 'bg-blue-100 text-blue-800',
  traitee: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-800',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
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
    return 'Non precisee'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))
}

export default async function CommandesPage() {
  const commandes = await getCommandes()
  const commandesActives = commandes.filter(
    (commande) => commande.statut === 'nouvelle' || commande.statut === 'preparee',
  )

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Commandes en ligne</h1>
          <p className="mt-1 text-sm text-gray-600">
            Commandes passees par les clients depuis la future boutique publique.
          </p>
        </div>

        <div className="rounded border bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            A traiter
          </p>
          <p className="mt-1 text-2xl font-bold">{commandesActives.length}</p>
        </div>
      </div>

      {commandes.length === 0 ? (
        <section className="rounded border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Aucune commande</h2>
          <p className="mt-1 text-sm text-gray-600">
            Les commandes client apparaitront ici quand la boutique publique
            sera branchee.
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {commandes.map((commande) => (
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
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        statusClasses[commande.statut]
                      }`}
                    >
                      {statusLabels[commande.statut]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatDateTime(commande.createdAt)}
                  </p>
                </div>

                <p className="text-xl font-bold">
                  {formatCurrency(commande.totalTTC)}
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
                      <dt>Telephone</dt>
                      <dd className="font-medium">{commande.tel || '-'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Retrait</dt>
                      <dd className="font-medium">{commande.lieu}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Date souhaitee</dt>
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
                          {formatCurrency(ligne.prixUnit * ligne.quantite)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4">
                <CommandeStatusActions
                  commandeId={commande.id}
                  statut={commande.statut}
                />
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
