import { ForbiddenException } from '@nestjs/common'
import { ROLES } from '../auth/roles'
import {
  assertArticlePriceUpdateAllowed,
  canUpdateArticlePrice,
} from './article-permissions'

describe('article permissions', () => {
  it('reserves price updates to administrators', () => {
    expect(canUpdateArticlePrice(ROLES.ADMIN)).toBe(true)
    expect(canUpdateArticlePrice(ROLES.GERANT)).toBe(false)
  })

  it('allows a manager payload when the price is unchanged or absent', () => {
    expect(() =>
      assertArticlePriceUpdateAllowed(ROLES.GERANT, 500, undefined),
    ).not.toThrow()
    expect(() =>
      assertArticlePriceUpdateAllowed(ROLES.GERANT, 500, 500),
    ).not.toThrow()
  })

  it('rejects a real manager price change', () => {
    expect(() =>
      assertArticlePriceUpdateAllowed(ROLES.GERANT, 500, 650),
    ).toThrow(ForbiddenException)
  })
})
