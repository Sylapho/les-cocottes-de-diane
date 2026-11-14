import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildArticlesHref,
  filterArticles,
  formatArticleStock,
  getArticleCounts,
  parseArticleListFilters,
} from './article-list'

const articles = [
  { id: 1, nom: 'Velouté de potimarron', online: true, archivedAt: null, categoryId: 1 },
  { id: 2, nom: 'Gratin de légumes', online: true, archivedAt: null, categoryId: 2 },
  { id: 3, nom: 'Tarte aux pommes', online: false, archivedAt: null, categoryId: 3 },
  { id: 4, nom: 'Ancien pâté', online: true, archivedAt: '2026-01-01T00:00:00.000Z', categoryId: 2 },
]

test('counts active articles by visibility and archived ones apart', () => {
  assert.deepEqual(getArticleCounts(articles), {
    all: 3,
    online: 2,
    offline: 1,
    archived: 1,
  })
})

test('filters by tab, category and accent-insensitive search', () => {
  const base = parseArticleListFilters({}, null)
  const ids = (filters: typeof base) =>
    filterArticles(articles, filters).map((article) => article.id)

  assert.deepEqual(ids(base), [1, 2, 3])
  assert.deepEqual(ids({ ...base, tab: 'offline' }), [3])
  assert.deepEqual(ids({ ...base, tab: 'archived' }), [4])
  assert.deepEqual(ids({ ...base, categoryId: 2 }), [2])
  assert.deepEqual(ids({ ...base, q: 'legumes' }), [2])
})

test('parses filters with safe defaults', () => {
  const filters = parseArticleListFilters({ tab: 'nope', page: '0', q: ' tarte ' }, 3)

  assert.equal(filters.tab, 'all')
  assert.equal(filters.page, 1)
  assert.equal(filters.q, 'tarte')
  assert.equal(filters.categoryId, 3)
})

test('builds hrefs and resets the page when a filter changes', () => {
  const filters = parseArticleListFilters({ q: 'tarte', page: '3' }, 2)

  assert.equal(
    buildArticlesHref(filters, { tab: 'online' }),
    '/articles?tab=online&category=2&q=tarte',
  )
  assert.equal(buildArticlesHref(filters, { page: 2 }), '/articles?category=2&q=tarte&page=2')
})

test('formats stock for the catalogue table', () => {
  assert.equal(formatArticleStock(0), '0 · indisponible')
  assert.equal(formatArticleStock(1), '1 unité')
  assert.equal(formatArticleStock(12), '12 unités')
})
