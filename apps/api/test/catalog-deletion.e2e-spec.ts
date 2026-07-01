import request from 'supertest'
import { ROLES } from '../src/auth/roles'
import { createArticle } from './fixtures/articles'
import { authAs } from './helpers/auth'
import { createTestApp, E2eTestApp } from './helpers/create-test-app'
import { truncateBusinessTables } from './helpers/database'

describe('API E2E - catalog deletion workflow', () => {
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

  it('DELETE /api/articles/:id archives an article used by an order', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Archived by delete E2E',
      prixCents: 450,
      stock: 10,
      online: true,
    })
    const commande = await testApp.prisma.commande.create({
      data: {
        nom: 'Client E2E',
        email: 'client.e2e@example.com',
        trackingToken: 'catalog-delete-archive-token',
        totalTtcCents: 450,
        lieu: 'Marché de Diane',
        lignes: {
          create: {
            articleId: article.id,
            quantite: 1,
            prixUnitCents: article.prixCents,
          },
        },
      },
    })

    const response = await request(testApp.app.getHttpServer())
      .delete(`/api/articles/${article.id}`)
      .set(authAs(ROLES.GERANT))
      .expect(200)

    expect(response.body).toMatchObject({
      id: article.id,
      online: false,
    })
    expect(response.body.archivedAt).toEqual(expect.any(String))

    const [archivedArticle, orderLine] = await Promise.all([
      testApp.prisma.article.findUniqueOrThrow({
        where: { id: article.id },
      }),
      testApp.prisma.ligneCommande.findFirstOrThrow({
        where: {
          commandeId: commande.id,
          articleId: article.id,
        },
      }),
    ])

    expect(archivedArticle.online).toBe(false)
    expect(archivedArticle.archivedAt).toBeInstanceOf(Date)
    expect(orderLine.prixUnitCents).toBe(article.prixCents)
  })

  it('DELETE /api/articles/:id physically deletes an unused article', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Unused delete E2E',
      prixCents: 450,
      stock: 0,
      online: true,
    })

    await request(testApp.app.getHttpServer())
      .delete(`/api/articles/${article.id}`)
      .set(authAs(ROLES.GERANT))
      .expect(200)

    await expect(
      testApp.prisma.article.findUnique({
        where: { id: article.id },
      }),
    ).resolves.toBeNull()
  })
})
