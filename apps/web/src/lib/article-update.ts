export type ArticleUpdateFields = {
  nom: string
  categoryId: number | null
  prixCents: number
  description?: string
  online: boolean
}

export function buildArticleUpdatePayload(
  fields: ArticleUpdateFields,
  canUpdatePrice: boolean,
) {
  const { prixCents, ...nonPriceFields } = fields

  return canUpdatePrice
    ? { ...nonPriceFields, prixCents }
    : nonPriceFields
}
