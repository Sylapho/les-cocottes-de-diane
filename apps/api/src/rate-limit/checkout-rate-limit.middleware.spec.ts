import type { NextFunction, Request, Response } from 'express'
import {
  CheckoutRateLimitStore,
  createCheckoutRateLimitMiddleware,
  getCheckoutRateLimitOptionsFromEnv,
} from './checkout-rate-limit.middleware'

function createRequest(ip = '127.0.0.1') {
  return {
    ip,
    socket: {
      remoteAddress: ip,
    },
  } as Request
}

function createResponse() {
  return {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response & {
    status: jest.Mock
    json: jest.Mock
    setHeader: jest.Mock
  }
}

describe('createCheckoutRateLimitMiddleware', () => {
  it('should allow requests until the configured maximum is reached', () => {
    let currentTime = 1_000
    const middleware = createCheckoutRateLimitMiddleware({
      windowMs: 60_000,
      maxRequests: 2,
      now: () => currentTime,
    })
    const next = jest.fn() as NextFunction
    const response = createResponse()

    middleware(createRequest(), response, next)
    middleware(createRequest(), response, next)
    middleware(createRequest(), response, next)

    expect(next).toHaveBeenCalledTimes(2)
    expect(response.status).toHaveBeenCalledWith(429)
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '60')
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 429,
      message: 'Trop de tentatives de paiement, veuillez reessayer bientot',
      error: 'Too Many Requests',
    })

    currentTime += 60_001
    middleware(createRequest(), response, next)

    expect(next).toHaveBeenCalledTimes(3)
  })

  it('should rate limit each IP independently', () => {
    const middleware = createCheckoutRateLimitMiddleware({
      windowMs: 60_000,
      maxRequests: 1,
      now: () => 1_000,
    })
    const next = jest.fn() as NextFunction
    const response = createResponse()

    middleware(createRequest('127.0.0.1'), response, next)
    middleware(createRequest('127.0.0.2'), response, next)
    middleware(createRequest('127.0.0.1'), response, next)

    expect(next).toHaveBeenCalledTimes(2)
    expect(response.status).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['::ffff:203.0.113.10', '203.0.113.10'],
    ['2001:0db8:0000:0000:0000:0000:0000:0001', '2001:db8::1'],
  ])('should normalize equivalent IP addresses', (firstIp, secondIp) => {
    const middleware = createCheckoutRateLimitMiddleware({
      windowMs: 60_000,
      maxRequests: 1,
      now: () => 1_000,
    })
    const next = jest.fn() as NextFunction
    const response = createResponse()

    middleware(createRequest(firstIp), response, next)
    middleware(createRequest(secondIp), response, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(response.status).toHaveBeenCalledWith(429)
  })

  it('should namespace checkout keys and avoid a shared missing-IP key', () => {
    const keys: string[] = []
    const store: CheckoutRateLimitStore = {
      get: jest.fn(() => undefined),
      set: jest.fn((key) => keys.push(key)),
    }
    const middleware = createCheckoutRateLimitMiddleware({ store })
    const next = jest.fn() as NextFunction
    const response = createResponse()
    const requestWithoutIp = {
      socket: {},
    } as Request

    middleware(createRequest('127.0.0.1'), response, next)
    middleware(requestWithoutIp, response, next)
    middleware(requestWithoutIp, response, next)

    expect(keys[0]).toBe('checkout:127.0.0.1')
    expect(keys[1]).toMatch(/^checkout:unresolved:/)
    expect(keys[2]).toMatch(/^checkout:unresolved:/)
    expect(keys[1]).not.toBe(keys[2])
  })
})

describe('getCheckoutRateLimitOptionsFromEnv', () => {
  it('should read valid checkout rate limit values from env', () => {
    expect(
      getCheckoutRateLimitOptionsFromEnv({
        CHECKOUT_RATE_LIMIT_WINDOW_MS: '120000',
        CHECKOUT_RATE_LIMIT_MAX: '5',
      }),
    ).toEqual({
      windowMs: 120_000,
      maxRequests: 5,
    })
  })

  it('should fall back when env values are invalid', () => {
    expect(
      getCheckoutRateLimitOptionsFromEnv({
        CHECKOUT_RATE_LIMIT_WINDOW_MS: 'invalid',
        CHECKOUT_RATE_LIMIT_MAX: '0',
      }),
    ).toEqual({
      windowMs: 60_000,
      maxRequests: 10,
    })
  })
})
