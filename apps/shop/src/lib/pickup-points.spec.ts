import assert from 'node:assert/strict'
import test, { mock } from 'node:test'
import {
  findPickupPoint,
  formatPickupDateLabel,
  formatPickupPoint,
  getAllowedPickupWeekdays,
  getEarliestOrderDate,
  getNextPickupDates,
  isNextDayOrderingAllowed,
  isOrderDateAllowed,
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
  assert.equal(
    findPickupPoint([tuesdayMarket], tuesdayMarket.value),
    tuesdayMarket,
  )
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

test('allows tomorrow at 13:59 and removes it at 14:00 in summer', () => {
  const beforeCutoff = new Date('2026-07-20T11:59:00.000Z')
  const atCutoff = new Date('2026-07-20T12:00:00.000Z')

  assert.equal(isNextDayOrderingAllowed(beforeCutoff), true)
  assert.equal(isOrderDateAllowed('2026-07-21', beforeCutoff), true)
  assert.equal(isNextDayOrderingAllowed(atCutoff), false)
  assert.equal(isOrderDateAllowed('2026-07-21', atCutoff), false)
  assert.deepEqual(getNextPickupDates(tuesdayMarket, 2, atCutoff), [
    '2026-07-28',
    '2026-08-04',
  ])
})

test('uses the Europe/Paris cutoff in winter', () => {
  assert.equal(
    isOrderDateAllowed('2026-01-13', new Date('2026-01-12T12:59:00.000Z')),
    true,
  )
  assert.equal(
    isOrderDateAllowed('2026-01-13', new Date('2026-01-12T13:00:00.000Z')),
    false,
  )
})

test('allows the day after tomorrow and handles calendar boundaries', () => {
  const afterCutoff = new Date('2026-12-31T13:00:00.000Z')

  assert.equal(getEarliestOrderDate(afterCutoff), '2027-01-02')
  assert.equal(isOrderDateAllowed('2027-01-02', afterCutoff), true)
})

test('treats an ISO timestamp as its explicit business date', () => {
  assert.equal(
    isOrderDateAllowed(
      '2026-07-21T23:30:00-10:00',
      new Date('2026-07-20T11:59:00.000Z'),
    ),
    true,
  )
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
