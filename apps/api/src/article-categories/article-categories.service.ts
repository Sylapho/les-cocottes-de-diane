import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateArticleCategoryDto } from './dto/create-article-category.dto'
import { UpdateArticleCategoryDto } from './dto/update-article-category.dto'

const DEFAULT_ARTICLE_CATEGORY_SLUG = 'autres'

type ArticleCategoryWriteData = {
  name?: string
  slug?: string
  description?: string | null
  sortOrder?: number
  isActive?: boolean
}

@Injectable()
export class ArticleCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.articleCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    })
  }

  findActive() {
    return this.prisma.articleCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
  }

  async findOne(id: number) {
    const category = await this.prisma.articleCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    })

    if (!category) {
      throw new NotFoundException('Catégorie d’article introuvable')
    }

    return category
  }

  async create(data: CreateArticleCategoryDto) {
    const slug = this.normalizeSlug(data.slug ?? data.name)

    if (!slug) {
      throw new BadRequestException('Le slug de catégorie est invalide')
    }

    try {
      return await this.prisma.articleCategory.create({
        data: {
          name: data.name,
          slug,
          description: data.description ?? null,
          sortOrder: data.sortOrder ?? 0,
          isActive: data.isActive ?? true,
        },
      })
    } catch (error) {
      this.handleWriteError(error)
    }
  }

  async update(id: number, data: UpdateArticleCategoryDto) {
    const existingCategory = await this.findOne(id)

    if (
      existingCategory.slug === DEFAULT_ARTICLE_CATEGORY_SLUG &&
      (data.isActive === false ||
        (data.slug !== undefined &&
          this.normalizeSlug(data.slug) !== DEFAULT_ARTICLE_CATEGORY_SLUG))
    ) {
      throw new BadRequestException(
        'La catégorie par défaut doit rester active avec son slug',
      )
    }

    const updateData = this.toUpdateData(data)

    try {
      return await this.prisma.articleCategory.update({
        where: { id },
        data: updateData,
      })
    } catch (error) {
      this.handleWriteError(error)
    }
  }

  async remove(id: number) {
    const category = await this.findOne(id)

    if (category.slug === DEFAULT_ARTICLE_CATEGORY_SLUG) {
      throw new BadRequestException(
        'La catégorie par défaut ne peut pas être supprimée',
      )
    }

    if (category._count.articles > 0) {
      return this.prisma.articleCategory.update({
        where: { id },
        data: { isActive: false },
      })
    }

    return this.prisma.articleCategory.delete({
      where: { id },
    })
  }

  async getDefaultCategoryId() {
    const category = await this.prisma.articleCategory.findUnique({
      where: { slug: DEFAULT_ARTICLE_CATEGORY_SLUG },
      select: { id: true },
    })

    if (!category) {
      throw new BadRequestException('La catégorie par défaut est manquante')
    }

    return category.id
  }

  async ensureAssignableCategory(categoryId?: number | null) {
    if (!categoryId) {
      return this.getDefaultCategoryId()
    }

    const category = await this.prisma.articleCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        isActive: true,
      },
    })

    if (!category) {
      throw new NotFoundException('Catégorie d’article introuvable')
    }

    if (!category.isActive) {
      throw new BadRequestException('La catégorie d’article est inactive')
    }

    return category.id
  }

  async ensureAssignableCategorySlug(slug: string) {
    const category = await this.prisma.articleCategory.findUnique({
      where: { slug },
      select: {
        id: true,
        isActive: true,
      },
    })

    if (!category) {
      throw new NotFoundException('Catégorie d’article introuvable')
    }

    if (!category.isActive) {
      throw new BadRequestException('La catégorie d’article est inactive')
    }

    return category.id
  }

  private toUpdateData(
    data: UpdateArticleCategoryDto,
  ): ArticleCategoryWriteData {
    return {
      name: data.name,
      slug: data.slug === undefined ? undefined : this.normalizeSlug(data.slug),
      description:
        data.description === undefined ? undefined : (data.description ?? null),
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    }
  }

  private normalizeSlug(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  private handleWriteError(error: unknown): never {
    if (this.isPrismaError(error, 'P2002')) {
      throw new ConflictException('Une catégorie existe déjà avec ce slug')
    }

    throw error
  }

  private isPrismaError(error: unknown, code: string) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    )
  }
}
