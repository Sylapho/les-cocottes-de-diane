import assert from 'node:assert/strict'
import test from 'node:test'
import { buildArticleUpdatePayload } from '@/lib/article-update'

const fields = {
  nom: 'Article renommÃ©',
  categoryId: 2,
  prixCents: 650,
  description: 'Description mise Ã  jour',
  online: false,
}

test('includes the price in an administrator update payload', () => {
  assert.deepEqual(buildArticleUpdatePayload(fields, true), fields)
})

test('omits the price while preserving manager metadata updates', () => {
  assert.deepEqual(buildArticleUpdatePayload(fields, false), {
    nom: 'Article renommÃ©',
    categoryId: 2,
    description: 'Description mise Ã  jour',
    online: false,
  })
})
