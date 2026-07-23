import {
  findPickupPoint,
  formatPickupPoint,
  getEarliestOrderDate,
  getPublicPickupPoints,
  isNextDayOrderingAllowed,
  isOrderDateAllowed,
  isPickupDateAllowed,
  NEXT_DAY_ORDER_CUTOFF_MESSAGE,
  pickupPoints,
  toStoredPickupDate,
  validatePickupSlot,
  type PickupPoint,
} from './pickup-slots'

function getPickupPointByLabel(label: string) {
  const point = pickupPoints.find((item) => item.label === label)

  if (!point) {
    throw new Error(`Missing pickup point: ${label}`)
  }

  return point
}

function dateFromInput(value: string) {
  const [year, month, day] = value.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function formatInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getNextDate(point: PickupPoint, expectedAllowed: boolean) {
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() + 1)

  for (let index = 0; index < 60; index += 1) {
    if (
      point.allowedWeekdays.includes(cursor.getDay()) &&
      isPickupDateAllowed(point, cursor) === expectedAllowed
    ) {
      return formatInputDate(cursor)
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  throw new Error('No matching pickup date found')
}

describe('pickup slots', () => {
  const tuesdayMarket = getPickupPointByLabel('Marché de Gaillon')
  const wednesdayMarket = getPickupPointByLabel('Marché du Neubourg')

  it.each([
    ['13:59 in summer', '2026-07-20T11:59:00.000Z', '2026-07-21', true],
    ['14:00 in summer', '2026-07-20T12:00:00.000Z', '2026-07-21', false],
    ['14:01 in summer', '2026-07-20T12:01:00.000Z', '2026-07-21', false],
    ['13:59 in winter', '2026-01-12T12:59:00.000Z', '2026-01-13', true],
    ['14:00 in winter', '2026-01-12T13:00:00.000Z', '2026-01-13', false],
  ])(
    'applies the next-day cutoff at %s in Europe/Paris',
    (_label, now, requestedDate, expected) => {
      expect(isNextDayOrderingAllowed(new Date(now))).toBe(expected)
      expect(isOrderDateAllowed(requestedDate, new Date(now))).toBe(expected)
    },
  )

  it('moves the earliest date to the day after tomorrow at the cutoff', () => {
    expect(getEarliestOrderDate(new Date('2026-07-20T11:59:00.000Z'))).toBe(
      '2026-07-21',
    )
    expect(getEarliestOrderDate(new Date('2026-07-20T12:00:00.000Z'))).toBe(
      '2026-07-22',
    )
    expect(
      isOrderDateAllowed('2026-07-22', new Date('2026-07-20T12:01:00Z')),
    ).toBe(true)
  })

  it('handles month and year boundaries in Paris', () => {
    expect(getEarliestOrderDate(new Date('2026-12-31T13:00:00.000Z'))).toBe(
      '2027-01-02',
    )
  })

  it.each([
    ['summer time change', '2026-03-29T12:00:00.000Z', '2026-03-31'],
    ['winter time change', '2026-10-25T13:00:00.000Z', '2026-10-27'],
  ])('keeps the Paris cutoff across the %s', (_label, now, expectedDate) => {
    expect(getEarliestOrderDate(new Date(now))).toBe(expectedDate)
  })

  it('rejects a manually submitted next-day order at 14:00 Paris', () => {
    const now = new Date('2026-07-20T12:00:00.000Z')

    expect(() =>
      validatePickupSlot(
        formatPickupPoint(tuesdayMarket),
        '2026-07-21',
        pickupPoints,
        now,
      ),
    ).toThrow(NEXT_DAY_ORDER_CUTOFF_MESSAGE)
    expect(() =>
      validatePickupSlot(
        formatPickupPoint(wednesdayMarket),
        '2026-07-22',
        pickupPoints,
        now,
      ),
    ).not.toThrow()
  })

  it('keeps the requested calendar date when an ISO offset is provided', () => {
    expect(toStoredPickupDate('2026-07-21T23:30:00-10:00')?.toISOString()).toBe(
      '2026-07-21T00:00:00.000Z',
    )
  })

  it('keeps Autheuil-Authouillet AMAP on its fortnightly Thursday schedule', () => {
    const autheuilAuthouillet = getPickupPointByLabel(
      'AMAP Autheuil-Authouillet',
    )

    expect(
      isPickupDateAllowed(autheuilAuthouillet, dateFromInput('2026-06-18')),
    ).toBe(true)
    expect(
      isPickupDateAllowed(autheuilAuthouillet, dateFromInput('2026-07-02')),
    ).toBe(true)
    expect(
      isPickupDateAllowed(autheuilAuthouillet, dateFromInput('2026-06-25')),
    ).toBe(false)
  })

  it('keeps Houlbec-Cocherel AMAP on the alternate Thursday schedule', () => {
    const houlbecCocherel = getPickupPointByLabel("AMAP d'Houlbec-Cocherel")

    expect(
      isPickupDateAllowed(houlbecCocherel, dateFromInput('2026-06-25')),
    ).toBe(true)
    expect(
      isPickupDateAllowed(houlbecCocherel, dateFromInput('2026-07-09')),
    ).toBe(true)
    expect(
      isPickupDateAllowed(houlbecCocherel, dateFromInput('2026-06-18')),
    ).toBe(false)
  })

  it('validates AMAP pickup dates against their alternating week', () => {
    const autheuilAuthouillet = getPickupPointByLabel(
      'AMAP Autheuil-Authouillet',
    )
    const lieu = formatPickupPoint(autheuilAuthouillet)

    expect(() =>
      validatePickupSlot(lieu, getNextDate(autheuilAuthouillet, true)),
    ).not.toThrow()
    expect(() =>
      validatePickupSlot(lieu, getNextDate(autheuilAuthouillet, false)),
    ).toThrow('La date de retrait ne correspond pas au lieu choisi')
  })

  it('exposes AMAP alternation anchors to the checkout', () => {
    const publicPickupPoints = getPublicPickupPoints()

    expect(
      publicPickupPoints.find(
        (point) => point.label === 'AMAP Autheuil-Authouillet',
      ),
    ).toMatchObject({
      alternatingWeekAnchorDate: '2026-06-18',
      value: 'AMAP Autheuil-Authouillet - Jeudi, tous les 15 jours',
    })
    expect(
      publicPickupPoints.find(
        (point) => point.label === "AMAP d'Houlbec-Cocherel",
      ),
    ).toMatchObject({
      alternatingWeekAnchorDate: '2026-06-25',
      value: "AMAP d'Houlbec-Cocherel - Jeudi, tous les 15 jours",
    })
  })

  it('finds pickup points from their public checkout value', () => {
    const publicPickupPoint = getPublicPickupPoints()[0]

    expect(findPickupPoint(publicPickupPoint.value)).toMatchObject({
      label: publicPickupPoint.label,
    })
  })
})
