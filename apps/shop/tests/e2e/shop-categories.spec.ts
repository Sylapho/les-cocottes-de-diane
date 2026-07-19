import { expect, test, type Page } from '@playwright/test'

const mockApiBaseUrl = `http://127.0.0.1:${
  process.env.PLAYWRIGHT_MOCK_API_PORT ?? 4010
}`

function getCategoryTrigger(page: Page, categoryName: string) {
  return page.getByRole('button', {
    name: new RegExp(`^${categoryName}\\s+1 produit$`),
  })
}

test.beforeEach(async ({ page, request }) => {
  await request.post(`${mockApiBaseUrl}/__mock/reset`)
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Produits disponibles' }),
  ).toBeVisible()
})

test('categories are closed by default', async ({ page }) => {
  const terrinesTrigger = getCategoryTrigger(page, 'Terrines')
  const sausagesTrigger = getCategoryTrigger(page, 'Saucisses')

  await expect(terrinesTrigger).toHaveAttribute('aria-expanded', 'false')
  await expect(sausagesTrigger).toHaveAttribute('aria-expanded', 'false')

  await expect(
    page.getByText('Terrine de volaille', { exact: true }),
  ).toHaveCount(0)

  await expect(
    page.getByText('Saucisse de poulet', { exact: true }),
  ).toHaveCount(0)
})

test('category header opens and closes its products', async ({ page }) => {
  const terrinesTrigger = getCategoryTrigger(page, 'Terrines')
  const productName = page.getByText('Terrine de volaille', {
    exact: true,
  })

  await expect(terrinesTrigger).toHaveAttribute('aria-expanded', 'false')
  await expect(productName).toHaveCount(0)

  await terrinesTrigger.click()

  await expect(terrinesTrigger).toHaveAttribute('aria-expanded', 'true')
  await expect(productName).toBeVisible()

  await terrinesTrigger.click()

  await expect(terrinesTrigger).toHaveAttribute('aria-expanded', 'false')
  await expect(productName).toHaveCount(0)
})

test('selecting a category filter opens the selected category', async ({
  page,
}) => {
  await page.getByRole('button', {
    name: 'Terrines',
    exact: true,
  }).click()

  const terrinesTrigger = getCategoryTrigger(page, 'Terrines')

  await expect(terrinesTrigger).toHaveAttribute('aria-expanded', 'true')

  await expect(
    page.getByText('Terrine de volaille', { exact: true }),
  ).toBeVisible()

  await expect(
    page.getByText('Saucisse de poulet', { exact: true }),
  ).toHaveCount(0)
})

test('switching filters opens the newly selected category', async ({
  page,
}) => {
  await page.getByRole('button', {
    name: 'Terrines',
    exact: true,
  }).click()

  await expect(
    page.getByText('Terrine de volaille', { exact: true }),
  ).toBeVisible()

  await page.getByRole('button', {
    name: 'Saucisses',
    exact: true,
  }).click()

  const sausagesTrigger = getCategoryTrigger(page, 'Saucisses')

  await expect(sausagesTrigger).toHaveAttribute('aria-expanded', 'true')

  await expect(
    page.getByText('Saucisse de poulet', { exact: true }),
  ).toBeVisible()

  await expect(
    page.getByText('Terrine de volaille', { exact: true }),
  ).toHaveCount(0)
})

test('returning to all categories closes every category', async ({
  page,
}) => {
  await page.getByRole('button', {
    name: 'Terrines',
    exact: true,
  }).click()

  await page.getByRole('button', {
    name: 'Toutes',
    exact: true,
  }).click()

  await expect(
    getCategoryTrigger(page, 'Terrines'),
  ).toHaveAttribute('aria-expanded', 'false')

  await expect(
    getCategoryTrigger(page, 'Saucisses'),
  ).toHaveAttribute('aria-expanded', 'false')

  await expect(
    page.getByText('Terrine de volaille', { exact: true }),
  ).toHaveCount(0)
})

test('category accordion works with the keyboard', async ({ page }) => {
  const terrinesTrigger = getCategoryTrigger(page, 'Terrines')

  await terrinesTrigger.focus()
  await terrinesTrigger.press('Enter')

  await expect(terrinesTrigger).toHaveAttribute('aria-expanded', 'true')

  await expect(
    page.getByText('Terrine de volaille', { exact: true }),
  ).toBeVisible()

  await terrinesTrigger.press('Space')

  await expect(terrinesTrigger).toHaveAttribute('aria-expanded', 'false')

  await expect(
    page.getByText('Terrine de volaille', { exact: true }),
  ).toHaveCount(0)
})