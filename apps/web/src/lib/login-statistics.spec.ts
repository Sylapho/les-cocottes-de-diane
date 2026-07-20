import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isLoginAuthenticationPath,
  trackSuccessfulLogin,
  UPDATE_LOGIN_STATISTICS_SQL,
} from '@/lib/login-statistics'

class InMemoryLoginStatisticsDatabase {
  loginCount = 0
  lastLoginAt: Date | null = null
  queryCount = 0

  async query(_text: string, values: unknown[]) {
    this.queryCount += 1
    this.loginCount += 1
    this.lastLoginAt = values[1] as Date

    return { rowCount: 1 }
  }
}

test('increments the counter and records the successful email login date', async () => {
  const database = new InMemoryLoginStatisticsDatabase()
  const firstLoginAt = new Date('2026-07-20T12:35:00.000Z')

  const tracked = await trackSuccessfulLogin({
    database,
    session: { userId: 'user-1' },
    context: { path: '/sign-in/email' },
    now: () => firstLoginAt,
  })

  assert.equal(tracked, true)
  assert.equal(database.loginCount, 1)
  assert.equal(database.lastLoginAt, firstLoginAt)
})

test('increments again and replaces the last login date', async () => {
  const database = new InMemoryLoginStatisticsDatabase()
  const firstLoginAt = new Date('2026-07-20T12:35:00.000Z')
  const secondLoginAt = new Date('2026-07-20T13:35:00.000Z')

  await trackSuccessfulLogin({
    database,
    session: { userId: 'user-1' },
    context: { path: '/sign-in/email' },
    now: () => firstLoginAt,
  })
  await trackSuccessfulLogin({
    database,
    session: { userId: 'user-1' },
    context: { path: '/sign-in/email' },
    now: () => secondLoginAt,
  })

  assert.equal(database.loginCount, 2)
  assert.equal(database.lastLoginAt, secondLoginAt)
  assert.ok(secondLoginAt > firstLoginAt)
})

test('does not track failed authentication or session reads', async () => {
  const database = new InMemoryLoginStatisticsDatabase()

  const failedAuthentication = await trackSuccessfulLogin({
    database,
    session: null,
    context: { path: '/sign-in/email' },
  })
  const sessionRead = await trackSuccessfulLogin({
    database,
    session: { userId: 'user-1' },
    context: { path: '/get-session' },
  })

  assert.equal(failedAuthentication, false)
  assert.equal(sessionRead, false)
  assert.equal(database.queryCount, 0)
  assert.equal(database.loginCount, 0)
  assert.equal(database.lastLoginAt, null)
})

test('uses one atomic increment for concurrent successful logins', async () => {
  const database = new InMemoryLoginStatisticsDatabase()

  await Promise.all([
    trackSuccessfulLogin({
      database,
      session: { userId: 'user-1' },
      context: { path: '/sign-in/email' },
    }),
    trackSuccessfulLogin({
      database,
      session: { userId: 'user-1' },
      context: { path: '/sign-in/email' },
    }),
  ])

  assert.equal(database.loginCount, 2)
  assert.equal(database.queryCount, 2)
  assert.match(
    UPDATE_LOGIN_STATISTICS_SQL,
    /"loginCount"\s*=\s*"loginCount"\s*\+\s*1/,
  )
  assert.doesNotMatch(UPDATE_LOGIN_STATISTICS_SQL, /SELECT/i)
})

test('tracks OAuth callbacks but excludes account creation and impersonation', () => {
  for (const path of [
    '/sign-in/social',
    '/callback/google',
    '/callback/github',
    '/oauth2/callback/custom',
  ]) {
    assert.equal(isLoginAuthenticationPath(path), true)
  }

  for (const path of [
    '/sign-up/email',
    '/admin/create-user',
    '/admin/impersonate-user',
    '/get-session',
  ]) {
    assert.equal(isLoginAuthenticationPath(path), false)
  }
})
