export type ArticleCategory = {
  id: number
  name: string
  slug: string
  description?: string | null
  sortOrder: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  _count?: {
    articles: number
  }
}

export const defaultArticleCategoryLabel = 'Autres'

export function getArticleCategoryLabel(
  category?: Pick<ArticleCategory, 'name'> | null,
) {
  return category?.name ?? defaultArticleCategoryLabel
}
