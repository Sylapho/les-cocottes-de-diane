import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateAjustementStockDto } from './dto/create-ajustement-stock.dto'
import { ReceptionMatiereDto } from './dto/reception-matiere.dto'

export type MouvementStockType =
  | 'vente'
  | 'production'
  | 'reception'
  | 'ajustement'
  | 'perte'
  | 'commande'

export type MouvementStockCible = 'article' | 'matiere_premiere'

type StockLotTarget = MouvementStockCible

type MouvementStockCreateData = {
  type: MouvementStockType
  cible: MouvementStockCible
  articleId?: number
  mpId?: number
  quantite: number
  stockAvant: number
  stockApres: number
  motif?: string
  reference?: string
  createdByUserId?: string
}

type StockLotData = {
  target: StockLotTarget
  articleId?: number
  mpId?: number
  initialQuantity: number
  remainingQuantity: number
  expiresAt?: Date
  reference?: string
}

type StockLotRecord = {
  id: number
  remainingQuantity: number
  expiresAt: Date | null
  createdAt: Date
}

type MouvementStockTransaction = {
  mouvementStock: {
    create: (args: {
      data: MouvementStockCreateData
      include?: {
        article: boolean
        mp: boolean
      }
    }) => Promise<unknown>
  }
  stockLot: {
    findMany: (args: {
      where: {
        target: StockLotTarget
        articleId?: number
        mpId?: number
        remainingQuantity: {
          gt: number
        }
      }
      select: {
        id: true
        remainingQuantity: true
        expiresAt: true
        createdAt: true
      }
    }) => Promise<StockLotRecord[]>
    create: (args: { data: StockLotData }) => Promise<unknown>
    update: (args: {
      where: { id: number }
      data: { remainingQuantity: number }
    }) => Promise<unknown>
  }
}

