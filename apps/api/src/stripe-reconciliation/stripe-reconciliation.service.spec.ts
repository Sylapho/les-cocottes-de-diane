import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { StripeCheckoutGateway } from '../commandes/stripe-checkout.gateway'
import { PrismaService } from '../prisma/prisma.service'
import { StripeReconciliationMetrics } from './stripe-reconciliation.metrics'
import { StripeReconciliationService } from './stripe-reconciliation.service'

function createService(overrides: Record<string, string> = {}) {
  const queryRaw = jest.fn()
  const prisma = {
    $queryRaw: queryRaw,
    stripeCheckoutReconciliation: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    stripeCheckoutReconciliationAttempt: {
      create: jest.fn(),
      update: jest.fn(),
    },
    commande: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService
  const gateway = {
    expireCheckoutSession: jest.fn(),
    retrieveCheckoutSession: jest.fn(),
  } as unknown as StripeCheckoutGateway
  const config = {
    get: jest.fn((key: string) => overrides[key]),
  } as unknown as ConfigService
  const metrics = {
    increment: jest.fn(),
    observeDuration: jest.fn(),
  } as unknown as StripeReconciliationMetrics
  const service = new StripeReconciliationService(
    prisma,
    gateway,
    config,
    metrics,
  )

  return {
    service,
    prisma: prisma as unknown as {
      $queryRaw: jest.Mock
      stripeCheckoutReconciliation: {
        findMany: jest.Mock
        count: jest.Mock
        findUnique: jest.Mock
      }
      stripeCheckoutReconciliationAttempt: {
        create: jest.Mock
        update: jest.Mock
      }
      commande: {
        findUnique: jest.Mock
      }
    },
    gateway: gateway as unknown as {
      expireCheckoutSession: jest.Mock
      retrieveCheckoutSession: jest.Mock
    },
    metrics: metrics as unknown as {
      increment: jest.Mock
      observeDuration: jest.Mock
    },
  }
}

describe('StripeReconciliationService', () => {
  it('lists reconciliations with filters', async () => {
    const { service, prisma } = createService()
    prisma.stripeCheckoutReconciliation.findMany.mockResolvedValue([{ id: 1 }])
    prisma.stripeCheckoutReconciliation.count.mockResolvedValue(1)

    await expect(
      service.listReconciliations({
        status: 'pending',
        operation: 'expire_checkout_session',
        page: '2',
        pageSize: '10',
      }),
    ).resolves.toMatchObject({
      total: 1,
      page: 2,
      pageSize: 10,
    })

    expect(prisma.stripeCheckoutReconciliation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'pending',
          operation: 'expire_checkout_session',
        },
        skip: 10,
        take: 10,
      }),
    )
  })

  it('returns one reconciliation with history', async () => {
    const { service, prisma } = createService()
    prisma.stripeCheckoutReconciliation.findUnique.mockResolvedValue({ id: 1 })

    await expect(service.getReconciliation(1)).resolves.toEqual({ id: 1 })
  })

  it('throws when a reconciliation is missing', async () => {
    const { service, prisma } = createService()
    prisma.stripeCheckoutReconciliation.findUnique.mockResolvedValue(null)

    await expect(service.getReconciliation(1)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('claims due reconciliations with a worker lease', async () => {
    const { service, prisma, metrics } = createService()
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }])

    await expect(service.claimDueReconciliations('worker-a')).resolves.toEqual([
      { id: 1 },
    ])
    expect(metrics.increment).toHaveBeenCalledWith(
      'stripe_reconciliation_claimed_total',
      { count: 1 },
    )
  })

  it('resolves an expired checkout session outside the claim query', async () => {
    const { service, prisma, gateway } = createService()
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 1,
          commandeId: 10,
          stripeSessionId: 'cs_test',
          operation: 'expire_checkout_session',
          attempts: 0,
          leaseExpiresAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([{ id: 1 }])
    prisma.stripeCheckoutReconciliationAttempt.create.mockResolvedValue({
      id: 100,
    })
    prisma.commande.findUnique.mockResolvedValue({
      id: 10,
      statut: 'paiement_en_attente',
      stripeId: 'cs_test',
    })
    gateway.expireCheckoutSession.mockResolvedValue({ status: 'expired' })

    await expect(
      service.processDueReconciliations('worker-a'),
    ).resolves.toEqual({
      claimed: 1,
    })

    expect(gateway.expireCheckoutSession).toHaveBeenCalledWith('cs_test')
    expect(
      prisma.stripeCheckoutReconciliationAttempt.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 100 },
        data: expect.objectContaining({
          result: 'resolved',
          stripeState: 'expired',
        }),
      }),
    )
  })

  it('sends paid expiration attempts to manual review', async () => {
    const { service, prisma, gateway } = createService()
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 1,
          commandeId: 10,
          stripeSessionId: 'cs_paid',
          operation: 'expire_checkout_session',
          attempts: 0,
          leaseExpiresAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([{ id: 1 }])
    prisma.stripeCheckoutReconciliationAttempt.create.mockResolvedValue({
      id: 100,
    })
    prisma.commande.findUnique.mockResolvedValue(null)
    gateway.expireCheckoutSession.mockResolvedValue({
      status: 'already_paid',
      paymentIntentId: 'pi_123',
    })

    await service.processDueReconciliations('worker-a')

    expect(
      prisma.stripeCheckoutReconciliationAttempt.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          result: 'manual_review',
          stripeState: 'already_paid',
          error: 'Checkout session is paid with payment intent pi_123',
        }),
      }),
    )
  })

  it('schedules retryable Stripe failures until max attempts', async () => {
    const { service, prisma, gateway } = createService({
      STRIPE_RECONCILIATION_MAX_ATTEMPTS: '3',
    })
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 1,
          commandeId: null,
          stripeSessionId: 'cs_retry',
          operation: 'review_unmatched_checkout_session',
          attempts: 0,
          leaseExpiresAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([{ id: 1 }])
    prisma.stripeCheckoutReconciliationAttempt.create.mockResolvedValue({
      id: 100,
    })
    gateway.retrieveCheckoutSession.mockResolvedValue({
      status: 'failed',
      retryable: true,
      reason: 'Stripe timeout',
    })

    await service.processDueReconciliations('worker-a')

    expect(
      prisma.stripeCheckoutReconciliationAttempt.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          result: 'retry_scheduled',
          stripeState: 'failed',
          error: 'Stripe timeout',
        }),
      }),
    )
  })

  it('records a skipped attempt when the lease is lost', async () => {
    const { service, prisma, gateway } = createService()
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 1,
          commandeId: null,
          stripeSessionId: 'cs_lost',
          operation: 'expire_checkout_session',
          attempts: 0,
          leaseExpiresAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([])
    prisma.stripeCheckoutReconciliationAttempt.create.mockResolvedValue({
      id: 100,
    })
    gateway.expireCheckoutSession.mockResolvedValue({ status: 'expired' })

    await service.processDueReconciliations('worker-a')

    expect(
      prisma.stripeCheckoutReconciliationAttempt.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          result: 'skipped',
        }),
      }),
    )
  })

  it('marks a reconciliation for manual retry', async () => {
    const { service, prisma } = createService()
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }])
    prisma.stripeCheckoutReconciliationAttempt.create.mockResolvedValue({
      id: 100,
    })
    prisma.stripeCheckoutReconciliation.findUnique.mockResolvedValue({ id: 1 })

    await expect(service.retryReconciliation(1, 'user-1')).resolves.toEqual({
      id: 1,
    })
    expect(
      prisma.stripeCheckoutReconciliationAttempt.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          origin: 'manual',
          action: 'manual_retry',
          result: 'retry_scheduled',
        }),
      }),
    )
  })

  it('rejects retry when no row is updated', async () => {
    const { service, prisma } = createService()
    prisma.$queryRaw.mockResolvedValue([])

    await expect(
      service.retryReconciliation(1, 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('records a manual resolution with justification', async () => {
    const { service, prisma } = createService()
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }])
    prisma.stripeCheckoutReconciliationAttempt.create.mockResolvedValue({
      id: 100,
    })
    prisma.stripeCheckoutReconciliation.findUnique.mockResolvedValue({ id: 1 })

    await expect(
      service.resolveManually(1, 'Refund confirmed in Stripe', 'user-1'),
    ).resolves.toEqual({ id: 1 })
    expect(
      prisma.stripeCheckoutReconciliationAttempt.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          origin: 'manual',
          action: 'manual_resolution',
          result: 'resolved',
          error: 'Refund confirmed in Stripe',
        }),
      }),
    )
  })
})
