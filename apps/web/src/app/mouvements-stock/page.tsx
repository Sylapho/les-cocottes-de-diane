import Link from 'next/link'
import AdjustStockForm from '@/components/stock/adjust-stock-form'
import ReceptionMatiereForm from '@/components/stock/reception-matiere-form'
import {
  getArticles,
  getMatieresPremieres,
  getMouvementsStock,
  type MouvementStock,
  type MouvementStockCible,
  type MouvementStockType,
} from '@/lib/api'

const typeLabels: Record<MouvementStockType, string> = {
  vente: 'Vente',
  production: 'Production',
  reception: 'Reception',
  ajustement: 'Ajustement',
  perte: 'Perte',
}

const cibleLabels: Record<MouvementStockCible, string> = {
  article: 'Article',
  matiere_premiere: 'Matiere premiere',
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))
}

function formatQuantity(value: number) {
  const prefix = value > 0 ? '+' : ''

  return `${prefix}${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 3,
  }).format(value)}`
}

function getMouvementName(mouvement: MouvementStock) {
  if (mouvement.cible === 'article') {
    return mouvement.article?.nom ?? `Article #${mouvement.articleId}`
  }

  return mouvement.mp?.nom ?? `Matiere #${mouvement.mpId}`
}

function getMouvementUnit(mouvement: MouvementStock) {
  if (mouvement.cible === 'matiere_premiere') {
    return mouvement.mp?.unite ? ` ${mouvement.mp.unite}` : ''
  }

  return ''
}

export default async function MouvementsStockPage() {
  const [mouvements, articles, matieres] = await Promise.all([
    getMouvementsStock(),
    getArticles(),
    getMatieresPremieres(),
  ])

  const recentMouvements = mouvements.slice(0, 80)

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mouvements de stock</h1>
          <p className="mt-1 text-sm text-gray-600">
            Receptionne les matieres, corrige les ecarts et garde une trace des
            variations.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/matieres-premieres" className="rounded border px-4 py-2">
            Matieres premieres
          </Link>
          <Link href="/articles" className="rounded border px-4 py-2">
            Articles
          </Link>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <ReceptionMatiereForm
          matieres={matieres.map((matiere) => ({
            id: matiere.id,
            nom: matiere.nom,
            unite: matiere.unite,
          }))}
        />
        <AdjustStockForm
          articles={articles.map((article) => ({
            id: article.id,
            nom: article.nom,
            stock: article.stock,
          }))}
          matieres={matieres.map((matiere) => ({
            id: matiere.id,
            nom: matiere.nom,
            stock: matiere.stock,
            unite: matiere.unite,
          }))}
        />
      </section>

      <section className="mt-6 rounded border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Historique</h2>
            <p className="mt-1 text-sm text-gray-600">
              {mouvements.length} mouvement(s) enregistres.
            </p>
          </div>
        </div>

        {recentMouvements.length === 0 ? (
          <p className="text-sm text-gray-600">
            Aucun mouvement de stock pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
                  <th className="py-3 pr-4 font-medium">Element</th>
                  <th className="py-3 pr-4 font-medium">Variation</th>
                  <th className="py-3 pr-4 font-medium">Avant</th>
                  <th className="py-3 pr-4 font-medium">Apres</th>
                  <th className="py-3 pr-4 font-medium">Motif</th>
                </tr>
              </thead>
              <tbody>
                {recentMouvements.map((mouvement) => {
                  const unit = getMouvementUnit(mouvement)

                  return (
                    <tr key={mouvement.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 text-gray-700">
                        {formatDateTime(mouvement.createdAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium">
                          {typeLabels[mouvement.type] ?? mouvement.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{getMouvementName(mouvement)}</p>
                        <p className="text-xs text-gray-600">
                          {cibleLabels[mouvement.cible]}
                        </p>
                      </td>
                      <td
                        className={
                          mouvement.quantite >= 0
                            ? 'py-3 pr-4 font-semibold text-green-700'
                            : 'py-3 pr-4 font-semibold text-red-700'
                        }
                      >
                        {formatQuantity(mouvement.quantite)}
                        {unit}
                      </td>
                      <td className="py-3 pr-4">
                        {formatQuantity(mouvement.stockAvant).replace('+', '')}
                        {unit}
                      </td>
                      <td className="py-3 pr-4">
                        {formatQuantity(mouvement.stockApres).replace('+', '')}
                        {unit}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {mouvement.motif || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
