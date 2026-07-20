import type { NextFunction, Request, Response } from 'express'
import { createAnalyticsRateLimitMiddleware } from './analytics-rate-limit.middleware'

describe('createAnalyticsRateLimitMiddleware', () => {
  it('limits repeated requests and resets after the configured window', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-20T12:00:00.000Z'))
    const middleware = createAnalyticsRateLimitMiddleware({
      ANALYTICS_RATE_LIMIT_WINDOW_MS: '1000',
      ANALYTICS_RATE_LIMIT_MAX: '1',
    })
    const request = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as Request
    const setHeader = jest.fn()
    const status = jest.fn().mockReturnThis()
    const response = {
      setHeader,
      status,
      json: jest.fn().mockReturnThis(),
    } as unknown as Response
    const next = jest.fn() as NextFunction

    middleware(request, response, next)
    middleware(request, response, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(status).toHaveBeenCalledWith(429)
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '1')

    jest.advanceTimersByTime(1_001)
    middleware(request, response, next)
    expect(next).toHaveBeenCalledTimes(2)

    jest.useRealTimers()
  })
})
