import request from 'supertest'
import { ROLES } from '../src/auth/roles'
import { authAs } from './helpers/auth'
import { createTestApp, type E2eTestApp } from './helpers/create-test-app'
import { truncateBusinessTables } from './helpers/database'

const visitorOne = '46b3a5e8-2e8c-4f43-a01c-1d0d4313b8a1'
const visitorTwo = '1aa4fbd6-8b48-41aa-8fa1-907f4506bb20'
const sessionOne = 'b25f1169-5ac8-44a4-8bb1-87f31f7fab82'
const sessionTwo = 'cebb291c-4048-41ba-bfa6-255c92d060b4'
const sessionThree = '4a032cc6-4dc8-4ddf-95ab-34df6285bb04'

describe('API E2E - shop analytics', () => {
  let testApp: E2eTestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  })

  beforeEach(async () => {
    await truncateBusinessTables(testApp.prisma)
  })

  afterAll(async () => {
    await testApp.app.close()
  })

  it('tracks one visit per active anonymous session without exposing hashes', async () => {
    const first = await trackVisit(testApp, visitorOne, sessionOne).expect(201)
    const duplicate = await trackVisit(testApp, visitorOne, sessionOne).expect(
      201,
    )
    const competingSession = await trackVisit(
      testApp,
      visitorOne,
      sessionTwo,
    ).expect(201)

    expect(first.body).toEqual({ tracked: true })
    expect(duplicate.body).toEqual({
      tracked: false,
      reason: 'active-session',
    })
    expect(competingSession.body).toEqual({
      tracked: false,
      reason: 'active-session',
    })
    expect(JSON.stringify(first.body)).not.toContain('Hash')
    expect(await testApp.prisma.analyticsVisitor.count()).toBe(1)
    expect(await testApp.prisma.analyticsSession.count()).toBe(1)
  })

  it('creates a new visit after 30 minutes and keeps the visitor unique', async () => {
    await trackVisit(testApp, visitorOne, sessionOne).expect(201)
    await testApp.prisma.analyticsSession.updateMany({
      data: { lastActivityAt: new Date(Date.now() - 31 * 60 * 1_000) },
    })

    await trackVisit(testApp, visitorOne, sessionTwo).expect(201, {
      tracked: true,
    })
    await trackVisit(testApp, visitorTwo, sessionThree).expect(201, {
      tracked: true,
    })

    expect(await testApp.prisma.analyticsVisitor.count()).toBe(2)
    expect(await testApp.prisma.analyticsSession.count()).toBe(3)
  })

  it('rejects invalid identifiers and deduplicates concurrent calls', async () => {
    await request(testApp.app.getHttpServer())
      .post('/api/analytics/visits')
      .send({
        visitorId: 'email@example.com',
        sessionId: 'too-long-or-invalid',
      })
      .expect(400)

    await Promise.all(
      Array.from({ length: 5 }, () =>
        trackVisit(testApp, visitorOne, sessionOne).expect(201),
      ),
    )

    expect(await testApp.prisma.analyticsVisitor.count()).toBe(1)
    expect(await testApp.prisma.analyticsSession.count()).toBe(1)
  })

  it('protects aggregated statistics and computes conversion from confirmed orders', async () => {
    await trackVisit(testApp, visitorOne, sessionOne).expect(201)
    await trackVisit(testApp, visitorTwo, sessionTwo).expect(201)
    const visitors = await testApp.prisma.analyticsVisitor.findMany({
      orderBy: { createdAt: 'asc' },
    })

    await testApp.prisma.commande.createMany({
      data: [
        orderData('one', 'nouvelle', new Date(), visitors[0].id),
        orderData('two', 'traitee', new Date(), visitors[0].id),
        orderData('three', 'annulee', new Date(), null),
        orderData('pending', 'paiement_en_attente', null, null),
      ],
    })

    await request(testApp.app.getHttpServer())
      .get('/api/admin/analytics/overview')
      .expect(401)
    await request(testApp.app.getHttpServer())
      .get('/api/admin/analytics/overview')
      .set(authAs(ROLES.GERANT))
      .expect(403)

    const response = await request(testApp.app.getHttpServer())
      .get('/api/admin/analytics/overview')
      .set(authAs(ROLES.ADMIN))
      .expect(200)

    expect(response.headers['cache-control']).toContain('private')
    expect(response.headers['cache-control']).toContain('no-store')
    expect(response.body.timezone).toBe('Europe/Paris')
    expect(response.body.periods.daily).toMatchObject({
      visits: 2,
      uniqueVisitors: 2,
      orders: 3,
      uniqueBuyers: 1,
      conversionRate: 50,
      unattributedOrders: 1,
    })
    expect(JSON.stringify(response.body)).not.toMatch(
      /visitorHash|visitorId|sessionHash/,
    )
  })
})

function trackVisit(testApp: E2eTestApp, visitorId: string, sessionId: string) {
  return request(testApp.app.getHttpServer())
    .post('/api/analytics/visits')
    .send({ visitorId, sessionId })
}

function orderData(
  suffix: string,
  statut: string,
  confirmedAt: Date | null,
  analyticsVisitorId: string | null,
) {
  return {
    trackingToken: `analytics-${suffix}`,
    nom: 'Analytics customer',
    email: `${suffix}@example.com`,
    totalTtcCents: 1000,
    lieu: 'Test',
    statut,
    confirmedAt,
    analyticsVisitorId,
  }
}
