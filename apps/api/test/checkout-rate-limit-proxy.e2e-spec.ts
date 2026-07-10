import { ExpressAdapter } from '@nestjs/platform-express'
import type { Request, Response } from 'express'
import request from 'supertest'
import { configureTrustedProxies } from '../src/bootstrap/trusted-proxies'
import { createCheckoutRateLimitMiddleware } from '../src/rate-limit/checkout-rate-limit.middleware'

type TestAppOptions = {
  trustedProxies?: string
  maxRequests?: number
}

function createRateLimitedApp(options: TestAppOptions = {}) {
  const adapter = new ExpressAdapter()
  const app = adapter.getInstance()

  configureTrustedProxies(app, {
    TRUSTED_PROXIES: options.trustedProxies,
  })

  const checkoutRateLimit = createCheckoutRateLimitMiddleware({
    maxRequests: options.maxRequests ?? 1,
    windowMs: 60_000,
  })

  app.get('/api/other', (_request: Request, response: Response) => {
    response.sendStatus(204)
  })
  app.post(
    '/api/commandes/checkout',
    checkoutRateLimit,
    (checkoutRequest: Request, response: Response) => {
      response.status(200).json({ ip: checkoutRequest.ip })
    },
  )

  return app as Parameters<typeof request>[0]
}

describe('checkout rate limiting behind trusted proxies', () => {
  it('ignores forged forwarded headers on a direct untrusted connection', async () => {
    const app = createRateLimitedApp()

    await request(app)
      .post('/api/commandes/checkout')
      .set('X-Forwarded-For', '203.0.113.10')
      .expect(200)

    await request(app)
      .post('/api/commandes/checkout')
      .set('X-Forwarded-For', '198.51.100.20')
      .expect(429)
  })

  it('uses the forwarded client address when the direct proxy is trusted', async () => {
    const app = createRateLimitedApp({
      trustedProxies: '127.0.0.1,::1',
    })

    const response = await request(app)
      .post('/api/commandes/checkout')
      .set('X-Forwarded-For', '203.0.113.10')
      .expect(200)

    expect(response.body).toEqual({ ip: '203.0.113.10' })
  })

  it('keeps independent counters for two clients behind the same proxy', async () => {
    const app = createRateLimitedApp({
      trustedProxies: '127.0.0.1,::1',
    })

    await request(app)
      .post('/api/commandes/checkout')
      .set('X-Forwarded-For', '203.0.113.10')
      .expect(200)
    await request(app)
      .post('/api/commandes/checkout')
      .set('X-Forwarded-For', '203.0.113.10')
      .expect(429)
    await request(app)
      .post('/api/commandes/checkout')
      .set('X-Forwarded-For', '198.51.100.20')
      .expect(200)
  })

  it('does not consume the checkout counter on another route', async () => {
    const app = createRateLimitedApp()

    await request(app).get('/api/other').expect(204)
    await request(app).get('/api/other').expect(204)
    await request(app).post('/api/commandes/checkout').expect(200)
  })

  it('returns a positive Retry-After header when the quota is exceeded', async () => {
    const app = createRateLimitedApp()

    await request(app).post('/api/commandes/checkout').expect(200)
    const response = await request(app)
      .post('/api/commandes/checkout')
      .expect(429)

    expect(response.headers['retry-after']).toMatch(/^\d+$/)
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0)
    expect(response.body).toEqual({
      statusCode: 429,
      message: 'Trop de tentatives de paiement, veuillez reessayer bientot',
      error: 'Too Many Requests',
    })
  })

  it('stops at the first untrusted hop in a forged forwarded chain', async () => {
    const app = createRateLimitedApp({
      trustedProxies: '127.0.0.1,::1',
    })

    await request(app)
      .post('/api/commandes/checkout')
      .set('X-Forwarded-For', '192.0.2.1, 203.0.113.10')
      .expect(200)
    await request(app)
      .post('/api/commandes/checkout')
      .set('X-Forwarded-For', '198.51.100.20, 203.0.113.10')
      .expect(429)
  })
})
