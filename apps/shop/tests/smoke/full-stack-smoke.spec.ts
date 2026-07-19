import { expect, test } from '@playwright/test'

test('shop renders catalog data from the real API and PostgreSQL', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Produits disponibles' }),
  ).toBeVisible()

  const bocauxFilter = page.getByRole('button', {
    name: 'Bocaux',
    exact: true,
  })

  await expect(bocauxFilter).toBeVisible()

  await bocauxFilter.click()

  const bocauxCategory = page.getByRole('button', {
    name: /^Bocaux\s+\d+ produits?$/,
  })

  await expect(bocauxCategory).toBeVisible()
  await expect(bocauxCategory).toHaveAttribute('aria-expanded', 'true')

  await expect(
    page.getByText('Terrine de poulet normande', {
      exact: true,
    }),
  ).toBeVisible()
})
