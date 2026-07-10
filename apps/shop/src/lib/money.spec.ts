import assert from 'node:assert/strict'
import test from 'node:test'
import {
  centsToEuros,
  eurosToCents,
  formatCurrencyFromCents,
} from './money'

test('money helpers preserve cent precision and French formatting', () => {
  assert.equal(eurosToCents(12.345), 1235)
  assert.equal(centsToEuros(1235), 12.35)
  assert.match(formatCurrencyFromCents(1235), /12,35\s€/)
})
