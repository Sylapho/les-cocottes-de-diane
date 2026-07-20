import { ValidationPipe } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { createAnalyticsRateLimitMiddleware } from '../rate-limit/analytics-rate-limit.middleware'
import { createCheckoutRateLimitMiddleware } from '../rate-limit/checkout-rate-limit.middleware'
import { configureTrustedProxies } from './trusted-proxies'

export function configureApp(
  app: NestExpressApplication,
  env: NodeJS.ProcessEnv = process.env,
) {
  configureTrustedProxies(app, env)
  app.use('/api/commandes/checkout', createCheckoutRateLimitMiddleware())
  app.use('/api/analytics/visits', createAnalyticsRateLimitMiddleware(env))

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.setGlobalPrefix('api')
}
