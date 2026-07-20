import assert from 'node:assert/strict'
import test from 'node:test'
import {
  analyticsPeriodLabels,
  formatAnalyticsNumber,
  formatAnalyticsPercentage,
} from './analytics'

test('formats analytics values for French readers', () => {
  assert.match(formatAnalyticsNumber(1234), /1[\s ]234/)
  assert.match(formatAnalyticsPercentage(4.25), /4,3\s?%/)
  assert.equal(formatAnalyticsPercentage(0), '0,0 %')
})

test('uses explicit rolling period labels', () => {
  assert.deepEqual(analyticsPeriodLabels, {
    daily: 'Aujourd’hui',
    weekly: '7 derniers jours',
    monthly: '30 derniers jours',
  })
})
