import { ConflictException } from '@nestjs/common'
import {
  assertCashRegisterDayOpen,
  getCashRegisterDayLockKey,
  getParisDayBounds,
} from './cash-register-day'

describe('cash register day', () => {
  it('uses Paris midnight bounds on a regular day', () => {
    expect(getParisDayBounds(new Date('2026-05-23T10:00:00.000Z'))).toEqual({
      dayKey: '2026-05-23',
      start: new Date('2026-05-22T22:00:00.000Z'),
      end: new Date('2026-05-23T22:00:00.000Z'),
    })
  })

  it('assigns a sale just after Paris midnight to the new day', () => {
    // 00:30 in Paris (summer time) is still the previous day in UTC.
    expect(getParisDayBounds(new Date('2026-07-14T22:30:00.000Z')).dayKey).toBe(
      '2026-07-15',
    )
  })

  it('handles the 23-hour day of the switch to summer time', () => {
    const bounds = getParisDayBounds(new Date('2026-03-29T12:00:00.000Z'))

    expect(bounds).toEqual({
      dayKey: '2026-03-29',
      start: new Date('2026-03-28T23:00:00.000Z'),
      end: new Date('2026-03-29T22:00:00.000Z'),
    })
    expect(bounds.end.getTime() - bounds.start.getTime()).toBe(
      23 * 60 * 60 * 1000,
    )
  })

  it('handles the 25-hour day of the switch to winter time', () => {
    const bounds = getParisDayBounds(new Date('2026-10-25T12:00:00.000Z'))

    expect(bounds).toEqual({
      dayKey: '2026-10-25',
      start: new Date('2026-10-24T22:00:00.000Z'),
      end: new Date('2026-10-25T23:00:00.000Z'),
    })
    expect(bounds.end.getTime() - bounds.start.getTime()).toBe(
      25 * 60 * 60 * 1000,
    )
  })

  it('keeps the repeated 02:00–03:00 hour in the same day', () => {
    // Both 02:30 (summer) and 02:30 (winter) on 2026-10-25 in Paris.
    expect(getParisDayBounds(new Date('2026-10-25T00:30:00.000Z')).dayKey).toBe(
      '2026-10-25',
    )
    expect(getParisDayBounds(new Date('2026-10-25T01:30:00.000Z')).dayKey).toBe(
      '2026-10-25',
    )
  })

  it('derives a distinct lock key per day', () => {
    expect(getCashRegisterDayLockKey('2026-03-29')).toBe(20260329)
    expect(getCashRegisterDayLockKey('2026-03-30')).toBe(20260330)
  })

  it('rejects a closed day with a stable business code', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      journeeCaisse: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    }
    const bounds = getParisDayBounds(new Date('2026-05-23T10:00:00.000Z'))

    const result = assertCashRegisterDayOpen(tx as never, bounds)

    await expect(result).rejects.toBeInstanceOf(ConflictException)
    await expect(result).rejects.toMatchObject({
      response: { code: 'CASH_REGISTER_DAY_CLOSED' },
    })
    expect(tx.journeeCaisse.findUnique).toHaveBeenCalledWith({
      where: { date: bounds.start },
      select: { id: true },
    })
  })
})
