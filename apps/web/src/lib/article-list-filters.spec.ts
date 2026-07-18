import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterArticlesByCategory,
  groupArticlesByCategory,
  resolveArticleCategoryId,
} from './article-list-filters'

const categories = [
  { id: 1, name: 'Bocaux', description: null, isActive: true },
  { id: 2, name: 'Découpes', description: null, isActive: false },
  { id: 3, name: 'Packs', description: null, isActive: true },
]
const articles = [
  { id: 1, categoryId: 1 },
  { id: 2, categoryId: 2 },
  { id: 3, categoryId: 1 },
  { id: 4, categoryId: null },
]

test('all categories keep every article, including uncategorized articles', () => {
  assert.deepEqual(filterArticlesByCategory(articles, null), articles)
})

test('a category keeps only its associated articles', () => {
  assert.deepEqual(filterArticlesByCategory(articles, 1), [
    articles[0],
    articles[2],
  ])
})

test('an empty category returns an empty list', () => {
  assert.deepEqual(filterArticlesByCategory(articles, 3), [])
})

test('a valid category is restored from the URL', () => {
  assert.equal(resolveArticleCategoryId({ category: '2' }, categories), 2)
})

test('an invalid or unknown category falls back to all categories', () => {
  assert.equal(resolveArticleCategoryId({ category: 'invalid' }, categories), null)
  assert.equal(resolveArticleCategoryId({ category: '99' }, categories), null)
  assert.equal(resolveArticleCategoryId({ category: ['2', '1'] }, categories), 2)
})

test('groups articles in category order and omits empty categories', () => {
  const groups = groupArticlesByCategory(articles, categories)

  assert.deepEqual(
    groups.map((group) => ({
      name: group.name,
      articleIds: group.articles.map((article) => article.id),
      status: group.status,
    })),
    [
      { name: 'Bocaux', articleIds: [1, 3], status: undefined },
      { name: 'Découpes', articleIds: [2], status: 'inactive' },
      {
        name: 'Sans catégorie',
        articleIds: [4],
        status: 'uncategorized',
      },
    ],
  )
})

test('keeps a selected category as a single group', () => {
  const filteredArticles = filterArticlesByCategory(articles, 1)
  const groups = groupArticlesByCategory(filteredArticles, categories)

  assert.equal(groups.length, 1)
  assert.equal(groups[0]?.categoryId, 1)
  assert.deepEqual(groups[0]?.articles, [articles[0], articles[2]])
})
