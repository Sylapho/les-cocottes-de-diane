'use client'

import type { ShopArticle } from '@/lib/api'
import {
  changeCartQuantity,
  getCartCount,
  removeCartItem,
  type Cart,
} from '@/lib/cart'
import {
  getCartSnapshot,
  getServerCartSnapshot,
  subscribeToCart,
  updateCart,
} from '@/lib/cart-store'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import CartDrawer from './cart-drawer'

export type ArticlesState =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'ready'; articles: ShopArticle[] }

type CartContextValue = {
  cart: Cart
  count: number
  changeQuantity: (articleId: number, delta: number) => void
  removeItem: (articleId: number) => void
  openCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const value = useContext(CartContext)

  if (!value) {
    throw new Error('useCart must be used inside <CartProvider>')
  }

  return value
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const cart = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot,
  )
  const [open, setOpen] = useState(false)
  const [articlesState, setArticlesState] = useState<ArticlesState>({
    status: 'idle',
  })

  const loadArticles = useCallback(async () => {
    setArticlesState({ status: 'loading' })

    try {
      // Same-origin call through the shop's /api proxy.
      const response = await fetch('/api/boutique/articles', {
        cache: 'no-store',
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      setArticlesState({
        status: 'ready',
        articles: (await response.json()) as ShopArticle[],
      })
    } catch {
      setArticlesState({ status: 'error' })
    }
  }, [])

  const openCart = useCallback(() => {
    setOpen(true)

    // Fetch fresh prices each time the drawer opens.
    void loadArticles()
  }, [loadArticles])

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: getCartCount(cart),
      changeQuantity: (articleId, delta) =>
        updateCart((current) => changeCartQuantity(current, articleId, delta)),
      removeItem: (articleId) =>
        updateCart((current) => removeCartItem(current, articleId)),
      openCart,
    }),
    [cart, openCart],
  )

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer
        open={open}
        onClose={() => setOpen(false)}
        articlesState={articlesState}
        onRetry={loadArticles}
      />
    </CartContext.Provider>
  )
}
