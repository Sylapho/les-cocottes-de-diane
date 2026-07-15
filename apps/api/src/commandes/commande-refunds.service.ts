import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { Prisma } from '../../prisma/generated/prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import {
  CommandeRefundReason,
  CreateCommandeRefundDto,
} from './dto/create-commande-refund.dto'
import { StripeCheckoutGateway } from './stripe-checkout.gateway'

type RefundStatus =
  'pending' | 'requires_action' | 'succeeded' | 'failed' | 'canceled'

type RefundWebhookEvent = {
  id: string
  type: string
  data: {
    object: unknown
  }
}

type StripeRefundObject = {
  id?: string | null
  amount?: number | null
  currency?: string | null
  payment_intent?: string | { id?: string | null } | null
  status?: string | null
  reason?: string | null
  failure_reason?: string | null
  metadata?: Record<string, string | null | undefined> | null
}

type StripeChargeObject = {
  id?: string | null
  payment_intent?: string | { id?: string | null } | null
  refunds?: {
    data?: StripeRefundObject[]
  } | null
}

type LocalRefund = {
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

type RefundableCommande = {
  id: number
  totalTtcCents: number
  statut: string
  stripeId: string | null
  stripePaymentIntentId: string | null
  refunds: LocalRefund[]
}

type PreparedRefundResult =
  | {
      type: 'ready'
      refundId: number
      commandeId: number
      amountCents: number
      currency: string
      reason: CommandeRefundReason
      idempotencyKey: string
      stripePaymentIntentId: string
    }
  | {
      type: 'idempotent'
    }
  | {
      type: 'resolve_payment_intent'
      stripeSessionId: string
      expectedAmountCents: number
    }

const REFUND_RESERVED_STATUSES: RefundStatus[] = [
  'pending',
  'requires_action',
  'succeeded',
]

const STRIPE_REFUND_EVENT_TYPES = new Set([
  'refund.created',
  'refund.updated',
  'refund.failed',
  'charge.refund.updated',
  'charge.refunded',
])

@Injectable()
export class CommandeRefundsService {
  private readonly logger = new Logger(CommandeRefundsService.name)
  private readonly maxStripeFailureReasonLength = 500

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeCheckoutGateway: StripeCheckoutGateway,
  ) {}

  isStripeRefundWebhookEvent(type: string) {
    return STRIPE_REFUND_EVENT_TYPES.has(type)
  }

  async listForCommande(commandeId: number) {
    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: {
        refunds: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!commande) {
      throw new NotFoundException('Commande introuvable')
    }

    return this.toRefundSummary(commande)
  }

  async createRefund(
    commandeId: number,
    data: CreateCommandeRefundDto,
    requestedByUserId: string | undefined,
  ) {
    let resolvedPaymentIntentId: string | undefined

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const prepared = await this.prepareRefundRequest(
        commandeId,
        data,
        requestedByUserId,
        resolvedPaymentIntentId,
      )

      if (prepared.type === 'idempotent') {
        return this.listForCommande(commandeId)
      }

      if (prepared.type === 'resolve_payment_intent') {
        resolvedPaymentIntentId = await this.resolvePaymentIntentFromCheckout(
          prepared.stripeSessionId,
          prepared.expectedAmountCents,
        )
        continue
      }

      await this.createStripeRefund(prepared)

      return this.listForCommande(commandeId)
    }

    throw new BadRequestException({
      code: 'ORDER_NOT_REFUNDABLE',
      message: 'Paiement Stripe confirme introuvable pour cette commande',
    })
  }

  async handleStripeRefundWebhook(event: RefundWebhookEvent) {
    if (
      event.type === 'refund.created' ||
      event.type === 'refund.updated' ||
      event.type === 'refund.failed' ||
      event.type === 'charge.refund.updated'
    ) {
      await this.syncStripeRefund(event.data.object as StripeRefundObject)
      return
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as StripeChargeObject
      const refunds = charge.refunds?.data ?? []

      for (const refund of refunds) {
        if (!refund.payment_intent) {
          refund.payment_intent = charge.payment_intent
        }

        await this.syncStripeRefund(refund)
      }
    }
  }

  private async prepareRefundRequest(
    commandeId: number,
    data: CreateCommandeRefundDto,
    requestedByUserId: string | undefined,
    resolvedPaymentIntentId: string | undefined,
  ): Promise<PreparedRefundResult> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockCommande(tx, commandeId)

      let commande = await tx.commande.findUniqueOrThrow({
        where: { id: commandeId },
        include: {
          refunds: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      })

      if (!this.isCommandePotentiallyRefundable(commande)) {
        throw new BadRequestException({
          code: 'ORDER_NOT_REFUNDABLE',
          message: 'Cette commande ne peut pas etre remboursee',
        })
      }

      if (resolvedPaymentIntentId && !commande.stripePaymentIntentId) {
        commande = await tx.commande.update({
          where: { id: commande.id },
          data: {
            stripePaymentIntentId: resolvedPaymentIntentId,
          },
          include: {
            refunds: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        })
      }

      if (!commande.stripePaymentIntentId) {
        if (commande.stripeId) {
          return {
            type: 'resolve_payment_intent',
            stripeSessionId: commande.stripeId,
            expectedAmountCents: commande.totalTtcCents,
          }
        }

        throw new BadRequestException({
          code: 'ORDER_NOT_REFUNDABLE',
          message: 'Paiement Stripe confirme introuvable pour cette commande',
        })
      }

      const requestIdempotencyKey = data.requestId
        ? this.buildIdempotencyKey({
            commandeId,
            requestedByUserId,
            requestId: data.requestId,
          })
        : undefined
      const existingByRequestId = requestIdempotencyKey
        ? await tx.refund.findUnique({
            where: {
              idempotencyKey: requestIdempotencyKey,
            },
          })
        : null

      if (
        existingByRequestId &&
        (existingByRequestId.status !== 'failed' ||
          existingByRequestId.stripeRefundId)
      ) {
        return { type: 'idempotent' }
      }

      const summary = this.calculateRefundSummary(commande)
      const requestedAmountCents =
        existingByRequestId?.amountCents ??
        data.amountCents ??
        summary.refundableAmountCents

      if (requestedAmountCents <= 0) {
        throw new BadRequestException({
          code: 'ORDER_NOT_REFUNDABLE',
          message: 'Cette commande est deja integralement remboursee',
        })
      }

      if (data.amountCents && data.amountCents !== requestedAmountCents) {
        throw new ConflictException({
          code: 'REFUND_IDEMPOTENCY_CONFLICT',
          message:
            'Cette demande de remboursement existe deja avec un montant different',
        })
      }

      if (requestedAmountCents > summary.refundableAmountCents) {
        throw new UnprocessableEntityException({
          code: 'REFUND_AMOUNT_EXCEEDS_REFUNDABLE',
          message: 'Le montant depasse le restant remboursable',
          refundableAmountCents: summary.refundableAmountCents,
        })
      }

      const idempotencyKey =
        requestIdempotencyKey ??
        this.buildIdempotencyKey({
          commandeId,
          requestedByUserId,
          amountCents: requestedAmountCents,
          reason: data.reason,
          internalNote: data.internalNote,
        })

      const existingByFallbackKey = requestIdempotencyKey
        ? null
        : await tx.refund.findUnique({
            where: {
              idempotencyKey,
            },
          })

      const existing = existingByRequestId ?? existingByFallbackKey

      if (
        existing &&
        (existing.status !== 'failed' || existing.stripeRefundId)
      ) {
        return { type: 'idempotent' }
      }

      const refund = existing
        ? await tx.refund.update({
            where: { id: existing.id },
            data: {
              status: 'pending',
              failureReason: null,
              stripeRawStatus: null,
              requestedByUserId: requestedByUserId ?? null,
            },
          })
        : await tx.refund.create({
            data: {
              commandeId: commande.id,
              stripePaymentIntentId: commande.stripePaymentIntentId,
              amountCents: requestedAmountCents,
              currency: 'eur',
              reason: data.reason,
              internalNote: this.normalizeOptionalText(data.internalNote),
              status: 'pending',
              requestedByUserId: requestedByUserId ?? null,
              idempotencyKey,
            },
          })

      return {
        type: 'ready',
        refundId: refund.id,
        commandeId: commande.id,
        amountCents: refund.amountCents,
        currency: refund.currency,
        reason: data.reason,
        idempotencyKey: refund.idempotencyKey,
        stripePaymentIntentId: refund.stripePaymentIntentId,
      }
    })
  }

  private async createStripeRefund(
    prepared: Extract<PreparedRefundResult, { type: 'ready' }>,
  ) {
    try {
      const stripeRefund = await this.stripeCheckoutGateway.createRefund(
        {
          payment_intent: prepared.stripePaymentIntentId,
          amount: prepared.amountCents,
          reason: this.toStripeRefundReason(prepared.reason),
          metadata: {
            commandeId: String(prepared.commandeId),
            refundId: String(prepared.refundId),
            idempotencyKey: prepared.idempotencyKey,
            localReason: prepared.reason,
          },
        },
        {
          idempotencyKey: prepared.idempotencyKey,
        },
      )

      await this.syncStripeRefund(stripeRefund, {
        refundId: prepared.refundId,
        idempotencyKey: prepared.idempotencyKey,
      })
    } catch (error) {
      await this.markRefundFailedAfterStripeError(prepared.refundId, error)
      throw this.toStripeRefundException(error)
    }
  }

  private async syncStripeRefund(
    refund: StripeRefundObject,
    localHints: { refundId?: number; idempotencyKey?: string } = {},
  ) {
    const stripeRefundId = this.normalizeOptionalText(refund.id)
    const paymentIntentId = this.extractPaymentIntentId(refund.payment_intent)

    if (!stripeRefundId || !paymentIntentId) {
      this.logger.warn({
        message:
          'Stripe refund webhook ignored because identifiers are missing',
        stripeRefundId,
        paymentIntentId,
      })
      return
    }

    const localStatus = this.toLocalRefundStatus(refund.status)
    const rawStatus = refund.status ?? null
    const failureReason = this.normalizeOptionalText(refund.failure_reason)
    const amountCents = refund.amount ?? 0
    const currency = (refund.currency ?? 'eur').toLowerCase()
    const metadataIdempotencyKey = this.normalizeOptionalText(
      refund.metadata?.idempotencyKey,
    )
    const metadataRefundId = this.parsePositiveInt(refund.metadata?.refundId)

    if (amountCents <= 0) {
      this.logger.warn({
        message: 'Stripe refund webhook ignored because amount is invalid',
        stripeRefundId,
        paymentIntentId,
        amountCents,
      })
      return
    }

    await this.prisma.$transaction(async (tx) => {
      const localRefund = await this.findLocalRefundForStripeRefund(tx, {
        stripeRefundId,
        paymentIntentId,
        refundId: localHints.refundId ?? metadataRefundId,
        idempotencyKey:
          localHints.idempotencyKey ?? metadataIdempotencyKey ?? undefined,
      })

      if (localRefund) {
        await tx.refund.update({
          where: { id: localRefund.id },
          data: {
            stripeRefundId,
            stripePaymentIntentId: paymentIntentId,
            amountCents: amountCents || localRefund.amountCents,
            currency,
            status: localStatus,
            stripeRawStatus: rawStatus,
            failureReason:
              localStatus === 'failed'
                ? (failureReason ?? 'Stripe refund failed')
                : null,
          },
        })

        await this.attachPaymentIntentToCommandeIfMissing(tx, {
          commandeId: localRefund.commandeId,
          paymentIntentId,
        })

        return
      }

      const commande = await tx.commande.findFirst({
        where: {
          stripePaymentIntentId: paymentIntentId,
        },
        select: {
          id: true,
        },
      })

      if (!commande) {
        this.logger.warn({
          message: 'Stripe refund webhook ignored because no order matches',
          stripeRefundId,
          paymentIntentId,
        })
        return
      }

      await tx.refund.create({
        data: {
          commandeId: commande.id,
          stripeRefundId,
          stripePaymentIntentId: paymentIntentId,
          amountCents,
          currency,
          reason: refund.reason ?? 'stripe_webhook',
          status: localStatus,
          requestedByUserId: null,
          stripeRawStatus: rawStatus,
          failureReason:
            localStatus === 'failed'
              ? (failureReason ?? 'Stripe refund failed')
              : null,
          idempotencyKey: `stripe:${stripeRefundId}`,
        },
      })
    })
  }

  private async findLocalRefundForStripeRefund(
    tx: Prisma.TransactionClient,
    data: {
      stripeRefundId: string
      paymentIntentId: string
      refundId?: number
      idempotencyKey?: string
    },
  ) {
    const candidates = await tx.refund.findMany({
      where: {
        OR: [
          { stripeRefundId: data.stripeRefundId },
          ...(data.refundId ? [{ id: data.refundId }] : []),
          ...(data.idempotencyKey
            ? [{ idempotencyKey: data.idempotencyKey }]
            : []),
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (candidates.length === 0) {
      return null
    }

    const matchingCandidate = candidates.find(
      (candidate) =>
        candidate.stripePaymentIntentId === data.paymentIntentId ||
        candidate.stripeRefundId === data.stripeRefundId,
    )

    return matchingCandidate ?? candidates[0]
  }

  private async attachPaymentIntentToCommandeIfMissing(
    tx: Prisma.TransactionClient,
    data: {
      commandeId: number
      paymentIntentId: string
    },
  ) {
    await tx.commande.updateMany({
      where: {
        id: data.commandeId,
        stripePaymentIntentId: null,
      },
      data: {
        stripePaymentIntentId: data.paymentIntentId,
      },
    })
  }

  private async resolvePaymentIntentFromCheckout(
    stripeSessionId: string,
    expectedAmountCents: number,
  ) {
    const details =
      await this.stripeCheckoutGateway.retrieveCheckoutSessionPaymentDetails(
        stripeSessionId,
      )

    if (details.status === 'paid') {
      if (
        details.amountTotal !== undefined &&
        details.amountTotal !== expectedAmountCents
      ) {
        throw new ConflictException({
          code: 'STRIPE_PAYMENT_AMOUNT_CONFLICT',
          message: 'Le paiement Stripe ne correspond pas au total commande',
        })
      }

      if (details.currency && details.currency.toLowerCase() !== 'eur') {
        throw new ConflictException({
          code: 'STRIPE_PAYMENT_CURRENCY_CONFLICT',
          message: 'La devise Stripe ne correspond pas a la commande',
        })
      }

      return details.paymentIntentId
    }

    if (details.status === 'failed') {
      throw new ServiceUnavailableException({
        code: 'STRIPE_PAYMENT_LOOKUP_FAILED',
        message: 'Verification du paiement Stripe temporairement indisponible',
      })
    }

    throw new BadRequestException({
      code: 'ORDER_NOT_REFUNDABLE',
      message: 'Paiement Stripe confirme introuvable pour cette commande',
    })
  }

  private async markRefundFailedAfterStripeError(
    refundId: number,
    error: unknown,
  ) {
    await this.prisma.refund.updateMany({
      where: {
        id: refundId,
        status: 'pending',
        stripeRefundId: null,
      },
      data: {
        status: 'failed',
        failureReason: this.formatStripeError(error),
      },
    })
  }

  private async lockCommande(tx: Prisma.TransactionClient, commandeId: number) {
    const rows = await tx.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "Commande"
      WHERE "id" = ${commandeId}
      FOR UPDATE
    `

    if (rows.length === 0) {
      throw new NotFoundException('Commande introuvable')
    }
  }

  private calculateRefundSummary(commande: RefundableCommande) {
    const refundedAmountCents = commande.refunds
      .filter((refund) => refund.status === 'succeeded')
      .reduce((sum, refund) => sum + refund.amountCents, 0)
    const reservedAmountCents = commande.refunds
      .filter((refund) => REFUND_RESERVED_STATUSES.includes(refund.status))
      .reduce((sum, refund) => sum + refund.amountCents, 0)
    const pendingAmountCents = commande.refunds
      .filter(
        (refund) =>
          refund.status === 'pending' || refund.status === 'requires_action',
      )
      .reduce((sum, refund) => sum + refund.amountCents, 0)
    const refundableAmountCents = Math.max(
      0,
      commande.totalTtcCents - reservedAmountCents,
    )
    const hasFailedRefund = commande.refunds.some(
      (refund) => refund.status === 'failed',
    )

    return {
      commandeId: commande.id,
      totalAmountCents: commande.totalTtcCents,
      refundedAmountCents,
      pendingAmountCents,
      refundableAmountCents,
      refundStatus: this.getAggregateRefundStatus({
        totalAmountCents: commande.totalTtcCents,
        refundedAmountCents,
        pendingAmountCents,
        hasFailedRefund,
      }),
      isRefundable:
        this.isCommandePotentiallyRefundable(commande) &&
        refundableAmountCents > 0,
    }
  }

  private toRefundSummary(commande: RefundableCommande) {
    return {
      ...this.calculateRefundSummary(commande),
      refunds: commande.refunds.map((refund) => ({
        id: refund.id,
        commandeId: refund.commandeId,
        stripeRefundId: refund.stripeRefundId,
        stripePaymentIntentId: refund.stripePaymentIntentId,
        amountCents: refund.amountCents,
        currency: refund.currency,
        reason: refund.reason,
        internalNote: refund.internalNote,
        status: refund.status,
        requestedByUserId: refund.requestedByUserId,
        stripeRawStatus: refund.stripeRawStatus,
        failureReason: refund.failureReason,
        createdAt: refund.createdAt,
        updatedAt: refund.updatedAt,
      })),
    }
  }

  private getAggregateRefundStatus(data: {
    totalAmountCents: number
    refundedAmountCents: number
    pendingAmountCents: number
    hasFailedRefund: boolean
  }) {
    if (data.pendingAmountCents > 0) {
      return 'pending'
    }

    if (data.refundedAmountCents >= data.totalAmountCents) {
      return 'full'
    }

    if (data.refundedAmountCents > 0) {
      return 'partial'
    }

    if (data.hasFailedRefund) {
      return 'failed'
    }

    return 'none'
  }

  private isCommandePotentiallyRefundable(commande: {
    statut: string
    stripeId?: string | null
    stripePaymentIntentId?: string | null
  }) {
    return (
      ['nouvelle', 'preparee', 'traitee', 'paiement_a_verifier'].includes(
        commande.statut,
      ) && Boolean(commande.stripePaymentIntentId || commande.stripeId)
    )
  }

  private buildIdempotencyKey(data: {
    commandeId: number
    requestedByUserId: string | undefined
    requestId?: string
    amountCents?: number
    reason?: string
    internalNote?: string
  }) {
    const requester = data.requestedByUserId ?? 'unknown'

    if (data.requestId) {
      return `commande:${data.commandeId}:refund:${requester}:request:${data.requestId}`
    }

    const noteHash = this.hashForIdempotency(data.internalNote ?? '')

    return [
      `commande:${data.commandeId}`,
      'refund',
      requester,
      data.amountCents,
      data.reason,
      noteHash,
    ].join(':')
  }

  private hashForIdempotency(value: string) {
    let hash = 0

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0
    }

    return hash.toString(16)
  }

  private toStripeRefundReason(reason: CommandeRefundReason) {
    if (reason === 'other') {
      return undefined
    }

    return reason
  }

  private toLocalRefundStatus(status: string | null | undefined): RefundStatus {
    if (
      status === 'succeeded' ||
      status === 'failed' ||
      status === 'canceled' ||
      status === 'requires_action'
    ) {
      return status
    }

    return 'pending'
  }

  private extractPaymentIntentId(
    paymentIntent: StripeRefundObject['payment_intent'],
  ) {
    if (!paymentIntent) {
      return undefined
    }

    if (typeof paymentIntent === 'string') {
      return paymentIntent
    }

    return this.normalizeOptionalText(paymentIntent.id)
  }

  private parsePositiveInt(value: string | null | undefined) {
    if (!value || !/^[1-9]\d*$/.test(value)) {
      return undefined
    }

    return Number(value)
  }

  private normalizeOptionalText(value: string | null | undefined) {
    const normalized = value?.trim()

    return normalized ? normalized : undefined
  }

  private toStripeRefundException(error: unknown) {
    if (this.isRetryableStripeError(error)) {
      return new ServiceUnavailableException({
        code: 'STRIPE_REFUND_UNAVAILABLE',
        message: 'Remboursement Stripe temporairement indisponible',
      })
    }

    return new BadRequestException({
      code: 'STRIPE_REFUND_FAILED',
      message: 'Remboursement Stripe refuse',
    })
  }

  private isRetryableStripeError(error: unknown) {
    if (typeof error !== 'object' || error === null) {
      return true
    }

    const code =
      'code' in error && typeof error.code === 'string' ? error.code : undefined
    const type =
      'type' in error && typeof error.type === 'string' ? error.type : undefined
    const statusCode =
      'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : undefined

    if (
      type === 'StripeAPIError' ||
      type === 'StripeConnectionError' ||
      type === 'StripeRateLimitError'
    ) {
      return true
    }

    if (code === 'lock_timeout' || code === 'rate_limit') {
      return true
    }

    if (statusCode && (statusCode === 409 || statusCode === 429)) {
      return true
    }

    if (statusCode && statusCode >= 500) {
      return true
    }

    return false
  }

  private formatStripeError(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown Stripe refund error'

    return message.slice(0, this.maxStripeFailureReasonLength)
  }
}
