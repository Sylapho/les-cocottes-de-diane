import assert from 'node:assert/strict'
import test from 'node:test'
import { getImageUrl } from './image-url'

test('builds API URLs for uploaded images', () => {
  assert.equal(
    getImageUrl('/uploads/articles/article-1.jpg'),
    'http://localhost:4000/uploads/articles/article-1.jpg',
  )
  assert.equal(
    getImageUrl('http://shop.test/uploads/articles/article-1.jpg?size=large'),
    'http://localhost:4000/uploads/articles/article-1.jpg?size=large',
  )
})

test('keeps external and malformed URLs unchanged', () => {
  assert.equal(getImageUrl('https://cdn.test/article.jpg'), 'https://cdn.test/article.jpg')
  assert.equal(getImageUrl('not a url'), 'not a url')
})

test('normalizes missing and blank image values to null', () => {
  assert.equal(getImageUrl(null), null)
  assert.equal(getImageUrl('   '), null)
})
