import assert from 'node:assert/strict'
import test from 'node:test'
import { betterAuthRoles } from '@/lib/auth-access'

test('reserves Better Auth user creation to administrators', () => {
  assert.equal(
    betterAuthRoles.admin.authorize({ user: ['create'] }).success,
    true,
  )

  for (const role of [
    'gerant',
    'vendeur',
    'production',
    'stock',
    'comptable',
    'read_only',
  ] as const) {
    assert.equal(
      betterAuthRoles[role].authorize({ user: ['create'] }).success,
      false,
    )
  }
})

test('denies every Better Auth user management permission to non-admin roles', () => {
  for (const role of ['gerant', 'read_only'] as const) {
    assert.equal(
      betterAuthRoles[role].authorize({
        user: [
          'create',
          'list',
          'set-role',
          'ban',
          'impersonate',
          'delete',
          'set-password',
          'set-email',
          'get',
          'update',
        ],
      }).success,
      false,
    )
    assert.equal(
      betterAuthRoles[role].authorize({
        session: ['list', 'revoke', 'delete'],
      }).success,
      false,
    )
  }
})
