import { CART_STORAGE_KEY, parseStoredCart, writeStoredCart, type Cart } from '@/lib/cart'

// Browser-only cart store backed by localStorage, read through
// useSyncExternalStore so every component (header, drawer, catalogue) shares
// the same cart and stays in sync across tabs.

const EMPTY_CART: Cart = {}
const listeners = new Set<() => void>()

let cachedRaw: string | null | undefined
let cachedCart: Cart = EMPTY_CART

function readRaw() {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY)
  } catch {
    return null
  }
}

function notify() {
  for (const listener of listeners) listener()
}

function handleStorage(event: StorageEvent) {
  if (event.key === null || event.key === CART_STORAGE_KEY) notify()
}

export function subscribeToCart(listener: () => void) {
  listeners.add(listener)

  if (listeners.size === 1) {
    window.addEventListener('storage', handleStorage)
  }

  return () => {
    listeners.delete(listener)

    if (listeners.size === 0) {
      window.removeEventListener('storage', handleStorage)
    }
  }
}

export function getCartSnapshot(): Cart {
  const raw = readRaw()

  // Return a stable reference while the stored value is unchanged.
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedCart = parseStoredCart(raw)
  }

  return cachedCart
}

export function getServerCartSnapshot(): Cart {
  return EMPTY_CART
}

export function updateCart(updater: (cart: Cart) => Cart) {
  writeStoredCart(updater(getCartSnapshot()))
  notify()
}
