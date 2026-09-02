export type PickupPoint = {
  label: string
  schedule: string
  allowedWeekdays: number[]
  alternatingWeekAnchorDate?: string
  value: string
}

export const ORDER_TIMEZONE = 'Europe/Paris'
export const NEXT_DAY_ORDER_CUTOFF_HOUR = 14

const MS_PER_DAY = 24 * 60 * 60 * 1000
const AMAP_ALTERNATION_DAYS = 14

type CalendarDate = {
  year: number
  month: number
  day: number
}

const parisDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ORDER_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const weekdayLabels = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
]

function formatInputDate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseInputDate(value: string) {
  const datePart = value.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null
}

function getUtcDayNumber(date: Date) {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      MS_PER_DAY,
  )
}

function isPickupDateAllowed(point: PickupPoint, date: Date) {
  if (!point.allowedWeekdays.includes(date.getUTCDay())) {
    return false
  }

  if (!point.alternatingWeekAnchorDate) {
    return true
  }

  const anchorDate = parseInputDate(point.alternatingWeekAnchorDate)

  if (!anchorDate) {
    return false
  }

  return (
    (getUtcDayNumber(date) - getUtcDayNumber(anchorDate)) %
      AMAP_ALTERNATION_DAYS ===
    0
  )
}

export function formatPickupPoint(point: PickupPoint) {
  return point.value
}

export function findPickupPoint(
  pickupPoints: readonly PickupPoint[],
  value: string,
) {
  return pickupPoints.find((point) => point.value === value)
}

export function getAllowedPickupWeekdays(point?: PickupPoint) {
  if (!point) {
    return ''
  }

  return point.allowedWeekdays
    .map((weekday) => weekdayLabels[weekday])
    .join(', ')
}

export function getEarliestOrderDate(now = new Date()) {
  const today = getParisCalendarDate(now)
  const minimumLeadDays = isNextDayOrderingAllowed(now) ? 1 : 2

  return formatCalendarDate(addCalendarDays(today, minimumLeadDays))
}

export function isNextDayOrderingAllowed(now = new Date()) {
  return getParisDateTime(now).hour < NEXT_DAY_ORDER_CUTOFF_HOUR
}

export function isOrderDateAllowed(value: string, now = new Date()) {
  const requestedDate = parseInputDate(value)
  const earliestDate = parseInputDate(getEarliestOrderDate(now))

  return Boolean(
    requestedDate &&
    earliestDate &&
    getUtcDayNumber(requestedDate) >= getUtcDayNumber(earliestDate),
  )
}

export function getNextPickupDates(
  point: PickupPoint,
  count = 8,
  now = new Date(),
) {
  const dates: string[] = []
  const cursor = parseInputDate(getEarliestOrderDate(now))

  if (!cursor) {
    return dates
  }

  while (dates.length < count) {
    if (isPickupDateAllowed(point, cursor)) {
      dates.push(formatInputDate(cursor))
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

export function formatPickupDateLabel(value: string) {
  const date = parseInputDate(value)

  if (!date) {
    return value
  }

  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getParisCalendarDate(now: Date): CalendarDate {
  const { year, month, day } = getParisDateTime(now)

  return { year, month, day }
}

function getParisDateTime(now: Date) {
  const values = Object.fromEntries(
    parisDateTimeFormatter
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day + days))

  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  }
}

function formatCalendarDate(date: CalendarDate) {
  return [
    String(date.year).padStart(4, '0'),
    String(date.month).padStart(2, '0'),
    String(date.day).padStart(2, '0'),
  ].join('-')
}
