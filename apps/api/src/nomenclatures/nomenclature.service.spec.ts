import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { NomenclatureService } from './nomenclature.service'

describe('NomenclatureService', () => {
  let service: NomenclatureService

  const prismaMock = {
    nomenclature: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NomenclatureService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile()

    service = module.get<NomenclatureService>(NomenclatureService)
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('findByArticle should return nomenclature lines for one article', async () => {
    const lines = [
      {
        articleId: 1,
        mpId: 2,
        quantite: 0.5,
      },
    ]

    prismaMock.nomenclature.findMany.mockResolvedValue(lines)

    await expect(service.findByArticle(1)).resolves.toEqual(lines)
    expect(prismaMock.nomenclature.findMany).toHaveBeenCalledWith({
      where: { articleId: 1 },
      include: {
        article: true,
        mp: true,
      },
      orderBy: {
        mp: {
          nom: 'asc',
        },
      },
    })
  })

  it('create should create a nomenclature line', async () => {
    const body = {
      mpId: 2,
      quantite: 0.5,
    }
    const created = {
      articleId: 1,
      ...body,
    }

    prismaMock.nomenclature.create.mockResolvedValue(created)

    await expect(service.create(1, body)).resolves.toEqual(created)
    expect(prismaMock.nomenclature.create).toHaveBeenCalledWith({
      data: {
        articleId: 1,
        mpId: 2,
        quantite: 0.5,
      },
      include: {
        article: true,
        mp: true,
      },
    })
  })

  it('update should update a nomenclature quantity', async () => {
    const updated = {
      articleId: 1,
      mpId: 2,
      quantite: 0.75,
    }

    prismaMock.nomenclature.update.mockResolvedValue(updated)

    await expect(service.update(1, 2, { quantite: 0.75 })).resolves.toEqual(
      updated,
    )
    expect(prismaMock.nomenclature.update).toHaveBeenCalledWith({
      where: {
        articleId_mpId: {
          articleId: 1,
          mpId: 2,
        },
      },
      data: {
        quantite: 0.75,
      },
      include: {
        article: true,
        mp: true,
      },
    })
  })

  it('remove should delete a nomenclature line', async () => {
    const deleted = {
      articleId: 1,
      mpId: 2,
      quantite: 0.5,
    }

    prismaMock.nomenclature.delete.mockResolvedValue(deleted)

    await expect(service.remove(1, 2)).resolves.toEqual(deleted)
    expect(prismaMock.nomenclature.delete).toHaveBeenCalledWith({
      where: {
        articleId_mpId: {
          articleId: 1,
          mpId: 2,
        },
      },
    })
  })
})
