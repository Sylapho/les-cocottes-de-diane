import request from 'supertest'
import { ROLES } from '../src/auth/roles'
import { createArticle } from './fixtures/articles'
import { authAs } from './helpers/auth'
import { createTestApp, E2eTestApp } from './helpers/create-test-app'
import { truncateBusinessTables } from './helpers/database'

describe('API E2E - READ_ONLY authorization', () => {
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

  it('allows authenticated direct reads across back-office modules', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Read-only article',
      prixCents: 1200,
      stock: 8,
    })
    const commande = await testApp.prisma.commande.create({
      data: {
        trackingToken: 'read-only-order',
        nom: 'Read Only Client',
        email: 'read-only-client@example.test',
        totalTtcCents: 1200,
        lieu: 'Ferme',
        statut: 'nouvelle',
        lignes: {
          create: {
            articleId: article.id,
            quantite: 1,
            prixUnitCents: 1200,
          },
        },
      },
    })
    const readOnly = authAs(ROLES.READ_ONLY)

    for (const path of [
      '/api/articles',
      `/api/articles/${article.id}`,
      '/api/article-categories',
      '/api/commandes',
      `/api/commandes/${commande.id}`,
      `/api/commandes/${commande.id}/refunds`,
      '/api/matieres-premieres',
      '/api/mouvements-stock',
      '/api/mouvements-stock/lots',
      '/api/caisse/today',
      '/api/caisse/journees',
      '/api/ventes',
      '/api/pickup-points',
    ]) {
      await request(testApp.app.getHttpServer())
        .get(path)
        .set(readOnly)
        .expect(200)
    }
  })

  it('rejects direct HTTP mutations and leaves persisted data unchanged', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Protected article',
      prixCents: 900,
      stock: 12,
    })
    const commande = await testApp.prisma.commande.create({
      data: {
        trackingToken: 'protected-order',
        nom: 'Protected Client',
        email: 'protected-client@example.test',
        totalTtcCents: 900,
        lieu: 'Ferme',
        statut: 'nouvelle',
        lignes: {
          create: {
            articleId: article.id,
            quantite: 1,
            prixUnitCents: 900,
          },
        },
      },
    })
    const pickupPoint = await testApp.prisma.pickupPoint.create({
      data: {
        label: 'Protected pickup',
        address: '1 rue de la Ferme',
        schedule: 'Vendredi 17h',
        allowedWeekdays: [5],
      },
    })
    const category = await testApp.prisma.articleCategory.findFirstOrThrow()
    const matiere = await testApp.prisma.matierePremiere.create({
      data: {
        nom: 'Protected material',
        stock: 20,
        unite: 'kg',
        coutUnitaireCents: 300,
        seuil: 5,
        conditionnement: 'sac',
      },
    })
    const lot = await testApp.prisma.stockLot.create({
      data: {
        target: 'article',
        articleId: article.id,
        initialQuantity: 12,
        remainingQuantity: 12,
      },
    })
    const readOnly = authAs(ROLES.READ_ONLY)

    const attempts: Array<{
      method: 'post' | 'patch' | 'delete'
      path: string
      body?: object
    }> = [
      { method: 'post', path: '/api/articles', body: {} },
      { method: 'patch', path: `/api/articles/${article.id}`, body: {} },
      { method: 'delete', path: `/api/articles/${article.id}` },
      { method: 'post', path: `/api/articles/${article.id}/image` },
      { method: 'post', path: `/api/articles/${article.id}/produce`, body: {} },
      { method: 'post', path: '/api/commandes', body: {} },
      { method: 'post', path: '/api/commandes/cleanup-abandoned', body: {} },
      {
        method: 'patch',
        path: `/api/commandes/${commande.id}/statut`,
        body: { statut: 'preparee' },
      },
      {
        method: 'patch',
        path: `/api/commandes/${commande.id}/statut`,
        body: { statut: 'annulee' },
      },
      {
        method: 'post',
        path: `/api/commandes/${commande.id}/refunds`,
        body: {},
      },
      { method: 'post', path: '/api/mouvements-stock/ajustement', body: {} },
      {
        method: 'post',
        path: `/api/mouvements-stock/matieres-premieres/${matiere.id}/reception`,
        body: {},
      },
      {
        method: 'post',
        path: `/api/mouvements-stock/lots/${lot.id}/perte`,
        body: {},
      },
      { method: 'post', path: '/api/matieres-premieres', body: {} },
      {
        method: 'patch',
        path: `/api/matieres-premieres/${matiere.id}`,
        body: {},
      },
      { method: 'delete', path: `/api/matieres-premieres/${matiere.id}` },
      {
        method: 'post',
        path: `/api/articles/${article.id}/nomenclature`,
        body: {},
      },
      {
        method: 'patch',
        path: `/api/articles/${article.id}/nomenclature/${matiere.id}`,
        body: {},
      },
      {
        method: 'delete',
        path: `/api/articles/${article.id}/nomenclature/${matiere.id}`,
      },
      { method: 'post', path: '/api/pickup-points', body: {} },
      {
        method: 'patch',
        path: `/api/pickup-points/${pickupPoint.id}`,
        body: {},
      },
      {
        method: 'patch',
        path: `/api/pickup-points/${pickupPoint.id}/deactivate`,
      },
      {
        method: 'patch',
        path: `/api/pickup-points/${pickupPoint.id}/reactivate`,
      },
      { method: 'post', path: '/api/article-categories', body: {} },
      {
        method: 'patch',
        path: `/api/article-categories/${category.id}`,
        body: {},
      },
      { method: 'delete', path: `/api/article-categories/${category.id}` },
      { method: 'post', path: '/api/ventes', body: {} },
      { method: 'post', path: '/api/caisse/cloturer', body: {} },
      { method: 'post', path: '/api/stripe-reconciliations/1/retry' },
      {
        method: 'post',
        path: '/api/stripe-reconciliations/1/manual-resolution',
        body: {},
      },
    ]

    for (const attempt of attempts) {
      const testRequest = request(testApp.app.getHttpServer())
        [attempt.method](attempt.path)
        .set(readOnly)

      if (attempt.body) {
        testRequest.send(attempt.body)
      }

      await testRequest.expect(403)
    }

    const [
      articleAfter,
      commandeAfter,
      pickupPointAfter,
      matiereAfter,
      lotAfter,
      counts,
    ] = await Promise.all([
      testApp.prisma.article.findUniqueOrThrow({ where: { id: article.id } }),
      testApp.prisma.commande.findUniqueOrThrow({
        where: { id: commande.id },
      }),
      testApp.prisma.pickupPoint.findUniqueOrThrow({
        where: { id: pickupPoint.id },
      }),
      testApp.prisma.matierePremiere.findUniqueOrThrow({
        where: { id: matiere.id },
      }),
      testApp.prisma.stockLot.findUniqueOrThrow({ where: { id: lot.id } }),
      Promise.all([
        testApp.prisma.article.count(),
        testApp.prisma.vente.count(),
        testApp.prisma.refund.count(),
        testApp.prisma.mouvementStock.count(),
        testApp.prisma.articleCategory.count(),
        testApp.prisma.journeeCaisse.count(),
        testApp.prisma.matierePremiere.count(),
        testApp.prisma.nomenclature.count(),
        testApp.prisma.stockLot.count(),
      ]),
    ])

    expect(articleAfter).toMatchObject({ nom: 'Protected article', stock: 12 })
    expect(commandeAfter.statut).toBe('nouvelle')
    expect(pickupPointAfter).toMatchObject({
      label: 'Protected pickup',
      active: true,
    })
    expect(matiereAfter).toMatchObject({ stock: 20 })
    expect(lotAfter).toMatchObject({ remainingQuantity: 12 })
    expect(counts).toEqual([1, 0, 0, 0, 1, 0, 1, 0, 1])
  })

  it('keeps existing roles, authentication and public shop routes unchanged', async () => {
    await request(testApp.app.getHttpServer()).get('/api/articles').expect(401)
    await request(testApp.app.getHttpServer())
      .get('/api/articles')
      .set(authAs(ROLES.GERANT))
      .expect(200)
    await request(testApp.app.getHttpServer())
      .post('/api/articles')
      .set(authAs(ROLES.ADMIN))
      .send({
        nom: 'Administrator article',
        prixCents: 1000,
        tvaBps: 550,
        online: true,
      })
      .expect(201)
    await request(testApp.app.getHttpServer())
      .get('/api/boutique/articles')
      .expect(200)
  })
})
