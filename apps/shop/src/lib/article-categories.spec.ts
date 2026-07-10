import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultArticleCategory,
  getArticleCategory,
} from './article-categories'

test('returns the assigned article category', () => {
  const category = {
    id: 1,
    name: 'Terrines',
    slug: 'terrines',
    description: null,
    sortOrder: 1,
    isActive: true,
  }

  assert.equal(getArticleCategory(category), category)
})

test('uses the default category when none is assigned', () => {
  assert.equal(getArticleCategory(null), defaultArticleCategory)
  assert.equal(getArticleCategory(undefined), defaultArticleCategory)
})
