import { BadRequestException } from '@nestjs/common'

export const ORDER_TIMEZONE = 'Europe/Paris'
export const NEXT_DAY_ORDER_CUTOFF_HOUR = 14
export const NEXT_DAY_ORDER_CUTOFF_MESSAGE =
  'Les commandes pour le lendemain doivent être passées avant 14 h. Veuillez choisir une autre date.'

const AUTHEUIL_AUTHOUILLET_AMAP_ANCHOR_DATE = '2026-06-18'
const HOULBEC_COCHEREL_AMAP_ANCHOR_DATE = '2026-06-25'
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

export type PickupPoint = {
  id?: number
  label: string
  address?: string | null
  schedule: string
  allowedWeekdays: readonly number[]
  alternatingWeekAnchorDate?: string | null
  active?: boolean
}

export type PublicPickupPoint = PickupPoint & {
  value: string
}

export const pickupPoints: readonly PickupPoint[] = [
  {
    label: 'Marché de Gaillon',
    address: 'Marché de Gaillon',
    schedule: 'Mardi matin, 8h-12h',
    allowedWeekdays: [2],
  },
  {
    label: 'Marché du Neubourg',
    address: 'Marché du Neubourg',
    schedule: 'Mercredi matin, 8h-12h',
    allowedWeekdays: [3],
  },
  {
    label: 'Marché de Conches',
    address: 'Marché de Conches',
    schedule: 'Jeudi matin, 8h-12h',
    allowedWeekdays: [4],
  },
  {
    label: 'À la ferme',
    address: 'À la ferme',
    schedule: 'Vendredi après-midi, 16h-18h',
    allowedWeekdays: [5],
  },
  {
    label: 'À la ferme',
    address: 'À la ferme',
    schedule: 'Samedi matin, 8h-12h',
    allowedWeekdays: [6],
  },
  {
    label: "AMAP d'Houlbec-Cocherel",
    address: "AMAP d'Houlbec-Cocherel",
    schedule: 'Jeudi, tous les 15 jours',
    allowedWeekdays: [4],
    alternatingWeekAnchorDate: HOULBEC_COCHEREL_AMAP_ANCHOR_DATE,
  },
  {
    label: 'AMAP Autheuil-Authouillet',
    address: 'AMAP Autheuil-Authouillet',
    schedule: 'Jeudi, tous les 15 jours',
    allowedWeekdays: [4],
    alternatingWeekAnchorDate: AUTHEUIL_AUTHOUILLET_AMAP_ANCHOR_DATE,
  },
] as const

export function formatPickupPoint(point: PickupPoint) {
  return `${point.label} - ${point.schedule}`
}

export function getPublicPickupPoints(
  points: readonly PickupPoint[] = pickupPoints,
) {
  return points.map((point) => ({
    ...point,
    value: formatPickupPoint(point),
  }))
}

export function findPickupPoint(
  value: string,
  points: readonly PickupPoint[] = pickupPoints,
) {
  return points.find((point) => formatPickupPoint(point) === value)
}

export function validatePickupSlot(
  lieu: string,
  dateRetrait: string | undefined,
  points: readonly PickupPoint[] = pickupPoints,
  now = new Date(),
) {
  const pickupPoint = findPickupPoint(lieu, points)

  if (!pickupPoint || pickupPoint.active === false) {
    throw new BadRequestException('Lieu de retrait invalide')
  }

  if (!dateRetrait) {
    throw new BadRequestException('Date de retrait obligatoire')
  }

  const pickupDate = parsePickupCalendarDate(dateRetrait)

  if (!pickupDate) {
    throw new BadRequestException('Date de retrait invalide')
  }

  const today = getParisCalendarDate(now)
  const pickupDayNumber = getCalendarDayNumber(pickupDate)
  const todayDayNumber = getCalendarDayNumber(today)

  if (pickupDayNumber < todayDayNumber) {
    throw new BadRequestException('La date de retrait ne peut pas être passée')
  }

  if (pickupDayNumber === todayDayNumber) {
    throw new BadRequestException(
      'Les retraits le jour même ne sont pas disponibles',
    )
  }

  if (!isOrderDateAllowed(dateRetrait, now)) {
    throw new BadRequestException(NEXT_DAY_ORDER_CUTOFF_MESSAGE)
  }

  if (!isPickupCalendarDateAllowed(pickupPoint, pickupDate)) {
    throw new BadRequestException(
      'La date de retrait ne correspond pas au lieu choisi',
    )
  }
}

export function getEarliestOrderDate(now = new Date()) {
  const today = getParisCalendarDate(now)
  const minimumLeadDays = isNextDayOrderingAllowed(now) ? 1 : 2

  return formatCalendarDate(addCalendarDays(today, minimumLeadDays))
}

export function isNextDayOrderingAllowed(now = new Date()) {
  return getParisDateTime(now).hour < NEXT_DAY_ORDER_CUTOFF_HOUR
}

export function isOrderDateAllowed(dateRetrait: string, now = new Date()) {
  const pickupDate = parsePickupCalendarDate(dateRetrait)
  const earliestDate = parsePickupCalendarDate(getEarliestOrderDate(now))

  return Boolean(
    pickupDate &&
    earliestDate &&
    getCalendarDayNumber(pickupDate) >= getCalendarDayNumber(earliestDate),
  )
}

export function toStoredPickupDate(value: string) {
  const date = parsePickupCalendarDate(value)

  return date
    ? new Date(Date.UTC(date.year, date.month - 1, date.day))
    : undefined
}

export function isPickupDateAllowed(point: PickupPoint, date: Date) {
  return isPickupCalendarDateAllowed(point, {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  })
}

function isPickupCalendarDateAllowed(point: PickupPoint, date: CalendarDate) {
  const weekday = new Date(
    Date.UTC(date.year, date.month - 1, date.day),
  ).getUTCDay()

  if (!point.allowedWeekdays.includes(weekday)) {
    return false
  }

  if (!point.alternatingWeekAnchorDate) {
    return true
  }

  const anchorDate = parsePickupCalendarDate(point.alternatingWeekAnchorDate)

  if (!anchorDate) {
    return false
  }

  return (
    (getCalendarDayNumber(date) - getCalendarDayNumber(anchorDate)) %
      AMAP_ALTERNATION_DAYS ===
    0
  )
}

function parsePickupCalendarDate(value: string) {
  const datePart = value.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day }
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

function getCalendarDayNumber(date: CalendarDate) {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / MS_PER_DAY)
}
