import request from 'supertest'
import {
  NEXT_DAY_ORDER_CUTOFF_MESSAGE,
  formatPickupPoint,
  pickupPoints,
} from '../src/commandes/pickup-slots'
import { createArticle } from './fixtures/articles'
import { createTestApp, type E2eTestApp } from './helpers/create-test-app'
import { truncateBusinessTables } from './helpers/database'

describe('API E2E - next-day order cutoff', () => {
  let testApp: E2eTestApp

  beforeAll(async () => {
    testApp = await createTestApp({
      orderNow: new Date('2026-07-20T12:00:00.000Z'),
    })
  })

  beforeEach(async () => {
    await truncateBusinessTables(testApp.prisma)
    testApp.stripe.reset()
  })

  afterAll(async () => {
    await testApp.app.close()
  })

  it('rejects a manually submitted next-day checkout at 14:00 Paris', async () => {
    const article = await createArticle(testApp.prisma)
    const tuesdayMarket = pickupPoints.find(
      (point) => point.label === 'Marché de Gaillon',
    )

    if (!tuesdayMarket) {
      throw new Error('Missing Tuesday pickup point')
    }

    const response = await request(testApp.app.getHttpServer())
      .post('/api/commandes/checkout')
      .send({
        nom: 'Client E2E',
        email: 'client.e2e@example.com',
        tel: '0600000000',
        lieu: formatPickupPoint(tuesdayMarket),
        dateRetrait: '2026-07-21',
        lignes: [{ articleId: article.id, quantite: 1 }],
      })
      .expect(400)

    expect(response.body).toMatchObject({
      statusCode: 400,
      message: NEXT_DAY_ORDER_CUTOFF_MESSAGE,
    })
    expect(await testApp.prisma.commande.count()).toBe(0)
    expect(testApp.stripe.createdSessions).toHaveLength(0)
  })
})
