import { ForbiddenException } from '@nestjs/common'
import { ROLES, type Role } from '../auth/roles'

const ARTICLE_PRICE_FORBIDDEN_MESSAGE =
  "Seul un administrateur peut modifier le prix d'un article."

export function canUpdateArticlePrice(role: Role | undefined) {
  return role === ROLES.ADMIN
}

export function assertArticlePriceUpdateAllowed(
  role: Role | undefined,
  currentPriceCents: number,
  requestedPriceCents: number | undefined,
) {
  if (
    requestedPriceCents === undefined ||
    requestedPriceCents === currentPriceCents ||
    canUpdateArticlePrice(role)
  ) {
    return
  }

  throw new ForbiddenException(ARTICLE_PRICE_FORBIDDEN_MESSAGE)
}
