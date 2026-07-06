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

  it('findActive should return active categories ordered for selection', async () => {
    const categories = [{ id: 1, name: 'Bocaux', isActive: true }]
    prismaMock.articleCategory.findMany.mockResolvedValue(categories)

    await expect(service.findActive()).resolves.toEqual(categories)
    expect(prismaMock.articleCategory.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
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

  it('create should reject invalid slugs', async () => {
    await expect(service.create({ name: '---' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prismaMock.articleCategory.create).not.toHaveBeenCalled()
  })

  it('create should rethrow unknown write errors', async () => {
    const error = new Error('database unavailable')
    prismaMock.articleCategory.create.mockRejectedValue(error)

    await expect(service.create({ name: 'Bocaux' })).rejects.toBe(error)
  })

  it('findOne should reject unknown categories', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue(null)

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('findOne should return a category with article count', async () => {
    const category = {
      id: 1,
      slug: 'bocaux',
      _count: { articles: 0 },
    }
    prismaMock.articleCategory.findUnique.mockResolvedValue(category)

    await expect(service.findOne(1)).resolves.toEqual(category)
    expect(prismaMock.articleCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    })
  })

  it('update should normalize writable fields', async () => {
    const existing = {
      id: 1,
      slug: 'bocaux',
      _count: { articles: 0 },
    }
    const updated = {
      id: 1,
      name: 'Bocaux frais',
      slug: 'bocaux-frais',
      description: 'Bocaux et conserves',
      sortOrder: 12,
      isActive: true,
    }
    prismaMock.articleCategory.findUnique.mockResolvedValue(existing)
    prismaMock.articleCategory.update.mockResolvedValue(updated)

    await expect(
      service.update(1, {
        name: 'Bocaux frais',
        slug: 'Bocaux frais',
        description: 'Bocaux et conserves',
        sortOrder: 12,
        isActive: true,
      }),
    ).resolves.toEqual(updated)
    expect(prismaMock.articleCategory.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: 'Bocaux frais',
        slug: 'bocaux-frais',
        description: 'Bocaux et conserves',
        sortOrder: 12,
        isActive: true,
      },
    })
  })

  it('update should protect the default category activation and slug', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue({
      id: 7,
      slug: 'autres',
      _count: { articles: 0 },
    })

    await expect(service.update(7, { isActive: false })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    await expect(
      service.update(7, { slug: 'autre-slug' }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(prismaMock.articleCategory.update).not.toHaveBeenCalled()
  })

  it('update should map duplicate slugs to conflict errors', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue({
      id: 1,
      slug: 'bocaux',
      _count: { articles: 0 },
    })
    prismaMock.articleCategory.update.mockRejectedValue({ code: 'P2002' })

    await expect(service.update(1, { slug: 'packs' })).rejects.toBeInstanceOf(
      ConflictException,
    )
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

  it('remove should delete an unused category', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue({
      id: 2,
      slug: 'packs',
      _count: { articles: 0 },
    })
    prismaMock.articleCategory.delete.mockResolvedValue({
      id: 2,
      slug: 'packs',
    })

    await expect(service.remove(2)).resolves.toEqual({
      id: 2,
      slug: 'packs',
    })
    expect(prismaMock.articleCategory.delete).toHaveBeenCalledWith({
      where: { id: 2 },
    })
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

  it('ensureAssignableCategory should return the default category when missing', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue({ id: 7 })

    await expect(service.ensureAssignableCategory()).resolves.toBe(7)
    expect(prismaMock.articleCategory.findUnique).toHaveBeenCalledWith({
      where: { slug: 'autres' },
      select: { id: true },
    })
  })

  it('ensureAssignableCategory should reject when the default category is missing', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue(null)

    await expect(service.ensureAssignableCategory()).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('ensureAssignableCategory should accept active categories', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue({
      id: 1,
      isActive: true,
    })

    await expect(service.ensureAssignableCategory(1)).resolves.toBe(1)
  })

  it('ensureAssignableCategory should reject unknown categories', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue(null)

    await expect(service.ensureAssignableCategory(404)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('ensureAssignableCategorySlug should accept active category slugs', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue({
      id: 1,
      isActive: true,
    })

    await expect(service.ensureAssignableCategorySlug('bocaux')).resolves.toBe(
      1,
    )
    expect(prismaMock.articleCategory.findUnique).toHaveBeenCalledWith({
      where: { slug: 'bocaux' },
      select: {
        id: true,
        isActive: true,
      },
    })
  })

  it('ensureAssignableCategorySlug should reject unknown category slugs', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue(null)

    await expect(
      service.ensureAssignableCategorySlug('missing'),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('ensureAssignableCategorySlug should reject inactive category slugs', async () => {
    prismaMock.articleCategory.findUnique.mockResolvedValue({
      id: 1,
      isActive: false,
    })

    await expect(
      service.ensureAssignableCategorySlug('bocaux'),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
