import assert from 'node:assert/strict'
import test from 'node:test'
import type { ShopArticle } from './api'
import {
  buildCartLines,
  CART_STORAGE_KEY,
  clearStoredCart,
  formatCurrency,
  getCartCount,
  getCartTotal,
  readStoredCart,
  writeStoredCart,
} from './cart'

const articles: ShopArticle[] = [
  {
    id: 1,
    nom: 'Terrine de volaille',
    prixCents: 625,
    tvaBps: 550,
    stock: 10,
    online: true,
  },
  {
    id: 2,
    nom: 'Saucisse de poulet',
    prixCents: 450,
    tvaBps: 550,
    stock: 5,
    online: true,
  },
]

test('builds cart lines and ignores unavailable articles', () => {
  assert.deepEqual(buildCartLines({ 1: 2, 3: 4 }, articles), [
    {
      article: articles[0],
      quantite: 2,
      totalCents: 1250,
    },
  ])
})

test('computes item count, total and display value', () => {
  const cart = { 1: 2, 2: 1 }

  assert.equal(getCartCount(cart), 3)
  assert.equal(getCartTotal(cart, articles), 1700)
  assert.match(formatCurrency(1700), /17,00\s€/)
})

test('returns an empty cart during server rendering', () => {
  assert.deepEqual(readStoredCart(), {})
  assert.doesNotThrow(() => writeStoredCart({ 1: 1 }))
  assert.doesNotThrow(() => clearStoredCart())
})

test('reads, writes and clears browser cart storage safely', () => {
  const values = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  })

  try {
    writeStoredCart({ 1: 2 })
    assert.equal(values.get(CART_STORAGE_KEY), '{"1":2}')
    assert.deepEqual(readStoredCart(), { 1: 2 })

    values.set(CART_STORAGE_KEY, '{invalid json')
    assert.deepEqual(readStoredCart(), {})

    clearStoredCart()
    assert.equal(values.has(CART_STORAGE_KEY), false)
  } finally {
    Reflect.deleteProperty(globalThis, 'window')
  }
})
