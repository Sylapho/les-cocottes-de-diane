'use client'

import type { ShopArticle } from '@/lib/api'
import {
  buildCartLines,
  formatCurrency,
  getCartCount,
  readStoredCart,
  writeStoredCart,
  type Cart,
} from '@/lib/cart'
import { formatPickupPoint, pickupPoints } from '@/lib/pickup-points'
import ArticleImage from './article-image'
import ProductInfoPopover from './product-info-popover'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type ShopClientProps = {
  articles: ShopArticle[]
}

type Category = 'Tous' | 'Plats' | 'Desserts' | 'Offres du moment'

const categories: Category[] = ['Tous', 'Plats', 'Desserts', 'Offres du moment']

function getArticleCategory(article: ShopArticle): Exclude<Category, 'Tous'> {
  const text = `${article.nom} ${article.description ?? ''}`.toLowerCase()

  if (
    text.includes('dessert') ||
    text.includes('tarte') ||
    text.includes('gâteau') ||
    text.includes('gateau') ||
    text.includes('cookie') ||
    text.includes('chocolat') ||
    text.includes('sucré') ||
    text.includes('sucre')
  ) {
    return 'Desserts'
  }

  if (article.stock > 0 && article.stock <= 4) {
    return 'Offres du moment'
  }

  return 'Plats'
}

function getAvailabilityLabel(stock: number) {
  if (stock <= 0) return 'Épuisé aujourd’hui'
  if (stock <= 3) return `Plus que ${stock} disponible${stock > 1 ? 's' : ''}`

  return 'Disponible au retrait'
}

