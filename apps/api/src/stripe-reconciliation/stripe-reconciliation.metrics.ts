import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class StripeReconciliationMetrics {
  private readonly logger = new Logger(StripeReconciliationMetrics.name)

  increment(metric: string, fields: Record<string, string | number> = {}) {
    this.logger.log({
      message: 'Stripe reconciliation metric incremented',
      metric,
      ...fields,
    })
  }

  observeDuration(
    metric: string,
    durationMs: number,
    fields: Record<string, string | number> = {},
  ) {
    this.logger.log({
      message: 'Stripe reconciliation metric observed',
      metric,
      durationMs,
      ...fields,
    })
  }
}
