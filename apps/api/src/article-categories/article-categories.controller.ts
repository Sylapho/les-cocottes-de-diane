import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { BetterAuthGuard } from '../auth/better-auth.guard'
import { ROLES } from '../auth/roles'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ArticleCategoriesService } from './article-categories.service'
import { CreateArticleCategoryDto } from './dto/create-article-category.dto'
import { UpdateArticleCategoryDto } from './dto/update-article-category.dto'

@Controller('article-categories')
@UseGuards(BetterAuthGuard, RolesGuard)
export class ArticleCategoriesController {
  constructor(
    private readonly articleCategoriesService: ArticleCategoriesService,
  ) {}

  @Get()
  @Roles(ROLES.GERANT, ROLES.VENDEUR, ROLES.PRODUCTION, ROLES.STOCK)
  findAll(@Query('active') active?: string) {
    if (active === 'true') {
      return this.articleCategoriesService.findActive()
    }

    return this.articleCategoriesService.findAll()
  }

  @Get(':id')
  @Roles(ROLES.GERANT, ROLES.VENDEUR, ROLES.PRODUCTION, ROLES.STOCK)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.articleCategoriesService.findOne(id)
  }

  @Post()
  @Roles(ROLES.GERANT)
  create(@Body() body: CreateArticleCategoryDto) {
    return this.articleCategoriesService.create(body)
  }

  @Patch(':id')
  @Roles(ROLES.GERANT)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateArticleCategoryDto,
  ) {
    return this.articleCategoriesService.update(id, body)
  }

  @Delete(':id')
  @Roles(ROLES.GERANT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.articleCategoriesService.remove(id)
  }
}
