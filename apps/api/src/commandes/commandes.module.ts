import { Module } from '@nestjs/common'
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module'
import { CommandesController } from './commandes.controller'
import { CommandesService } from './commandes.service'

@Module({
  imports: [MouvementsStockModule],
  controllers: [CommandesController],
  providers: [CommandesService],
})
export class CommandesModule {}
