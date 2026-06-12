import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import {
  CheckoutSessionExpirationResult,
  CheckoutSessionStateResult,
  StripeCheckoutGateway,
} from '../commandes/stripe-checkout.gateway'
import { ListStripeReconciliationsDto } from './dto/list-stripe-reconciliations.dto'
import { StripeReconciliationMetrics } from './stripe-reconciliation.metrics'

type ReconciliationStatus = 'pending' | 'manual_review' | 'resolved' | 'failed'
type AttemptResult =
  | 'resolved'
  | 'retry_scheduled'
  | 'failed'
  | 'manual_review'
  | 'skipped'

type ClaimedReconciliation = {
  id: number
  commandeId: number | null
  stripeSessionId: string
  operation: string
  attempts: number
  leaseExpiresAt: Date
}

type ProcessOutcome = {
  status: ReconciliationStatus
  result: AttemptResult
  error?: string
  stripeState?: string
  manualReviewReason?: string
  nextAttemptAt?: Date
}

@Injectable()
export class StripeReconciliationService {
  private readonly logger = new Logger(StripeReconciliationService.name)
  readonly workerId = `stripe-reconciliation-${process.pid}-${Math.random()
    .toString(36)
    .slice(2)}`
  readonly workerEnabled: boolean
  readonly workerIntervalMs: number
  readonly batchSize: number
  private readonly maxAttempts: number
  private readonly backoffBaseMs: number
  private readonly backoffMaxMs: number
  private readonly leaseMs: number

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeCheckoutGateway: StripeCheckoutGateway,
    private readonly configService: ConfigService,
    private readonly metrics: StripeReconciliationMetrics,
  ) {
    this.workerEnabled =
      this.configService.get<string>('STRIPE_RECONCILIATION_WORKER_ENABLED') ===
      'true'
    this.workerIntervalMs = this.readPositiveInt(
      'STRIPE_RECONCILIATION_WORKER_INTERVAL_MS',
      60_000,
    )
    this.batchSize = this.readPositiveInt(
      'STRIPE_RECONCILIATION_BATCH_SIZE',
      10,
    )
    this.maxAttempts = this.readPositiveInt(
      'STRIPE_RECONCILIATION_MAX_ATTEMPTS',
      5,
    )
    this.backoffBaseMs = this.readPositiveInt(
      'STRIPE_RECONCILIATION_BACKOFF_BASE_MS',
      60_000,
    )
    this.backoffMaxMs = this.readPositiveInt(
      'STRIPE_RECONCILIATION_BACKOFF_MAX_MS',
      3_600_000,
    )
    this.leaseMs = this.readPositiveInt(
      'STRIPE_RECONCILIATION_LEASE_MS',
      300_000,
    )
  }

  async listReconciliations(query: ListStripeReconciliationsDto) {
    const page =
      this.parseBoundedInt(query.page, 1, 1, Number.MAX_SAFE_INTEGER) ?? 1
    const pageSize = this.parseBoundedInt(query.pageSize, 25, 1, 100) ?? 25
    const commandeId = this.parseBoundedInt(
      query.commandeId,
      undefined,
      1,
      Number.MAX_SAFE_INTEGER,
    )
    const where: Record<string, unknown> = {}

    if (query.status) {
      where.status = query.status
    }

    if (query.operation) {
      where.operation = query.operation
    }

    if (commandeId) {
      where.commandeId = commandeId
    }

    if (query.stripeSessionId) {
      where.stripeSessionId = query.stripeSessionId
    }

    const [items, total] = await Promise.all([
      this.prisma.stripeCheckoutReconciliation.findMany({
        where,
        orderBy: [{ status: 'asc' }, { nextAttemptAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          commande: {
            select: {
              id: true,
              nom: true,
              email: true,
              statut: true,
              totalTtcCents: true,
              createdAt: true,
            },
          },
          attemptsHistory: {
            orderBy: { startedAt: 'desc' },
            take: 3,
          },
        },
      }),
      this.prisma.stripeCheckoutReconciliation.count({ where }),
    ])

    return { items, total, page, pageSize }
  }

  async getReconciliation(id: number) {
    const reconciliation =
      await this.prisma.stripeCheckoutReconciliation.findUnique({
        where: { id },
        include: {
          commande: {
            select: {
              id: true,
              nom: true,
              email: true,
              statut: true,
              totalTtcCents: true,
              stripeId: true,
              createdAt: true,
            },
          },
          attemptsHistory: {
            orderBy: { startedAt: 'desc' },
          },
        },
      })

    if (!reconciliation) {
      throw new NotFoundException('Reconciliation introuvable')
    }

    return reconciliation
  }

  async processDueReconciliations(workerId = this.workerId) {
    const claimed = await this.claimDueReconciliations(workerId)

    for (const reconciliation of claimed) {
      await this.processClaimedReconciliation(reconciliation, workerId)
    }

    return { claimed: claimed.length }
  }

  async claimDueReconciliations(workerId = this.workerId) {
    const rows = await this.prisma.$queryRaw<ClaimedReconciliation[]>`
      WITH candidates AS (
        SELECT "id"
        FROM "StripeCheckoutReconciliation"
        WHERE "status" = 'pending'::"StripeCheckoutReconciliationStatus"
          AND "nextAttemptAt" <= CURRENT_TIMESTAMP
          AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" <= CURRENT_TIMESTAMP)
        ORDER BY "nextAttemptAt" ASC, "id" ASC
        LIMIT ${this.batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "StripeCheckoutReconciliation" reconciliation
      SET
        "claimedAt" = CURRENT_TIMESTAMP,
        "claimedBy" = ${workerId},
        "leaseExpiresAt" = CURRENT_TIMESTAMP + (${this.leaseMs} * INTERVAL '1 millisecond'),
        "updatedAt" = CURRENT_TIMESTAMP
      FROM candidates
      WHERE reconciliation."id" = candidates."id"
      RETURNING
        reconciliation."id",
        reconciliation."commandeId",
        reconciliation."stripeSessionId",
        reconciliation."operation"::text AS "operation",
        reconciliation."attempts",
        reconciliation."leaseExpiresAt"
    `

    if (rows.length > 0) {
      this.metrics.increment('stripe_reconciliation_claimed_total', {
        count: rows.length,
      })
    }

    return rows
  }

  async retryReconciliation(id: number, userId?: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`
      UPDATE "StripeCheckoutReconciliation"
      SET
        "status" = 'pending'::"StripeCheckoutReconciliationStatus",
        "nextAttemptAt" = CURRENT_TIMESTAMP,
        "claimedAt" = NULL,
        "claimedBy" = NULL,
        "leaseExpiresAt" = NULL,
        "failedAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
        AND "status" IN (
          'pending'::"StripeCheckoutReconciliationStatus",
          'manual_review'::"StripeCheckoutReconciliationStatus",
          'failed'::"StripeCheckoutReconciliationStatus"
        )
      RETURNING "id"
    `

    if (rows.length === 0) {
      throw new NotFoundException('Reconciliation relancable introuvable')
    }

    await this.prisma.stripeCheckoutReconciliationAttempt.create({
      data: {
        reconciliationId: id,
        attemptNumber: 0,
        origin: 'manual',
        action: 'manual_retry',
        result: 'retry_scheduled',
        workerId: userId,
        finishedAt: new Date(),
      },
    })

    return this.getReconciliation(id)
  }

  async resolveManually(id: number, justification: string, userId?: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`
      UPDATE "StripeCheckoutReconciliation"
      SET
        "status" = 'resolved'::"StripeCheckoutReconciliationStatus",
        "manualResolution" = ${justification},
        "manualResolvedByUserId" = ${userId ?? null},
        "resolvedAt" = CURRENT_TIMESTAMP,
        "claimedAt" = NULL,
        "claimedBy" = NULL,
        "leaseExpiresAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
        AND "status" IN (
          'manual_review'::"StripeCheckoutReconciliationStatus",
          'failed'::"StripeCheckoutReconciliationStatus"
        )
      RETURNING "id"
    `

    if (rows.length === 0) {
      throw new NotFoundException('Reconciliation resolvable introuvable')
    }

    await this.prisma.stripeCheckoutReconciliationAttempt.create({
      data: {
        reconciliationId: id,
        attemptNumber: 0,
        origin: 'manual',
        action: 'manual_resolution',
        result: 'resolved',
        error: justification,
        workerId: userId,
        finishedAt: new Date(),
      },
    })

    return this.getReconciliation(id)
  }

  private async processClaimedReconciliation(
    reconciliation: ClaimedReconciliation,
    workerId: string,
  ) {
    const startedAt = Date.now()
    const attemptNumber = reconciliation.attempts + 1
    const attempt =
      await this.prisma.stripeCheckoutReconciliationAttempt.create({
        data: {
          reconciliationId: reconciliation.id,
          attemptNumber,
          origin: 'automatic',
          action: reconciliation.operation,
          workerId,
        },
      })

    try {
      const localState = await this.readLocalState(reconciliation.commandeId)
      const outcome = await this.processStripeState(
        reconciliation,
        attemptNumber,
      )

      const finalized = await this.finalizeClaimedReconciliation(
        reconciliation.id,
        workerId,
        attemptNumber,
        outcome,
      )

      await this.prisma.stripeCheckoutReconciliationAttempt.update({
        where: { id: attempt.id },
        data: {
          localState,
          stripeState: outcome.stripeState,
          result: finalized ? outcome.result : 'skipped',
          error: finalized
            ? (outcome.error ?? outcome.manualReviewReason)
            : 'Lease was not owned by this worker during finalization',
          finishedAt: new Date(),
        },
      })

      this.metrics.increment('stripe_reconciliation_processed_total', {
        status: finalized ? outcome.status : 'skipped',
      })
    } catch (error) {
      const message = this.normalizeError(error)
      const outcome = this.getRetryOutcome(attemptNumber, message)
      const finalized = await this.finalizeClaimedReconciliation(
        reconciliation.id,
        workerId,
        attemptNumber,
        outcome,
      )

      await this.prisma.stripeCheckoutReconciliationAttempt.update({
        where: { id: attempt.id },
        data: {
          result: finalized ? outcome.result : 'skipped',
          error: message,
          finishedAt: new Date(),
        },
      })

      this.logger.error({
        message: 'Stripe reconciliation attempt failed',
        reconciliationId: reconciliation.id,
        stripeSessionId: reconciliation.stripeSessionId,
        error: message,
      })
    } finally {
      this.metrics.observeDuration(
        'stripe_reconciliation_duration_ms',
        Date.now() - startedAt,
      )
    }
  }

  private async processStripeState(
    reconciliation: ClaimedReconciliation,
    attemptNumber: number,
  ): Promise<ProcessOutcome> {
    if (reconciliation.operation === 'expire_checkout_session') {
      const result = await this.stripeCheckoutGateway.expireCheckoutSession(
        reconciliation.stripeSessionId,
      )

      return this.mapExpirationResult(result, attemptNumber)
    }

    const result = await this.stripeCheckoutGateway.retrieveCheckoutSession(
      reconciliation.stripeSessionId,
    )

    return this.mapReviewResult(result, reconciliation.operation, attemptNumber)
  }

  private mapExpirationResult(
    result: CheckoutSessionExpirationResult,
    attemptNumber: number,
  ): ProcessOutcome {
    if (result.status === 'expired' || result.status === 'already_expired') {
      return {
        status: 'resolved',
        result: 'resolved',
        stripeState: result.status,
      }
    }

    if (result.status === 'already_paid') {
      return {
        status: 'manual_review',
        result: 'manual_review',
        stripeState: result.status,
        manualReviewReason: result.paymentIntentId
          ? `Checkout session is paid with payment intent ${result.paymentIntentId}`
          : 'Checkout session is paid and must not be expired locally',
      }
    }

    if (result.status === 'not_found') {
      return {
        status: 'manual_review',
        result: 'manual_review',
        stripeState: result.status,
        manualReviewReason:
          'Checkout session was not found in Stripe during reconciliation',
      }
    }

    return result.retryable
      ? this.getRetryOutcome(attemptNumber, result.reason, result.status)
      : this.getManualReviewOutcome(result.reason, result.status)
  }

  private mapReviewResult(
    result: CheckoutSessionStateResult,
    operation: string,
    attemptNumber: number,
  ): ProcessOutcome {
    if (result.status === 'failed') {
      return result.retryable
        ? this.getRetryOutcome(attemptNumber, result.reason, result.status)
        : this.getManualReviewOutcome(result.reason, result.status)
    }

    return {
      status: 'manual_review',
      result: 'manual_review',
      stripeState: result.status,
      manualReviewReason:
        operation === 'review_unmatched_checkout_session'
          ? 'Checkout session has no matching local order'
          : `Checkout session requires manual review after Stripe state reload: ${result.status}`,
    }
  }

  private getRetryOutcome(
    attemptNumber: number,
    error: string,
    stripeState = 'failed',
  ): ProcessOutcome {
    if (attemptNumber >= this.maxAttempts) {
      return {
        status: 'failed',
        result: 'failed',
        error,
        stripeState,
      }
    }

    return {
      status: 'pending',
      result: 'retry_scheduled',
      error,
      stripeState,
      nextAttemptAt: this.calculateNextAttemptAt(attemptNumber),
    }
  }

  private getManualReviewOutcome(
    error: string,
    stripeState = 'failed',
  ): ProcessOutcome {
    return {
      status: 'manual_review',
      result: 'manual_review',
      error,
      stripeState,
      manualReviewReason: error,
    }
  }

  private async finalizeClaimedReconciliation(
    reconciliationId: number,
    workerId: string,
    attemptNumber: number,
    outcome: ProcessOutcome,
  ) {
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`
      UPDATE "StripeCheckoutReconciliation"
      SET
        "status" = ${outcome.status}::"StripeCheckoutReconciliationStatus",
        "attempts" = ${attemptNumber},
        "lastError" = ${outcome.error ?? outcome.manualReviewReason ?? null},
        "lastAttemptedAt" = CURRENT_TIMESTAMP,
        "nextAttemptAt" = ${outcome.nextAttemptAt ?? new Date()},
        "manualReviewReason" = ${outcome.manualReviewReason ?? null},
        "resolvedAt" = CASE
          WHEN ${outcome.status} = 'resolved' THEN CURRENT_TIMESTAMP
          ELSE NULL
        END,
        "failedAt" = CASE
          WHEN ${outcome.status} = 'failed' THEN CURRENT_TIMESTAMP
          ELSE NULL
        END,
        "claimedAt" = NULL,
        "claimedBy" = NULL,
        "leaseExpiresAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${reconciliationId}
        AND "claimedBy" = ${workerId}
        AND "leaseExpiresAt" > CURRENT_TIMESTAMP
      RETURNING "id"
    `

    return rows.length === 1
  }

  private calculateNextAttemptAt(attemptNumber: number) {
    const multiplier = 2 ** Math.max(attemptNumber - 1, 0)
    const delayMs = Math.min(this.backoffBaseMs * multiplier, this.backoffMaxMs)

    return new Date(Date.now() + delayMs)
  }

  private async readLocalState(commandeId: number | null) {
    if (!commandeId) {
      return null
    }

    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      select: {
        id: true,
        statut: true,
        stripeId: true,
      },
    })

    return commande
      ? `order:${commande.id}:${commande.statut}:${commande.stripeId ?? 'no_stripe_id'}`
      : `order:${commandeId}:missing`
  }

  private readPositiveInt(name: string, fallback: number) {
    const value = Number(this.configService.get<string>(name))

    if (Number.isInteger(value) && value > 0) {
      return value
    }

    return fallback
  }

  private normalizeError(error: unknown) {
    return error instanceof Error
      ? error.message
      : 'Unknown reconciliation error'
  }

  private parseBoundedInt(
    value: string | undefined,
    fallback: number | undefined,
    min: number,
    max: number,
  ) {
    if (!value) {
      return fallback
    }

    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      return fallback
    }

    return parsed
  }
}
