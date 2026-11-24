import { ConflictException } from '@nestjs/common'
import { Prisma } from '../../prisma/generated/prisma/client'

const TIME_ZONE = 'Europe/Paris'

// Namespace of the transaction-level advisory locks taken on a cash register
// day. Sales and the day closure both take this lock for the same Paris day,
// so PostgreSQL serializes them: a sale either commits before the closure
// reads the day's sales, or waits and then sees the day as closed.
const CASH_REGISTER_DAY_LOCK_NAMESPACE = 41_020

export const CASH_REGISTER_DAY_CLOSED = 'CASH_REGISTER_DAY_CLOSED'
export const CASH_REGISTER_DAY_ALREADY_CLOSED =
  'CASH_REGISTER_DAY_ALREADY_CLOSED'

export type DayBounds = {
  dayKey: string
  start: Date
  end: Date
}

type CashRegisterTransaction = Pick<
  Prisma.TransactionClient,
  '$executeRaw' | 'journeeCaisse'
>

export function getParisDayBounds(date: Date): DayBounds {
  const parts = getTimeZoneDateParts(date, TIME_ZONE)
  const start = zonedTimeToUtc(parts.year, parts.month, parts.day, TIME_ZONE)
  const end = zonedTimeToUtc(parts.year, parts.month, parts.day + 1, TIME_ZONE)

  return {
    dayKey: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(
      parts.day,
    ).padStart(2, '0')}`,
    start,
    end,
  }
}

// "2026-03-29" -> 20260329, stable and unique per day.
export function getCashRegisterDayLockKey(dayKey: string) {
  return Number(dayKey.replaceAll('-', ''))
}

export async function lockCashRegisterDay(
  tx: CashRegisterTransaction,
  bounds: DayBounds,
) {
  const key = getCashRegisterDayLockKey(bounds.dayKey)

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CASH_REGISTER_DAY_LOCK_NAMESPACE}::int, ${key}::int)`
}

export async function assertCashRegisterDayOpen(
  tx: CashRegisterTransaction,
  bounds: DayBounds,
) {
  const closedDay = await tx.journeeCaisse.findUnique({
    where: { date: bounds.start },
    select: { id: true },
  })

  if (closedDay) {
    throw new ConflictException({
      code: CASH_REGISTER_DAY_CLOSED,
      message:
        'La journée de caisse est clôturée : aucune vente ne peut plus y être ajoutée',
    })
  }
}

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour') % 24,
    getPart('minute'),
    getPart('second'),
  )

  return asUtc - date.getTime()
}

// Midnight of the given Paris calendar day, in UTC.
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone)

  return new Date(utcGuess.getTime() - offset)
}
