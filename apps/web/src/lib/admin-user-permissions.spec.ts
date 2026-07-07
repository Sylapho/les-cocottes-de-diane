import assert from 'node:assert/strict'
import test from 'node:test'
import { canDeleteAdminUser } from '@/lib/admin-user-permissions'

test('allows deleting another admin user', () => {
  assert.equal(canDeleteAdminUser('user-2', 'user-1'), true)
})

test('prevents deleting the current admin user', () => {
  assert.equal(canDeleteAdminUser('user-1', 'user-1'), false)
})

test('prevents deleting an empty user id', () => {
  assert.equal(canDeleteAdminUser('', 'user-1'), false)
})
