import assert from 'node:assert/strict'
import test from 'node:test'
import {
  analyticsPeriodLabels,
  formatAnalyticsDecimal,
  formatAnalyticsNumber,
  formatAnalyticsPercentage,
  parseAnalyticsPeriod,
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

test('reads the analytics period from the URL with a weekly default', () => {
  assert.equal(parseAnalyticsPeriod('daily'), 'daily')
  assert.equal(parseAnalyticsPeriod(['monthly', 'daily']), 'monthly')
  assert.equal(parseAnalyticsPeriod('yearly'), 'weekly')
  assert.equal(parseAnalyticsPeriod(undefined), 'weekly')
})

test('formats ratios with two decimals', () => {
  assert.equal(formatAnalyticsDecimal(1.08), '1,08')
})
