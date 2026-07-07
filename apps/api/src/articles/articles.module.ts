import { Module } from '@nestjs/common'
import { ArticleCategoriesModule } from '../article-categories/article-categories.module'
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module'
import { ArticlesController } from './articles.controller'
import { ArticlesService } from './articles.service'

@Module({
  imports: [ArticleCategoriesModule, MouvementsStockModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
