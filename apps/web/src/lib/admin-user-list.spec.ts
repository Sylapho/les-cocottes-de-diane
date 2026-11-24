import assert from 'node:assert/strict'
import test from 'node:test'
import { filterAdminUsers, formatLastLogin } from './admin-user-list'

const users = [
  { name: 'Hélène Durand', email: 'helene@example.com' },
  { name: 'Alex Martin', email: 'alex@example.com' },
]

test('returns every user when the search is empty', () => {
  assert.deepEqual(filterAdminUsers(users, '  '), users)
})

test('matches names without accents or case', () => {
  assert.deepEqual(
    filterAdminUsers(users, 'HELENE').map((user) => user.name),
    ['Hélène Durand'],
  )
})

test('matches email addresses', () => {
  assert.deepEqual(
    filterAdminUsers(users, 'alex@').map((user) => user.name),
    ['Alex Martin'],
  )
})

test('formats a missing last login as never', () => {
  assert.equal(formatLastLogin(null), 'Jamais')
})

test('formats logins from today and yesterday in Paris time', () => {
  const now = new Date('2026-11-24T15:00:00Z')

  assert.equal(
    formatLastLogin('2026-11-24T07:42:00Z', now),
    'Aujourd’hui · 08:42',
  )
  assert.equal(formatLastLogin('2026-11-23T15:18:00Z', now), 'Hier · 16:18')
})

test('formats older logins with their date', () => {
  const now = new Date('2026-11-24T15:00:00Z')

  assert.equal(
    formatLastLogin('2026-11-12T09:05:00Z', now),
    '12 nov. 2026 · 10:05',
  )
})
