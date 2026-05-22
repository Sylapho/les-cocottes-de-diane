import { Test, TestingModule } from '@nestjs/testing'
import { ArticlesService } from './articles.service'
import { PrismaService } from '../prisma/prisma.service'
import { BadRequestException } from '@nestjs/common'

describe('ArticlesService', () => {
  let service: ArticlesService

  const prismaMock = {
    article: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    matierePremiere: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile()

    service = module.get<ArticlesService>(ArticlesService)
    jest.clearAllMocks()

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        article: prismaMock.article,
        matierePremiere: prismaMock.matierePremiere,
      }),
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('findAll should return articles', async () => {
    const articles = [
      { id: 1, nom: 'Baguette', prix: 1.2 },
      { id: 2, nom: 'Croissant', prix: 1.1 },
    ]

    prismaMock.article.findMany.mockResolvedValue(articles)

    await expect(service.findAll()).resolves.toEqual(articles)
    expect(prismaMock.article.findMany).toHaveBeenCalledWith({
      include: {
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

  it('findOne should return one article', async () => {
    const article = { id: 1, nom: 'Baguette', prix: 1.2 }

    prismaMock.article.findUniqueOrThrow.mockResolvedValue(article)

    await expect(service.findOne(1)).resolves.toEqual(article)
    expect(prismaMock.article.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        nomen: {
          include: {
            mp: true,
          },
        },
      },
    })
  })

  it('create should create an article with defaults', async () => {
    const input = {
      nom: 'Pain au chocolat',
      prix: 1.5,
    }

    const created = {
      id: 1,
      nom: 'Pain au chocolat',
      prix: 1.5,
      tva: 0.055,
      stock: 0,
      online: true,
      emoji: '🥖',
    }

    prismaMock.article.create.mockResolvedValue(created)

    await expect(service.create(input as any)).resolves.toEqual(created)
    expect(prismaMock.article.create).toHaveBeenCalledWith({
      data: {
        nom: 'Pain au chocolat',
        prix: 1.5,
        tva: 0.055,
        stock: 0,
        online: true,
        emoji: '🥖',
        description: undefined,
      },
    })
  })

  it('update should update an article', async () => {
    const updated = {
      id: 1,
      nom: 'Baguette tradition',
      prix: 1.3,
    }

    prismaMock.article.update.mockResolvedValue(updated)

    await expect(service.update(1, { prix: 1.3 })).resolves.toEqual(updated)
    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { prix: 1.3 },
    })
  })

  it('remove should delete an article', async () => {
    const deleted = { id: 1, nom: 'Baguette', prix: 1.2 }

    prismaMock.article.delete.mockResolvedValue(deleted)

    await expect(service.remove(1)).resolves.toEqual(deleted)
    expect(prismaMock.article.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    })
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
        unite: 'kg',
        quantiteNecessaire: 0.1,
        possible: 10,
      },
      ingredients: [
        {
          mpId: 1,
          nom: 'Farine',
          stock: 10,
          unite: 'kg',
          quantiteNecessaire: 0.5,
          possible: 20,
        },
        {
          mpId: 2,
          nom: 'Levure',
          stock: 1,
          unite: 'kg',
          quantiteNecessaire: 0.1,
          possible: 10,
        },
      ],
    })
  })

  it('produce should reject an article without nomenclature', async () => {
    prismaMock.article.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      nom: 'Baguette',
      nomen: [],
    })

    await expect(service.produce(1, 2)).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
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

    await expect(service.produce(1, 2)).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('produce should decrement ingredients and increment article stock', async () => {
    const article = {
      id: 1,
      nom: 'Baguette',
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
    prismaMock.article.update.mockResolvedValue(updatedArticle)

    await expect(service.produce(1, 3)).resolves.toEqual({
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
    expect(prismaMock.matierePremiere.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: {
        stock: {
          decrement: 1.5,
        },
      },
    })
    expect(prismaMock.matierePremiere.update).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
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
  })
})
