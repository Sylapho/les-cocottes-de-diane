import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { unlink } from 'fs/promises'
import { resolve, sep } from 'path'
import { Prisma } from '../../prisma/generated/prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MouvementsStockService } from '../mouvements-stock/mouvements-stock.service'
import { ArticleCategoriesService } from '../article-categories/article-categories.service'
import { CreateArticleDto } from './dto/create-article.dto'
import { ProduceArticleDto } from './dto/produce-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { ARTICLE_IMAGE_UPLOAD_DIR } from './article-image-upload'
import type { Role } from '../auth/roles'
import {
  assertArticlePriceUpdateAllowed,
  canUpdateArticlePrice,
} from './article-permissions'

const ARTICLE_IMAGE_FILENAME_PATTERN =
  /^article-\d+-\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i

const LEGACY_ARTICLE_CATEGORY_SLUGS: Record<string, string> = {
  JARS: 'bocaux',
  CUTS: 'decoupes',
  PREPARATIONS: 'preparations',
  SKEWERS: 'brochettes',
  EGGS: 'oeufs',
  PACKS: 'packs',
  OTHER: 'autres',
}

type ProductionArticle = {
  id: number
  nom: string
  stock: number
  nomen: Array<{
    mpId: number
    quantite: number
  }>
}

type LockedProductionMatiere = {
  id: number
  nom: string
  stock: number
  unite: string
}

