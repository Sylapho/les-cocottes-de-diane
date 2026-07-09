import type { ShopArticle } from '@/lib/api'
import { getImageUrl } from '@/lib/image-url'

export const productionShopUrl = 'https://lescocottesdediane.fr'
export const defaultShopUrl = 'http://localhost:3001'
export const siteName = 'Les cocottes de Diane'
export const defaultSeoTitle = 'Les cocottes de Diane - Boutique Click & Collect'
export const defaultSeoDescription =
  'Commandez les produits frais de Les cocottes de Diane en Click & Collect et retirez votre commande localement.'

export const publicStaticRoutes = [
  {
    path: '/',
    priority: 1,
    changeFrequency: 'daily',
  },
  {
    path: '/click-and-collect',
    priority: 0.8,
    changeFrequency: 'monthly',
  },
  {
    path: '/mentions-legales',
    priority: 0.3,
    changeFrequency: 'yearly',
    lastModified: '2026-06-04',
  },
  {
    path: '/cgv',
    priority: 0.3,
    changeFrequency: 'yearly',
    lastModified: '2026-06-04',
  },
  {
    path: '/confidentialite',
    priority: 0.3,
    changeFrequency: 'yearly',
    lastModified: '2026-06-04',
  },
  {
    path: '/cookies',
    priority: 0.3,
    changeFrequency: 'yearly',
    lastModified: '2026-06-04',
  },
] as const

export function getShopBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SHOP_URL ??
    process.env.SHOP_PUBLIC_URL ??
    defaultShopUrl

  try {
    return new URL(configuredUrl)
  } catch {
    return new URL(defaultShopUrl)
  }
}

export function getAbsoluteShopUrl(path = '/') {
  return new URL(path, getShopBaseUrl()).toString()
}

export function isProductionShopIndexable() {
  return getShopBaseUrl().origin === productionShopUrl
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getArticleSlug(article: Pick<ShopArticle, 'id' | 'nom'>) {
  const nameSlug = slugify(article.nom)

  return nameSlug ? `${article.id}-${nameSlug}` : String(article.id)
}

export function getArticlePath(article: Pick<ShopArticle, 'id' | 'nom'>) {
  return `/articles/${getArticleSlug(article)}`
}

export function getArticleIdFromSlug(slug: string) {
  const [id] = slug.split('-')
  const articleId = Number(id)

  return Number.isInteger(articleId) && articleId > 0 ? articleId : null
}

export function getArticleSeoDescription(article: ShopArticle) {
  const text =
    article.description ??
    article.ingredients ??
    `${article.nom} disponible en Click & Collect chez ${siteName}.`

  return truncateSeoText(text)
}

export function getArticleImageUrl(article: Pick<ShopArticle, 'imageUrl'>) {
  const imageUrl = getImageUrl(article.imageUrl)

  return imageUrl ? imageUrl : getAbsoluteShopUrl('/logo.svg')
}

export function truncateSeoText(value: string, maxLength = 155) {
  const normalized = value.replace(/\s+/g, ' ').trim()

  if (normalized.length <= maxLength) return normalized

  return `${normalized.slice(0, maxLength - 3).trim()}...`
}

export function getJsonLdScript(jsonLd: unknown) {
  return {
    __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
  }
}
