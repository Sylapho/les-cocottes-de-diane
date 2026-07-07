export type ArticleCategory = {
  id: number
  name: string
  slug: string
  description?: string | null
  sortOrder: number
  isActive: boolean
}

export type CategoryFilter = 'ALL' | string

export const defaultArticleCategory: ArticleCategory = {
  id: 0,
  name: 'Autres',
  slug: 'autres',
  description: null,
  sortOrder: 999,
  isActive: true,
}

export function getArticleCategory(
  category?: ArticleCategory | null,
): ArticleCategory {
  return category ?? defaultArticleCategory
}
