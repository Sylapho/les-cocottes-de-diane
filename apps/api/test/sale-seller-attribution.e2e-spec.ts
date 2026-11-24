import request from 'supertest'
import { ROLES } from '../src/auth/roles'
import { createArticle } from './fixtures/articles'
import { authAs, E2E_USER_ID_HEADER, getE2eUserId } from './helpers/auth'
import { createTestApp, E2eTestApp } from './helpers/create-test-app'
import { truncateBusinessTables } from './helpers/database'

describe('API E2E - sale seller attribution', () => {
  let testApp: E2eTestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  })

  beforeEach(async () => {
    await truncateBusinessTables(testApp.prisma)
    testApp.emails.reset()
    testApp.stripe.reset()
  })

  afterAll(async () => {
    await testApp.app.close()
  })

  async function createSaleArticle() {
    return createArticle(testApp.prisma, {
      nom: 'Attribution',
      prixCents: 300,
      stock: 10,
    })
  }

  it('attributes the sale and its stock movements to the authenticated seller', async () => {
    const article = await createSaleArticle()

    const response = await request(testApp.app.getHttpServer())
      .post('/api/ventes')
      .set(authAs(ROLES.VENDEUR))
      .send({ mode: 'cb', lignes: [{ articleId: article.id, quantite: 1 }] })
      .expect(201)

    const sellerId = getE2eUserId(ROLES.VENDEUR)

    expect(response.body.seller).toEqual({
      id: sellerId,
      name: `E2E ${ROLES.VENDEUR}`,
    })

    const [vente, mouvements] = await Promise.all([
      testApp.prisma.vente.findUniqueOrThrow({
        where: { id: response.body.id },
      }),
      testApp.prisma.mouvementStock.findMany({
        where: { reference: `vente:${response.body.id}` },
      }),
    ])

    expect(vente.sellerId).toBe(sellerId)
    expect(vente.userId).toBeNull()
    expect(mouvements).toHaveLength(1)
    expect(mouvements[0].createdByUserId).toBe(sellerId)
  })

  it('rejects a forged seller identifier in the JSON body', async () => {
    const article = await createSaleArticle()

    const response = await request(testApp.app.getHttpServer())
      .post('/api/ventes')
      .set(authAs(ROLES.VENDEUR))
      .send({
        mode: 'cb',
        userId: 1,
        sellerId: getE2eUserId(ROLES.GERANT),
        lignes: [{ articleId: article.id, quantite: 1 }],
      })
      .expect(400)

    expect(JSON.stringify(response.body)).toContain('userId')
    expect(await testApp.prisma.vente.count()).toBe(0)
    expect(await testApp.prisma.mouvementStock.count()).toBe(0)
  })

  it('never lets user A attribute a sale to user B', async () => {
    const article = await createSaleArticle()
    const userA = getE2eUserId(ROLES.VENDEUR)
    const userB = getE2eUserId(ROLES.GERANT)

    await request(testApp.app.getHttpServer())
      .post('/api/ventes')
      .set(authAs(ROLES.VENDEUR))
      .set(E2E_USER_ID_HEADER, userA)
      .send({
        mode: 'especes',
        sellerId: userB,
        lignes: [{ articleId: article.id, quantite: 1 }],
      })
      .expect(400)

    const response = await request(testApp.app.getHttpServer())
      .post('/api/ventes')
      .set(authAs(ROLES.VENDEUR))
      .set(E2E_USER_ID_HEADER, userA)
      .send({
        mode: 'especes',
        lignes: [{ articleId: article.id, quantite: 1 }],
      })
      .expect(201)

    const ventes = await testApp.prisma.vente.findMany()

    expect(ventes).toHaveLength(1)
    expect(ventes[0].id).toBe(response.body.id)
    expect(ventes[0].sellerId).toBe(userA)
  })

  it('refuses the sale when the session account has no matching user', async () => {
    const article = await createSaleArticle()

    const response = await request(testApp.app.getHttpServer())
      .post('/api/ventes')
      .set(authAs(ROLES.VENDEUR))
      .set(E2E_USER_ID_HEADER, 'deleted-account')
      .send({ mode: 'cb', lignes: [{ articleId: article.id, quantite: 1 }] })
      .expect(403)

    expect(response.body.message).toContain('Compte vendeur introuvable')

    const articleAfter = await testApp.prisma.article.findUniqueOrThrow({
      where: { id: article.id },
    })

    expect(articleAfter.stock).toBe(article.stock)
    expect(await testApp.prisma.vente.count()).toBe(0)
  })
})
