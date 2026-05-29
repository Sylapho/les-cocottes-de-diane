'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type {
  Article,
  MatierePremiere,
  MouvementStock,
  MouvementStockCible,
  MouvementStockType,
} from '@/lib/api'
import ArticleImage from '@/components/articles/article-image'
import AdjustStockForm from './adjust-stock-form'
import ProduceLotForm from './produce-lot-form'
import ReceptionMatiereForm from './reception-matiere-form'

type StockDashboardProps = {
  articles: Article[]
  matieres: MatierePremiere[]
  mouvements: MouvementStock[]
}

type StockTab = 'mp' | 'articles'
type StockFilter = 'all' | 'ok' | 'moyen' | 'critique'
type SortMode =
  | 'nom'
  | 'stock-asc'
  | 'stock-desc'
  | 'prix-asc'
  | 'prix-desc'
  | 'statut'

const typeLabels: Record<MouvementStockType, string> = {
  vente: 'Vente',
  production: 'Production',
  reception: 'Reception',
  ajustement: 'Ajustement',
  perte: 'Perte',
  commande: 'Commande',
}

const cibleLabels: Record<MouvementStockCible, string> = {
  article: 'Article',
  matiere_premiere: 'Matiere premiere',
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 3,
  }).format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))
}

function mpStatus(matiere: MatierePremiere): StockFilter {
  if (matiere.stock <= matiere.seuil) {
    return 'critique'
  }

  if (matiere.stock <= matiere.seuil * 3) {
    return 'moyen'
  }

  return 'ok'
}

function articleStatus(article: Article): StockFilter {
  if (article.stock <= 0) {
    return 'critique'
  }

  if (article.stock <= 3) {
    return 'moyen'
  }

  return 'ok'
}

function statusLabel(status: StockFilter) {
  if (status === 'critique') return 'Critique'
  if (status === 'moyen') return 'Moyen'
  if (status === 'ok') return 'OK'
  return 'Tous'
}

function statusClass(status: StockFilter) {
  if (status === 'critique') {
    return 'bg-red-100 text-red-700'
  }

  if (status === 'moyen') {
    return 'bg-amber-100 text-amber-800'
  }

  return 'bg-green-100 text-green-700'
}

function statusRank(status: StockFilter) {
  if (status === 'critique') return 0
  if (status === 'moyen') return 1
  if (status === 'ok') return 2
  return 3
}

