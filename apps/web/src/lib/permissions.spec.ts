import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canAccessAdmin,
  canCreateSales,
  canManageArticleProduction,
  canManageArticles,
  canManageCashRegister,
  canManageOrders,
  canManageStock,
  canViewArticles,
  canViewCashRegister,
  canViewOrders,
  canViewStock,
  getUserRole,
} from '@/lib/permissions'
import type { Role } from '@/lib/roles'

function user(role: Role) {
  return { role }
}

test('normalizes missing or unknown roles to vendeur', () => {
  assert.equal(getUserRole(null), 'vendeur')
  assert.equal(getUserRole({ role: 'unknown' }), 'vendeur')
  assert.equal(getUserRole(user('stock')), 'stock')
})

test('matches admin-only permissions to gerant', () => {
  assert.equal(canAccessAdmin(user('gerant')), true)
  assert.equal(canManageArticles(user('gerant')), true)

  for (const role of ['vendeur', 'production', 'stock', 'comptable'] as const) {
    assert.equal(canAccessAdmin(user(role)), false)
    assert.equal(canManageArticles(user(role)), false)
  }
})

test('matches sales and cash register permissions', () => {
  assert.equal(canCreateSales(user('vendeur')), true)
  assert.equal(canCreateSales(user('comptable')), false)
  assert.equal(canViewCashRegister(user('comptable')), true)
  assert.equal(canManageCashRegister(user('comptable')), true)
  assert.equal(canManageCashRegister(user('vendeur')), false)
})

test('matches operations permissions', () => {
  assert.equal(canViewOrders(user('production')), true)
  assert.equal(canManageOrders(user('production')), true)
  assert.equal(canViewOrders(user('stock')), false)
  assert.equal(canViewArticles(user('stock')), true)
  assert.equal(canViewStock(user('stock')), true)
  assert.equal(canManageStock(user('stock')), true)
  assert.equal(canManageArticleProduction(user('production')), true)
  assert.equal(canManageArticleProduction(user('stock')), false)
})
