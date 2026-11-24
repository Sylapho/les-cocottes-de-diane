import request from 'supertest'
import { ROLES } from '../src/auth/roles'
import { getParisDayBounds } from '../src/caisse/cash-register-day'
import { createArticle } from './fixtures/articles'
import { authAs } from './helpers/auth'
import { createTestApp, E2eTestApp } from './helpers/create-test-app'
import { truncateBusinessTables } from './helpers/database'

describe('API E2E - cash register day closure', () => {
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
    await dropFailingClosureTrigger()
    await testApp.app.close()
  })

  function sell(articleId: number, quantite = 1) {
    return request(testApp.app.getHttpServer())
      .post('/api/ventes')
      .set(authAs(ROLES.VENDEUR))
      .send({ mode: 'cb', lignes: [{ articleId, quantite }] })
  }

  function closeDay() {
    return request(testApp.app.getHttpServer())
      .post('/api/caisse/cloturer')
      .set(authAs(ROLES.GERANT))
  }

  async function expectSnapshotMatchesAdmittedSales() {
    const bounds = getParisDayBounds(new Date())
    const [journee, ventes] = await Promise.all([
      testApp.prisma.journeeCaisse.findUniqueOrThrow({
        where: { date: bounds.start },
      }),
      testApp.prisma.vente.findMany({
        where: { date: { gte: bounds.start, lt: bounds.end } },
      }),
    ])

    expect(journee.nbVentes).toBe(ventes.length)
    expect(journee.totalTtcCents).toBe(
      ventes.reduce((total, vente) => total + vente.totalTtcCents, 0),
    )
    expect(journee.cbCents).toBe(journee.totalTtcCents)
  }

  it('refuses a sale once the day is closed and leaves stock untouched', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Après clôture',
      prixCents: 400,
      stock: 5,
    })

    await sell(article.id).expect(201)
    await closeDay().expect(201)

    const response = await sell(article.id).expect(409)

    expect(response.body).toMatchObject({ code: 'CASH_REGISTER_DAY_CLOSED' })

    const [articleAfter, ventes, mouvements] = await Promise.all([
      testApp.prisma.article.findUniqueOrThrow({ where: { id: article.id } }),
      testApp.prisma.vente.count(),
      testApp.prisma.mouvementStock.count({ where: { type: 'vente' } }),
    ])

    expect(articleAfter.stock).toBe(4)
    expect(ventes).toBe(1)
    expect(mouvements).toBe(1)
    await expectSnapshotMatchesAdmittedSales()
  })

  it('either includes a concurrent sale in the snapshot or refuses it', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Concurrence',
      prixCents: 250,
      stock: 50,
    })

    await sell(article.id).expect(201)

    const [saleResponses, closeResponse] = await Promise.all([
      Promise.all([sell(article.id), sell(article.id), sell(article.id)]),
      closeDay(),
    ])

    expect(closeResponse.status).toBe(201)

    for (const response of saleResponses) {
      expect([201, 409]).toContain(response.status)

      if (response.status === 409) {
        expect(response.body).toMatchObject({
          code: 'CASH_REGISTER_DAY_CLOSED',
        })
      }
    }

    const admittedSales =
      1 + saleResponses.filter((response) => response.status === 201).length
    const articleAfter = await testApp.prisma.article.findUniqueOrThrow({
      where: { id: article.id },
    })

    expect(await testApp.prisma.vente.count()).toBe(admittedSales)
    expect(articleAfter.stock).toBe(50 - admittedSales)
    await expectSnapshotMatchesAdmittedSales()
  })

  it('creates a single closed day when two closures race', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Double clôture',
      prixCents: 300,
      stock: 5,
    })

    await sell(article.id).expect(201)

    const responses = await Promise.all([closeDay(), closeDay()])

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ])
    expect(
      responses.find((response) => response.status === 409)?.body,
    ).toMatchObject({ code: 'CASH_REGISTER_DAY_ALREADY_CLOSED' })
    expect(await testApp.prisma.journeeCaisse.count()).toBe(1)
    await expectSnapshotMatchesAdmittedSales()
  })

  it('leaves no partial snapshot and keeps the day open when the closure fails', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Rollback',
      prixCents: 200,
      stock: 5,
    })

    await sell(article.id).expect(201)
    await createFailingClosureTrigger()

    try {
      await closeDay().expect(500)
    } finally {
      await dropFailingClosureTrigger()
    }

    expect(await testApp.prisma.journeeCaisse.count()).toBe(0)
    await sell(article.id).expect(201)
  })

  async function createFailingClosureTrigger() {
    await testApp.prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION e2e_fail_journee_insert()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'e2e journee caisse insert failure';
      END;
      $$ LANGUAGE plpgsql;
    `)
    await testApp.prisma.$executeRawUnsafe(`
      CREATE TRIGGER e2e_fail_journee_insert
      BEFORE INSERT ON "JourneeCaisse"
      FOR EACH ROW
      EXECUTE FUNCTION e2e_fail_journee_insert();
    `)
  }

  async function dropFailingClosureTrigger() {
    await testApp.prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS e2e_fail_journee_insert ON "JourneeCaisse";
    `)
    await testApp.prisma.$executeRawUnsafe(`
      DROP FUNCTION IF EXISTS e2e_fail_journee_insert();
    `)
  }
})
