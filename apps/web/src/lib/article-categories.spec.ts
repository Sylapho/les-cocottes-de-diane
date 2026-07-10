import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultArticleCategoryLabel,
  getArticleCategoryLabel,
} from './article-categories'

test('returns the category name when one is assigned', () => {
  assert.equal(getArticleCategoryLabel({ name: 'Terrines' }), 'Terrines')
})

test('returns the default label when the category is missing', () => {
  assert.equal(getArticleCategoryLabel(null), defaultArticleCategoryLabel)
  assert.equal(getArticleCategoryLabel(undefined), defaultArticleCategoryLabel)
})
