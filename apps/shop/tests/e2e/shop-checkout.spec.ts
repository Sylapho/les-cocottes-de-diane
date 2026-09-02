import { expect, test } from '@playwright/test'

const mockApiBaseUrl = `http://127.0.0.1:${process.env.PLAYWRIGHT_MOCK_API_PORT ?? 4010}`

test.beforeEach(async ({ request }) => {
  await request.post(`${mockApiBaseUrl}/__mock/reset`)
})

test('checkout displays an empty cart state', async ({ page }) => {
  await page.goto('/checkout')

  await expect(
    page.getByRole('heading', { name: 'Votre panier est vide' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voir les produits' })).toHaveAttribute(
    'href',
    '/#produits',
  )
})

test('checkout removes tomorrow at 14:00 Paris and selects the next valid date', async ({
  page,
}) => {
  await page.clock.install({
    time: new Date('2026-07-20T11:58:59.000Z'),
  })
  await page.addInitScript(() => {
    window.localStorage.setItem('localco-shop-cart', JSON.stringify({ 1: 1 }))
  })

  await page.goto('/checkout')
  await page.clock.fastForward(1_100)

  await page.locator('#dateRetrait').selectOption('2026-07-21')
  await expect(page.locator('#dateRetrait')).toHaveValue('2026-07-21')

  await page.clock.fastForward(60_000)

  await expect(
    page.getByText(
      'Il est désormais trop tard pour commander pour demain. La première date compatible suivante a été sélectionnée.',
    ),
  ).toBeVisible()
  await expect(page.locator('#dateRetrait')).toHaveValue('2026-07-28')
  await expect(
    page.locator('#dateRetrait option[value="2026-07-21"]'),
  ).toHaveCount(0)
})

test('shop user can add a product and create a checkout session', async ({
  page,
  request,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Produits disponibles' }),
  ).toBeVisible()
  const terrinesTrigger = page.getByRole('button', {
    name: /^Terrines\s+1 produit$/,
  })

  await expect(terrinesTrigger).toHaveAttribute(
    'aria-expanded',
    'false',
  )

  await terrinesTrigger.click()

  await expect(terrinesTrigger).toHaveAttribute(
    'aria-expanded',
    'true',
  )

  await expect(
    page.getByText('Terrine de volaille', { exact: true }),
  ).toBeVisible()

  await page
    .locator('article')
    .filter({ hasText: 'Terrine de volaille' })
    .getByRole('button', { name: 'Ajouter' })
    .click()

  await expect(page.getByRole('button', { name: 'Panier (1)' })).toBeVisible()
  await page.getByRole('button', { name: 'Panier (1)' }).click()
  await expect(
    page.getByRole('heading', { name: 'Votre commande' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Continuer vers le paiement' }).click()

  await expect(
    page.getByRole('heading', { name: 'Finaliser ma commande' }),
  ).toBeVisible()
  await expect(page.getByText('Terrine de volaille')).toBeVisible()

  await page.locator('#nom').fill('Marie Dupont')
  await page.locator('#email').fill('marie@example.fr')
  await page.locator('#tel').fill('0612345678')

  await page.locator('button[form="checkout-form"]').click()
  await page.waitForURL(`${mockApiBaseUrl}/stripe/checkout-session`)
  await expect(page.getByText('Stripe checkout mock')).toBeVisible()

  const checkoutResponse = await request.get(
    `${mockApiBaseUrl}/__mock/last-checkout`,
  )
  const checkout = (await checkoutResponse.json()) as {
    payload: {
      nom: string
      email: string
      tel: string
      lieu: string
      dateRetrait: string
      lignes: { articleId: number; quantite: number }[]
    }
  }

  expect(checkout.payload).toMatchObject({
    nom: 'Marie Dupont',
    email: 'marie@example.fr',
    tel: '0612345678',
    lieu: 'Marche de Gaillon - Mardi matin, 8h-12h',
    lignes: [{ articleId: 1, quantite: 1 }],
  })
  expect(checkout.payload.dateRetrait).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})
