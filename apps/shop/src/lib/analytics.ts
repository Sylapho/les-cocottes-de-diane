export const ANALYTICS_CONSENT_STORAGE_KEY = 'lcd:analytics-consent:v1'
export const ANALYTICS_VISITOR_STORAGE_KEY = 'lcd:analytics-visitor:v1'
export const ANALYTICS_SESSION_STORAGE_KEY = 'lcd:analytics-session:v1'
export const ANALYTICS_CONSENT_EVENT = 'lcd:analytics-consent-open'

export const ANALYTICS_SESSION_WINDOW_MS = 30 * 60 * 1_000
export const ANALYTICS_ACTIVITY_PING_MS = 5 * 60 * 1_000
export const ANALYTICS_VISITOR_RETENTION_MS = 395 * 24 * 60 * 60 * 1_000
export const ANALYTICS_CONSENT_RETENTION_MS = 6 * 30 * 24 * 60 * 60 * 1_000

export type AnalyticsConsent = 'granted' | 'denied'

export type AnalyticsContext = {
  visitorId: string
  sessionId: string
  shouldTrack: boolean
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type TimedChoice = {
  value: AnalyticsConsent
  savedAt: number
}

type StoredVisitor = {
  id: string
  createdAt: number
}

type StoredSession = {
  id: string
  lastActivityAt: number
  lastTrackedAt: number | null
}

export function readAnalyticsConsent(
  storage: StorageLike,
  now = Date.now(),
): AnalyticsConsent | null {
  const choice = readJson<TimedChoice>(
    storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY),
  )

  if (
    !choice ||
    (choice.value !== 'granted' && choice.value !== 'denied') ||
    !Number.isFinite(choice.savedAt) ||
    now - choice.savedAt >= ANALYTICS_CONSENT_RETENTION_MS
  ) {
    storage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY)
    return null
  }

  return choice.value
}

export function writeAnalyticsConsent(
  storage: StorageLike,
  value: AnalyticsConsent,
  now = Date.now(),
) {
  storage.setItem(
    ANALYTICS_CONSENT_STORAGE_KEY,
    JSON.stringify({ value, savedAt: now } satisfies TimedChoice),
  )

  if (value === 'denied') {
    clearAnalyticsIdentifiers(storage)
  }
}

export function clearAnalyticsIdentifiers(storage: StorageLike) {
  storage.removeItem(ANALYTICS_VISITOR_STORAGE_KEY)
  storage.removeItem(ANALYTICS_SESSION_STORAGE_KEY)
}

export function getAnalyticsContext(
  storage: StorageLike,
  now = Date.now(),
  createUuid = () => crypto.randomUUID(),
): AnalyticsContext | null {
  if (readAnalyticsConsent(storage, now) !== 'granted') {
    return null
  }

  let visitor = readJson<StoredVisitor>(
    storage.getItem(ANALYTICS_VISITOR_STORAGE_KEY),
  )

  if (
    !visitor ||
    !isUuid(visitor.id) ||
    !Number.isFinite(visitor.createdAt) ||
    now - visitor.createdAt >= ANALYTICS_VISITOR_RETENTION_MS
  ) {
    visitor = { id: createUuid(), createdAt: now }
    storage.setItem(ANALYTICS_VISITOR_STORAGE_KEY, JSON.stringify(visitor))
    storage.removeItem(ANALYTICS_SESSION_STORAGE_KEY)
  }

  const storedSession = readJson<StoredSession>(
    storage.getItem(ANALYTICS_SESSION_STORAGE_KEY),
  )
  const sessionExpired =
    !storedSession ||
    !isUuid(storedSession.id) ||
    !Number.isFinite(storedSession.lastActivityAt) ||
    now - storedSession.lastActivityAt >= ANALYTICS_SESSION_WINDOW_MS
  let session: StoredSession

  if (sessionExpired) {
    session = {
      id: createUuid(),
      lastActivityAt: now,
      lastTrackedAt: null,
    }
  } else {
    session = storedSession
  }

  const shouldTrack =
    session.lastTrackedAt === null ||
    !Number.isFinite(session.lastTrackedAt) ||
    now - session.lastTrackedAt >= ANALYTICS_ACTIVITY_PING_MS

  storage.setItem(
    ANALYTICS_SESSION_STORAGE_KEY,
    JSON.stringify({
      ...session,
      lastActivityAt: now,
      lastTrackedAt: shouldTrack ? now : session.lastTrackedAt,
    } satisfies StoredSession),
  )

  return {
    visitorId: visitor.id,
    sessionId: session.id,
    shouldTrack,
  }
}

export function getCheckoutAnalyticsIdentifiers() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const context = getAnalyticsContext(window.localStorage)

    return context
      ? { visitorId: context.visitorId, sessionId: context.sessionId }
      : null
  } catch {
    return null
  }
}

export function isObviousAutomatedBrowser(navigatorLike: {
  userAgent: string
  webdriver?: boolean
}) {
  return (
    navigatorLike.webdriver === true ||
    /bot|crawler|spider|headless|lighthouse|pagespeed/i.test(
      navigatorLike.userAgent,
    )
  )
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
}

function readJson<T>(value: string | null): T | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}
