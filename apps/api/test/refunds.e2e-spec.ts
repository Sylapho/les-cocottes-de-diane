import request from 'supertest'
import { ROLES } from '../src/auth/roles'
import { createArticle } from './fixtures/articles'
import { validPickupPoint } from './fixtures/dates'
import { authAs } from './helpers/auth'
import { createTestApp, E2eTestApp } from './helpers/create-test-app'
import { truncateBusinessTables } from './helpers/database'
import { createSignedStripeRefundEvent } from './helpers/stripe-events'

describe('API E2E - Stripe refunds', () => {
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

  it('refunds the remaining amount of a paid order', async () => {
    const { commandeId } = await createPaidCommande({
      totalTtcCents: 1250,
      stripePaymentIntentId: 'pi_refund_total',
    })

    const response = await refundCommande(commandeId, {
      reason: 'requested_by_customer',
      requestId: 'total-refund',
    }).expect(201)

    expect(response.body).toMatchObject({
      commandeId,
      totalAmountCents: 1250,
      refundedAmountCents: 1250,
      refundableAmountCents: 0,
      refundStatus: 'full',
      isRefundable: false,
    })
    expect(response.body.refunds).toEqual([
      expect.objectContaining({
        amountCents: 1250,
        status: 'succeeded',
        reason: 'requested_by_customer',
        stripeRefundId: 're_test_1',
      }),
    ])
    expect(testApp.stripe.createdRefunds).toHaveLength(1)
    expect(testApp.stripe.createdRefunds[0]).toMatchObject({
      params: {
        payment_intent: 'pi_refund_total',
        amount: 1250,
        reason: 'requested_by_customer',
      },
      options: {
        idempotencyKey:
          'commande:1:refund:e2e-user-gerant:request:total-refund',
      },
    })
  })

  it('creates a valid partial refund', async () => {
    const { commandeId } = await createPaidCommande({
      totalTtcCents: 1250,
      stripePaymentIntentId: 'pi_refund_partial',
    })

    const response = await refundCommande(commandeId, {
      amountCents: 500,
      reason: 'requested_by_customer',
      requestId: 'partial-refund',
    }).expect(201)

    expect(response.body).toMatchObject({
      refundedAmountCents: 500,
      refundableAmountCents: 750,
      refundStatus: 'partial',
      isRefundable: true,
    })
    expect(testApp.stripe.createdRefunds[0].params).toMatchObject({
      payment_intent: 'pi_refund_partial',
      amount: 500,
    })
  })

  it('refuses refunds for unpaid orders', async () => {
    const { commandeId } = await createPaidCommande({
      totalTtcCents: 1250,
      statut: 'paiement_en_attente',
      stripePaymentIntentId: null,
    })

    await refundCommande(commandeId, {
      reason: 'requested_by_customer',
      requestId: 'unpaid-refund',
    }).expect(400)

    expect(testApp.stripe.createdRefunds).toHaveLength(0)
  })

  it('refuses an amount greater than the refundable amount', async () => {
    const { commandeId } = await createPaidCommande({
      totalTtcCents: 1250,
      stripePaymentIntentId: 'pi_refund_over',
    })
    await testApp.prisma.refund.create({
      data: {
        commandeId,
        stripeRefundId: 're_existing',
        stripePaymentIntentId: 'pi_refund_over',
        amountCents: 1000,
        currency: 'eur',
        reason: 'requested_by_customer',
        status: 'succeeded',
        idempotencyKey: 'existing-refund',
      },
    })

    await refundCommande(commandeId, {
      amountCents: 300,
      reason: 'requested_by_customer',
      requestId: 'too-large',
    }).expect(422)

    expect(testApp.stripe.createdRefunds).toHaveLength(0)
  })

  it('forbids non managers from creating refunds', async () => {
    const { commandeId } = await createPaidCommande({
      totalTtcCents: 1250,
      stripePaymentIntentId: 'pi_refund_forbidden',
    })

    await request(testApp.app.getHttpServer())
      .post(`/api/commandes/${commandeId}/refunds`)
      .set(authAs(ROLES.VENDEUR))
      .send({
        reason: 'requested_by_customer',
        requestId: 'forbidden',
      })
      .expect(403)

    expect(testApp.stripe.createdRefunds).toHaveLength(0)
  })

  it('keeps repeated requests with the same request id idempotent', async () => {
    const { commandeId } = await createPaidCommande({
      totalTtcCents: 1250,
      stripePaymentIntentId: 'pi_refund_idempotent',
    })
    const payload = {
      amountCents: 500,
      reason: 'requested_by_customer' as const,
      requestId: 'same-request',
    }

    await refundCommande(commandeId, payload).expect(201)
    await refundCommande(commandeId, payload).expect(201)

    await expect(testApp.prisma.refund.count()).resolves.toBe(1)
    expect(testApp.stripe.createdRefunds).toHaveLength(1)
  })

  it('serializes concurrent refunds so they cannot exceed the paid amount', async () => {
    const { commandeId } = await createPaidCommande({
      totalTtcCents: 1000,
      stripePaymentIntentId: 'pi_refund_concurrent',
    })

    const [firstResponse, secondResponse] = await Promise.all([
      refundCommande(commandeId, {
        amountCents: 800,
        reason: 'requested_by_customer',
        requestId: 'concurrent-a',
      }),
      refundCommande(commandeId, {
        amountCents: 800,
        reason: 'requested_by_customer',
        requestId: 'concurrent-b',
      }),
    ])

    expect([firstResponse.status, secondResponse.status].sort()).toEqual([
      201, 422,
    ])
    await expect(testApp.prisma.refund.count()).resolves.toBe(1)
    expect(testApp.stripe.createdRefunds).toHaveLength(1)
  })

  it('processes refund webhooks idempotently', async () => {
    const { commandeId } = await createPaidCommande({
      totalTtcCents: 1250,
      stripePaymentIntentId: 'pi_refund_webhook',
    })
    const event = createSignedStripeRefundEvent({
      id: 'evt_refund_created',
      type: 'refund.created',
      refundId: 're_webhook',
      paymentIntentId: 'pi_refund_webhook',
      amount: 400,
      status: 'succeeded',
    })

    await postSignedWebhook(event).expect(201)
    await postSignedWebhook(event).expect(201)

    const summary = await request(testApp.app.getHttpServer())
      .get(`/api/commandes/${commandeId}/refunds`)
      .set(authAs(ROLES.GERANT))
      .expect(200)

    expect(summary.body).toMatchObject({
      refundedAmountCents: 400,
      refundableAmountCents: 850,
      refundStatus: 'partial',
    })
    await expect(testApp.prisma.refund.count()).resolves.toBe(1)
  })

  it('records failed refund webhooks without marking the order as refunded', async () => {
    const { commandeId } = await createPaidCommande({
      totalTtcCents: 1250,
      stripePaymentIntentId: 'pi_refund_failed',
    })
    const event = createSignedStripeRefundEvent({
      id: 'evt_refund_failed',
      type: 'refund.failed',
      refundId: 're_failed',
      paymentIntentId: 'pi_refund_failed',
      amount: 400,
      status: 'failed',
      failureReason: 'expired_or_canceled_card',
    })

    await postSignedWebhook(event).expect(201)

    const summary = await request(testApp.app.getHttpServer())
      .get(`/api/commandes/${commandeId}/refunds`)
      .set(authAs(ROLES.GERANT))
      .expect(200)

    expect(summary.body).toMatchObject({
      refundedAmountCents: 0,
      refundableAmountCents: 1250,
      refundStatus: 'failed',
    })
    expect(summary.body.refunds).toEqual([
      expect.objectContaining({
        status: 'failed',
        failureReason: 'expired_or_canceled_card',
      }),
    ])
  })

  it('rejects unsigned refund webhooks', async () => {
    const event = createSignedStripeRefundEvent({
      id: 'evt_unsigned_refund',
      type: 'refund.created',
      refundId: 're_unsigned',
      paymentIntentId: 'pi_unsigned',
      amount: 400,
    })

    await request(testApp.app.getHttpServer())
      .post('/api/commandes/stripe/webhook')
      .set('Content-Type', 'application/json')
      .send(event.payload)
      .expect(400)
  })

  async function createPaidCommande(data: {
    totalTtcCents: number
    stripePaymentIntentId?: string | null
    statut?: string
  }) {
    const article = await createArticle(testApp.prisma, {
      prixCents: data.totalTtcCents,
      stock: 10,
    })
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const commande = await testApp.prisma.commande.create({
      data: {
        trackingToken: `refund-${unique}`,
        nom: 'Client Refund',
        email: 'refund@example.com',
        tel: '0600000000',
        lieu: validPickupPoint,
        totalTtcCents: data.totalTtcCents,
        statut: data.statut ?? 'nouvelle',
        stripeId: 'cs_refund_test',
        stripePaymentIntentId: data.stripePaymentIntentId,
        lignes: {
          create: [
            {
              articleId: article.id,
              quantite: 1,
              prixUnitCents: data.totalTtcCents,
            },
          ],
        },
      },
    })

    return { articleId: article.id, commandeId: commande.id }
  }

  function refundCommande(
    commandeId: number,
    payload: {
      amountCents?: number
      reason: 'requested_by_customer' | 'duplicate' | 'fraudulent' | 'other'
      requestId: string
    },
  ) {
    return request(testApp.app.getHttpServer())
      .post(`/api/commandes/${commandeId}/refunds`)
      .set(authAs(ROLES.GERANT))
      .send(payload)
  }

  function postSignedWebhook(event: { payload: string; signature: string }) {
    return request(testApp.app.getHttpServer())
      .post('/api/commandes/stripe/webhook')
      .set('stripe-signature', event.signature)
      .set('Content-Type', 'application/json')
      .send(event.payload)
  }
})