@Injectable()
export class MouvementsStockService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.mouvementStock.findMany({
      include: {
        article: true,
        mp: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  findLots() {
    return this.prisma.stockLot.findMany({
      where: {
        remainingQuantity: {
          gt: 0,
        },
      },
      include: {
        article: true,
        mp: true,
      },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async createAjustement(
    data: CreateAjustementStockDto,
    createdByUserId?: string,
  ) {
    if (data.quantite === 0) {
      throw new BadRequestException('La quantité doit être différente de 0')
    }

    if (data.cible === 'article') {
      return this.ajusterArticle({
        articleId: data.cibleId,
        quantite: data.quantite,
        type: 'ajustement',
        motif: data.motif,
        expiresAt: this.parseOptionalDate(data.expiresAt),
        createdByUserId,
      })
    }

    return this.ajusterMatierePremiere({
      mpId: data.cibleId,
      quantite: data.quantite,
      type: 'ajustement',
      motif: data.motif,
      expiresAt: this.parseOptionalDate(data.expiresAt),
      createdByUserId,
    })
  }

  createReceptionMatiere(
    mpId: number,
    data: ReceptionMatiereDto,
    createdByUserId?: string,
  ) {
    return this.ajusterMatierePremiere({
      mpId,
      quantite: data.quantite,
      type: 'reception',
      motif: data.motif,
      reference: `matiere-premiere:${mpId}`,
      expiresAt: this.parseOptionalDate(data.expiresAt),
      createdByUserId,
    })
  }

  async recordArticleMovement(
    tx: MouvementStockTransaction,
    data: {
      articleId: number
      quantite: number
      stockAvant: number
      stockApres: number
      type: MouvementStockType
      motif?: string
      reference?: string
      expiresAt?: Date
      createdByUserId?: string
    },
  ) {
    await this.applyLotMovement(tx, {
      target: 'article',
      targetId: data.articleId,
      quantity: data.quantite,
      expiresAt: data.expiresAt,
      reference: data.reference,
    })

    return tx.mouvementStock.create({
      data: {
        type: data.type,
        cible: 'article',
        articleId: data.articleId,
        quantite: data.quantite,
        stockAvant: data.stockAvant,
        stockApres: data.stockApres,
        motif: data.motif,
        reference: data.reference,
        createdByUserId: data.createdByUserId,
      },
    })
  }

  async recordMatierePremiereMovement(
    tx: MouvementStockTransaction,
    data: {
      mpId: number
      quantite: number
      stockAvant: number
      stockApres: number
      type: MouvementStockType
      motif?: string
      reference?: string
      expiresAt?: Date
      createdByUserId?: string
    },
  ) {
    await this.applyLotMovement(tx, {
      target: 'matiere_premiere',
      targetId: data.mpId,
      quantity: data.quantite,
      expiresAt: data.expiresAt,
      reference: data.reference,
    })

    return tx.mouvementStock.create({
      data: {
        type: data.type,
        cible: 'matiere_premiere',
        mpId: data.mpId,
        quantite: data.quantite,
        stockAvant: data.stockAvant,
        stockApres: data.stockApres,
        motif: data.motif,
        reference: data.reference,
        createdByUserId: data.createdByUserId,
      },
    })
  }

  private async ajusterArticle(data: {
    articleId: number
    quantite: number
    type: MouvementStockType
    motif?: string
    reference?: string
    expiresAt?: Date
    createdByUserId?: string
  }) {
    if (!Number.isInteger(data.quantite)) {
      throw new BadRequestException(
        'La quantité doit être un entier pour un article',
      )
    }

    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findUniqueOrThrow({
        where: { id: data.articleId },
      })
      const stockAvant = article.stock
      const stockApres = stockAvant + data.quantite

      if (stockApres < 0) {
        throw new BadRequestException(
          'Le stock article ne peut pas être négatif',
        )
      }

      await tx.article.update({
        where: { id: data.articleId },
        data: {
          stock: stockApres,
        },
      })

      await this.applyLotMovement(tx, {
        target: 'article',
        targetId: data.articleId,
        quantity: data.quantite,
        expiresAt: data.expiresAt,
        reference: data.reference,
      })

      return tx.mouvementStock.create({
        data: {
          type: data.type,
          cible: 'article',
          articleId: data.articleId,
          quantite: data.quantite,
          stockAvant,
          stockApres,
          motif: data.motif,
          reference: data.reference,
          createdByUserId: data.createdByUserId,
        },
        include: {
          article: true,
          mp: true,
        },
      })
    })
  }

  private async ajusterMatierePremiere(data: {
    mpId: number
    quantite: number
    type: MouvementStockType
    motif?: string
    reference?: string
    expiresAt?: Date
    createdByUserId?: string
  }) {
    return this.prisma.$transaction(async (tx) => {
      const matiere = await tx.matierePremiere.findUniqueOrThrow({
        where: { id: data.mpId },
      })
      const stockAvant = matiere.stock
      const stockApres = stockAvant + data.quantite

      if (stockApres < 0) {
        throw new BadRequestException(
          'Le stock matière première ne peut pas être négatif',
        )
      }

      await tx.matierePremiere.update({
        where: { id: data.mpId },
        data: {
          stock: stockApres,
        },
      })

      await this.applyLotMovement(tx, {
        target: 'matiere_premiere',
        targetId: data.mpId,
        quantity: data.quantite,
        expiresAt: data.expiresAt,
        reference: data.reference,
      })

      return tx.mouvementStock.create({
        data: {
          type: data.type,
          cible: 'matiere_premiere',
          mpId: data.mpId,
          quantite: data.quantite,
          stockAvant,
          stockApres,
          motif: data.motif,
          reference: data.reference,
          createdByUserId: data.createdByUserId,
        },
        include: {
          article: true,
          mp: true,
        },
      })
    })
  }

  private async applyLotMovement(
    tx: MouvementStockTransaction,
    data: {
      target: StockLotTarget
      targetId: number
      quantity: number
      expiresAt?: Date
      reference?: string
    },
  ) {
    if (data.quantity > 0) {
      if (!data.expiresAt) return

      await tx.stockLot.create({
        data: {
          target: data.target,
          articleId: data.target === 'article' ? data.targetId : undefined,
          mpId: data.target === 'matiere_premiere' ? data.targetId : undefined,
          initialQuantity: data.quantity,
          remainingQuantity: data.quantity,
          expiresAt: data.expiresAt,
          reference: data.reference,
        },
      })
      return
    }

    if (data.quantity < 0) {
      await this.consumeLots(
        tx,
        data.target,
        data.targetId,
        Math.abs(data.quantity),
      )
    }
  }

  private async consumeLots(
    tx: MouvementStockTransaction,
    target: StockLotTarget,
    targetId: number,
    quantity: number,
  ) {
    let remainingToConsume = quantity
    const lots = await tx.stockLot.findMany({
      where: {
        target,
        articleId: target === 'article' ? targetId : undefined,
        mpId: target === 'matiere_premiere' ? targetId : undefined,
        remainingQuantity: {
          gt: 0,
        },
      },
      select: {
        id: true,
        remainingQuantity: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    const sortedLots = lots.sort((a, b) => {
      if (a.expiresAt && b.expiresAt) {
        return a.expiresAt.getTime() - b.expiresAt.getTime()
      }

      if (a.expiresAt) return -1
      if (b.expiresAt) return 1

      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    for (const lot of sortedLots) {
      if (remainingToConsume <= 0) return

      const consumed = Math.min(lot.remainingQuantity, remainingToConsume)

      await tx.stockLot.update({
        where: { id: lot.id },
        data: {
          remainingQuantity: lot.remainingQuantity - consumed,
        },
      })

      remainingToConsume -= consumed
    }
  }

  private parseOptionalDate(value?: string) {
    if (!value) return undefined

    return new Date(value)
  }
}
