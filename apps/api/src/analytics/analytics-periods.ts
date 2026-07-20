export const ANALYTICS_TIMEZONE = 'Europe/Paris'

export type AnalyticsPeriodKey = 'daily' | 'weekly' | 'monthly'

export type AnalyticsPeriod = {
  from: Date
  to: Date
}

type CalendarDate = {
  year: number
  month: number
  day: number
}

const calendarFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ANALYTICS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ANALYTICS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export function getAnalyticsPeriods(
  now = new Date(),
): Record<AnalyticsPeriodKey, AnalyticsPeriod> {
  const today = getCalendarDate(now)

  return {
    daily: { from: startOfZonedDay(today), to: now },
    weekly: { from: startOfZonedDay(addDays(today, -6)), to: now },
    monthly: { from: startOfZonedDay(addDays(today, -29)), to: now },
  }
}

function getCalendarDate(date: Date): CalendarDate {
  const parts = calendarFormatter.formatToParts(date)

  return {
    year: getPart(parts, 'year'),
    month: getPart(parts, 'month'),
    day: getPart(parts, 'day'),
  }
}

function addDays(date: CalendarDate, amount: number): CalendarDate {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1, date.day + amount),
  )

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

function startOfZonedDay(date: CalendarDate) {
  const wallClockUtc = Date.UTC(date.year, date.month - 1, date.day)
  let candidate = new Date(wallClockUtc)

  for (let index = 0; index < 2; index += 1) {
    candidate = new Date(wallClockUtc - getOffsetMilliseconds(candidate))
  }

  return candidate
}

function getOffsetMilliseconds(date: Date) {
  const parts = offsetFormatter.formatToParts(date)
  const asUtc = Date.UTC(
    getPart(parts, 'year'),
    getPart(parts, 'month') - 1,
    getPart(parts, 'day'),
    getPart(parts, 'hour'),
    getPart(parts, 'minute'),
    getPart(parts, 'second'),
  )

  return asUtc - date.getTime()
}

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value = parts.find((part) => part.type === type)?.value

  if (!value) {
    throw new Error(`Missing ${type} while computing analytics period`)
  }

  return Number(value)
}
