import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'

describe('AnalyticsController', () => {
  const analyticsServiceMock = {
    trackVisit: jest.fn(),
    getOverview: jest.fn(),
  }
  const controller = new AnalyticsController(
    analyticsServiceMock as unknown as AnalyticsService,
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('tracks a visit through the analytics service', async () => {
    analyticsServiceMock.trackVisit.mockResolvedValue({ tracked: true })

    await expect(
      controller.trackVisit({
        visitorId: 'visitor-1',
        sessionId: 'session-1',
      }),
    ).resolves.toEqual({ tracked: true })
    expect(analyticsServiceMock.trackVisit).toHaveBeenCalledWith(
      'visitor-1',
      'session-1',
    )
  })

  it('returns the aggregated overview', async () => {
    const overview = { generatedAt: '2026-07-20T12:00:00.000Z' }
    analyticsServiceMock.getOverview.mockResolvedValue(overview)

    await expect(controller.getOverview()).resolves.toBe(overview)
  })
})