function movementName(mouvement: MouvementStock) {
  if (mouvement.cible === 'article') {
    return mouvement.article?.nom ?? `Article #${mouvement.articleId}`
  }

  return mouvement.mp?.nom ?? `Matiere #${mouvement.mpId}`
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${cell.replaceAll('"', '""')}"`)
        .join(','),
    )
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function StockDashboard({
  articles,
  matieres,
  mouvements,
}: StockDashboardProps) {
  const [tab, setTab] = useState<StockTab>('mp')
  const [filter, setFilter] = useState<StockFilter>('all')
  const [sort, setSort] = useState<SortMode>('nom')

  const matieresCritiques = matieres.filter(
    (matiere) => mpStatus(matiere) === 'critique',
  )
  const matieresMoyennes = matieres.filter(
    (matiere) => mpStatus(matiere) === 'moyen',
  )
  const articlesCritiques = articles.filter(
    (article) => articleStatus(article) === 'critique',
  )
  const articlesMoyens = articles.filter(
    (article) => articleStatus(article) === 'moyen',
  )

  const visibleMatieres = useMemo(() => {
    return matieres
      .filter((matiere) => filter === 'all' || mpStatus(matiere) === filter)
      .sort((a, b) => {
        if (sort === 'stock-asc') return a.stock - b.stock
        if (sort === 'stock-desc') return b.stock - a.stock
        if (sort === 'statut') {
          return statusRank(mpStatus(a)) - statusRank(mpStatus(b))
        }

        return a.nom.localeCompare(b.nom)
      })
  }, [filter, matieres, sort])

  const visibleArticles = useMemo(() => {
    return articles
      .filter((article) => filter === 'all' || articleStatus(article) === filter)
      .sort((a, b) => {
        if (sort === 'stock-asc') return a.stock - b.stock
        if (sort === 'stock-desc') return b.stock - a.stock
        if (sort === 'prix-asc') return a.prix - b.prix
        if (sort === 'prix-desc') return b.prix - a.prix
        if (sort === 'statut') {
          return statusRank(articleStatus(a)) - statusRank(articleStatus(b))
        }

        return a.nom.localeCompare(b.nom)
      })
  }, [articles, filter, sort])

  function exportCurrentTab() {
    if (tab === 'mp') {
      downloadCsv('stock-matieres-premieres.csv', [
        ['Matiere', 'Stock', 'Unite', 'Seuil', 'Conditionnement', 'Statut'],
        ...visibleMatieres.map((matiere) => [
          matiere.nom,
          String(matiere.stock),
          matiere.unite,
          String(matiere.seuil),
          matiere.conditionnement,
          statusLabel(mpStatus(matiere)),
        ]),
      ])
      return
    }

    downloadCsv('stock-articles.csv', [
      ['Article', 'Stock', 'Prix TTC', 'En ligne', 'Statut'],
      ...visibleArticles.map((article) => [
        article.nom,
        String(article.stock),
        String(article.prix),
        article.online ? 'Oui' : 'Non',
        statusLabel(articleStatus(article)),
      ]),
    ])
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock</h1>
          <p className="mt-1 text-sm text-gray-600">
            Matieres premieres, articles finis, alertes et actions rapides.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/matieres-premieres/new" className="rounded border px-4 py-2 text-sm">
            + Matiere premiere
          </Link>
          <a href="#lot-article" className="rounded border px-4 py-2 text-sm">
            + Lot article
          </a>
          <a href="#reappro" className="rounded bg-black px-4 py-2 text-sm text-white">
            + Reappro
          </a>
        </div>
      </div>

      <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            MP critiques
          </p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {matieresCritiques.length}
          </p>
        </div>
        <div className="rounded border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            MP a surveiller
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {matieresMoyennes.length}
          </p>
        </div>
        <div className="rounded border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Articles en rupture
          </p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {articlesCritiques.length}
          </p>
        </div>
        <div className="rounded border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Articles bas
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {articlesMoyens.length}
          </p>
        </div>
      </section>

      {(matieresCritiques.length > 0 || articlesCritiques.length > 0) ? (
        <section className="mb-6 rounded border border-red-200 bg-red-50 p-4">
          <h2 className="font-semibold text-red-800">Alertes stock</h2>
          <div className="mt-2 grid gap-1 text-sm text-red-800">
            {matieresCritiques.slice(0, 4).map((matiere) => (
              <p key={`mp-${matiere.id}`}>
                {matiere.nom} : {formatNumber(matiere.stock)} {matiere.unite} restant(s)
              </p>
            ))}
            {articlesCritiques.slice(0, 4).map((article) => (
              <p key={`article-${article.id}`}>
                {article.nom} : {article.stock} en stock
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTab('mp')
                setFilter('all')
                setSort('nom')
              }}
              className={
                tab === 'mp'
                  ? 'rounded bg-black px-3 py-2 text-sm text-white'
                  : 'rounded border px-3 py-2 text-sm'
              }
            >
              Matieres premieres
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('articles')
                setFilter('all')
                setSort('nom')
              }}
              className={
                tab === 'articles'
                  ? 'rounded bg-black px-3 py-2 text-sm text-white'
                  : 'rounded border px-3 py-2 text-sm'
              }
            >
              Articles finis
            </button>
          </div>

          <button
            type="button"
            onClick={exportCurrentTab}
            className="rounded border px-3 py-2 text-sm"
          >
            Export CSV
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as StockFilter)}
            className="rounded border px-3 py-2 text-sm"
            title="Filtrer par statut"
          >
            <option value="all">Tous les statuts</option>
            <option value="ok">OK</option>
            <option value="moyen">Moyen</option>
            <option value="critique">Critique</option>
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="rounded border px-3 py-2 text-sm"
            title="Trier"
          >
            <option value="nom">Trier : Nom</option>
            <option value="stock-asc">Stock croissant</option>
            <option value="stock-desc">Stock decroissant</option>
            {tab === 'articles' ? (
              <>
                <option value="prix-asc">Prix croissant</option>
                <option value="prix-desc">Prix decroissant</option>
              </>
            ) : null}
            <option value="statut">Statut critique en premier</option>
          </select>
        </div>

        {tab === 'mp' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="py-3 pr-4 font-medium">Matiere</th>
                  <th className="py-3 pr-4 font-medium">Stock</th>
                  <th className="py-3 pr-4 font-medium">Seuil</th>
                  <th className="py-3 pr-4 font-medium">Conditionnement</th>
                  <th className="py-3 pr-4 font-medium">Statut</th>
                  <th className="py-3 pr-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleMatieres.map((matiere) => {
                  const status = mpStatus(matiere)

                  return (
                    <tr key={matiere.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium">{matiere.nom}</td>
                      <td className="py-3 pr-4">
                        {formatNumber(matiere.stock)} {matiere.unite}
                      </td>
                      <td className="py-3 pr-4">
                        {formatNumber(matiere.seuil)} {matiere.unite}
                      </td>
                      <td className="py-3 pr-4">{matiere.conditionnement}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(status)}`}>
                          {statusLabel(status)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/matieres-premieres/${matiere.id}`}
                          className="rounded border px-3 py-2 text-xs"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="py-3 pr-4 font-medium">Article</th>
                  <th className="py-3 pr-4 font-medium">Stock</th>
                  <th className="py-3 pr-4 font-medium">Prix TTC</th>
                  <th className="py-3 pr-4 font-medium">En ligne</th>
                  <th className="py-3 pr-4 font-medium">Statut</th>
                  <th className="py-3 pr-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleArticles.map((article) => {
                  const status = articleStatus(article)

                  return (
                    <tr key={article.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <ArticleImage
                            article={article}
                            className="h-8 w-8 overflow-hidden rounded border bg-gray-100"
                          />
                          <span className="font-medium">{article.nom}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">{article.stock}</td>
                      <td className="py-3 pr-4">{formatCurrency(article.prix)}</td>
                      <td className="py-3 pr-4">{article.online ? 'Oui' : 'Non'}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(status)}`}>
                          {statusLabel(status)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/articles/${article.id}`}
                          className="rounded border px-3 py-2 text-xs"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <div id="reappro">
          <ReceptionMatiereForm
            matieres={matieres.map((matiere) => ({
              id: matiere.id,
              nom: matiere.nom,
              unite: matiere.unite,
            }))}
          />
        </div>

        <ProduceLotForm
          articles={articles.map((article) => ({
            id: article.id,
            nom: article.nom,
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
        <h2 className="text-xl font-semibold">Derniers mouvements</h2>
        {mouvements.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">
            Aucun mouvement enregistre pour le moment.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {mouvements.slice(0, 8).map((mouvement) => {
              const quantityPrefix = mouvement.quantite > 0 ? '+' : ''

              return (
                <div
                  key={mouvement.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{movementName(mouvement)}</p>
                    <p className="text-sm text-gray-600">
                      {typeLabels[mouvement.type]} - {cibleLabels[mouvement.cible]} -{' '}
                      {formatDateTime(mouvement.createdAt)}
                    </p>
                  </div>
                  <p
                    className={
                      mouvement.quantite >= 0
                        ? 'font-semibold text-green-700'
                        : 'font-semibold text-red-700'
                    }
                  >
                    {quantityPrefix}
                    {formatNumber(mouvement.quantite)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
