'use client'

import type { PickupPoint, ShopArticle } from '@/lib/api'
import {
  getArticleCategory,
  type CategoryFilter,
} from '@/lib/article-categories'
import { useCart } from '@/components/cart/cart-provider'
import { buildCartLines, formatCurrency, MAX_CART_QUANTITY } from '@/lib/cart'
import { getImageUrl } from '@/lib/image-url'
import { formatPickupPoint } from '@/lib/pickup-points'
import { getArticlePath } from '@/lib/seo'
import ProductInfoPopover from './product-info-popover'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

type ShopClientProps = {
  articles: ShopArticle[]
  pickupPoints: PickupPoint[]
}

const maxCartQuantity = MAX_CART_QUANTITY

function compareArticlesByPrice(first: ShopArticle, second: ShopArticle) {
  const priceDifference = first.prixCents - second.prixCents

  if (priceDifference !== 0) {
    return priceDifference
  }

  const nameDifference = first.nom.localeCompare(second.nom, 'fr', {
    sensitivity: 'base',
  })

  if (nameDifference !== 0) {
    return nameDifference
  }

  return first.id - second.id
}

export default function ShopClient({ articles, pickupPoints }: ShopClientProps) {
  const { cart, count, changeQuantity, openCart } = useCart()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('ALL')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [openCategories, setOpenCategories] = useState<
    Partial<Record<string, boolean>>
  >({})


  const lines = useMemo(() => buildCartLines(cart, articles), [cart, articles])
  const total = lines.reduce((sum, line) => sum + line.totalCents, 0)
  const categories = useMemo(() => {
    const categoriesBySlug = new Map(
      articles.map((article) => {
        const articleCategory = getArticleCategory(article.category)

        return [articleCategory.slug, articleCategory] as const
      }),
    )

    return Array.from(categoriesBySlug.values()).sort((first, second) => {
      const orderDifference = first.sortOrder - second.sortOrder

      if (orderDifference !== 0) return orderDifference

      return first.name.localeCompare(second.name, 'fr', {
        sensitivity: 'base',
      })
    })
  }, [articles])
  const categoryFilters: CategoryFilter[] = [
    'ALL',
    ...categories.map((item) => item.slug),
  ]

  const filteredArticles = articles
    .filter((article) => {
      const searchValue = search.trim().toLowerCase()

      const matchesSearch = searchValue
        ? `${article.nom} ${article.description ?? ''} ${article.ingredients ?? ''} ${article.allergenes ?? ''}`
            .toLowerCase()
            .includes(searchValue)
        : true

      const matchesCategory =
        category === 'ALL'
          ? true
          : getArticleCategory(article.category).slug === category

      const matchesAvailability = onlyAvailable ? article.stock > 0 : true

      return matchesSearch && matchesCategory && matchesAvailability
    })
    .sort(compareArticlesByPrice)

  const groupedArticles = categories
    .map((item) => ({
      category: item,
      articles: filteredArticles.filter(
        (article) => getArticleCategory(article.category).slug === item.slug,
      ),
    }))
    .filter((group) => group.articles.length > 0)

  function isCategoryOpen(categorySlug: string) {
    return openCategories[categorySlug] ?? false
  }

  function selectCategory(nextCategory: CategoryFilter) {
    setCategory(nextCategory)

    if (nextCategory === 'ALL') {
      setOpenCategories({})
      return
    }

    setOpenCategories((currentCategories) => ({
      ...currentCategories,
      [nextCategory]: true,
    }))
  }

  function toggleCategory(categorySlug: string) {
    const currentlyOpen = isCategoryOpen(categorySlug)

    setOpenCategories((currentCategories) => ({
      ...currentCategories,
      [categorySlug]: !currentlyOpen,
    }))
  }

  return (
    <main className="min-h-screen bg-[#faf7f8]">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-14">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b5006e]">
            Commande locale
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
            {['Paiement sécurisé', 'Préparation selon le retrait', 'Retrait local'].map(
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
      </section>

      <section id="retrait" className="mx-auto max-w-6xl px-4 pb-4">
        <div className="rounded-[1.5rem] border border-[#f0dbe6] bg-white p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[#b5006e]">
                Retrait
              </p>
              <h2 className="text-2xl font-black text-[#181014]">
                Les différents points de retraits disponible 
              </h2>
              <p className="mt-1 text-sm text-[#7a6d73]">
                Choisissez votre point de retrait et votre créneau horaire lors de
                la finalisation de votre commande.
              </p>
            </div>

            <p className="text-sm text-[#7a6d73]">
              Marchés et ferme selon disponibilité.
            </p>
          </div>

          <div className="mt-4 grid gap-3 text-sm text-[#4a3d43] sm:grid-cols-2 lg:grid-cols-4">
            {pickupPoints.map((point) => (
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
              placeholder="Rechercher un produit, un ingrédient, un allergène..."
              className="min-h-11 flex-1 rounded-full border border-[#e8e1e4] bg-white px-4 text-sm shadow-sm"
            />

            <label className="flex min-h-11 items-center gap-2 rounded-full border border-[#e8e1e4] bg-white px-4 text-sm font-bold text-[#4a3d43] shadow-sm">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(event) => setOnlyAvailable(event.target.checked)}
              />
              En stock
            </label>
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {categoryFilters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => selectCategory(item)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                category === item
                  ? 'bg-[#b5006e] text-white'
                  : 'border border-[#e8e1e4] bg-white text-[#4a3d43] hover:border-[#b5006e]'
              }`}
            >
              {item === 'ALL'
                ? 'Toutes'
                : categories.find((categoryItem) => categoryItem.slug === item)
                    ?.name}
            </button>
          ))}
        </div>

        {articles.length === 0 ? (
          <EmptyState message="Aucun article disponible pour le moment." />
        ) : filteredArticles.length === 0 ? (
          <EmptyState message="Aucun produit ne correspond à cette recherche." />
        ) : (
          <div className="grid gap-5">
            {groupedArticles.map((group) => {
              const isOpen = isCategoryOpen(group.category.slug)

              return (
                <section
                  key={group.category.slug}
                  className="overflow-hidden rounded-[1.5rem] border border-[#eee2e7] bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(group.category.slug)}
                    className="flex w-full items-center justify-between gap-3 border-b border-[#eee2e7] bg-[#fffafb] px-4 py-3 text-left transition hover:bg-[#fceef6]"
                    aria-expanded={isOpen}
                  >
                    <div>
                      <h3 className="text-lg font-black text-[#181014]">
                        {group.category.name}
                      </h3>
                      <p className="mt-0.5 text-xs font-semibold text-[#7a6d73]">
                        {group.articles.length} produit
                        {group.articles.length > 1 ? 's' : ''}
                      </p>
                    </div>

                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lg font-black text-[#5a0037] transition ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    >
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M5 7.5L10 12.5L15 7.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="divide-y divide-[#eee2e7]">
                      {group.articles.map((article) => (
                        <ProductRow
                          key={article.id}
                          article={article}
                          quantity={cart[article.id] ?? 0}
                          onDecrease={() => changeQuantity(article.id, -1)}
                          onIncrease={() => changeQuantity(article.id, 1)}
                        />
                      ))}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        )}
      </section>

      {count > 0 ? (
        <button
          type="button"
          onClick={openCart}
          className="fixed bottom-4 left-4 right-4 z-30 rounded-full bg-[#181014] px-5 py-3 text-sm font-bold text-white shadow-lg sm:hidden"
        >
          Voir le panier · {count} article{count > 1 ? 's' : ''} ·{' '}
          {formatCurrency(total)}
        </button>
      ) : null}

    </main>
  )
}

function ProductRow({
  article,
  quantity,
  onDecrease,
  onIncrease,
}: {
  article: ShopArticle
  quantity: number
  onDecrease: () => void
  onIncrease: () => void
}) {
  const [isAddAnimating, setIsAddAnimating] = useState(false)
  const [isStepperAnimating, setIsStepperAnimating] = useState(false)
  const addTimeoutRef = useRef<number | null>(null)
  const stepperTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (addTimeoutRef.current !== null) {
        window.clearTimeout(addTimeoutRef.current)
      }

      if (stepperTimeoutRef.current !== null) {
        window.clearTimeout(stepperTimeoutRef.current)
      }
    }
  }, [])

  function playStepperAnimation() {
    if (stepperTimeoutRef.current !== null) {
      window.clearTimeout(stepperTimeoutRef.current)
    }

    setIsStepperAnimating(true)

    stepperTimeoutRef.current = window.setTimeout(() => {
      setIsStepperAnimating(false)
    }, 350)
  }

  function handleIncrease() {
    if (isAddAnimating) return

    if (quantity === 0) {
      setIsAddAnimating(true)

      addTimeoutRef.current = window.setTimeout(() => {
        onIncrease()
        setIsAddAnimating(false)
        playStepperAnimation()
      }, 180)

      return
    }

    onIncrease()
    playStepperAnimation()
  }

  return (
    <article className="grid grid-cols-[4.5rem_1fr] gap-3 p-3 sm:grid-cols-[4.5rem_1fr_auto] sm:items-center sm:p-4">
      <Link
        href={getArticlePath(article)}
        aria-label={`Voir ${article.nom}`}
        className="block"
      >
        <ProductThumbnail article={article} />
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-base font-black text-[#181014]">
            <Link href={getArticlePath(article)} className="hover:text-[#b5006e]">
              {article.nom}
            </Link>
          </h4>

          {article.allergenes ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
              Allergènes
            </span>
          ) : null}
        </div>

        {article.description ? (
          <p className="mt-1 text-sm leading-6 text-[#7a6d73]">
            {article.description}
          </p>
        ) : null}

        <div className="mt-2 max-w-2xl">
          <ProductInfoPopover
            ingredients={article.ingredients}
            allergenes={article.allergenes}
          />
        </div>
      </div>

      <div className="col-span-2 flex items-end justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
        <div className="sm:text-right">
          <p className="text-lg font-black text-[#b5006e]">
            {formatCurrency(article.prixCents)}
          </p>
        </div>

        {quantity === 0 ? (
          <button
            type="button"
            onClick={handleIncrease}
            disabled={isAddAnimating}
            className={`rounded-full bg-[#b5006e] px-4 py-2 text-sm font-bold text-white transition-all duration-200 ${
              isAddAnimating
                ? 'scale-95 bg-[#8c0055] shadow-inner ring-4 ring-[#b5006e]/20'
                : 'hover:scale-105 hover:bg-[#8c0055] active:scale-95'
            }`}
          >
            Ajouter
          </button>
        ) : (
          <div
            className={`transition-all duration-300 ${
              isStepperAnimating
                ? 'scale-105 rounded-full ring-4 ring-[#b5006e]/20'
                : ''
            }`}
          >
            <QuantityStepper
              quantity={quantity}
              onDecrease={onDecrease}
              onIncrease={handleIncrease}
            />
          </div>
        )}
      </div>
    </article>
  )
}

function ProductThumbnail({ article }: { article: ShopArticle }) {
  const imageUrl = getImageUrl(article.imageUrl)

  if (imageUrl) {
    return (
      <div className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-2xl bg-[#fceef6]">
        <Image
          src={imageUrl}
          alt={article.nom}
          fill
          sizes="72px"
          className="object-cover"
        />
      </div>
    )
  }

  return (
    <div className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-2xl bg-[#fceef6]">
      <Image
        src="/logo.svg"
        alt={article.nom}
        fill
        sizes="72px"
        className="object-contain p-2"
      />
    </div>
  )
}

function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
}: {
  quantity: number
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
        disabled={quantity >= maxCartQuantity}
        className="grid h-8 w-8 place-items-center rounded-full bg-[#faf7f8] font-bold"
        aria-label="Ajouter un produit"
      >
        +
      </button>
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
