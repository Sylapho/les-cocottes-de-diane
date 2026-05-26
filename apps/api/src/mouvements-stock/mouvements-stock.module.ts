import { Module } from '@nestjs/common'
import { MouvementsStockController } from './mouvements-stock.controller'
import { MouvementsStockService } from './mouvements-stock.service'

@Module({
  controllers: [MouvementsStockController],
  providers: [MouvementsStockService],
  exports: [MouvementsStockService],
})
export class MouvementsStockModule {}
