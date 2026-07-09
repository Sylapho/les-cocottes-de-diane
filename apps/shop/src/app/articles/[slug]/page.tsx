import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getShopArticles } from '@/lib/api'
import { formatCurrencyFromCents } from '@/lib/money'
import {
  getAbsoluteShopUrl,
  getArticleIdFromSlug,
  getArticleImageUrl,
  getArticlePath,
  getArticleSeoDescription,
  getArticleSlug,
  getJsonLdScript,
  siteName,
} from '@/lib/seo'
import { getImageUrl } from '@/lib/image-url'

type ArticlePageProps = {
  params: Promise<{
    slug: string
  }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    return {
      title: 'Article introuvable',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const description = getArticleSeoDescription(article)
  const canonicalPath = getArticlePath(article)
  const imageUrl = getArticleImageUrl(article)

  return {
    title: article.nom,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: 'website',
      title: article.nom,
      description,
      url: getAbsoluteShopUrl(canonicalPath),
      images: [
        {
          url: imageUrl,
          alt: article.nom,
        },
      ],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    notFound()
  }

  const canonicalPath = getArticlePath(article)

  if (slug !== getArticleSlug(article)) {
    permanentRedirect(canonicalPath)
  }

  const description = getArticleSeoDescription(article)
  const imageUrl = getArticleImageUrl(article)
  const displayImageUrl = getImageUrl(article.imageUrl) ?? '/logo.svg'
  const articleUrl = getAbsoluteShopUrl(canonicalPath)
  const availability =
    article.stock > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock'
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: article.nom,
    description,
    image: imageUrl,
    sku: String(article.id),
    brand: {
      '@type': 'Brand',
      name: siteName,
    },
    offers: {
      '@type': 'Offer',
      url: articleUrl,
      priceCurrency: 'EUR',
      price: (article.prixCents / 100).toFixed(2),
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'LocalBusiness',
        name: siteName,
      },
    },
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Boutique',
        item: getAbsoluteShopUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: article.nom,
        item: articleUrl,
      },
    ],
  }

  return (
    <main className="min-h-screen bg-[#faf7f8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={getJsonLdScript(productJsonLd)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={getJsonLdScript(breadcrumbJsonLd)}
      />

      <article className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:py-12">
        <div className="relative min-h-80 overflow-hidden rounded-[1.5rem] border border-[#f0dbe6] bg-white shadow-sm">
          <Image
            src={displayImageUrl}
            alt={article.nom}
            fill
            sizes="(max-width: 1024px) 100vw, 520px"
            className={article.imageUrl ? 'object-cover' : 'object-contain p-10'}
            priority
          />
        </div>

        <div>
          <nav aria-label="Fil d'Ariane" className="text-sm font-bold text-[#7a6d73]">
            <Link href="/" className="hover:text-[#b5006e]">
              Boutique
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-[#181014]">{article.nom}</span>
          </nav>

          <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-[#b5006e]">
            Produit Click & Collect
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-[#181014] sm:text-5xl">
            {article.nom}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-[#4a3d43]">
            {description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className="text-3xl font-black text-[#b5006e]">
              {formatCurrencyFromCents(article.prixCents)}
            </p>
            <p className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#4a3d43] shadow-sm">
              {article.stock > 0 ? 'Disponible' : 'Indisponible'}
            </p>
          </div>

          <dl className="mt-6 grid gap-3 rounded-[1.5rem] border border-[#eee2e7] bg-white p-5 text-sm shadow-sm">
            {article.ingredients ? (
              <ArticleDetail label="Ingrédients" value={article.ingredients} />
            ) : null}
            {article.allergenes ? (
              <ArticleDetail label="Allergènes" value={article.allergenes} />
            ) : null}
            <ArticleDetail label="Retrait" value="Commande en Click & Collect uniquement." />
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#produits"
              className="rounded-full bg-[#b5006e] px-6 py-3 text-center text-sm font-black text-white shadow-sm transition hover:bg-[#8c0055]"
            >
              Commander ce produit
            </Link>
            <Link
              href="/click-and-collect"
              className="rounded-full border border-[#e8e1e4] bg-white px-6 py-3 text-center text-sm font-black text-[#5a0037] transition hover:border-[#b5006e]"
            >
              Infos retrait
            </Link>
          </div>
        </div>
      </article>
    </main>
  )
}

async function getArticleBySlug(slug: string) {
  const articleId = getArticleIdFromSlug(slug)

  if (!articleId) return null

  const articles = await getShopArticles()

  return articles.find((article) => article.id === articleId) ?? null
}

function ArticleDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-[#eee2e7] pb-3 last:border-b-0 last:pb-0">
      <dt className="font-black text-[#181014]">{label}</dt>
      <dd className="leading-6 text-[#7a6d73]">{value}</dd>
    </div>
  )
}
