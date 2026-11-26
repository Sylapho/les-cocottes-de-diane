import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { cx } from './cx'

describe('cx', () => {
  it('joins truthy class names with a single space', () => {
    assert.equal(cx('a', 'b'), 'a b')
  })

  it('drops falsy values', () => {
    assert.equal(cx('a', false, null, undefined, '', 'b'), 'a b')
  })

  it('returns an empty string when nothing is truthy', () => {
    assert.equal(cx(false, undefined), '')
  })
})
