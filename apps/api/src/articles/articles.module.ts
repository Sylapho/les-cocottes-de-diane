import { Module } from '@nestjs/common'
import { ArticlesController } from './articles.controller'
import { ArticlesService } from './articles.service'
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module'

@Module({
  imports: [MouvementsStockModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
