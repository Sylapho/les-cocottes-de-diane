import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { ArticleCategoriesService } from './article-categories.service'

describe('ArticleCategoriesService', () => {
  let service: ArticleCategoriesService

  const prismaMock = {
    articleCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleCategoriesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile()

    service = module.get<ArticleCategoriesService>(ArticleCategoriesService)
    jest.clearAllMocks()
  })

  it('findAll should return categories ordered for management', async () => {
    const categories = [{ id: 1, name: 'Bocaux' }]
    prismaMock.articleCategory.findMany.mockResolvedValue(categories)

    await expect(service.findAll()).resolves.toEqual(categories)
    expect(prismaMock.articleCategory.findMany).toHaveBeenCalledWith({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    })
  })

  it('create should generate a slug from the name', async () => {
    const created = { id: 1, name: 'Préparations', slug: 'preparations' }
    prismaMock.articleCategory.create.mockResolvedValue(created)

    await expect(
      service.create({ name: 'Préparations', sortOrder: 30 }),
    ).resolves.toEqual(created)
    expect(prismaMock.articleCategory.create).toHaveBeenCalledWith({
      data: {
        name: 'Préparations',
        slug: 'preparations',
        description: null,
        sortOrder: 30,
        isActive: true,
      },
    })
  })

  it('create should map duplicate slugs to conflict errors', async () => {
    prismaMock.articleCategory.create.mockRejectedValue({ code: 'P2002' })

    await expect(service.create({ name: 'Bocaux' })).rejects.toBeInstanceOf(
      ConflictException,
    )
  })

  it('findOne should reject unknown categories', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue(null)

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('remove should deactivate a used category', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue({
      id: 1,
      slug: 'bocaux',
      _count: { articles: 2 },
    })
    prismaMock.articleCategory.update.mockResolvedValue({
      id: 1,
      slug: 'bocaux',
      isActive: false,
    })

    await expect(service.remove(1)).resolves.toEqual({
      id: 1,
      slug: 'bocaux',
      isActive: false,
    })
    expect(prismaMock.articleCategory.delete).not.toHaveBeenCalled()
  })

  it('remove should protect the default category', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue({
      id: 7,
      slug: 'autres',
      _count: { articles: 0 },
    })

    await expect(service.remove(7)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('ensureAssignableCategory should reject inactive categories', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue({
      id: 1,
      isActive: false,
    })

    await expect(service.ensureAssignableCategory(1)).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })
})
