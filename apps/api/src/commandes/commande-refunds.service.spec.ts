import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CommandeRefundsService } from './commande-refunds.service'
import { StripeCheckoutGateway } from './stripe-checkout.gateway'

type RefundStatus =
  'pending' | 'requires_action' | 'succeeded' | 'failed' | 'canceled'

type RefundMock = {
  id: number
  commandeId: number
  stripeRefundId: string | null
  stripePaymentIntentId: string
  amountCents: number
  currency: string
  reason: string
  internalNote: string | null
  status: RefundStatus
  requestedByUserId: string | null
  stripeRawStatus: string | null
  failureReason: string | null
  idempotencyKey: string
  createdAt: Date
  updatedAt: Date
}

type CommandeMock = {
  id: number
  totalTtcCents: number
  statut: string
  stripeId: string | null
  stripePaymentIntentId: string | null
  refunds: RefundMock[]
}

describe('CommandeRefundsService', () => {
  let service: CommandeRefundsService
  let prismaMock: {
    commande: {
      findUnique: jest.Mock
    }
    refund: {
      updateMany: jest.Mock
    }
    $transaction: jest.Mock
  }
  let txMock: {
    $queryRaw: jest.Mock
    commande: {
      findUniqueOrThrow: jest.Mock
      findFirst: jest.Mock
      update: jest.Mock
      updateMany: jest.Mock
    }
    refund: {
      findUnique: jest.Mock
      findMany: jest.Mock
      create: jest.Mock
      update: jest.Mock
    }
  }
  let stripeGatewayMock: {
    createRefund: jest.Mock
    retrieveCheckoutSessionPaymentDetails: jest.Mock
  }

  beforeEach(() => {
    txMock = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
      commande: {
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      refund: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    }

    prismaMock = {
      commande: {
        findUnique: jest.fn(),
      },
      refund: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => Promise.resolve(callback(txMock))),
    }

    stripeGatewayMock = {
      createRefund: jest.fn(),
      retrieveCheckoutSessionPaymentDetails: jest.fn(),
    }

    service = new CommandeRefundsService(
      prismaMock as unknown as PrismaService,
      stripeGatewayMock as unknown as StripeCheckoutGateway,
    )
  })

  it('detects Stripe refund webhook event types', () => {
    expect(service.isStripeRefundWebhookEvent('refund.created')).toBe(true)
    expect(service.isStripeRefundWebhookEvent('refund.updated')).toBe(true)
    expect(service.isStripeRefundWebhookEvent('refund.failed')).toBe(true)
    expect(service.isStripeRefundWebhookEvent('charge.refunded')).toBe(true)
    expect(service.isStripeRefundWebhookEvent('charge.refund.updated')).toBe(
      true,
    )
    expect(
      service.isStripeRefundWebhookEvent('checkout.session.completed'),
    ).toBe(false)
  })

  it('returns a refund summary for an order', async () => {
    prismaMock.commande.findUnique.mockResolvedValue(
      createCommande({
        refunds: [
          createRefund({
            id: 1,
            amountCents: 400,
            status: 'succeeded',
          }),
          createRefund({
            id: 2,
            amountCents: 200,
            status: 'pending',
          }),
        ],
      }),
    )

    await expect(service.listForCommande(1)).resolves.toMatchObject({
      commandeId: 1,
      totalAmountCents: 1250,
      refundedAmountCents: 400,
      pendingAmountCents: 200,
      refundableAmountCents: 650,
      refundStatus: 'pending',
      isRefundable: true,
      refunds: [
        expect.objectContaining({
          id: 1,
          amountCents: 400,
          status: 'succeeded',
        }),
        expect.objectContaining({
          id: 2,
          amountCents: 200,
          status: 'pending',
        }),
      ],
    })
  })

  it('throws when listing refunds for an unknown order', async () => {
    prismaMock.commande.findUnique.mockResolvedValue(null)

    await expect(service.listForCommande(404)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it.each([
    {
      refunds: [],
      expectedStatus: 'none',
      expectedRefundable: 1250,
    },
    {
      refunds: [createRefund({ amountCents: 1250, status: 'succeeded' })],
      expectedStatus: 'full',
      expectedRefundable: 0,
    },
    {
      refunds: [createRefund({ amountCents: 400, status: 'succeeded' })],
      expectedStatus: 'partial',
      expectedRefundable: 850,
    },
    {
      refunds: [createRefund({ amountCents: 400, status: 'failed' })],
      expectedStatus: 'failed',
      expectedRefundable: 1250,
    },
  ])(
    'calculates aggregate status $expectedStatus',
    async ({ refunds, expectedStatus, expectedRefundable }) => {
      prismaMock.commande.findUnique.mockResolvedValue(
        createCommande({ refunds }),
      )

      await expect(service.listForCommande(1)).resolves.toMatchObject({
        refundStatus: expectedStatus,
        refundableAmountCents: expectedRefundable,
      })
    },
  )

  it('creates a Stripe refund with a deterministic idempotency key', async () => {
    const localRefund = createRefund({
      id: 10,
      amountCents: 500,
      status: 'pending',
      idempotencyKey: 'commande:1:refund:user-1:request:req-1',
    })
    txMock.commande.findUniqueOrThrow.mockResolvedValue(createCommande())
    txMock.refund.findUnique.mockResolvedValue(null)
    txMock.refund.create.mockResolvedValue(localRefund)
    txMock.refund.findMany.mockResolvedValue([localRefund])
    txMock.refund.update.mockResolvedValue({
      ...localRefund,
      status: 'succeeded',
      stripeRefundId: 're_created',
    })
    stripeGatewayMock.createRefund.mockResolvedValue({
      id: 're_created',
      payment_intent: 'pi_123',
      amount: 500,
      currency: 'eur',
      status: 'succeeded',
      metadata: {
        refundId: '10',
        idempotencyKey: localRefund.idempotencyKey,
      },
    })
    prismaMock.commande.findUnique.mockResolvedValue(
      createCommande({
        refunds: [
          {
            ...localRefund,
            status: 'succeeded',
            stripeRefundId: 're_created',
          },
        ],
      }),
    )

    const result = await service.createRefund(
      1,
      {
        amountCents: 500,
        reason: 'requested_by_customer',
        internalNote: '  Customer request  ',
        requestId: 'req-1',
      },
      'user-1',
    )

    expect(result).toMatchObject({
      refundedAmountCents: 500,
      refundStatus: 'partial',
    })
    expect(txMock.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        commandeId: 1,
        amountCents: 500,
        reason: 'requested_by_customer',
        internalNote: 'Customer request',
        idempotencyKey: localRefund.idempotencyKey,
      }),
    })
    expect(stripeGatewayMock.createRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: 'pi_123',
        amount: 500,
        reason: 'requested_by_customer',
        metadata: expect.objectContaining({
          commandeId: '1',
          refundId: '10',
          idempotencyKey: localRefund.idempotencyKey,
        }),
      }),
      {
        idempotencyKey: localRefund.idempotencyKey,
      },
    )
    expect(txMock.commande.updateMany).toHaveBeenCalledWith({
      where: {
        id: 1,
        stripePaymentIntentId: null,
      },
      data: {
        stripePaymentIntentId: 'pi_123',
      },
    })
  })

  it('does not call Stripe again for an idempotent request', async () => {
    txMock.commande.findUniqueOrThrow.mockResolvedValue(createCommande())
    txMock.refund.findUnique.mockResolvedValue(
      createRefund({
        idempotencyKey: 'commande:1:refund:user-1:request:req-1',
        status: 'succeeded',
        stripeRefundId: 're_existing',
      }),
    )
    prismaMock.commande.findUnique.mockResolvedValue(
      createCommande({
        refunds: [
          createRefund({
            status: 'succeeded',
            stripeRefundId: 're_existing',
          }),
        ],
      }),
    )

    await service.createRefund(
      1,
      {
        amountCents: 500,
        reason: 'requested_by_customer',
        requestId: 'req-1',
      },
      'user-1',
    )

    expect(stripeGatewayMock.createRefund).not.toHaveBeenCalled()
    expect(txMock.refund.create).not.toHaveBeenCalled()
  })

  it('refuses non-refundable orders', async () => {
    txMock.commande.findUniqueOrThrow.mockResolvedValue(
      createCommande({
        statut: 'paiement_en_attente',
        stripeId: null,
        stripePaymentIntentId: null,
      }),
    )

    await expect(
      service.createRefund(
        1,
        {
          reason: 'requested_by_customer',
          requestId: 'req-1',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('refuses refund amounts above the remaining amount', async () => {
    txMock.commande.findUniqueOrThrow.mockResolvedValue(
      createCommande({
        refunds: [
          createRefund({
            amountCents: 1000,
            status: 'succeeded',
          }),
        ],
      }),
    )
    txMock.refund.findUnique.mockResolvedValue(null)

    await expect(
      service.createRefund(
        1,
        {
          amountCents: 300,
          reason: 'requested_by_customer',
          requestId: 'req-1',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)
  })

  it('resolves the payment intent from an existing Checkout Session', async () => {
    const commandeWithoutPaymentIntent = createCommande({
      stripeId: 'cs_123',
      stripePaymentIntentId: null,
    })
    const commandeWithPaymentIntent = createCommande({
      stripeId: 'cs_123',
      stripePaymentIntentId: 'pi_resolved',
    })
    const refund = createRefund({
      stripePaymentIntentId: 'pi_resolved',
      idempotencyKey: 'commande:1:refund:user-1:request:req-1',
    })

    txMock.commande.findUniqueOrThrow
      .mockResolvedValueOnce(commandeWithoutPaymentIntent)
      .mockResolvedValueOnce(commandeWithoutPaymentIntent)
    txMock.commande.update.mockResolvedValue(commandeWithPaymentIntent)
    txMock.refund.findUnique.mockResolvedValue(null)
    txMock.refund.create.mockResolvedValue(refund)
    txMock.refund.findMany.mockResolvedValue([refund])
    stripeGatewayMock.retrieveCheckoutSessionPaymentDetails.mockResolvedValue({
      status: 'paid',
      paymentIntentId: 'pi_resolved',
      amountTotal: 1250,
      currency: 'eur',
    })
    stripeGatewayMock.createRefund.mockResolvedValue({
      id: 're_resolved',
      payment_intent: 'pi_resolved',
      amount: 1250,
      status: 'succeeded',
    })
    prismaMock.commande.findUnique.mockResolvedValue(
      createCommande({
        stripePaymentIntentId: 'pi_resolved',
        refunds: [
          {
            ...refund,
            status: 'succeeded',
            stripeRefundId: 're_resolved',
          },
        ],
      }),
    )

    await service.createRefund(
      1,
      {
        reason: 'requested_by_customer',
        requestId: 'req-1',
      },
      'user-1',
    )

    expect(
      stripeGatewayMock.retrieveCheckoutSessionPaymentDetails,
    ).toHaveBeenCalledWith('cs_123')
    expect(txMock.commande.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          stripePaymentIntentId: 'pi_resolved',
        },
      }),
    )
  })

  it('marks pending local refunds as failed when Stripe rejects the refund', async () => {
    const refund = createRefund({
      id: 20,
      status: 'pending',
      idempotencyKey: 'commande:1:refund:user-1:request:req-1',
    })
    txMock.commande.findUniqueOrThrow.mockResolvedValue(createCommande())
    txMock.refund.findUnique.mockResolvedValue(null)
    txMock.refund.create.mockResolvedValue(refund)
    stripeGatewayMock.createRefund.mockRejectedValue(
      Object.assign(new Error('lock timeout'), {
        code: 'lock_timeout',
      }),
    )

    await expect(
      service.createRefund(
        1,
        {
          reason: 'requested_by_customer',
          requestId: 'req-1',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
    expect(prismaMock.refund.updateMany).toHaveBeenCalledWith({
      where: {
        id: 20,
        status: 'pending',
        stripeRefundId: null,
      },
      data: {
        status: 'failed',
        failureReason: 'lock timeout',
      },
    })
  })

  it('syncs an existing local refund from a Stripe refund webhook', async () => {
    const refund = createRefund({
      id: 30,
      status: 'pending',
      stripeRefundId: null,
    })
    txMock.refund.findMany.mockResolvedValue([refund])
    txMock.refund.update.mockResolvedValue({
      ...refund,
      status: 'succeeded',
      stripeRefundId: 're_webhook',
    })

    await service.handleStripeRefundWebhook({
      id: 'evt_refund',
      type: 'refund.created',
      data: {
        object: {
          id: 're_webhook',
          payment_intent: {
            id: 'pi_123',
          },
          amount: 400,
          currency: 'EUR',
          status: 'succeeded',
          metadata: {
            refundId: '30',
          },
        },
      },
    })

    expect(txMock.refund.update).toHaveBeenCalledWith({
      where: { id: 30 },
      data: expect.objectContaining({
        stripeRefundId: 're_webhook',
        stripePaymentIntentId: 'pi_123',
        amountCents: 400,
        currency: 'eur',
        status: 'succeeded',
        stripeRawStatus: 'succeeded',
        failureReason: null,
      }),
    })
  })

  it('creates a local refund from a Stripe dashboard webhook', async () => {
    txMock.refund.findMany.mockResolvedValue([])
    txMock.commande.findFirst.mockResolvedValue({ id: 1 })

    await service.handleStripeRefundWebhook({
      id: 'evt_refund',
      type: 'refund.failed',
      data: {
        object: {
          id: 're_dashboard',
          payment_intent: 'pi_123',
          amount: 300,
          status: 'failed',
          reason: null,
          failure_reason: 'expired_or_canceled_card',
        },
      },
    })

    expect(txMock.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        commandeId: 1,
        stripeRefundId: 're_dashboard',
        stripePaymentIntentId: 'pi_123',
        amountCents: 300,
        currency: 'eur',
        reason: 'stripe_webhook',
        status: 'failed',
        failureReason: 'expired_or_canceled_card',
        idempotencyKey: 'stripe:re_dashboard',
      }),
    })
  })

  it('ignores Stripe refund webhooks with missing identifiers or invalid amounts', async () => {
    await service.handleStripeRefundWebhook({
      id: 'evt_missing',
      type: 'refund.created',
      data: {
        object: {
          id: 're_missing',
          amount: 300,
        },
      },
    })

    await service.handleStripeRefundWebhook({
      id: 'evt_invalid_amount',
      type: 'refund.created',
      data: {
        object: {
          id: 're_invalid',
          payment_intent: 'pi_123',
          amount: 0,
        },
      },
    })

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(txMock.refund.create).not.toHaveBeenCalled()
    expect(txMock.refund.update).not.toHaveBeenCalled()
  })

  it('syncs refunds from charge.refunded events', async () => {
    txMock.refund.findMany.mockResolvedValue([])
    txMock.commande.findFirst.mockResolvedValue({ id: 1 })

    await service.handleStripeRefundWebhook({
      id: 'evt_charge_refunded',
      type: 'charge.refunded',
      data: {
        object: {
          payment_intent: 'pi_charge',
          refunds: {
            data: [
              {
                id: 're_charge',
                amount: 200,
                status: 'succeeded',
              },
            ],
          },
        },
      },
    })

    expect(txMock.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stripeRefundId: 're_charge',
        stripePaymentIntentId: 'pi_charge',
        status: 'succeeded',
      }),
    })
  })

  function createCommande(data: Partial<CommandeMock> = {}): CommandeMock {
    return {
      id: data.id ?? 1,
      totalTtcCents: data.totalTtcCents ?? 1250,
      statut: data.statut ?? 'nouvelle',
      stripeId: data.stripeId !== undefined ? data.stripeId : 'cs_123',
      stripePaymentIntentId:
        data.stripePaymentIntentId !== undefined
          ? data.stripePaymentIntentId
          : 'pi_123',
      refunds: data.refunds ?? [],
    }
  }

  function createRefund(data: Partial<RefundMock> = {}): RefundMock {
    const now = new Date('2026-07-06T12:00:00.000Z')

    return {
      id: data.id ?? 1,
      commandeId: data.commandeId ?? 1,
      stripeRefundId: data.stripeRefundId ?? null,
      stripePaymentIntentId: data.stripePaymentIntentId ?? 'pi_123',
      amountCents: data.amountCents ?? 500,
      currency: data.currency ?? 'eur',
      reason: data.reason ?? 'requested_by_customer',
      internalNote: data.internalNote ?? null,
      status: data.status ?? 'pending',
      requestedByUserId: data.requestedByUserId ?? null,
      stripeRawStatus: data.stripeRawStatus ?? null,
      failureReason: data.failureReason ?? null,
      idempotencyKey: data.idempotencyKey ?? 'refund-key',
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    }
  }
})
