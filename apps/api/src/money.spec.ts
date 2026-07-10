import {
  calculateHtFromTtcCents,
  centsToEuros,
  eurosToCents,
  formatCurrencyFromCents,
} from './money'

describe('money helpers', () => {
  it('converts euros and cents with business-safe rounding', () => {
    expect(eurosToCents(12.345)).toBe(1235)
    expect(centsToEuros(1235)).toBe(12.35)
  })

  it('formats cents as euros for the French locale', () => {
    expect(formatCurrencyFromCents(1235)).toMatch(/12,35\s€/)
  })

  it('calculates the tax-exclusive amount from a tax-inclusive price', () => {
    expect(calculateHtFromTtcCents(1055, 550)).toBe(1000)
    expect(calculateHtFromTtcCents(1200, 2000)).toBe(1000)
  })
})
