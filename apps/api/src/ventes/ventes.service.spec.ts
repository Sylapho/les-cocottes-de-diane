import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { MouvementsStockService } from '../mouvements-stock/mouvements-stock.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateVenteDto } from './dto/create-vente.dto'
import { VentesService } from './ventes.service'

describe('VentesService', () => {
  let service: VentesService

  const SELLER_ID = 'auth-user-seller'

  const prismaMock = {
    journeeCaisse: {
      findUnique: jest.fn(),
    },
    authUser: {
      findUnique: jest.fn(),
    },
    article: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    stockLot: {
      findMany: jest.fn(),
    },
    vente: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  }

  const mouvementsStockServiceMock = {
    recordArticleMovement: jest.fn(),
    getSellableArticleStock: jest.fn(),
  }

  type TransactionClient = {
    $queryRaw: typeof prismaMock.$queryRaw
    $executeRaw: typeof prismaMock.$executeRaw
    journeeCaisse: typeof prismaMock.journeeCaisse
    authUser: typeof prismaMock.authUser
    article: typeof prismaMock.article
    stockLot: typeof prismaMock.stockLot
    vente: typeof prismaMock.vente
  }

  type TransactionCallback<T> = (tx: TransactionClient) => Promise<T>

  const transactionClient: TransactionClient = {
    $queryRaw: prismaMock.$queryRaw,
    $executeRaw: prismaMock.$executeRaw,
    journeeCaisse: prismaMock.journeeCaisse,
    authUser: prismaMock.authUser,
    article: prismaMock.article,
    stockLot: prismaMock.stockLot,
    vente: prismaMock.vente,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: MouvementsStockService,
          useValue: mouvementsStockServiceMock,
        },
      ],
    }).compile()

    service = module.get<VentesService>(VentesService)
    jest.clearAllMocks()

    prismaMock.$transaction.mockImplementation(
      <T>(callback: TransactionCallback<T>) => callback(transactionClient),
    )
    prismaMock.$queryRaw.mockResolvedValue([])
    prismaMock.authUser.findUnique.mockResolvedValue({ id: SELLER_ID })
    prismaMock.journeeCaisse.findUnique.mockResolvedValue(null)
    prismaMock.stockLot.findMany.mockResolvedValue([])
    mouvementsStockServiceMock.recordArticleMovement.mockResolvedValue({
      id: 1,
    })
    mouvementsStockServiceMock.getSellableArticleStock.mockImplementation(
      (articles: { id: number; stock: number }[]) =>
        new Map(articles.map((article) => [article.id, article.stock])),
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('findAll should return ventes ordered by date desc', async () => {
    const ventes = [
      {
        id: 1,
        mode: 'cb',
        totalTtcCents: 1200,
        lignes: [],
      },
    ]

    prismaMock.vente.findMany.mockResolvedValue(ventes)

    await expect(service.findAll()).resolves.toEqual(ventes)
    expect(prismaMock.vente.findMany).toHaveBeenCalledWith({
      include: {
        seller: { select: { id: true, name: true } },
        lignes: {
          include: {
            article: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })
  })

  it('findOne should return one vente with lines and seller', async () => {
    const vente = {
      id: 1,
      mode: 'especes',
      totalTtcCents: 800,
      lignes: [],
      seller: null,
    }

    prismaMock.vente.findUniqueOrThrow.mockResolvedValue(vente)

    await expect(service.findOne(1)).resolves.toEqual(vente)
    expect(prismaMock.vente.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        seller: { select: { id: true, name: true } },
        lignes: {
          include: {
            article: true,
          },
        },
      },
    })
  })

  it('create should calculate totals, create lines and decrement article stock', async () => {
    const body: CreateVenteDto = {
      mode: 'cb',
      remiseCents: 100,
      lignes: [
        { articleId: 1, quantite: 2 },
        { articleId: 2, quantite: 1 },
      ],
    }

    const articles = [
      {
        id: 1,
        nom: 'Baguette',
        prixCents: 210,
        tvaBps: 550,
        stock: 5,
      },
      {
        id: 2,
        nom: 'Croissant',
        prixCents: 150,
        tvaBps: 2000,
        stock: 3,
      },
    ]

    const created = {
      id: 10,
      mode: 'cb',
      remiseCents: 100,
      totalTtcCents: 470,
      totalHtCents: 431,
      tvaCents: 39,
      lignes: [],
    }

    prismaMock.$queryRaw.mockResolvedValue(articles)
    prismaMock.vente.create.mockResolvedValue(created)

    await expect(service.create(body, SELLER_ID)).resolves.toEqual(created)

    expect(prismaMock.$queryRaw).toHaveBeenCalled()
    expect(prismaMock.article.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: {
        stock: {
          decrement: 2,
        },
      },
    })
    expect(prismaMock.article.update).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      data: {
        stock: {
          decrement: 1,
        },
      },
    })
    expect(prismaMock.vente.create).toHaveBeenCalledWith({
      data: {
        date: expect.any(Date),
        mode: 'cb',
        remiseCents: 100,
        totalTtcCents: 470,
        totalHtCents: 431,
        tvaCents: 39,
        sellerId: SELLER_ID,
        lignes: {
          create: [
            {
              articleId: 1,
              quantite: 2,
              prixUnitCents: 210,
              tvaBps: 550,
            },
            {
              articleId: 2,
              quantite: 1,
              prixUnitCents: 150,
              tvaBps: 2000,
            },
          ],
        },
      },
      include: {
        seller: { select: { id: true, name: true } },
        lignes: {
          include: {
            article: true,
          },
        },
      },
    })
    expect(
      mouvementsStockServiceMock.recordArticleMovement,
    ).toHaveBeenNthCalledWith(1, transactionClient, {
      articleId: 1,
      quantite: -2,
      stockAvant: 5,
      stockApres: 3,
      type: 'vente',
      motif: 'Vente #10',
      reference: 'vente:10',
      createdByUserId: SELLER_ID,
    })
    expect(
      mouvementsStockServiceMock.recordArticleMovement,
    ).toHaveBeenNthCalledWith(2, transactionClient, {
      articleId: 2,
      quantite: -1,
      stockAvant: 3,
      stockApres: 2,
      type: 'vente',
      motif: 'Vente #10',
      reference: 'vente:10',
      createdByUserId: SELLER_ID,
    })
  })

  it('create should keep decimal-sensitive totals exact by using cents', async () => {
    const body: CreateVenteDto = {
      mode: 'cb',
      lignes: [
        { articleId: 1, quantite: 1 },
        { articleId: 2, quantite: 1 },
      ],
    }

    prismaMock.$queryRaw.mockResolvedValue([
      {
        id: 1,
        nom: 'Petit prix',
        prixCents: 10,
        tvaBps: 550,
        stock: 5,
      },
      {
        id: 2,
        nom: 'Autre petit prix',
        prixCents: 20,
        tvaBps: 550,
        stock: 5,
      },
    ])
    prismaMock.vente.create.mockResolvedValue({ id: 11 })

    await service.create(body, SELLER_ID)

    expect(prismaMock.vente.create).toHaveBeenCalledWith({
      data: {
        date: expect.any(Date),
        mode: 'cb',
        remiseCents: 0,
        totalTtcCents: 30,
        totalHtCents: 28,
        tvaCents: 2,
        sellerId: SELLER_ID,
        lignes: {
          create: [
            {
              articleId: 1,
              quantite: 1,
              prixUnitCents: 10,
              tvaBps: 550,
            },
            {
              articleId: 2,
              quantite: 1,
              prixUnitCents: 20,
              tvaBps: 550,
            },
          ],
        },
      },
      include: {
        seller: { select: { id: true, name: true } },
        lignes: {
          include: {
            article: true,
          },
        },
      },
    })
  })

  it('create should reject an empty vente', async () => {
    const body: CreateVenteDto = {
      mode: 'cb',
      lignes: [],
    }

    await expect(service.create(body, SELLER_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prismaMock.article.findMany).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('create should reject unknown articles', async () => {
    const body: CreateVenteDto = {
      mode: 'cb',
      lignes: [{ articleId: 1, quantite: 1 }],
    }

    prismaMock.$queryRaw.mockResolvedValue([])

    await expect(service.create(body, SELLER_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prismaMock.$transaction).toHaveBeenCalled()
  })

  it('create should reject insufficient stock', async () => {
    const body: CreateVenteDto = {
      mode: 'especes',
      lignes: [{ articleId: 1, quantite: 6 }],
    }

    prismaMock.$queryRaw.mockResolvedValue([
      {
        id: 1,
        nom: 'Baguette',
        prixCents: 210,
        tvaBps: 550,
        stock: 5,
      },
    ])

    await expect(service.create(body, SELLER_ID)).rejects.toBeInstanceOf(
      ConflictException,
    )
    expect(prismaMock.$transaction).toHaveBeenCalled()
    expect(prismaMock.vente.create).not.toHaveBeenCalled()
  })

  it('create should attribute the sale and its stock movements to the session seller', async () => {
    const body: CreateVenteDto = {
      mode: 'cb',
      lignes: [{ articleId: 1, quantite: 1 }],
    }

    prismaMock.$queryRaw.mockResolvedValue([
      { id: 1, nom: 'Baguette', prixCents: 210, tvaBps: 550, stock: 5 },
    ])
    prismaMock.vente.create.mockResolvedValue({ id: 11, lignes: [] })

    await service.create(body, SELLER_ID)

    expect(prismaMock.authUser.findUnique).toHaveBeenCalledWith({
      where: { id: SELLER_ID },
      select: { id: true },
    })
    expect(prismaMock.vente.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sellerId: SELLER_ID }),
      }),
    )
    expect(
      mouvementsStockServiceMock.recordArticleMovement,
    ).toHaveBeenCalledWith(
      transactionClient,
      expect.objectContaining({ createdByUserId: SELLER_ID }),
    )
  })

  it('create should refuse a sale when the session account does not exist', async () => {
    const body: CreateVenteDto = {
      mode: 'cb',
      lignes: [{ articleId: 1, quantite: 1 }],
    }

    prismaMock.authUser.findUnique.mockResolvedValue(null)

    await expect(service.create(body, 'unknown-user')).rejects.toBeInstanceOf(
      ForbiddenException,
    )
    expect(prismaMock.article.update).not.toHaveBeenCalled()
    expect(prismaMock.vente.create).not.toHaveBeenCalled()
  })

  it('create should refuse a sale once the cash register day is closed', async () => {
    const body: CreateVenteDto = {
      mode: 'cb',
      lignes: [{ articleId: 1, quantite: 1 }],
    }

    prismaMock.journeeCaisse.findUnique.mockResolvedValue({ id: 3 })

    const result = service.create(body, SELLER_ID)

    await expect(result).rejects.toBeInstanceOf(ConflictException)
    await expect(result).rejects.toMatchObject({
      response: { code: 'CASH_REGISTER_DAY_CLOSED' },
    })
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1)
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled()
    expect(prismaMock.article.update).not.toHaveBeenCalled()
    expect(prismaMock.vente.create).not.toHaveBeenCalled()
  })
})
