import { ConflictException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { MouvementsStockService } from '../mouvements-stock/mouvements-stock.service'
import { ArticleCategoriesService } from '../article-categories/article-categories.service'
import { PrismaService } from '../prisma/prisma.service'
import { ArticlesService } from './articles.service'
import { CreateArticleDto } from './dto/create-article.dto'

describe('ArticlesService', () => {
  let service: ArticlesService

  const prismaMock = {
    article: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    nomenclature: {
      deleteMany: jest.fn(),
    },
    matierePremiere: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    stockLot: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  }

  const mouvementsStockServiceMock = {
    recordArticleMovement: jest.fn(),
    recordMatierePremiereMovement: jest.fn(),
    getSellableMatiereStock: jest.fn(),
  }

  const articleCategoriesServiceMock = {
    ensureAssignableCategory: jest.fn(),
    ensureAssignableCategorySlug: jest.fn(),
  }

  type TransactionClient = {
    $queryRaw: typeof prismaMock.$queryRaw
    article: typeof prismaMock.article
    matierePremiere: typeof prismaMock.matierePremiere
    stockLot: typeof prismaMock.stockLot
    nomenclature: typeof prismaMock.nomenclature
  }

  type TransactionCallback<T> = (tx: TransactionClient) => Promise<T>

  const transactionClient: TransactionClient = {
    $queryRaw: prismaMock.$queryRaw,
    article: prismaMock.article,
    matierePremiere: prismaMock.matierePremiere,
    stockLot: prismaMock.stockLot,
    nomenclature: prismaMock.nomenclature,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: MouvementsStockService,
          useValue: mouvementsStockServiceMock,
        },
        {
          provide: ArticleCategoriesService,
          useValue: articleCategoriesServiceMock,
        },
      ],
    }).compile()

    service = module.get<ArticlesService>(ArticlesService)
    jest.clearAllMocks()

    prismaMock.$transaction.mockImplementation(
      <T>(callback: TransactionCallback<T>) => callback(transactionClient),
    )
    prismaMock.$queryRaw.mockResolvedValue([])
    prismaMock.stockLot.findMany.mockResolvedValue([])
    prismaMock.matierePremiere.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.nomenclature.deleteMany.mockResolvedValue({ count: 0 })
    mouvementsStockServiceMock.recordArticleMovement.mockResolvedValue({
      movement: { id: 1 },
      consumedLots: [],
    })
    mouvementsStockServiceMock.recordMatierePremiereMovement.mockResolvedValue({
      movement: { id: 2 },
      consumedLots: [],
    })
    mouvementsStockServiceMock.getSellableMatiereStock.mockImplementation(
      (matieres: { id: number; stock: number }[]) =>
        new Map(matieres.map((matiere) => [matiere.id, matiere.stock])),
    )
    articleCategoriesServiceMock.ensureAssignableCategory.mockResolvedValue(7)
    articleCategoriesServiceMock.ensureAssignableCategorySlug.mockResolvedValue(
      3,
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('findAll should return articles', async () => {
    const articles = [
      { id: 1, nom: 'Baguette', prixCents: 120 },
      { id: 2, nom: 'Croissant', prixCents: 110 },
    ]

    prismaMock.article.findMany.mockResolvedValue(articles)

    await expect(service.findAll()).resolves.toEqual(articles)
    expect(prismaMock.article.findMany).toHaveBeenCalledWith({
      include: {
        category: true,
        nomen: {
          include: {
            mp: true,
          },
        },
      },
      orderBy: {
        nom: 'asc',
      },
    })
  })

  it('findOne should return one article without nomenclature', async () => {
    const article = { id: 1, nom: 'Baguette', prixCents: 120, nomen: [] }

    prismaMock.article.findUniqueOrThrow.mockResolvedValue(article)

    await expect(service.findOne(1)).resolves.toEqual(article)
    expect(prismaMock.article.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        category: true,
        nomen: {
          include: {
            mp: true,
          },
        },
      },
    })
  })

  it('create should create an article with defaults', async () => {
    const input: CreateArticleDto = {
      nom: 'Pain au chocolat',
      prixCents: 150,
    }

    const created = {
      id: 1,
      nom: 'Pain au chocolat',
      prixCents: 150,
      tvaBps: 550,
      stock: 0,
      online: true,
      imageUrl: null,
      nomen: [],
    }

    prismaMock.article.create.mockResolvedValue(created)

    await expect(service.create(input)).resolves.toEqual(created)
    expect(prismaMock.article.create).toHaveBeenCalledWith({
      data: {
        nom: 'Pain au chocolat',
        categoryId: undefined,
        prixCents: 150,
        tvaBps: 550,
        stock: 0,
        online: true,
        description: undefined,
        ingredients: undefined,
        allergenes: undefined,
        imageUrl: undefined,
      },
    })
    expect(
      articleCategoriesServiceMock.ensureAssignableCategory,
    ).not.toHaveBeenCalled()
  })

  it('update should update an article', async () => {
    const updated = {
      id: 1,
      nom: 'Baguette tradition',
      prixCents: 130,
    }

    prismaMock.article.update.mockResolvedValue(updated)

    await expect(service.update(1, { prixCents: 130 })).resolves.toEqual(
      updated,
    )
    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        nom: undefined,
        categoryId: undefined,
        prixCents: 130,
        tvaBps: undefined,
        online: undefined,
        description: undefined,
        ingredients: undefined,
        allergenes: undefined,
        imageUrl: undefined,
      },
    })
    expect(
      articleCategoriesServiceMock.ensureAssignableCategory,
    ).not.toHaveBeenCalled()
  })

  it('update should accept legacy article category values', async () => {
    const updated = {
      id: 1,
      nom: 'Baguette tradition',
      categoryId: 3,
    }

    prismaMock.article.update.mockResolvedValue(updated)

    await expect(
      service.update(1, { category: 'PREPARATIONS' }),
    ).resolves.toEqual(updated)
    expect(
      articleCategoriesServiceMock.ensureAssignableCategorySlug,
    ).toHaveBeenCalledWith('preparations')
    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        nom: undefined,
        categoryId: 3,
        prixCents: undefined,
        tvaBps: undefined,
        online: undefined,
        description: undefined,
        ingredients: undefined,
        allergenes: undefined,
        imageUrl: undefined,
      },
    })
  })

  it('update should clear an article category without requiring nomenclature', async () => {
    const updated = {
      id: 1,
      nom: 'Baguette tradition',
      categoryId: null,
      nomen: [],
    }

    prismaMock.article.update.mockResolvedValue(updated)

    await expect(service.update(1, { categoryId: null })).resolves.toEqual(
      updated,
    )
    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        nom: undefined,
        categoryId: null,
        prixCents: undefined,
        tvaBps: undefined,
        online: undefined,
        description: undefined,
        ingredients: undefined,
        allergenes: undefined,
        imageUrl: undefined,
      },
    })
    expect(
      articleCategoriesServiceMock.ensureAssignableCategory,
    ).not.toHaveBeenCalled()
  })

  it('updateImage should update an existing article image', async () => {
    const updated = {
      id: 1,
      nom: 'Baguette',
      imageUrl: '/uploads/articles/article-1-new.jpg',
    }

    prismaMock.article.findUnique.mockResolvedValue({ imageUrl: null })
    prismaMock.article.update.mockResolvedValue(updated)

    await expect(
      service.updateImage(
        1,
        '/uploads/articles/article-1-new.jpg',
        'uploads/articles/article-1-new.jpg',
      ),
    ).resolves.toEqual(updated)
    expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { imageUrl: true },
    })
    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        imageUrl: '/uploads/articles/article-1-new.jpg',
      },
    })
  })

  it('updateImage should reject an unknown article', async () => {
    prismaMock.article.findUnique.mockResolvedValue(null)

    await expect(
      service.updateImage(
        999,
        '/uploads/articles/article-999-new.jpg',
        'uploads/articles/article-999-new.jpg',
      ),
    ).rejects.toThrow('Article introuvable')
    expect(prismaMock.article.update).not.toHaveBeenCalled()
  })

  it('remove should delete an unused article', async () => {
    const deleted = { id: 1, nom: 'Baguette', prixCents: 120 }

    prismaMock.article.findUniqueOrThrow.mockResolvedValue({
      archivedAt: null,
      _count: {
        lignesVente: 0,
        lignesCmd: 0,
        mouvementsStock: 0,
        stockLots: 0,
      },
    })
    prismaMock.article.delete.mockResolvedValue(deleted)

    await expect(service.remove(1)).resolves.toEqual(deleted)
    expect(prismaMock.article.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 1 },
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
    expect(prismaMock.nomenclature.deleteMany).toHaveBeenCalledWith({
      where: { articleId: 1 },
    })
    expect(prismaMock.article.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    })
  })

  it('remove should archive an article used in business history', async () => {
    const archived = {
      id: 1,
      nom: 'Baguette',
      prixCents: 120,
      online: false,
      archivedAt: new Date('2026-07-01T10:00:00.000Z'),
    }

    prismaMock.article.findUniqueOrThrow.mockResolvedValue({
      archivedAt: null,
      _count: {
        lignesVente: 0,
        lignesCmd: 1,
        mouvementsStock: 0,
        stockLots: 0,
      },
    })
    prismaMock.article.update.mockResolvedValue(archived)

    await expect(service.remove(1)).resolves.toEqual(archived)
    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        archivedAt: expect.any(Date),
        online: false,
      },
    })
    expect(prismaMock.nomenclature.deleteMany).not.toHaveBeenCalled()
    expect(prismaMock.article.delete).not.toHaveBeenCalled()
  })

  it('getProductionCapacity should return zero without nomenclature', async () => {
    const article = {
      id: 1,
      nom: 'Baguette',
      nomen: [],
    }

    prismaMock.article.findUniqueOrThrow.mockResolvedValue(article)

    await expect(service.getProductionCapacity(1)).resolves.toEqual({
      articleId: 1,
      articleNom: 'Baguette',
      capacite: 0,
      limitingIngredient: null,
      ingredients: [],
    })
  })

  it('getProductionCapacity should calculate the limiting ingredient', async () => {
    const article = {
      id: 1,
      nom: 'Baguette',
      stock: 1,
      nomen: [
        {
          mpId: 1,
          quantite: 0.5,
          mp: {
            id: 1,
            nom: 'Farine',
            stock: 10,
            unite: 'kg',
          },
        },
        {
          mpId: 2,
          quantite: 0.1,
          mp: {
            id: 2,
            nom: 'Levure',
            stock: 1,
            unite: 'kg',
          },
        },
      ],
    }

    prismaMock.article.findUniqueOrThrow.mockResolvedValue(article)

    await expect(service.getProductionCapacity(1)).resolves.toEqual({
      articleId: 1,
      articleNom: 'Baguette',
      capacite: 10,
      limitingIngredient: {
        mpId: 2,
        nom: 'Levure',
        stock: 1,
        sellableStock: 1,
        unite: 'kg',
        quantiteNecessaire: 0.1,
        possible: 10,
      },
      ingredients: [
        {
          mpId: 1,
          nom: 'Farine',
          stock: 10,
          sellableStock: 10,
          unite: 'kg',
          quantiteNecessaire: 0.5,
          possible: 20,
        },
        {
          mpId: 2,
          nom: 'Levure',
          stock: 1,
          sellableStock: 1,
          unite: 'kg',
          quantiteNecessaire: 0.1,
          possible: 10,
        },
      ],
    })
  })

  it('produce should increment article stock without raw material consumption when nomenclature is missing', async () => {
    const article = {
      id: 1,
      nom: 'Baguette',
      stock: 3,
      nomen: [],
    }
    const updatedArticle = {
      ...article,
      stock: 5,
    }

    prismaMock.article.findUniqueOrThrow.mockResolvedValue(article)
    prismaMock.article.update.mockResolvedValue(updatedArticle)

    await expect(service.produce(1, { quantite: 2 })).resolves.toEqual({
      article: updatedArticle,
      produced: 2,
      consumed: [],
    })

    expect(prismaMock.$transaction).toHaveBeenCalled()
    expect(prismaMock.matierePremiere.updateMany).not.toHaveBeenCalled()
    expect(
      mouvementsStockServiceMock.recordMatierePremiereMovement,
    ).not.toHaveBeenCalled()
    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        stock: {
          increment: 2,
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
    expect(
      mouvementsStockServiceMock.recordArticleMovement,
    ).toHaveBeenCalledWith(transactionClient, {
      articleId: 1,
      quantite: 2,
      stockAvant: 3,
      stockApres: 5,
      type: 'production',
      motif: 'Production de 2 Baguette',
      reference: 'production:article:1',
    })
  })

  it('produce should reject insufficient ingredients', async () => {
    prismaMock.article.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      nom: 'Baguette',
      nomen: [
        {
          mpId: 1,
          quantite: 0.5,
          mp: {
            id: 1,
            nom: 'Farine',
            stock: 0.8,
            unite: 'kg',
          },
        },
      ],
    })

    prismaMock.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 1,
        nom: 'Farine',
        stock: 0.8,
        unite: 'kg',
      },
    ])

    await expect(service.produce(1, { quantite: 2 })).rejects.toBeInstanceOf(
      ConflictException,
    )
    expect(prismaMock.$transaction).toHaveBeenCalled()
    expect(prismaMock.matierePremiere.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.article.update).not.toHaveBeenCalled()
  })

  it('produce should decrement ingredients and increment article stock', async () => {
    const article = {
      id: 1,
      nom: 'Baguette',
      stock: 1,
      nomen: [
        {
          mpId: 1,
          quantite: 0.5,
          mp: {
            id: 1,
            nom: 'Farine',
            stock: 10,
            unite: 'kg',
          },
        },
        {
          mpId: 2,
          quantite: 0.1,
          mp: {
            id: 2,
            nom: 'Levure',
            stock: 2,
            unite: 'kg',
          },
        },
      ],
    }
    const updatedArticle = {
      ...article,
      stock: 4,
    }

    prismaMock.article.findUniqueOrThrow.mockResolvedValue(article)
    prismaMock.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 1,
        nom: 'Farine',
        stock: 10,
        unite: 'kg',
      },
      {
        id: 2,
        nom: 'Levure',
        stock: 2,
        unite: 'kg',
      },
    ])
    prismaMock.article.update.mockResolvedValue(updatedArticle)

    await expect(service.produce(1, { quantite: 3 })).resolves.toEqual({
      article: updatedArticle,
      produced: 3,
      consumed: [
        {
          mpId: 1,
          nom: 'Farine',
          unite: 'kg',
          quantite: 1.5,
        },
        {
          mpId: 2,
          nom: 'Levure',
          unite: 'kg',
          quantite: 0.30000000000000004,
        },
      ],
    })
    expect(prismaMock.matierePremiere.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 1,
        stock: {
          gte: 1.5,
        },
      },
      data: {
        stock: {
          decrement: 1.5,
        },
      },
    })
    expect(prismaMock.matierePremiere.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 2,
        stock: {
          gte: 0.30000000000000004,
        },
      },
      data: {
        stock: {
          decrement: 0.30000000000000004,
        },
      },
    })
    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        stock: {
          increment: 3,
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
    expect(
      mouvementsStockServiceMock.recordMatierePremiereMovement,
    ).toHaveBeenNthCalledWith(1, transactionClient, {
      mpId: 1,
      quantite: -1.5,
      stockAvant: 10,
      stockApres: 8.5,
      type: 'production',
      motif: 'Production de 3 Baguette',
      reference: 'production:article:1',
    })
    expect(
      mouvementsStockServiceMock.recordMatierePremiereMovement,
    ).toHaveBeenNthCalledWith(2, transactionClient, {
      mpId: 2,
      quantite: -0.30000000000000004,
      stockAvant: 2,
      stockApres: 1.7,
      type: 'production',
      motif: 'Production de 3 Baguette',
      reference: 'production:article:1',
    })
    expect(
      mouvementsStockServiceMock.recordArticleMovement,
    ).toHaveBeenCalledWith(transactionClient, {
      articleId: 1,
      quantite: 3,
      stockAvant: 1,
      stockApres: 4,
      type: 'production',
      motif: 'Production de 3 Baguette',
      reference: 'production:article:1',
    })
  })

  it('produce should aggregate duplicated raw material needs before checking stock', async () => {
    const article = {
      id: 1,
      nom: 'Baguette',
      stock: 1,
      nomen: [
        {
          mpId: 1,
          quantite: 0.5,
        },
        {
          mpId: 1,
          quantite: 0.25,
        },
      ],
    }
    const updatedArticle = {
      ...article,
      stock: 3,
    }

    prismaMock.article.findUniqueOrThrow.mockResolvedValue(article)
    prismaMock.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 1,
        nom: 'Farine',
        stock: 10,
        unite: 'kg',
      },
    ])
    prismaMock.article.update.mockResolvedValue(updatedArticle)

    await expect(service.produce(1, { quantite: 2 })).resolves.toEqual({
      article: updatedArticle,
      produced: 2,
      consumed: [
        {
          mpId: 1,
          nom: 'Farine',
          unite: 'kg',
          quantite: 1.5,
        },
      ],
    })

    expect(prismaMock.matierePremiere.updateMany).toHaveBeenCalledTimes(1)
    expect(prismaMock.matierePremiere.updateMany).toHaveBeenCalledWith({
      where: {
        id: 1,
        stock: {
          gte: 1.5,
        },
      },
      data: {
        stock: {
          decrement: 1.5,
        },
      },
    })
    expect(
      mouvementsStockServiceMock.recordMatierePremiereMovement,
    ).toHaveBeenCalledTimes(1)
  })
})
