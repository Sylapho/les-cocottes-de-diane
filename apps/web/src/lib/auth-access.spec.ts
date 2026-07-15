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
  ] as const) {
    assert.equal(
      betterAuthRoles[role].authorize({ user: ['create'] }).success,
      false,
    )
  }
})

test('denies every Better Auth user management permission to gerant', () => {
  assert.equal(
    betterAuthRoles.gerant.authorize({
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
    betterAuthRoles.gerant.authorize({ session: ['list', 'revoke', 'delete'] })
      .success,
    false,
  )
})
