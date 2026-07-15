import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canAssignUserRole,
  canDeleteAdminUser,
  getUserCreationAuthorization,
} from '@/lib/admin-user-permissions'

test('allows only administrators to create users', () => {
  assert.deepEqual(getUserCreationAuthorization({ role: 'admin' }), {
    allowed: true,
  })
  assert.deepEqual(getUserCreationAuthorization({ role: 'gerant' }), {
    allowed: false,
    status: 403,
  })
  assert.deepEqual(getUserCreationAuthorization({ role: 'vendeur' }), {
    allowed: false,
    status: 403,
  })
  assert.deepEqual(getUserCreationAuthorization({ role: 'unknown' }), {
    allowed: false,
    status: 403,
  })
  assert.deepEqual(getUserCreationAuthorization(null), {
    allowed: false,
    status: 401,
  })
})

test('prevents gerant from assigning every role', () => {
  assert.equal(canAssignUserRole({ role: 'admin' }, 'admin'), true)
  assert.equal(canAssignUserRole({ role: 'admin' }, 'vendeur'), true)
  assert.equal(canAssignUserRole({ role: 'gerant' }, 'vendeur'), false)
  assert.equal(canAssignUserRole({ role: 'gerant' }, 'admin'), false)
  assert.equal(canAssignUserRole({ role: 'unknown' }, 'vendeur'), false)
})

test('allows deleting another admin user', () => {
  assert.equal(canDeleteAdminUser('user-2', 'user-1'), true)
})

test('prevents deleting the current admin user', () => {
  assert.equal(canDeleteAdminUser('user-1', 'user-1'), false)
})

test('prevents deleting an empty user id', () => {
  assert.equal(canDeleteAdminUser('', 'user-1'), false)
})
