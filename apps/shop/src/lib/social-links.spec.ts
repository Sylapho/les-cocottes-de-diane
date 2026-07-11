import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ShopFooter from '@/components/shop/shop-footer'
import { getConfiguredSocialUrls } from '@/lib/social-links'

const originalFacebookUrl = process.env.NEXT_PUBLIC_FACEBOOK_URL
const originalInstagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL

afterEach(() => {
  restoreEnvironmentVariable('NEXT_PUBLIC_FACEBOOK_URL', originalFacebookUrl)
  restoreEnvironmentVariable('NEXT_PUBLIC_INSTAGRAM_URL', originalInstagramUrl)
})

describe('social links', () => {
  it('renders configured links with accessible and secure attributes', () => {
    process.env.NEXT_PUBLIC_FACEBOOK_URL = 'https://www.facebook.com/example'
    process.env.NEXT_PUBLIC_INSTAGRAM_URL = 'https://www.instagram.com/example'

    const html = renderToStaticMarkup(createElement(ShopFooter))

    assert.match(html, /href="https:\/\/www\.facebook\.com\/example"/)
    assert.match(html, /aria-label="Facebook des Cocottes de Diane"/)
    assert.match(html, /href="https:\/\/www\.instagram\.com\/example"/)
    assert.match(html, /aria-label="Instagram des Cocottes de Diane"/)
    assert.equal((html.match(/target="_blank"/g) ?? []).length, 2)
    assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 2)
  })

  it('omits a social link when its URL is absent', () => {
    delete process.env.NEXT_PUBLIC_FACEBOOK_URL
    process.env.NEXT_PUBLIC_INSTAGRAM_URL = 'https://www.instagram.com/example'

    const html = renderToStaticMarkup(createElement(ShopFooter))

    assert.doesNotMatch(html, /Facebook des Cocottes de Diane/)
    assert.match(html, /Instagram des Cocottes de Diane/)
  })

  it('returns only configured URLs for structured data', () => {
    process.env.NEXT_PUBLIC_FACEBOOK_URL = '  https://www.facebook.com/example  '
    delete process.env.NEXT_PUBLIC_INSTAGRAM_URL

    assert.deepEqual(getConfiguredSocialUrls(), [
      'https://www.facebook.com/example',
    ])
  })
})

function restoreEnvironmentVariable(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}
