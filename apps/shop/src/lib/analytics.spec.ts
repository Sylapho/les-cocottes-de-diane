import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_SESSION_STORAGE_KEY,
  ANALYTICS_SESSION_WINDOW_MS,
  ANALYTICS_VISITOR_STORAGE_KEY,
  getAnalyticsContext,
  getCheckoutAnalyticsIdentifiers,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from './analytics'

const visitorId = '46b3a5e8-2e8c-4f43-a01c-1d0d4313b8a1'
const firstSessionId = 'b25f1169-5ac8-44a4-8bb1-87f31f7fab82'
const secondSessionId = 'cebb291c-4048-41ba-bfa6-255c92d060b4'

test('does not create identifiers before analytics consent', () => {
  const storage = createStorage()

  assert.equal(
    getAnalyticsContext(storage, 1_000, () => visitorId),
    null,
  )
  assert.equal(storage.values.size, 0)
})

test('creates one visitor and one session after consent', () => {
  const storage = createStorage()
  const ids = [visitorId, firstSessionId]
  writeAnalyticsConsent(storage, 'granted', 1_000)

  const first = getAnalyticsContext(storage, 1_000, () => ids.shift()!)
  const second = getAnalyticsContext(storage, 2_000, () => secondSessionId)

  assert.deepEqual(first, {
    visitorId,
    sessionId: firstSessionId,
    shouldTrack: true,
  })
  assert.deepEqual(second, {
    visitorId,
    sessionId: firstSessionId,
    shouldTrack: false,
  })
})

test('starts a new session after 30 minutes of inactivity', () => {
  const storage = createStorage()
  const ids = [visitorId, firstSessionId, secondSessionId]
  writeAnalyticsConsent(storage, 'granted', 1_000)
  getAnalyticsContext(storage, 1_000, () => ids.shift()!)

  const active = getAnalyticsContext(
    storage,
    1_000 + ANALYTICS_SESSION_WINDOW_MS - 1,
    () => ids.shift()!,
  )
  const expired = getAnalyticsContext(
    storage,
    1_000 + ANALYTICS_SESSION_WINDOW_MS * 2,
    () => ids.shift()!,
  )

  assert.equal(active?.sessionId, firstSessionId)
  assert.equal(expired?.sessionId, secondSessionId)
  assert.equal(expired?.visitorId, visitorId)
  assert.equal(expired?.shouldTrack, true)
})

test('refusing consent deletes analytics identifiers', () => {
  const storage = createStorage()
  storage.setItem(ANALYTICS_VISITOR_STORAGE_KEY, '{}')
  storage.setItem(ANALYTICS_SESSION_STORAGE_KEY, '{}')

  writeAnalyticsConsent(storage, 'denied', 1_000)

  assert.equal(readAnalyticsConsent(storage, 1_001), 'denied')
  assert.equal(storage.getItem(ANALYTICS_VISITOR_STORAGE_KEY), null)
  assert.equal(storage.getItem(ANALYTICS_SESSION_STORAGE_KEY), null)
  assert.notEqual(storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY), null)
})

test('unavailable browser storage never blocks checkout', () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      get localStorage() {
        throw new Error('Storage unavailable')
      },
    },
  })

  try {
    assert.equal(getCheckoutAnalyticsIdentifiers(), null)
  } finally {
    Reflect.deleteProperty(globalThis, 'window')
  }
})

function createStorage() {
  const values = new Map<string, string>()

  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}
