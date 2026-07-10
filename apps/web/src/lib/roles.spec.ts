import assert from 'node:assert/strict'
import test from 'node:test'
import { isRole, roles } from './roles'

test('recognizes every supported role', () => {
  for (const role of roles) {
    assert.equal(isRole(role), true)
  }
})

test('rejects unknown and non-string roles', () => {
  assert.equal(isRole('administrator'), false)
  assert.equal(isRole(null), false)
  assert.equal(isRole(1), false)
})
