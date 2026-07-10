import assert from 'node:assert/strict'
import test, { mock } from 'node:test'
import {
  findPickupPoint,
  formatPickupDateLabel,
  formatPickupPoint,
  getAllowedPickupWeekdays,
  getNextPickupDates,
  type PickupPoint,
} from './pickup-points'

const tuesdayMarket: PickupPoint = {
  label: 'Marché de Gaillon',
  schedule: 'Mardi matin, 8h-12h',
  allowedWeekdays: [2],
  value: 'Marché de Gaillon - Mardi matin, 8h-12h',
}

test('finds and formats configured pickup points', () => {
  assert.equal(formatPickupPoint(tuesdayMarket), tuesdayMarket.value)
  assert.equal(findPickupPoint([tuesdayMarket], tuesdayMarket.value), tuesdayMarket)
  assert.equal(findPickupPoint([tuesdayMarket], 'Unknown'), undefined)
  assert.equal(getAllowedPickupWeekdays(tuesdayMarket), 'mardi')
  assert.equal(getAllowedPickupWeekdays(), '')
})

test('returns the next allowed weekday dates', (t) => {
  mock.timers.enable({
    apis: ['Date'],
    now: new Date(2026, 6, 10, 12),
  })
  t.after(() => mock.timers.reset())

  assert.deepEqual(getNextPickupDates(tuesdayMarket, 2), [
    '2026-07-14',
    '2026-07-21',
  ])
})

test('respects alternating-week pickup anchors', (t) => {
  mock.timers.enable({
    apis: ['Date'],
    now: new Date(2026, 6, 10, 12),
  })
  t.after(() => mock.timers.reset())

  assert.deepEqual(
    getNextPickupDates(
      {
        ...tuesdayMarket,
        alternatingWeekAnchorDate: '2026-07-14',
      },
      2,
    ),
    ['2026-07-14', '2026-07-28'],
  )
})

test('formats pickup dates for customers', () => {
  assert.match(formatPickupDateLabel('2026-07-14'), /mardi 14 juillet 2026/i)
})
