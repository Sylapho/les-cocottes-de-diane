import { StripeReconciliationMetrics } from './stripe-reconciliation.metrics'

describe('StripeReconciliationMetrics', () => {
  it('records counter and duration metrics through structured logs', () => {
    const metrics = new StripeReconciliationMetrics()

    expect(() => {
      metrics.increment('metric_total', { status: 'resolved' })
      metrics.observeDuration('metric_duration_ms', 12, { status: 'resolved' })
    }).not.toThrow()
  })
})
