import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateHtFromTtcCents,
  centsToEuros,
  eurosToCents,
  formatCurrencyFromCents,
} from './money'

test('money helpers round, convert and format cents consistently', () => {
  assert.equal(eurosToCents(12.345), 1235)
  assert.equal(centsToEuros(1235), 12.35)
  assert.match(formatCurrencyFromCents(1235), /12,35\s€/)
  assert.equal(calculateHtFromTtcCents(1055, 550), 1000)
  assert.equal(calculateHtFromTtcCents(1200, 2000), 1000)
})
