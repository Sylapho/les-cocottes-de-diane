import { getAnalyticsPeriods } from './analytics-periods'
import { calculateConversionRate } from './analytics.service'

describe('analytics periods', () => {
  it('starts the daily period at midnight in Europe/Paris in summer', () => {
    const periods = getAnalyticsPeriods(new Date('2026-07-20T12:00:00.000Z'))

    expect(periods.daily.from.toISOString()).toBe('2026-07-19T22:00:00.000Z')
    expect(periods.weekly.from.toISOString()).toBe('2026-07-13T22:00:00.000Z')
    expect(periods.monthly.from.toISOString()).toBe('2026-06-20T22:00:00.000Z')
  })

  it('uses the winter offset and includes the current day in rolling periods', () => {
    const periods = getAnalyticsPeriods(new Date('2026-01-15T23:30:00.000Z'))

    expect(periods.daily.from.toISOString()).toBe('2026-01-15T23:00:00.000Z')
    expect(periods.weekly.from.toISOString()).toBe('2026-01-09T23:00:00.000Z')
    expect(periods.monthly.from.toISOString()).toBe('2025-12-17T23:00:00.000Z')
  })

  it('keeps midnight correct across the daylight-saving transition', () => {
    const periods = getAnalyticsPeriods(new Date('2026-03-29T12:00:00.000Z'))

    expect(periods.daily.from.toISOString()).toBe('2026-03-28T23:00:00.000Z')
    expect(periods.weekly.from.toISOString()).toBe('2026-03-22T23:00:00.000Z')
  })
})

describe('analytics conversion', () => {
  it('returns zero instead of NaN when there are no visitors', () => {
    expect(calculateConversionRate(0, 0)).toBe(0)
  })

  it('uses unique buyers rather than the number of orders', () => {
    expect(calculateConversionRate(1, 4)).toBe(25)
  })
})
