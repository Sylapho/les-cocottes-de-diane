import type { Article } from '@/lib/api'
import type { ArticleCategory } from '@/lib/article-categories'

type SearchParams = Record<string, string | string[] | undefined>

function getFirstParam(params: SearchParams, key: string) {
  const value = params[key]

  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export function resolveArticleCategoryId(
  params: SearchParams,
  categories: Pick<ArticleCategory, 'id'>[],
) {
  const categoryParam = getFirstParam(params, 'category')

  if (!/^[1-9]\d*$/.test(categoryParam)) {
    return null
  }

  const categoryId = Number(categoryParam)

  return categories.some((category) => category.id === categoryId)
    ? categoryId
    : null
}

export function filterArticlesByCategory<T extends Pick<Article, 'categoryId'>>(
  articles: T[],
  categoryId: number | null,
) {
  if (categoryId === null) {
    return articles
  }

  return articles.filter((article) => article.categoryId === categoryId)
}

export type ArticleCategoryGroup<T> = {
  key: string
  categoryId: number | null
  name: string
  description: string | null
  status?: 'inactive' | 'uncategorized'
  articles: T[]
}

export function groupArticlesByCategory<
  T extends Pick<Article, 'categoryId'>,
>(
  articles: T[],
  categories: Array<
    Pick<ArticleCategory, 'id' | 'name' | 'description' | 'isActive'>
  >,
): ArticleCategoryGroup<T>[] {
  const articlesByCategoryId = new Map<number, T[]>()
  const uncategorizedArticles: T[] = []

  for (const article of articles) {
    if (article.categoryId == null) {
      uncategorizedArticles.push(article)
      continue
    }

    const categoryArticles = articlesByCategoryId.get(article.categoryId) ?? []
    categoryArticles.push(article)
    articlesByCategoryId.set(article.categoryId, categoryArticles)
  }

  const groups = categories
    .map((category): ArticleCategoryGroup<T> => ({
      key: `category-${category.id}`,
      categoryId: category.id,
      name: category.name,
      description: category.description ?? null,
      status: category.isActive ? undefined : 'inactive',
      articles: articlesByCategoryId.get(category.id) ?? [],
    }))
    .filter((group) => group.articles.length > 0)

  if (uncategorizedArticles.length > 0) {
    groups.push({
      key: 'uncategorized',
      categoryId: null,
      name: 'Sans catégorie',
      description: 'Articles qui doivent encore être rattachés à une catégorie.',
      status: 'uncategorized',
      articles: uncategorizedArticles,
    })
  }

  return groups
}
