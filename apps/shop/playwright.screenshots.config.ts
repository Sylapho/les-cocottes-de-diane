import { defineConfig } from '@playwright/test'

const apiPort = Number(process.env.SCREENSHOTS_API_PORT ?? 4400)
const webPort = Number(process.env.SCREENSHOTS_WEB_PORT ?? 4200)
const shopPort = Number(process.env.SCREENSHOTS_SHOP_PORT ?? 4201)
const apiOrigin = `http://127.0.0.1:${apiPort}`
const apiBaseUrl = `${apiOrigin}/api`
const webOrigin = `http://127.0.0.1:${webPort}`
const shopOrigin = `http://127.0.0.1:${shopPort}`
const databaseUrl = process.env.DATABASE_URL
const authSecret = process.env.SCREENSHOTS_AUTH_SECRET

if (!databaseUrl || !authSecret) {
  throw new Error(
    'DATABASE_URL and SCREENSHOTS_AUTH_SECRET are required for screenshot generation',
  )
}

export default defineConfig({
  testDir: './tests/screenshots',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results/screenshots',
  timeout: 120_000,
  use: {
    baseURL: shopOrigin,
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'light',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @localco/api start:prod',
      url: `${apiBaseUrl}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(apiPort),
        DATABASE_URL: databaseUrl,
        BETTER_AUTH_SECRET: authSecret,
        BETTER_AUTH_URL: apiOrigin,
        FRONTEND_URL: webOrigin,
        SHOP_PUBLIC_URL: shopOrigin,
        API_CORS_ORIGINS: `${webOrigin},${shopOrigin}`,
        STRIPE_SECRET_KEY: '',
        STRIPE_WEBHOOK_SECRET: '',
        RESEND_API_KEY: '',
      },
    },
    {
      command: 'node tests/screenshots/start-standalone.mjs web',
      url: `${webOrigin}/sign-in`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: 'production',
        PORT: String(webPort),
        HOSTNAME: '127.0.0.1',
        NEXT_TELEMETRY_DISABLED: '1',
        DATABASE_URL: databaseUrl,
        BETTER_AUTH_SECRET: authSecret,
        BETTER_AUTH_URL: webOrigin,
        NEXT_PUBLIC_AUTH_URL: webOrigin,
        API_INTERNAL_URL: apiBaseUrl,
        NEXT_PUBLIC_API_URL: `${webOrigin}/api`,
      },
    },
    {
      command: 'node tests/screenshots/start-standalone.mjs shop',
      url: shopOrigin,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: 'production',
        PORT: String(shopPort),
        HOSTNAME: '127.0.0.1',
        NEXT_TELEMETRY_DISABLED: '1',
        API_INTERNAL_URL: apiBaseUrl,
        NEXT_PUBLIC_API_URL: `${shopOrigin}/api`,
      },
    },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
