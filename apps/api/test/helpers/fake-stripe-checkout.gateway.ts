import Stripe from 'stripe'
import {
  CheckoutSessionPaymentDetailsResult,
  CheckoutSessionStateResult,
  CreatedCheckoutSession,
  CreatedStripeRefund,
  ExpireCheckoutSessionError,
  ExpireCheckoutSessionResult,
  StripeCheckoutGateway,
} from '../../src/commandes/stripe-checkout.gateway'

export class FakeStripeCheckoutGateway {
  readonly createdSessions: {
    params: Parameters<StripeCheckoutGateway['createCheckoutSession']>[0]
    options?: Parameters<StripeCheckoutGateway['createCheckoutSession']>[1]
  }[] = []
  readonly createdRefunds: {
    params: NonNullable<Parameters<StripeCheckoutGateway['createRefund']>[0]>
    options?: Parameters<StripeCheckoutGateway['createRefund']>[1]
  }[] = []
  readonly expiredSessions: string[] = []
  readonly retrievedSessions: string[] = []
  private nextSession: CreatedCheckoutSession = {
    id: 'cs_test_e2e_success',
    object: 'checkout.session',
    url: 'https://checkout.stripe.test/e2e',
  } as CreatedCheckoutSession
  private nextError: Error | null = null
  private nextRefund: CreatedStripeRefund | null = null
  private nextRefundError: Error | null = null
  private nextExpirationError: Error | null = null
  private nextExpirationResult: ExpireCheckoutSessionResult | null = null
  private nextRetrieveResult: CheckoutSessionStateResult | null = null
  private nextPaymentDetailsResult: CheckoutSessionPaymentDetailsResult | null =
    null
  private nextExpirationBarrier: {
    started: Promise<void>
    released: Promise<ExpireCheckoutSessionResult>
    release: (result: ExpireCheckoutSessionResult) => void
  } | null = null
  private resolveNextExpirationStarted: (() => void) | null = null

  reset() {
    this.createdSessions.length = 0
    this.createdRefunds.length = 0
    this.expiredSessions.length = 0
    this.retrievedSessions.length = 0
    this.nextError = null
    this.nextRefund = null
    this.nextRefundError = null
    this.nextExpirationError = null
    this.nextExpirationResult = null
    this.nextRetrieveResult = null
    this.nextPaymentDetailsResult = null
    this.nextExpirationBarrier = null
    this.resolveNextExpirationStarted = null
    this.nextSession = {
      id: 'cs_test_e2e_success',
      object: 'checkout.session',
      url: 'https://checkout.stripe.test/e2e',
    } as CreatedCheckoutSession
  }

  setNextSession(session: Pick<CreatedCheckoutSession, 'id' | 'url'>) {
    this.nextSession = {
      id: session.id,
      object: 'checkout.session',
      url: session.url,
    } as CreatedCheckoutSession
  }

  failNextSession(error = new Error('Stripe unavailable')) {
    this.nextError = error
  }

  setNextRefund(refund: Partial<CreatedStripeRefund> & { id: string }) {
    this.nextRefund = {
      object: 'refund',
      amount: 0,
      currency: 'eur',
      payment_intent: 'pi_test_refund',
      status: 'succeeded',
      ...refund,
    } as CreatedStripeRefund
  }

  failNextRefund(error = new Error('Stripe refund unavailable')) {
    this.nextRefundError = error
  }

  failNextExpiration(
    error = new ExpireCheckoutSessionError('Stripe expiration unavailable'),
  ) {
    this.nextExpirationError = error
  }

  setNextExpirationResult(result: ExpireCheckoutSessionResult) {
    this.nextExpirationResult = result
  }

  setNextRetrieveResult(result: CheckoutSessionStateResult) {
    this.nextRetrieveResult = result
  }

  setNextPaymentDetailsResult(result: CheckoutSessionPaymentDetailsResult) {
    this.nextPaymentDetailsResult = result
  }

