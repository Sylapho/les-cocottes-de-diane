import request from 'supertest'
import { ROLES } from '../src/auth/roles'
import { createArticle } from './fixtures/articles'
import { authAs } from './helpers/auth'
import { createTestApp, E2eTestApp } from './helpers/create-test-app'
import { truncateBusinessTables } from './helpers/database'

describe('API E2E - production raw material concurrency', () => {
  let testApp: E2eTestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  })

  beforeEach(async () => {
    await dropArticleIncrementFailureTrigger()
    await truncateBusinessTables(testApp.prisma)
    testApp.emails.reset()
    testApp.stripe.reset()
  })

  afterAll(async () => {
    await dropArticleIncrementFailureTrigger()
    await testApp.app.close()
  })

  it('produces an article atomically and consumes sellable raw material lots once', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Produit E2E',
      stock: 1,
    })
    const matiere = await createMatierePremiere({
      nom: 'Farine E2E',
      stock: 2,
      unite: 'kg',
    })
    const rawLot = await createMatiereLot(matiere.id, {
      initialQuantity: 2,
      remainingQuantity: 2,
      expiresAt: futureDate(10),
    })
    await createRecipe(article.id, matiere.id, 0.75)

    const response = await produceArticle(article.id, {
      quantite: 2,
      expiresAt: futureDate(5).toISOString(),
    })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      produced: 2,
      consumed: [
        {
          mpId: matiere.id,
          nom: 'Farine E2E',
          unite: 'kg',
          quantite: 1.5,
        },
      ],
    })

    const [updatedMatiere, updatedArticle, updatedRawLot, producedLots] =
      await Promise.all([
        testApp.prisma.matierePremiere.findUniqueOrThrow({
          where: { id: matiere.id },
        }),
        testApp.prisma.article.findUniqueOrThrow({
          where: { id: article.id },
        }),
        testApp.prisma.stockLot.findUniqueOrThrow({
          where: { id: rawLot.id },
        }),
        testApp.prisma.stockLot.findMany({
          where: { target: 'article', articleId: article.id },
        }),
      ])

    expect(updatedMatiere.stock).toBeCloseTo(0.5)
    expect(updatedArticle.stock).toBe(3)
    expect(updatedRawLot.remainingQuantity).toBeCloseTo(0.5)
    expect(producedLots).toHaveLength(1)
    expect(producedLots[0]).toMatchObject({
      target: 'article',
      articleId: article.id,
      initialQuantity: 2,
      remainingQuantity: 2,
      reference: `production:article:${article.id}`,
    })
    await expectMovementCounts({
      articleId: article.id,
      mpId: matiere.id,
      articleMovements: 1,
      rawMaterialMovements: 1,
    })
    expectRawMaterialInvariant({
      initialQuantity: rawLot.initialQuantity,
      remainingQuantity: updatedRawLot.remainingQuantity,
      consumedQuantity: 1.5,
    })
  })

  it('rejects insufficient raw material without partial stock or movement writes', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Produit insuffisant E2E',
      stock: 0,
    })
    const matiere = await createMatierePremiere({
      nom: 'Farine faible E2E',
      stock: 1,
      unite: 'kg',
    })
    const rawLot = await createMatiereLot(matiere.id, {
      initialQuantity: 1,
      remainingQuantity: 1,
      expiresAt: futureDate(10),
    })
    await createRecipe(article.id, matiere.id, 0.75)

    const response = await produceArticle(article.id, {
      quantite: 2,
      expiresAt: futureDate(5).toISOString(),
    })

    expect(response.status).toBe(409)
    expect(response.body).toMatchObject({
      code: 'INSUFFICIENT_MATERIAL_STOCK',
    })

    const [updatedMatiere, updatedArticle, updatedRawLot, movements] =
      await Promise.all([
        testApp.prisma.matierePremiere.findUniqueOrThrow({
          where: { id: matiere.id },
        }),
        testApp.prisma.article.findUniqueOrThrow({
          where: { id: article.id },
        }),
        testApp.prisma.stockLot.findUniqueOrThrow({
          where: { id: rawLot.id },
        }),
        testApp.prisma.mouvementStock.findMany({
          where: {
            OR: [{ articleId: article.id }, { mpId: matiere.id }],
          },
        }),
      ])

    expect(updatedMatiere.stock).toBe(1)
    expect(updatedArticle.stock).toBe(0)
    expect(updatedRawLot.remainingQuantity).toBe(1)
    expect(movements).toHaveLength(0)
  })

  it('rolls back raw material consumption when article increment fails later in the transaction', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Produit rollback E2E',
      stock: 0,
    })
    const matiere = await createMatierePremiere({
      nom: 'Farine rollback E2E',
      stock: 2,
      unite: 'kg',
    })
    const rawLot = await createMatiereLot(matiere.id, {
      initialQuantity: 2,
      remainingQuantity: 2,
      expiresAt: futureDate(10),
    })
    await createRecipe(article.id, matiere.id, 1)
    await installArticleIncrementFailureTrigger()

    try {
      const response = await produceArticle(article.id, {
        quantite: 1,
        expiresAt: futureDate(5).toISOString(),
      })

      expect(response.status).toBe(500)
    } finally {
      await dropArticleIncrementFailureTrigger()
    }

    const [updatedMatiere, updatedArticle, updatedRawLot, movements, lots] =
      await Promise.all([
        testApp.prisma.matierePremiere.findUniqueOrThrow({
          where: { id: matiere.id },
        }),
        testApp.prisma.article.findUniqueOrThrow({
          where: { id: article.id },
        }),
        testApp.prisma.stockLot.findUniqueOrThrow({
          where: { id: rawLot.id },
        }),
        testApp.prisma.mouvementStock.findMany({
          where: {
            OR: [{ articleId: article.id }, { mpId: matiere.id }],
          },
        }),
        testApp.prisma.stockLot.findMany({
          where: { target: 'article', articleId: article.id },
        }),
      ])

    expect(updatedMatiere.stock).toBe(2)
    expect(updatedArticle.stock).toBe(0)
    expect(updatedRawLot.remainingQuantity).toBe(2)
    expect(movements).toHaveLength(0)
    expect(lots).toHaveLength(0)
  })

  it('allows only one of two concurrent productions to consume the same raw material quantity', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Produit concurrent E2E',
      stock: 0,
    })
    const matiere = await createMatierePremiere({
      nom: 'Farine concurrente E2E',
      stock: 1,
      unite: 'kg',
    })
    const rawLot = await createMatiereLot(matiere.id, {
      initialQuantity: 1,
      remainingQuantity: 1,
      expiresAt: futureDate(10),
    })
    await createRecipe(article.id, matiere.id, 1)

    const responses = await Promise.all([
      produceArticle(article.id, {
        quantite: 1,
        expiresAt: futureDate(5).toISOString(),
      }),
      produceArticle(article.id, {
        quantite: 1,
        expiresAt: futureDate(5).toISOString(),
      }),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ])

    const [updatedMatiere, updatedArticle, updatedRawLot, rawMovements] =
      await Promise.all([
        testApp.prisma.matierePremiere.findUniqueOrThrow({
          where: { id: matiere.id },
        }),
        testApp.prisma.article.findUniqueOrThrow({
          where: { id: article.id },
        }),
        testApp.prisma.stockLot.findUniqueOrThrow({
          where: { id: rawLot.id },
        }),
        testApp.prisma.mouvementStock.findMany({
          where: { cible: 'matiere_premiere', mpId: matiere.id },
        }),
      ])

    expect(updatedMatiere.stock).toBe(0)
    expect(updatedArticle.stock).toBe(1)
    expect(updatedRawLot.remainingQuantity).toBe(0)
    expect(rawMovements).toHaveLength(1)
    expect(rawMovements[0]).toMatchObject({
      mpId: matiere.id,
      quantite: -1,
      stockAvant: 1,
      stockApres: 0,
      type: 'production',
    })
    await expectMovementCounts({
      articleId: article.id,
      mpId: matiere.id,
      articleMovements: 1,
      rawMaterialMovements: 1,
    })
  })

  it('rejects a direct PostgreSQL write that would make raw material stock negative', async () => {
    const matiere = await createMatierePremiere({
      nom: 'Farine contrainte E2E',
      stock: 1,
      unite: 'kg',
    })

    await expect(
      testApp.prisma.$executeRaw`
        UPDATE "MatierePremiere"
        SET "stock" = -1
        WHERE "id" = ${matiere.id}
      `,
    ).rejects.toThrow()

    const updatedMatiere =
      await testApp.prisma.matierePremiere.findUniqueOrThrow({
        where: { id: matiere.id },
      })

    expect(updatedMatiere.stock).toBe(1)
  })

  function produceArticle(
    articleId: number,
    body: { quantite: number; expiresAt?: string },
  ) {
    return request(testApp.app.getHttpServer())
      .post(`/api/articles/${articleId}/produce`)
      .set(authAs(ROLES.PRODUCTION))
      .send(body)
  }

  function createMatierePremiere(data: {
    nom: string
    stock: number
    unite: string
  }) {
    return testApp.prisma.matierePremiere.create({
      data: {
        nom: data.nom,
        stock: data.stock,
        unite: data.unite,
        coutUnitaireCents: 100,
        seuil: 0,
        conditionnement: data.unite,
      },
    })
  }

  function createRecipe(articleId: number, mpId: number, quantite: number) {
    return testApp.prisma.nomenclature.create({
      data: {
        articleId,
        mpId,
        quantite,
      },
    })
  }

  function createMatiereLot(
    mpId: number,
    data: {
      initialQuantity: number
      remainingQuantity: number
      expiresAt: Date
    },
  ) {
    return testApp.prisma.stockLot.create({
      data: {
        target: 'matiere_premiere',
        mpId,
        initialQuantity: data.initialQuantity,
        remainingQuantity: data.remainingQuantity,
        expiresAt: data.expiresAt,
      },
    })
  }

  async function expectMovementCounts(data: {
    articleId: number
    mpId: number
    articleMovements: number
    rawMaterialMovements: number
  }) {
    const [articleMovements, rawMaterialMovements] = await Promise.all([
      testApp.prisma.mouvementStock.count({
        where: { cible: 'article', articleId: data.articleId },
      }),
      testApp.prisma.mouvementStock.count({
        where: { cible: 'matiere_premiere', mpId: data.mpId },
      }),
    ])

    expect(articleMovements).toBe(data.articleMovements)
    expect(rawMaterialMovements).toBe(data.rawMaterialMovements)
  }

  async function installArticleIncrementFailureTrigger() {
    await testApp.prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION e2e_fail_article_stock_increment()
      RETURNS trigger AS $$
      BEGIN
        IF NEW."stock" > OLD."stock" THEN
          RAISE EXCEPTION 'e2e production article increment failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `)

    await testApp.prisma.$executeRawUnsafe(`
      CREATE TRIGGER e2e_fail_article_stock_increment_trigger
      BEFORE UPDATE ON "Article"
      FOR EACH ROW
      EXECUTE FUNCTION e2e_fail_article_stock_increment();
    `)
  }

  async function dropArticleIncrementFailureTrigger() {
    await testApp.prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS e2e_fail_article_stock_increment_trigger ON "Article";
    `)

    await testApp.prisma.$executeRawUnsafe(`
      DROP FUNCTION IF EXISTS e2e_fail_article_stock_increment();
    `)
  }
})

function expectRawMaterialInvariant(data: {
  initialQuantity: number
  remainingQuantity: number
  consumedQuantity: number
}) {
  expect(data.initialQuantity).toBeCloseTo(
    data.remainingQuantity + data.consumedQuantity,
  )
}

function futureDate(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}