type AggregatedProductionNeed = {
  mpId: number
  quantite: number
}

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private readonly mouvementsStockService: MouvementsStockService,
    private readonly articleCategoriesService: ArticleCategoriesService,
  ) {}

  findAll() {
    return this.prisma.article.findMany({
      include: {
        category: true,
        nomen: {
          include: { mp: true },
        },
      },
      orderBy: { nom: 'asc' },
    })
  }

  findOne(id: number) {
    return this.prisma.article.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
        nomen: {
          include: { mp: true },
        },
      },
    })
  }

  async create(data: CreateArticleDto) {
    const categoryId = await this.resolveCategoryId(data, true)

    return this.prisma.article.create({
      data: {
        nom: data.nom,
        categoryId,
        prixCents: data.prixCents,
        tvaBps: data.tvaBps ?? 550,
        stock: 0,
        online: data.online ?? true,
        description: data.description,
        ingredients: data.ingredients,
        allergenes: data.allergenes,
        imageUrl: data.imageUrl,
      },
    })
  }

  async update(id: number, data: UpdateArticleDto, role?: Role) {
    if (data.prixCents !== undefined && !canUpdateArticlePrice(role)) {
      const currentArticle = await this.prisma.article.findUniqueOrThrow({
        where: { id },
        select: { prixCents: true },
      })

      assertArticlePriceUpdateAllowed(
        role,
        currentArticle.prixCents,
        data.prixCents,
      )
    }

    const categoryId = await this.resolveCategoryId(data, false)

    return this.prisma.article.update({
      where: { id },
      data: {
        nom: data.nom,
        categoryId,
        prixCents: canUpdateArticlePrice(role) ? data.prixCents : undefined,
        tvaBps: data.tvaBps,
        online: data.online,
        description: data.description,
        ingredients: data.ingredients,
        allergenes: data.allergenes,
        imageUrl: data.imageUrl,
      },
    })
  }

  async updateImage(id: number, imageUrl: string, uploadedFilename?: string) {
    const existingArticle = await this.prisma.article.findUnique({
      where: { id },
      select: { imageUrl: true },
    })

    if (!existingArticle) {
      await this.deleteArticleImageFile(uploadedFilename)
      throw new NotFoundException('Article introuvable')
    }

    try {
      const updatedArticle = await this.prisma.article.update({
        where: { id },
        data: { imageUrl },
      })

      await this.deleteLocalArticleImage(existingArticle.imageUrl)

      return updatedArticle
    } catch (error) {
      await this.deleteArticleImageFile(uploadedFilename)
      throw error
    }
  }

  remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findUniqueOrThrow({
        where: { id },
        select: {
          archivedAt: true,
          _count: {
            select: {
              lignesVente: true,
              lignesCmd: true,
              mouvementsStock: true,
              stockLots: true,
            },
          },
        },
      })

      if (this.hasBusinessHistory(article._count)) {
        return tx.article.update({
          where: { id },
          data: {
            archivedAt: article.archivedAt ?? new Date(),
            online: false,
          },
        })
      }

      await tx.nomenclature.deleteMany({
        where: { articleId: id },
      })

      return tx.article.delete({
        where: { id },
      })
    })
  }

  async getProductionCapacity(id: number) {
    const article = await this.prisma.article.findUniqueOrThrow({
      where: { id },
      include: {
        nomen: {
          include: {
            mp: true,
          },
        },
      },
    })

    if (article.nomen.length === 0) {
      return {
        articleId: article.id,
        articleNom: article.nom,
        capacite: 0,
        limitingIngredient: null,
        ingredients: [],
      }
    }

    const sellableStockByMatiere =
      await this.mouvementsStockService.getSellableMatiereStock(
        article.nomen.map((line) => line.mp),
      )

    const ingredients = article.nomen.map((line) => {
      const sellableStock = sellableStockByMatiere.get(line.mp.id) ?? 0
      const possible = Math.floor(sellableStock / line.quantite)

      return {
        mpId: line.mp.id,
        nom: line.mp.nom,
        stock: line.mp.stock,
        sellableStock,
        unite: line.mp.unite,
        quantiteNecessaire: line.quantite,
        possible,
      }
    })

    const limitingIngredient = ingredients.reduce((min, current) => {
      return current.possible < min.possible ? current : min
    })

    return {
      articleId: article.id,
      articleNom: article.nom,
      capacite: limitingIngredient.possible,
      limitingIngredient,
      ingredients,
    }
  }

  async produce(id: number, data: ProduceArticleDto) {
    const quantite = data.quantite
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : undefined

    return this.prisma.$transaction(async (tx) => {
      const article = await this.lockProductionArticle(tx, id)

      if (article.nomen.length === 0) {
        const updatedArticle = await this.incrementProducedArticleStock(
          tx,
          article,
          quantite,
          expiresAt,
        )

        return {
          article: updatedArticle,
          produced: quantite,
          consumed: [],
        }
      }

      const needs = this.aggregateProductionNeeds(article, quantite)
      const matieres = await this.lockProductionMatieres(tx, needs)

      if (matieres.length !== needs.length) {
        throw new BadRequestException(
          'Une ou plusieurs matières premières sont introuvables',
        )
      }

      const sellableStockByMatiere = await this.getSellableMatiereStock(
        tx,
        matieres,
      )

      this.assertSufficientMatiereStock(matieres, needs, sellableStockByMatiere)

      for (const need of needs) {
        const matiere = matieres.find((item) => item.id === need.mpId)!

        const updated = await tx.matierePremiere.updateMany({
          where: {
            id: need.mpId,
            stock: {
              gte: need.quantite,
            },
          },
          data: {
            stock: {
              decrement: need.quantite,
            },
          },
        })

        if (updated.count !== 1) {
          throw this.buildInsufficientMatiereStockError([
            {
              mpId: matiere.id,
              nom: matiere.nom,
              unite: matiere.unite,
              stock: matiere.stock,
              needed: need.quantite,
              available: matiere.stock,
              missing: Math.max(0, need.quantite - matiere.stock),
            },
          ])
        }

        await this.mouvementsStockService.recordMatierePremiereMovement(tx, {
          mpId: need.mpId,
          quantite: -need.quantite,
          stockAvant: matiere.stock,
          stockApres: matiere.stock - need.quantite,
          type: 'production',
          motif: `Production de ${quantite} ${article.nom}`,
          reference: `production:article:${id}`,
        })
      }

      const updatedArticle = await this.incrementProducedArticleStock(
        tx,
        article,
        quantite,
        expiresAt,
      )

      return {
        article: updatedArticle,
        produced: quantite,
        consumed: needs.map((need) => ({
          mpId: need.mpId,
          nom: matieres.find((matiere) => matiere.id === need.mpId)!.nom,
          unite: matieres.find((matiere) => matiere.id === need.mpId)!.unite,
          quantite: need.quantite,
        })),
      }
    })
  }

  private async incrementProducedArticleStock(
    tx: Prisma.TransactionClient,
    article: ProductionArticle,
    quantite: number,
    expiresAt?: Date,
  ) {
    const updatedArticle = await tx.article.update({
      where: { id: article.id },
      data: {
        stock: {
          increment: quantite,
        },
      },
      include: {
        nomen: {
          include: {
            mp: true,
          },
        },
      },
    })

    const articleMovement: Parameters<
      MouvementsStockService['recordArticleMovement']
    >[1] = {
      articleId: article.id,
      quantite,
      stockAvant: article.stock,
      stockApres: article.stock + quantite,
      type: 'production',
      motif: `Production de ${quantite} ${article.nom}`,
      reference: `production:article:${article.id}`,
    }

    if (expiresAt) {
      articleMovement.expiresAt = expiresAt
    }

    await this.mouvementsStockService.recordArticleMovement(tx, articleMovement)

    return updatedArticle
  }

  private async lockProductionArticle(
    tx: Prisma.TransactionClient,
    articleId: number,
  ): Promise<ProductionArticle> {
    await tx.$queryRaw`
      SELECT "id"
      FROM "Article"
      WHERE "id" = ${articleId}
      FOR UPDATE
    `

    return tx.article.findUniqueOrThrow({
      where: { id: articleId },
      select: {
        id: true,
        nom: true,
        stock: true,
        nomen: {
          select: {
            mpId: true,
            quantite: true,
          },
        },
      },
    })
  }

  private aggregateProductionNeeds(
    article: ProductionArticle,
    quantityToProduce: number,
  ): AggregatedProductionNeed[] {
    const needsByMatiere = article.nomen.reduce((acc, line) => {
      const quantity = line.quantite * quantityToProduce
      acc.set(line.mpId, (acc.get(line.mpId) ?? 0) + quantity)
      return acc
    }, new Map<number, number>())

    return Array.from(needsByMatiere.entries())
      .map(([mpId, quantite]) => ({ mpId, quantite }))
      .sort((a, b) => a.mpId - b.mpId)
  }

  private async lockProductionMatieres(
    tx: Prisma.TransactionClient,
    needs: AggregatedProductionNeed[],
  ): Promise<LockedProductionMatiere[]> {
    const mpIds = needs.map((need) => need.mpId)

    // All productions lock raw materials by primary key order to prevent
    // double consumption and reduce deadlock risk across API instances.
    return tx.$queryRaw<LockedProductionMatiere[]>`
      SELECT "id", "nom", "stock", "unite"
      FROM "MatierePremiere"
      WHERE "id" IN (${Prisma.join(mpIds)})
      ORDER BY "id" ASC
      FOR UPDATE
    `
  }

  private async getSellableMatiereStock(
    tx: Pick<Prisma.TransactionClient, 'stockLot'>,
    matieres: LockedProductionMatiere[],
  ) {
    const result = new Map(
      matieres.map((matiere) => [matiere.id, matiere.stock]),
    )
    const ids = matieres.map((matiere) => matiere.id)

    if (ids.length === 0) {
      return result
    }

    const expiredLots = await tx.stockLot.findMany({
      where: {
        target: 'matiere_premiere',
        mpId: {
          in: ids,
        },
        remainingQuantity: {
          gt: 0,
        },
        expiresAt: {
          lt: this.startOfToday(),
        },
      },
      select: {
        mpId: true,
        remainingQuantity: true,
      },
    })

    for (const lot of expiredLots) {
      if (!lot.mpId) continue

      result.set(
        lot.mpId,
        Math.max(0, (result.get(lot.mpId) ?? 0) - lot.remainingQuantity),
      )
    }

    return result
  }

  private assertSufficientMatiereStock(
    matieres: LockedProductionMatiere[],
    needs: AggregatedProductionNeed[],
    sellableStockByMatiere: Map<number, number>,
  ) {
    const insufficientIngredients = needs
      .map((need) => {
        const matiere = matieres.find((item) => item.id === need.mpId)

        if (!matiere) return null

        const available = sellableStockByMatiere.get(matiere.id) ?? 0

        return {
          mpId: matiere.id,
          nom: matiere.nom,
          unite: matiere.unite,
          stock: matiere.stock,
          needed: need.quantite,
          available,
          missing: Math.max(0, need.quantite - available),
        }
      })
      .filter(
        (
          item,
        ): item is {
          mpId: number
          nom: string
          unite: string
          stock: number
          needed: number
          available: number
          missing: number
        } => Boolean(item && item.missing > 0),
      )

    if (insufficientIngredients.length > 0) {
      throw this.buildInsufficientMatiereStockError(insufficientIngredients)
    }
  }

  private buildInsufficientMatiereStockError(
    insufficientIngredients: Array<{
      mpId: number
      nom: string
      unite: string
      stock: number
      needed: number
      available: number
      missing: number
    }>,
  ) {
    return new ConflictException({
      code: 'INSUFFICIENT_MATERIAL_STOCK',
      message: 'Stock insuffisant pour produire cet article',
      insufficientIngredients,
    })
  }

  private startOfToday() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return today
  }

  private async resolveCategoryId(
    data: Pick<CreateArticleDto, 'category' | 'categoryId'>,
    defaultWhenMissing: boolean,
  ) {
    if (data.categoryId === null) {
      return null
    }

    if (data.categoryId !== undefined) {
      return this.articleCategoriesService.ensureAssignableCategory(
        data.categoryId,
      )
    }

    if (data.category !== undefined) {
      return this.articleCategoriesService.ensureAssignableCategorySlug(
        this.getLegacyCategorySlug(data.category),
      )
    }

    return defaultWhenMissing
      ? this.articleCategoriesService.ensureAssignableCategory(undefined)
      : undefined
  }

  private getLegacyCategorySlug(category: string) {
    return (
      LEGACY_ARTICLE_CATEGORY_SLUGS[category] ??
      category
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )
  }

  private hasBusinessHistory(counts: {
    lignesVente: number
    lignesCmd: number
    mouvementsStock: number
    stockLots: number
  }) {
    return (
      counts.lignesVente > 0 ||
      counts.lignesCmd > 0 ||
      counts.mouvementsStock > 0 ||
      counts.stockLots > 0
    )
  }

  private async deleteLocalArticleImage(imageUrl?: string | null) {
    const filename = this.getLocalArticleImageFilename(imageUrl)

    if (!filename) return

    await this.deleteArticleImageFile(filename)
  }

  private getLocalArticleImageFilename(imageUrl?: string | null) {
    if (!imageUrl) return null

    let pathname: string

    try {
      pathname = new URL(imageUrl).pathname
    } catch {
      pathname = imageUrl
    }

    const match = pathname.match(/^\/uploads\/articles\/([^/]+)$/)

    return match && this.isArticleImageFilename(match[1]) ? match[1] : null
  }

  private async deleteArticleImageFile(filename?: string | null) {
    if (!filename || !this.isArticleImageFilename(filename)) return

    const uploadRoot = resolve(ARTICLE_IMAGE_UPLOAD_DIR)
    const targetPath = resolve(uploadRoot, filename)
    const uploadRootWithSep = uploadRoot.endsWith(sep)
      ? uploadRoot
      : `${uploadRoot}${sep}`

    if (!targetPath.startsWith(uploadRootWithSep)) return

    try {
      await unlink(targetPath)
    } catch {
      return
    }
  }

  private isArticleImageFilename(filename: string) {
    return ARTICLE_IMAGE_FILENAME_PATTERN.test(filename)
  }
}
