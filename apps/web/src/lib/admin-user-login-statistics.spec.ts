import assert from 'node:assert/strict'
import test from 'node:test'
import { serializeAdminUserLoginStatistics } from '@/lib/admin-user-login-statistics'

test('serializes only the approved user and login statistic fields', () => {
  const databaseRecord = {
    id: 'user-1',
    name: 'Admin',
    email: 'admin@example.test',
    role: 'admin',
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    loginCount: 12,
    lastLoginAt: new Date('2026-07-20T12:35:00.000Z'),
    password: 'must-not-leak',
    token: 'must-not-leak',
    ipAddress: '127.0.0.1',
    userAgent: 'test',
  }
  const serialized = serializeAdminUserLoginStatistics(databaseRecord)

  assert.deepEqual(Object.keys(serialized), [
    'id',
    'name',
    'email',
    'role',
    'createdAt',
    'loginCount',
    'lastLoginAt',
  ])
  assert.equal('password' in serialized, false)
  assert.equal('token' in serialized, false)
  assert.equal('ipAddress' in serialized, false)
  assert.equal('userAgent' in serialized, false)
})
