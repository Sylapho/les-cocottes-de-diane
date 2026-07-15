import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canAccessAdmin,
  canAccessBackOffice,
  canCreateUsers,
  canCreateSales,
  canManageArticleProduction,
  canManageArticles,
  canManageCashRegister,
  canManageOrders,
  canManageStock,
  canManageUsers,
  canRefundOrders,
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

test('rejects missing or unknown roles by default', () => {
  assert.equal(getUserRole(null), null)
  assert.equal(getUserRole({ role: 'unknown' }), null)
  assert.equal(getUserRole(user('stock')), 'stock')
})

test('grants every existing permission to admin', () => {
  const administrator = user('admin')

  for (const permission of [
    canAccessAdmin,
    canAccessBackOffice,
    canCreateUsers,
    canManageArticles,
    canRefundOrders,
    canCreateSales,
    canViewCashRegister,
    canManageCashRegister,
    canViewOrders,
    canManageOrders,
    canViewArticles,
    canViewStock,
    canManageStock,
    canManageUsers,
    canManageArticleProduction,
  ]) {
    assert.equal(permission(administrator), true)
  }
})

test('reserves all user management to admin', () => {
  assert.equal(canAccessAdmin(user('gerant')), true)
  assert.equal(canManageUsers(user('admin')), true)
  assert.equal(canManageUsers(user('gerant')), false)
  assert.equal(canCreateUsers(user('admin')), true)
  assert.equal(canCreateUsers(user('gerant')), false)
  assert.equal(canManageArticles(user('gerant')), true)
  assert.equal(canRefundOrders(user('gerant')), true)

  for (const role of ['vendeur', 'production', 'stock', 'comptable'] as const) {
    assert.equal(canAccessAdmin(user(role)), false)
    assert.equal(canManageUsers(user(role)), false)
    assert.equal(canCreateUsers(user(role)), false)
    assert.equal(canManageArticles(user(role)), false)
    assert.equal(canRefundOrders(user(role)), false)
  }
})

test('grants no permission to missing or unknown roles', () => {
  for (const invalidUser of [null, { role: 'unknown' }]) {
    assert.equal(canAccessAdmin(invalidUser), false)
    assert.equal(canManageUsers(invalidUser), false)
    assert.equal(canAccessBackOffice(invalidUser), false)
    assert.equal(canCreateUsers(invalidUser), false)
    assert.equal(canManageOrders(invalidUser), false)
    assert.equal(canViewArticles(invalidUser), false)
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
