import { AnalyticsIdentityService } from './analytics-identity.service'
import { AnalyticsService } from './analytics.service'
import { PrismaService } from '../prisma/prisma.service'

describe('AnalyticsService', () => {
  const transactionClient = {
    $queryRaw: jest.fn(),
    analyticsVisitor: {
      upsert: jest.fn(),
    },
    analyticsSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  }
  const prismaMock = {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    analyticsSession: {
      deleteMany: jest.fn(),
    },
    analyticsVisitor: {
      deleteMany: jest.fn(),
    },
  }
  const identityMock = {
    hashIdentifier: jest.fn((value: string) => `hash:${value}`),
  }

  let service: AnalyticsService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new AnalyticsService(
      prismaMock as unknown as PrismaService,
      identityMock as unknown as AnalyticsIdentityService,
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('creates a visit when no active session exists', async () => {
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    )
    transactionClient.analyticsVisitor.upsert.mockResolvedValue({
      id: 'visitor-db',
    })
    transactionClient.$queryRaw.mockResolvedValue([{ id: 'visitor-db' }])
    transactionClient.analyticsSession.findUnique.mockResolvedValue(null)
    transactionClient.analyticsSession.findFirst.mockResolvedValue(null)
    transactionClient.analyticsSession.create.mockResolvedValue({})

    await expect(service.trackVisit('visitor-1', 'session-1')).resolves.toEqual(
      {
        tracked: true,
      },
    )
    expect(transactionClient.analyticsSession.create).toHaveBeenCalledWith({
      data: {
        visitorId: 'visitor-db',
        sessionHash: 'hash:session-1',
        startedAt: expect.any(Date) as Date,
        lastActivityAt: expect.any(Date) as Date,
      },
    })
  })

  it('updates an existing matching session without counting another visit', async () => {
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    )
    transactionClient.analyticsVisitor.upsert.mockResolvedValue({
      id: 'visitor-db',
    })
    transactionClient.$queryRaw.mockResolvedValue([{ id: 'visitor-db' }])
    transactionClient.analyticsSession.findUnique.mockResolvedValue({
      id: 'session-db',
      visitorId: 'visitor-db',
    })
    transactionClient.analyticsSession.update.mockResolvedValue({})

    await expect(service.trackVisit('visitor-1', 'session-1')).resolves.toEqual(
      {
        tracked: false,
        reason: 'active-session',
      },
    )
    expect(transactionClient.analyticsSession.update).toHaveBeenCalledWith({
      where: { id: 'session-db' },
      data: { lastActivityAt: expect.any(Date) as Date },
    })
  })

  it('aggregates overview rows and explicitly casts SQL period bounds', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      {
        period: 'daily',
        visits: 4n,
        uniqueVisitors: 2n,
        orders: 3n,
        uniqueBuyers: 1n,
        unattributedOrders: 1n,
      },
    ])

    const overview = await service.getOverview(
      new Date('2026-07-20T12:00:00.000Z'),
    )

    expect(overview.periods.daily).toMatchObject({
      visits: 4,
      uniqueVisitors: 2,
      orders: 3,
      uniqueBuyers: 1,
      conversionRate: 50,
      unattributedOrders: 1,
      averageOrdersPerBuyer: 2,
    })
    expect(overview.periods.weekly.conversionRate).toBe(0)

    const sqlStrings = prismaMock.$queryRaw.mock.calls[0][0] as string[]
    expect(sqlStrings.join('')).toContain('::timestamp')
  })

  it('starts and stops periodic retention cleanup', async () => {
    jest.useFakeTimers()
    prismaMock.$transaction.mockResolvedValue([])
    const cleanupSpy = jest.spyOn(service, 'cleanupExpiredData')

    service.onModuleInit()
    expect(cleanupSpy).toHaveBeenCalledTimes(1)

    await jest.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000)
    expect(cleanupSpy).toHaveBeenCalledTimes(2)

    service.onModuleDestroy()
  })
})
