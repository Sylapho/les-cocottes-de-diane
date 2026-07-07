import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateArticleCategoryDto } from './create-article-category.dto'

describe('CreateArticleCategoryDto', () => {
  it('should trim text fields and omit empty optional values', async () => {
    const dto = plainToInstance(CreateArticleCategoryDto, {
      name: '  Bocaux  ',
      slug: '  ',
      description: '  Articles en pot  ',
      sortOrder: 10,
      isActive: true,
    })

    await expect(validate(dto)).resolves.toEqual([])
    expect(dto.name).toBe('Bocaux')
    expect(dto.slug).toBeUndefined()
    expect(dto.description).toBe('Articles en pot')
  })

  it('should reject empty names', async () => {
    const dto = plainToInstance(CreateArticleCategoryDto, {
      name: '  ',
    })

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'name',
        }),
      ]),
    )
  })
})
