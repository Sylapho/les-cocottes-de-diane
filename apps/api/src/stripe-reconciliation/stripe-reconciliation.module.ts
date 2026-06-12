import { Module } from '@nestjs/common'
import { StripeCheckoutGateway } from '../commandes/stripe-checkout.gateway'
import { StripeReconciliationController } from './stripe-reconciliation.controller'
import { StripeReconciliationMetrics } from './stripe-reconciliation.metrics'
import { StripeReconciliationService } from './stripe-reconciliation.service'
import { StripeReconciliationWorker } from './stripe-reconciliation.worker'

@Module({
  controllers: [StripeReconciliationController],
  providers: [
    StripeCheckoutGateway,
    StripeReconciliationMetrics,
    StripeReconciliationService,
    StripeReconciliationWorker,
  ],
  exports: [StripeReconciliationService],
})
export class StripeReconciliationModule {}
