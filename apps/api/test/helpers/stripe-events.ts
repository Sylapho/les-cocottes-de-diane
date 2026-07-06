import Stripe from 'stripe'

export function createSignedStripeEvent(data: {
  id: string
  type: string
  sessionId: string
  paymentStatus?: string
  amountTotal?: number
  currency?: string
  commandeId?: number
  clientReferenceId?: string
  paymentIntentId?: string
}) {
  const payload = JSON.stringify({
    id: data.id,
    object: 'event',
    type: data.type,
    data: {
      object: {
        id: data.sessionId,
        object: 'checkout.session',
        payment_status: data.paymentStatus ?? 'paid',
        amount_total: data.amountTotal ?? 1250,
        currency: data.currency ?? 'eur',
        payment_intent: data.paymentIntentId ?? 'pi_test_checkout',
        client_reference_id:
          data.clientReferenceId ??
          (data.commandeId !== undefined ? String(data.commandeId) : undefined),
        metadata:
          data.commandeId !== undefined
            ? {
                commandeId: String(data.commandeId),
              }
            : undefined,
      },
    },
  })
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_localco_e2e_secret'
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  })

  return { payload, signature }
}

export function createSignedStripeRefundEvent(data: {
  id: string
  type: string
  refundId: string
  paymentIntentId: string
  amount: number
  status?: string
  reason?: string | null
  failureReason?: string | null
  metadata?: Record<string, string>
}) {
  const payload = JSON.stringify({
    id: data.id,
    object: 'event',
    type: data.type,
    data: {
      object: {
        id: data.refundId,
        object: 'refund',
        amount: data.amount,
        currency: 'eur',
        payment_intent: data.paymentIntentId,
        status: data.status ?? 'succeeded',
        reason: data.reason ?? 'requested_by_customer',
        failure_reason: data.failureReason ?? null,
        metadata: data.metadata ?? {},
      },
    },
  })
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_localco_e2e_secret'
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  })

  return { payload, signature }
}
