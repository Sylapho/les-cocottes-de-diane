import request from 'supertest'
import { ROLES } from '../src/auth/roles'
import { createArticle } from './fixtures/articles'
import { authAs } from './helpers/auth'
import { createTestApp, E2eTestApp } from './helpers/create-test-app'
import { truncateBusinessTables } from './helpers/database'

describe('API E2E - stock CRUD protection', () => {
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

  it('rejects direct article stock updates through the generic PATCH endpoint', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Article protégé E2E',
      stock: 7,
    })

    await request(testApp.app.getHttpServer())
      .patch(`/api/articles/${article.id}`)
      .set(authAs(ROLES.GERANT))
      .send({ stock: 100 })
      .expect(400)

    const unchangedArticle = await testApp.prisma.article.findUniqueOrThrow({
      where: { id: article.id },
    })

    expect(unchangedArticle.stock).toBe(7)
  })

  it('rejects stock-like unknown fields on generic article updates', async () => {
    const article = await createArticle(testApp.prisma)

    await request(testApp.app.getHttpServer())
      .patch(`/api/articles/${article.id}`)
      .set(authAs(ROLES.GERANT))
      .send({ currentStock: 100 })
      .expect(400)
  })

  it('updates article metadata without changing its stock', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Article metadata E2E',
      prixCents: 250,
      stock: 4,
    })

    const response = await request(testApp.app.getHttpServer())
      .patch(`/api/articles/${article.id}`)
      .set(authAs(ROLES.GERANT))
      .send({
        nom: 'Article metadata updated E2E',
        online: false,
      })
      .expect(200)

    expect(response.body).toMatchObject({
      id: article.id,
      nom: 'Article metadata updated E2E',
      prixCents: 250,
      stock: 4,
      online: false,
    })

    const updatedArticle = await testApp.prisma.article.findUniqueOrThrow({
      where: { id: article.id },
    })

    expect(updatedArticle.stock).toBe(4)
  })

  it('rejects direct stock on article creation and creates valid articles with zero stock', async () => {
    await request(testApp.app.getHttpServer())
      .post('/api/articles')
      .set(authAs(ROLES.GERANT))
      .send({
        nom: 'Article forbidden stock E2E',
        prixCents: 450,
        stock: 12,
      })
      .expect(400)

    expect(await testApp.prisma.article.count()).toBe(0)

    const response = await request(testApp.app.getHttpServer())
      .post('/api/articles')
      .set(authAs(ROLES.GERANT))
      .send({
        nom: 'Article zero stock E2E',
        prixCents: 450,
      })
      .expect(201)

    expect(response.body).toMatchObject({
      nom: 'Article zero stock E2E',
      prixCents: 450,
      stock: 0,
    })
  })

  it('rejects direct raw material stock updates through the generic PATCH endpoint', async () => {
    const matiere = await createMatierePremiere({
      nom: 'Matière protégée E2E',
      stock: 5,
    })

    await request(testApp.app.getHttpServer())
      .patch(`/api/matieres-premieres/${matiere.id}`)
      .set(authAs(ROLES.STOCK))
      .send({ stock: 50 })
      .expect(400)

    const unchangedMatiere =
      await testApp.prisma.matierePremiere.findUniqueOrThrow({
        where: { id: matiere.id },
      })

    expect(unchangedMatiere.stock).toBe(5)
  })

  it('updates raw material metadata without changing its stock', async () => {
    const matiere = await createMatierePremiere({
      nom: 'Matière metadata E2E',
      stock: 6,
    })

    const response = await request(testApp.app.getHttpServer())
      .patch(`/api/matieres-premieres/${matiere.id}`)
      .set(authAs(ROLES.STOCK))
      .send({
        nom: 'Matière metadata updated E2E',
        unite: 'g',
        coutUnitaireCents: 80,
        seuil: 2,
        conditionnement: 'carton',
      })
      .expect(200)

    expect(response.body).toMatchObject({
      id: matiere.id,
      nom: 'Matière metadata updated E2E',
      stock: 6,
      unite: 'g',
      coutUnitaireCents: 80,
      seuil: 2,
      conditionnement: 'carton',
    })

    const updatedMatiere =
      await testApp.prisma.matierePremiere.findUniqueOrThrow({
        where: { id: matiere.id },
      })

    expect(updatedMatiere.stock).toBe(6)
  })

  it('rejects direct stock on raw material creation and creates valid raw materials with zero stock', async () => {
    await request(testApp.app.getHttpServer())
      .post('/api/matieres-premieres')
      .set(authAs(ROLES.STOCK))
      .send({
        nom: 'Matière forbidden stock E2E',
        stock: 12,
        unite: 'kg',
        coutUnitaireCents: 100,
        seuil: 1,
        conditionnement: 'sac',
      })
      .expect(400)

    expect(await testApp.prisma.matierePremiere.count()).toBe(0)

    const response = await request(testApp.app.getHttpServer())
      .post('/api/matieres-premieres')
      .set(authAs(ROLES.STOCK))
      .send({
        nom: 'Matière zero stock E2E',
        unite: 'kg',
        coutUnitaireCents: 100,
        seuil: 1,
        conditionnement: 'sac',
      })
      .expect(201)

    expect(response.body).toMatchObject({
      nom: 'Matière zero stock E2E',
      stock: 0,
      unite: 'kg',
      coutUnitaireCents: 100,
      seuil: 1,
      conditionnement: 'sac',
    })
  })

  it('keeps dedicated stock adjustments working with movements and lots', async () => {
    const matiere = await createMatierePremiere({
      nom: 'Matière ajustement E2E',
      stock: 0,
    })
    const expiresAt = futureDate(10).toISOString()

    await request(testApp.app.getHttpServer())
      .post('/api/mouvements-stock/ajustement')
      .set(authAs(ROLES.STOCK))
      .send({
        cible: 'matiere_premiere',
        cibleId: matiere.id,
        quantite: 3,
        motif: 'E2E stock adjustment',
        expiresAt,
      })
      .expect(201)

    const [updatedMatiere, movement, lots] = await Promise.all([
      testApp.prisma.matierePremiere.findUniqueOrThrow({
        where: { id: matiere.id },
      }),
      testApp.prisma.mouvementStock.findFirstOrThrow({
        where: {
          cible: 'matiere_premiere',
          mpId: matiere.id,
          type: 'ajustement',
        },
      }),
      testApp.prisma.stockLot.findMany({
        where: {
          target: 'matiere_premiere',
          mpId: matiere.id,
        },
      }),
    ])

    expect(updatedMatiere.stock).toBe(3)
    expect(movement).toMatchObject({
      quantite: 3,
      stockAvant: 0,
      stockApres: 3,
      motif: 'E2E stock adjustment',
    })
    expect(lots).toHaveLength(1)
    expect(lots[0]).toMatchObject({
      initialQuantity: 3,
      remainingQuantity: 3,
    })
  })

  function createMatierePremiere(data: { nom: string; stock: number }) {
    return testApp.prisma.matierePremiere.create({
      data: {
        nom: data.nom,
        stock: data.stock,
        unite: 'kg',
        coutUnitaireCents: 100,
        seuil: 1,
        conditionnement: 'sac',
      },
    })
  }
})

function futureDate(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}