  pauseNextExpiration() {
    let resolveStarted: () => void = () => {}
    let release: (result: ExpireCheckoutSessionResult) => void = () => {}
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve
    })
    const released = new Promise<ExpireCheckoutSessionResult>((resolve) => {
      release = resolve
    })

    this.resolveNextExpirationStarted = resolveStarted
    this.nextExpirationBarrier = {
      started,
      released,
      release: (result) => {
        release(result)
        this.nextExpirationResult = null
      },
    }
    const barrier = this.nextExpirationBarrier

    return {
      started,
      release: (result: ExpireCheckoutSessionResult) => {
        barrier.release(result)
      },
    }
  }

  createCheckoutSession(
    params: Parameters<StripeCheckoutGateway['createCheckoutSession']>[0],
    options?: Parameters<StripeCheckoutGateway['createCheckoutSession']>[1],
  ): Promise<CreatedCheckoutSession> {
    this.createdSessions.push({ params, options })

    if (this.nextError) {
      const error = this.nextError
      this.nextError = null
      return Promise.reject(error)
    }

    return Promise.resolve(this.nextSession)
  }

  createRefund(
    params: NonNullable<Parameters<StripeCheckoutGateway['createRefund']>[0]>,
    options?: Parameters<StripeCheckoutGateway['createRefund']>[1],
  ): Promise<CreatedStripeRefund> {
    this.createdRefunds.push({ params, options })

    if (this.nextRefundError) {
      const error = this.nextRefundError
      this.nextRefundError = null
      return Promise.reject(error)
    }

    if (this.nextRefund) {
      const refund = this.nextRefund
      this.nextRefund = null
      return Promise.resolve(refund)
    }

    return Promise.resolve({
      id: `re_test_${this.createdRefunds.length}`,
      object: 'refund',
      amount: params.amount ?? 0,
      currency: 'eur',
      payment_intent:
        typeof params.payment_intent === 'string'
          ? params.payment_intent
          : 'pi_test_refund',
      status: 'succeeded',
      reason: params.reason ?? null,
      metadata: params.metadata ?? {},
    } as CreatedStripeRefund)
  }

  retrieveCheckoutSession(
    sessionId: string,
  ): Promise<CheckoutSessionStateResult> {
    this.retrievedSessions.push(sessionId)

    if (this.nextRetrieveResult) {
      const result = this.nextRetrieveResult
      this.nextRetrieveResult = null
      return Promise.resolve(result)
    }

    return Promise.resolve({
      status: 'open_unpaid',
    } satisfies CheckoutSessionStateResult)
  }

  retrieveCheckoutSessionPaymentDetails(
    sessionId: string,
  ): Promise<CheckoutSessionPaymentDetailsResult> {
    this.retrievedSessions.push(sessionId)

    if (this.nextPaymentDetailsResult) {
      const result = this.nextPaymentDetailsResult
      this.nextPaymentDetailsResult = null
      return Promise.resolve(result)
    }

    return Promise.resolve({
      status: 'paid',
      paymentIntentId: 'pi_test_resolved',
      amountTotal: 1250,
      currency: 'eur',
    } satisfies CheckoutSessionPaymentDetailsResult)
  }

  async expireCheckoutSession(
    sessionId: string,
  ): Promise<ExpireCheckoutSessionResult> {
    this.expiredSessions.push(sessionId)
    this.resolveNextExpirationStarted?.()
    this.resolveNextExpirationStarted = null

    if (this.nextExpirationBarrier) {
      const barrier = this.nextExpirationBarrier
      this.nextExpirationBarrier = null
      return barrier.released
    }

    if (this.nextExpirationError) {
      const error = this.nextExpirationError
      this.nextExpirationError = null
      return {
        status: 'failed',
        retryable: true,
        reason: error.message,
      } satisfies ExpireCheckoutSessionResult
    }

    if (this.nextExpirationResult) {
      const result = this.nextExpirationResult
      this.nextExpirationResult = null
      return result
    }

    return {
      status: 'expired',
    } satisfies ExpireCheckoutSessionResult
  }

  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    const stripe = new Stripe('sk_test_localco_e2e')

    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  }
}
