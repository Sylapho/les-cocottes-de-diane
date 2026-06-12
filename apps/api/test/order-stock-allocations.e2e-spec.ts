import request from 'supertest'
import { ROLES } from '../src/auth/roles'
import { createArticle } from './fixtures/articles'
import { validPickupPoint } from './fixtures/dates'
import { authAs } from './helpers/auth'
import { createTestApp, E2eTestApp } from './helpers/create-test-app'
import { truncateBusinessTables } from './helpers/database'

describe('API E2E - order stock allocations', () => {
  let testApp: E2eTestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  })

  beforeEach(async () => {
    await truncateBusinessTables(testApp.prisma)
    testApp.emails.reset()
    testApp.stripe.reset()
  })

  afterEach(async () => {
    await dropFailingAllocationTrigger()
  })

  afterAll(async () => {
    await testApp.app.close()
  })

  it('restores each FEFO allocation to its original lot with DLC and reference preserved', async () => {
    const article = await createArticle(testApp.prisma, {
      stock: 8,
      prixCents: 250,
    })
    const earliest = await createArticleLot(article.id, {
      initialQuantity: 3,
      remainingQuantity: 3,
      expiresAt: futureDate(4),
      reference: 'lot-earliest-dlc',
    })
    const later = await createArticleLot(article.id, {
      initialQuantity: 5,
      remainingQuantity: 5,
      expiresAt: futureDate(9),
      reference: 'lot-later-dlc',
    })

    const commandeId = await createDirectCommande(article.id, 6)

    const [allocations, lotsAfterReservation] = await Promise.all([
      testApp.prisma.commandeStockAllocation.findMany({
        where: { commandeId },
        orderBy: [{ stockLotId: 'asc' }, { id: 'asc' }],
      }),
      findArticleLots(article.id),
    ])

    expect(
      allocations.map((allocation) => [
        allocation.stockLotId,
        allocation.quantity,
      ]),
    ).toEqual([
      [earliest.id, 3],
      [later.id, 3],
    ])
    expect(
      lotsAfterReservation.map((lot) => [lot.id, lot.remainingQuantity]),
    ).toEqual([
      [earliest.id, 0],
      [later.id, 2],
    ])

    await cancelCommande(commandeId).expect(200)

    const [lotsAfterCancel, restoredAllocations, releaseMovements] =
      await Promise.all([
        findArticleLots(article.id),
        testApp.prisma.commandeStockAllocation.findMany({
          where: { commandeId },
          orderBy: [{ stockLotId: 'asc' }, { id: 'asc' }],
        }),
        testApp.prisma.mouvementStock.findMany({
          where: { reference: `commande:${commandeId}:reservation:release` },
        }),
      ])

    expect(lotsAfterCancel.map((lot) => lot.id)).toEqual([
      earliest.id,
      later.id,
    ])
    expect(lotsAfterCancel.map((lot) => lot.remainingQuantity)).toEqual([3, 5])
    expect(lotsAfterCancel.map((lot) => lot.expiresAt?.toISOString())).toEqual([
      earliest.expiresAt?.toISOString(),
      later.expiresAt?.toISOString(),
    ])
    expect(lotsAfterCancel.map((lot) => lot.reference)).toEqual([
      'lot-earliest-dlc',
      'lot-later-dlc',
    ])
    expect(
      restoredAllocations.every((allocation) => allocation.restoredAt),
    ).toBe(true)
    expect(releaseMovements).toHaveLength(1)
    expect(releaseMovements[0]).toMatchObject({
      articleId: article.id,
      quantite: 6,
    })
  })

  it('keeps uncovered quantity as preorder and never creates a generic lot on cancellation', async () => {
    const article = await createArticle(testApp.prisma, {
      stock: 6,
      prixCents: 250,
    })
    const lot = await createArticleLot(article.id, {
      initialQuantity: 6,
      remainingQuantity: 6,
      expiresAt: futureDate(7),
      reference: 'partial-physical-lot',
    })

    const commandeId = await createDirectCommande(article.id, 10)

    const commande = await testApp.prisma.commande.findUniqueOrThrow({
      where: { id: commandeId },
      include: {
        lignes: true,
        stockAllocations: true,
      },
    })
    const articleAfterReservation =
      await testApp.prisma.article.findUniqueOrThrow({
        where: { id: article.id },
      })

    expect(commande.lignes[0].quantite).toBe(10)
    expect(commande.lignes[0].quantitePrecommande).toBe(4)
    expect(commande.stockAllocations).toHaveLength(1)
    expect(commande.stockAllocations[0]).toMatchObject({
      stockLotId: lot.id,
      quantity: 6,
    })
    expect(articleAfterReservation.stock).toBe(-4)

    await cancelCommande(commandeId).expect(200)

    const [lotsAfterCancel, articleAfterCancel] = await Promise.all([
      findArticleLots(article.id),
      testApp.prisma.article.findUniqueOrThrow({
        where: { id: article.id },
      }),
    ])

    expect(lotsAfterCancel).toHaveLength(1)
    expect(lotsAfterCancel[0]).toMatchObject({
      id: lot.id,
      remainingQuantity: 6,
      reference: 'partial-physical-lot',
    })
    expect(lotsAfterCancel[0].expiresAt?.toISOString()).toBe(
      lot.expiresAt?.toISOString(),
    )
    expect(articleAfterCancel.stock).toBe(6)
  })

  it('restores allocations only once with concurrent cancellations', async () => {
    const article = await createArticle(testApp.prisma, {
      stock: 5,
      prixCents: 250,
    })
    const lot = await createArticleLot(article.id, {
      initialQuantity: 5,
      remainingQuantity: 5,
      expiresAt: futureDate(7),
    })
    const commandeId = await createDirectCommande(article.id, 5)

    const responses = await Promise.all([
      cancelCommande(commandeId),
      cancelCommande(commandeId),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 200,
    ])

    const [updatedLot, releaseOperations, releaseMovements, allocations] =
      await Promise.all([
        testApp.prisma.stockLot.findUniqueOrThrow({ where: { id: lot.id } }),
        testApp.prisma.commandeReservationRelease.count({
          where: { commandeId },
        }),
        testApp.prisma.mouvementStock.findMany({
          where: { reference: `commande:${commandeId}:reservation:release` },
        }),
        testApp.prisma.commandeStockAllocation.findMany({
          where: { commandeId },
        }),
      ])

    expect(updatedLot.remainingQuantity).toBe(5)
    expect(releaseOperations).toBe(1)
    expect(releaseMovements).toHaveLength(1)
    expect(allocations).toHaveLength(1)
    expect(allocations[0].restoredAt).toBeTruthy()
  })

  it('keeps lot quantities coherent with concurrent consumption and cancellation', async () => {
    const article = await createArticle(testApp.prisma, {
      stock: 10,
      prixCents: 250,
    })
    const lot = await createArticleLot(article.id, {
      initialQuantity: 10,
      remainingQuantity: 10,
      expiresAt: futureDate(8),
    })
    const commandeId = await createDirectCommande(article.id, 6)

    const [cancelResponse, consumeResponse] = await Promise.all([
      cancelCommande(commandeId),
      consumeArticle(article.id, 4, 'consume-while-order-cancel'),
    ])

    expect(cancelResponse.status).toBe(200)
    expect(consumeResponse.status).toBe(201)

    const [updatedLot, updatedArticle, allocation] = await Promise.all([
      testApp.prisma.stockLot.findUniqueOrThrow({ where: { id: lot.id } }),
      testApp.prisma.article.findUniqueOrThrow({ where: { id: article.id } }),
      testApp.prisma.commandeStockAllocation.findFirstOrThrow({
        where: { commandeId },
      }),
    ])

    expect(updatedLot.remainingQuantity).toBe(6)
    expect(updatedArticle.stock).toBe(6)
    expect(allocation.restoredAt).toBeTruthy()
  })

  it('rolls back article stock, lot consumption, movements and allocations on reservation failure', async () => {
    const article = await createArticle(testApp.prisma, {
      stock: 4,
      prixCents: 250,
    })
    const lot = await createArticleLot(article.id, {
      initialQuantity: 4,
      remainingQuantity: 4,
      expiresAt: futureDate(5),
    })

    await installFailingAllocationTrigger()

    await createDirectCommandeRequest(article.id, 3).expect(500)

    const [updatedArticle, updatedLot, allocations, movements, commandes] =
      await Promise.all([
        testApp.prisma.article.findUniqueOrThrow({ where: { id: article.id } }),
        testApp.prisma.stockLot.findUniqueOrThrow({ where: { id: lot.id } }),
        testApp.prisma.commandeStockAllocation.findMany(),
        testApp.prisma.mouvementStock.findMany(),
        testApp.prisma.commande.findMany(),
      ])

    expect(updatedArticle.stock).toBe(4)
    expect(updatedLot.remainingQuantity).toBe(4)
    expect(allocations).toHaveLength(0)
    expect(movements).toHaveLength(0)
    expect(commandes).toHaveLength(0)
  })

  async function createDirectCommande(articleId: number, quantity: number) {
    const response = await createDirectCommandeRequest(
      articleId,
      quantity,
    ).expect(201)

    return response.body.id as number
  }

  function createDirectCommandeRequest(articleId: number, quantity: number) {
    return request(testApp.app.getHttpServer())
      .post('/api/commandes')
      .set(authAs(ROLES.GERANT))
      .send({
        nom: 'Client allocations',
        email: 'allocations@example.com',
        tel: '0600000000',
        lieu: validPickupPoint,
        dateRetrait: nextTuesday(),
        lignes: [{ articleId, quantite: quantity }],
      })
  }

  function cancelCommande(commandeId: number) {
    return request(testApp.app.getHttpServer())
      .patch(`/api/commandes/${commandeId}/statut`)
      .set(authAs(ROLES.GERANT))
      .send({ statut: 'annulee' })
  }

  function consumeArticle(articleId: number, quantity: number, motif: string) {
    return request(testApp.app.getHttpServer())
      .post('/api/mouvements-stock/ajustement')
      .set(authAs(ROLES.STOCK))
      .send({
        cible: 'article',
        cibleId: articleId,
        quantite: -quantity,
        motif,
      })
  }

  function findArticleLots(articleId: number) {
    return testApp.prisma.stockLot.findMany({
      where: { articleId },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    })
  }

  function createArticleLot(
    articleId: number,
    data: {
      initialQuantity: number
      remainingQuantity: number
      expiresAt: Date
      reference?: string
    },
  ) {
    return testApp.prisma.stockLot.create({
      data: {
        target: 'article',
        articleId,
        initialQuantity: data.initialQuantity,
        remainingQuantity: data.remainingQuantity,
        expiresAt: data.expiresAt,
        reference: data.reference,
      },
    })
  }

  async function installFailingAllocationTrigger() {
    await testApp.prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION e2e_fail_order_stock_allocation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'e2e order stock allocation failure';
      END;
      $$ LANGUAGE plpgsql;
    `)

    await testApp.prisma.$executeRawUnsafe(`
      CREATE TRIGGER e2e_fail_order_stock_allocation
      BEFORE INSERT ON "CommandeStockAllocation"
      FOR EACH ROW
      EXECUTE FUNCTION e2e_fail_order_stock_allocation();
    `)
  }

  async function dropFailingAllocationTrigger() {
    await testApp.prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS e2e_fail_order_stock_allocation ON "CommandeStockAllocation";
    `)
    await testApp.prisma.$executeRawUnsafe(`
      DROP FUNCTION IF EXISTS e2e_fail_order_stock_allocation();
    `)
  }
})

function futureDate(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

function nextTuesday() {
  const date = new Date()
  date.setHours(10, 0, 0, 0)
  const day = date.getDay()
  const daysUntilTuesday = (2 - day + 7) % 7 || 7
  date.setDate(date.getDate() + daysUntilTuesday)
  return date.toISOString()
}