export default function ShopClient({ articles }: ShopClientProps) {
  const [cart, setCart] = useState<Cart>({})
  const [cartReady, setCartReady] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('Tous')
  const [onlyAvailable, setOnlyAvailable] = useState(false)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setCart(readStoredCart())
      setCartReady(true)
    }, 0)

    return () => window.clearTimeout(handle)
  }, [])

  useEffect(() => {
    if (!cartReady) return

    writeStoredCart(cart)
  }, [cart, cartReady])

  const lines = useMemo(() => buildCartLines(cart, articles), [cart, articles])
  const total = lines.reduce((sum, line) => sum + line.total, 0)
  const count = getCartCount(cart)

  const filteredArticles = articles.filter((article) => {
    const searchValue = search.trim().toLowerCase()

    const matchesSearch = searchValue
      ? `${article.nom} ${article.description ?? ''}`
          .toLowerCase()
          .includes(searchValue)
      : true

    const matchesCategory =
      category === 'Tous' ? true : getArticleCategory(article) === category

    const matchesAvailability = onlyAvailable ? article.stock > 0 : true

    return matchesSearch && matchesCategory && matchesAvailability
  })

  function updateCart(article: ShopArticle, delta: number) {
    setCart((current) => {
      const nextQuantity = Math.max(
        0,
        Math.min(article.stock, (current[article.id] ?? 0) + delta),
      )

      const next = { ...current }

      if (nextQuantity === 0) {
        delete next[article.id]
      } else {
        next[article.id] = nextQuantity
      }

      return next
    })
  }

  function removeFromCart(article: ShopArticle) {
    setCart((current) => {
      const next = { ...current }
      delete next[article.id]
      return next
    })
  }

  return (
    <main className="min-h-screen bg-[#faf7f8]">
      <Header count={count} onCartClick={() => setPanelOpen(true)} />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-14">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b5006e]">
            Commande locale premium
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-[#181014] sm:text-5xl">
            Des produits frais, prêts à retirer sans perdre de temps.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-[#4a3d43]">
            Choisissez vos produits, sélectionnez votre créneau de retrait, puis
            payez en ligne. Une expérience courte, élégante et pensée pour les
            commandes alimentaires locales.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="#produits"
              className="rounded-full bg-[#b5006e] px-6 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-[#8c0055]"
            >
              Commander maintenant
            </a>

            <a
              href="#retrait"
              className="rounded-full border border-[#e8e1e4] bg-white px-6 py-3 text-center text-sm font-bold text-[#5a0037] transition hover:border-[#b5006e]"
            >
              Voir les points de retrait
            </a>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {['Paiement sécurisé', 'Stocks en temps réel', 'Retrait local'].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[#f0dbe6] bg-white/80 px-4 py-3 text-sm font-semibold text-[#4a3d43]"
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </div>

        <div className="rounded-[2rem] bg-[#fceef6] p-5 shadow-sm lg:p-8">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.svg"
              alt="Les Cocottes de Diane"
              width={112}
              height={112}
              className="h-28 w-28 rounded-full bg-white object-contain p-3 shadow-sm"
            />

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#b5006e]">
                Les Cocottes de Diane
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#181014]">
                Boutique en ligne
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#4a3d43]">
                Une sélection courte, lisible et mise à jour selon les stocks
                disponibles.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="retrait" className="mx-auto max-w-6xl px-4 pb-4">
        <div className="rounded-[1.5rem] border border-[#f0dbe6] bg-white p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[#b5006e]">
                Retrait
              </p>
              <h2 className="text-2xl font-black text-[#181014]">
                Choisissez votre point de retrait au paiement
              </h2>
            </div>

            <p className="text-sm text-[#7a6d73]">
              Marchés, ferme et AMAP selon disponibilité.
            </p>
          </div>

          <div className="mt-4 grid gap-3 text-sm text-[#4a3d43] sm:grid-cols-2 lg:grid-cols-4">
            {pickupPoints.slice(0, 4).map((point) => (
              <div
                key={formatPickupPoint(point)}
                className="rounded-2xl bg-[#faf7f8] px-4 py-3"
              >
                <p className="font-bold text-[#181014]">{point.label}</p>
                <p className="mt-1 text-[#7a6d73]">{point.schedule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="produits" className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#b5006e]">
              Catalogue
            </p>
            <h2 className="text-3xl font-black text-[#181014]">
              Produits disponibles
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[#7a6d73]">
              Filtrez rapidement, ajoutez au panier, puis finalisez votre retrait
              sur une page dédiée.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:min-w-[520px]">
            <label className="sr-only" htmlFor="search">
              Rechercher un produit
            </label>

            <input
              id="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une tarte, un plat, un dessert..."
              className="min-h-11 flex-1 rounded-full border border-[#e8e1e4] bg-white px-4 text-sm shadow-sm"
            />

            <button
              type="button"
              onClick={() => setOnlyAvailable((value) => !value)}
              className={`min-h-11 rounded-full border px-4 text-sm font-bold ${
                onlyAvailable
                  ? 'border-[#b5006e] bg-[#fceef6] text-[#8c0055]'
                  : 'border-[#e8e1e4] bg-white text-[#4a3d43]'
              }`}
            >
              Disponible aujourd’hui
            </button>
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                category === item
                  ? 'bg-[#b5006e] text-white'
                  : 'border border-[#e8e1e4] bg-white text-[#4a3d43] hover:border-[#b5006e]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {articles.length === 0 ? (
          <EmptyState message="Aucun article disponible pour le moment." />
        ) : filteredArticles.length === 0 ? (
          <EmptyState message="Aucun produit ne correspond à cette recherche." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => {
              const quantity = cart[article.id] ?? 0
              const disabled = article.stock <= 0

              return (
                <article
                  key={article.id}
                  className="group overflow-hidden rounded-[1.35rem] border border-[#eee2e7] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ArticleImage article={article} />

                  <div className="grid gap-4 p-4">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-black text-[#181014]">
                          {article.nom}
                        </h3>

                        <span className="rounded-full bg-[#fff4d6] px-2.5 py-1 text-xs font-bold text-[#7c5c13]">
                          {getArticleCategory(article)}
                        </span>
                      </div>

                      {article.description ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#7a6d73]">
                          {article.description}
                        </p>
                      ) : null}
                    </div>

                    <ProductInfoPopover
                      ingredients={article.ingredients}
                      allergenes={article.allergenes}
                    />

                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xl font-black text-[#b5006e]">
                          {formatCurrency(article.prix)}
                        </p>

                        <p
                          className={`text-xs font-semibold ${
                            article.stock <= 0
                              ? 'text-red-600'
                              : article.stock <= 3
                                ? 'text-amber-700'
                                : 'text-green-700'
                          }`}
                        >
                          {getAvailabilityLabel(article.stock)}
                        </p>
                      </div>

                      {quantity === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateCart(article, 1)}
                          disabled={disabled}
                          className="rounded-full bg-[#b5006e] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#8c0055] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Ajouter
                        </button>
                      ) : (
                        <QuantityStepper
                          quantity={quantity}
                          max={article.stock}
                          onDecrease={() => updateCart(article, -1)}
                          onIncrease={() => updateCart(article, 1)}
                        />
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {count > 0 ? (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="fixed bottom-4 left-4 right-4 z-30 rounded-full bg-[#181014] px-5 py-3 text-sm font-bold text-white shadow-lg sm:hidden"
        >
          Voir le panier · {count} article{count > 1 ? 's' : ''} ·{' '}
          {formatCurrency(total)}
        </button>
      ) : null}

      {panelOpen ? (
        <CartDrawer
          lines={lines}
          total={total}
          onClose={() => setPanelOpen(false)}
          onDecrease={(article) => updateCart(article, -1)}
          onIncrease={(article) => updateCart(article, 1)}
          onRemove={removeFromCart}
        />
      ) : null}
    </main>
  )
}

function Header({
  count,
  onCartClick,
}: {
  count: number
  onCartClick: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#5a0037] text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-full bg-white object-contain p-1"
            aria-hidden="true"
          />

          <div>
            <p className="font-black leading-tight">
              Les Cocottes de <span className="text-[#fde68a]">Diane</span>
            </p>
            <p className="text-xs text-white/70">Commande en ligne</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-semibold text-white/80 md:flex">
          <a href="#produits" className="hover:text-white">
            Boutique
          </a>
          <a href="#retrait" className="hover:text-white">
            Retrait
          </a>
          <Link href="/compte" className="hover:text-white">
            Compte
          </Link>
        </nav>

        <button
          type="button"
          onClick={onCartClick}
          className="rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-bold transition hover:bg-white/25"
        >
          Panier ({count})
        </button>
      </div>
    </header>
  )
}

function QuantityStepper({
  quantity,
  max,
  onDecrease,
  onIncrease,
}: {
  quantity: number
  max: number
  onDecrease: () => void
  onIncrease: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#e8e1e4] bg-white p-1">
      <button
        type="button"
        onClick={onDecrease}
        className="grid h-8 w-8 place-items-center rounded-full bg-[#faf7f8] font-bold"
        aria-label="Retirer un produit"
      >
        -
      </button>

      <span className="min-w-5 text-center text-sm font-black">{quantity}</span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={quantity >= max}
        className="grid h-8 w-8 place-items-center rounded-full bg-[#faf7f8] font-bold disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Ajouter un produit"
      >
        +
      </button>
    </div>
  )
}

function CartDrawer({
  lines,
  total,
  onClose,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  lines: {
    article: ShopArticle
    quantite: number
    total: number
  }[]
  total: number
  onClose: () => void
  onDecrease: (article: ShopArticle) => void
  onIncrease: (article: ShopArticle) => void
  onRemove: (article: ShopArticle) => void
}) {
  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Fermer le panier"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#eee2e7] p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#b5006e]">
              Panier
            </p>
            <h2 className="text-xl font-black text-[#181014]">Votre commande</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e8e1e4] px-4 py-2 text-sm font-bold text-[#4a3d43]"
          >
            Fermer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <div className="rounded-2xl bg-[#faf7f8] p-5 text-sm text-[#7a6d73]">
              Votre panier est vide. Ajoutez un produit pour commencer votre
              commande.
            </div>
          ) : (
            <ul className="grid gap-3">
              {lines.map((line) => (
                <li
                  key={line.article.id}
                  className="grid gap-3 rounded-2xl border border-[#eee2e7] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#181014]">
                        {line.article.nom}
                      </p>
                      <p className="text-sm text-[#7a6d73]">
                        {line.quantite} x {formatCurrency(line.article.prix)}
                      </p>
                    </div>

                    <p className="font-black text-[#b5006e]">
                      {formatCurrency(line.total)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <QuantityStepper
                      quantity={line.quantite}
                      max={line.article.stock}
                      onDecrease={() => onDecrease(line.article)}
                      onIncrease={() => onIncrease(line.article)}
                    />

                    <button
                      type="button"
                      onClick={() => onRemove(line.article)}
                      className="text-sm font-bold text-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-4 border-t border-[#eee2e7] p-4">
          <div className="rounded-2xl bg-[#fceef6] p-3 text-xs leading-5 text-[#8c0055]">
            Le choix du point de retrait, la date et vos informations client se
            font à l’étape suivante.
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#7a6d73]">
              Total TTC
            </span>
            <strong className="text-2xl text-[#181014]">
              {formatCurrency(total)}
            </strong>
          </div>

          <Link
            href="/checkout"
            className={`rounded-full px-4 py-3 text-center font-black text-white ${
              lines.length === 0
                ? 'pointer-events-none bg-[#181014]/30'
                : 'bg-[#b5006e] hover:bg-[#8c0055]'
            }`}
          >
            Continuer vers le paiement
          </Link>
        </div>
      </aside>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#eee2e7] bg-white p-8 text-center text-sm text-[#7a6d73]">
      {message}
    </div>
  )
}
