import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { ArticleCategoriesController } from './article-categories.controller'
import { ArticleCategoriesService } from './article-categories.service'

describe('ArticleCategoriesController', () => {
  let controller: ArticleCategoriesController

  const articleCategoriesServiceMock = {
    findAll: jest.fn(),
    findActive: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticleCategoriesController],
      providers: [
        {
          provide: ArticleCategoriesService,
          useValue: articleCategoriesServiceMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile()

    controller = module.get<ArticleCategoriesController>(
      ArticleCategoriesController,
    )
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('findAll should return all categories by default', async () => {
    const result = [{ id: 1, name: 'Bocaux' }]
    articleCategoriesServiceMock.findAll.mockResolvedValue(result)

    await expect(controller.findAll()).resolves.toEqual(result)
  })

  it('findAll should return active categories on demand', async () => {
    const result = [{ id: 1, name: 'Bocaux', isActive: true }]
    articleCategoriesServiceMock.findActive.mockResolvedValue(result)

    await expect(controller.findAll('true')).resolves.toEqual(result)
  })

  it('create should delegate to the service', async () => {
    const body = { name: 'Packs' }
    const result = { id: 2, name: 'Packs' }
    articleCategoriesServiceMock.create.mockResolvedValue(result)

    await expect(controller.create(body)).resolves.toEqual(result)
  })

  it('update should delegate to the service', async () => {
    const body = { name: 'Packs famille' }
    const result = { id: 2, name: 'Packs famille' }
    articleCategoriesServiceMock.update.mockResolvedValue(result)

    await expect(controller.update(2, body)).resolves.toEqual(result)
  })

  it('remove should delegate to the service', async () => {
    const result = { id: 2, isActive: false }
    articleCategoriesServiceMock.remove.mockResolvedValue(result)

    await expect(controller.remove(2)).resolves.toEqual(result)
  })
})
