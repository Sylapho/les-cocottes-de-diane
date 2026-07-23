import { Module } from '@nestjs/common'
import { ORDER_CLOCK, systemOrderClock } from '../commandes/order-clock'
import { PickupPointsController } from './pickup-points.controller'
import { PickupPointsService } from './pickup-points.service'

@Module({
  controllers: [PickupPointsController],
  providers: [
    PickupPointsService,
    {
      provide: ORDER_CLOCK,
      useValue: systemOrderClock,
    },
  ],
  exports: [PickupPointsService],
})
export class PickupPointsModule {}
