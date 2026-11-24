import type { Article } from './api'

export const ARTICLES_PAGE_SIZE = 20

export const articleTabs = ['all', 'online', 'offline', 'archived'] as const

export type ArticleTab = (typeof articleTabs)[number]

export type ArticleListFilters = {
  tab: ArticleTab
  categoryId: number | null
  q: string
  page: number
}

type ArticleLike = Pick<
  Article,
  'nom' | 'online' | 'archivedAt' | 'categoryId'
> & { description?: string | null }

type SearchParams = Record<string, string | string[] | undefined>

function getParam(params: SearchParams, key: string) {
  const value = params[key]

  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

export function parseArticleListFilters(
  params: SearchParams,
  categoryId: number | null,
): ArticleListFilters {
  const tab = getParam(params, 'tab')
  const page = Number.parseInt(getParam(params, 'page'), 10)

  return {
    tab: articleTabs.includes(tab as ArticleTab) ? (tab as ArticleTab) : 'all',
    categoryId,
    q: getParam(params, 'q').trim(),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

function matchesTab(article: ArticleLike, tab: ArticleTab) {
  if (tab === 'archived') {
    return Boolean(article.archivedAt)
  }

  // Archived articles only show up in their own tab.
  if (article.archivedAt) {
    return false
  }

  if (tab === 'online') {
    return article.online
  }

  if (tab === 'offline') {
    return !article.online
  }

  return true
}

export function filterArticles<T extends ArticleLike>(
  articles: T[],
  filters: ArticleListFilters,
) {
  const search = normalize(filters.q)

  return articles.filter((article) => {
    if (!matchesTab(article, filters.tab)) {
      return false
    }

    if (
      filters.categoryId !== null &&
      article.categoryId !== filters.categoryId
    ) {
      return false
    }

    return (
      !search ||
      normalize(article.nom).includes(search) ||
      normalize(article.description ?? '').includes(search)
    )
  })
}

export function getArticleCounts(articles: ArticleLike[]) {
  const active = articles.filter((article) => !article.archivedAt)

  return {
    all: active.length,
    online: active.filter((article) => article.online).length,
    offline: active.filter((article) => !article.online).length,
    archived: articles.length - active.length,
  }
}

export function buildArticlesHref(
  filters: ArticleListFilters,
  overrides: Partial<ArticleListFilters> = {},
) {
  const next = { ...filters, page: 1, ...overrides }
  const params = new URLSearchParams()

  if (next.tab !== 'all') params.set('tab', next.tab)
  if (next.categoryId !== null) params.set('category', String(next.categoryId))
  if (next.q) params.set('q', next.q)
  if (next.page > 1) params.set('page', String(next.page))

  const query = params.toString()

  return query ? `/articles?${query}` : '/articles'
}

export function formatArticleStock(stock: number) {
  if (stock <= 0) {
    return `${stock} · indisponible`
  }

  return stock > 1 ? `${stock} unités` : '1 unité'
}
