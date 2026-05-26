import { Module } from '@nestjs/common'
import { VentesController } from './ventes.controller'
import { VentesService } from './ventes.service'
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module'

@Module({
  imports: [MouvementsStockModule],
  controllers: [VentesController],
  providers: [VentesService],
})
export class VentesModule {}
