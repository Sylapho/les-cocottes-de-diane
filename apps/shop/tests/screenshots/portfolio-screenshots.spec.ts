import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputDirectory = resolve(process.cwd(), '../../docs/screenshots')
const webOrigin = `http://127.0.0.1:${process.env.SCREENSHOTS_WEB_PORT ?? 4200}`
const adminEmail = getRequiredEnvironmentVariable('SCREENSHOTS_ADMIN_EMAIL')
const adminPassword = getRequiredEnvironmentVariable(
  'SCREENSHOTS_ADMIN_PASSWORD',
)

test.beforeAll(async () => {
  await mkdir(outputDirectory, { recursive: true })
})

test('generates the README and portfolio screenshot set', async ({ page }) => {
  await captureShopScreenshots(page)
  await captureBackOfficeScreenshots(page)
})

async function captureShopScreenshots(page: Page) {
  await page.goto('/#produits')
  await expect(page.getByRole('heading', { name: 'Produits disponibles' })).toBeVisible()
  await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>('#produits')
    window.scrollTo(0, Math.max(0, (section?.offsetTop ?? 0) - 90))
  })
  await capture(page, 'shop-catalog-desktop.png')

  await addProduct(page, 'Terrine de poulet normande')
  await addProduct(page, 'Cordon bleu x2')
  await page.getByRole('button', { name: 'Panier (2)' }).click()
  await expect(page.getByRole('heading', { name: 'Votre commande' })).toBeVisible()
  await capture(page, 'shop-cart-desktop.png')

  await page.getByRole('link', { name: 'Continuer vers le paiement' }).click()
  await expect(page.getByRole('heading', { name: 'Finaliser ma commande' })).toBeVisible()
  await page.locator('#nom').fill('Camille Martin')
  await page.locator('#email').fill('camille.martin@example.test')
  await page.locator('#tel').fill('06 12 34 56 78')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, 'shop-checkout-desktop.png')

  await page.goto('/suivi?token=portfolio-order-ready')
  await expect(page.getByRole('heading', { name: /Commande CMD-/ })).toBeVisible()
  await capture(page, 'shop-order-tracking-desktop.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Des produits frais/ })).toBeVisible()
  await capture(page, 'shop-home-mobile.png')
}

async function captureBackOfficeScreenshots(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${webOrigin}/sign-in`)
  await page.locator('#email').fill(adminEmail)
  await page.locator('#password').fill(adminPassword)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(`${webOrigin}/`)
  await expect(
    page.getByRole('heading', { name: 'Tableau de bord Les cocottes de Diane' }),
  ).toBeVisible()
  await capture(page, 'backoffice-dashboard-desktop.png')

  await page.goto(`${webOrigin}/commandes`)
  await expect(page.getByRole('heading', { name: 'Commandes en ligne' })).toBeVisible()
  await capture(page, 'backoffice-orders-desktop.png')

  await page.goto(`${webOrigin}/preparation?date=all`)
  await expect(page.getByRole('heading', { name: 'Préparation du jour' })).toBeVisible()
  await expect(page.getByText('Camille Martin')).toBeVisible()
  await capture(page, 'backoffice-preparation-desktop.png')

  await page.goto(`${webOrigin}/stock`)
  await expect(page.getByRole('heading', { name: 'Stock', exact: true })).toBeVisible()
  await capture(page, 'backoffice-stock-desktop.png')
}

async function addProduct(page: Page, productName: string) {
  const card = page.locator('article').filter({ hasText: productName }).first()
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Ajouter' }).click()
}

async function capture(page: Page, fileName: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: resolve(outputDirectory, fileName),
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  })
}

function getRequiredEnvironmentVariable(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}
