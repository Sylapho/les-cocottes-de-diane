import type { ShopArticle } from '@/lib/api'
import { formatCurrencyFromCents } from '@/lib/money'

export type Cart = Record<number, number>

export const CART_STORAGE_KEY = 'localco-shop-cart'

export function formatCurrency(value: number) {
  return formatCurrencyFromCents(value)
}

export const MAX_CART_QUANTITY = 99

export function parseStoredCart(raw: string | null): Cart {
  if (!raw) return {}

  try {
    const parsed: unknown = JSON.parse(raw)

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Cart)
      : {}
  } catch {
    return {}
  }
}

export function readStoredCart(): Cart {
  if (typeof window === 'undefined') return {}

  try {
    return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY))
  } catch {
    return {}
  }
}

export function changeCartQuantity(
  cart: Cart,
  articleId: number,
  delta: number,
  max = MAX_CART_QUANTITY,
): Cart {
  const nextQuantity = Math.max(0, Math.min(max, (cart[articleId] ?? 0) + delta))
  const next = { ...cart }

  if (nextQuantity === 0) {
    delete next[articleId]
  } else {
    next[articleId] = nextQuantity
  }

  return next
}

export function removeCartItem(cart: Cart, articleId: number): Cart {
  const next = { ...cart }
  delete next[articleId]
  return next
}

export function writeStoredCart(cart: Cart) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
}

export function clearStoredCart() {
  if (typeof window === 'undefined') return

  window.localStorage.removeItem(CART_STORAGE_KEY)
}

export function buildCartLines(cart: Cart, articles: ShopArticle[]) {
  const articlesById = new Map(articles.map((article) => [article.id, article]))

  return Object.entries(cart)
    .map(([articleId, quantite]) => {
      const article = articlesById.get(Number(articleId))

      if (!article) return null

      return {
        article,
        quantite,
        totalCents: article.prixCents * quantite,
      }
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line))
}

export function getCartCount(cart: Cart) {
  return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)
}

export function getCartTotal(cart: Cart, articles: ShopArticle[]) {
  return buildCartLines(cart, articles).reduce((sum, line) => {
    return sum + line.totalCents
  }, 0)
}
