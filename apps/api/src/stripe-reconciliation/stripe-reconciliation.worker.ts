import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { StripeReconciliationService } from './stripe-reconciliation.service'

@Injectable()
export class StripeReconciliationWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(StripeReconciliationWorker.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly reconciliationService: StripeReconciliationService,
  ) {}

  onModuleInit() {
    if (!this.reconciliationService.workerEnabled) {
      return
    }

    this.timer = setInterval(
      () => void this.tick(),
      this.reconciliationService.workerIntervalMs,
    )
    this.timer.unref()

    void this.tick()
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }

  private async tick() {
    if (this.running) {
      return
    }

    this.running = true

    try {
      await this.reconciliationService.processDueReconciliations()
    } catch (error) {
      this.logger.error(
        'Stripe reconciliation worker tick failed',
        error instanceof Error ? error.stack : undefined,
      )
    } finally {
      this.running = false
    }
  }
}
