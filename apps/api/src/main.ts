import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpStatus, ValidationPipe } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

type RateLimitEntry = {
  count: number
  resetAt: number
}

function getCorsOrigins() {
  const configuredOrigins = process.env.API_CORS_ORIGINS

  if (!configuredOrigins) {
    return ['http://localhost:3000', 'http://localhost:3001']
  }

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function createCheckoutRateLimitMiddleware() {
  const requestsByIp = new Map<string, RateLimitEntry>()
  const windowMs = Number(process.env.CHECKOUT_RATE_LIMIT_WINDOW_MS ?? 60000)
  const maxRequests = Number(process.env.CHECKOUT_RATE_LIMIT_MAX ?? 10)

  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now()
    const key = request.ip || request.socket.remoteAddress || 'unknown'
    const current = requestsByIp.get(key)

    if (!current || current.resetAt <= now) {
      requestsByIp.set(key, {
        count: 1,
        resetAt: now + windowMs,
      })
      next()
      return
    }

    if (current.count >= maxRequests) {
      response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Trop de tentatives de paiement, veuillez réessayer bientôt',
        error: 'Too Many Requests',
      })
      return
    }

    current.count += 1
    next()
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true })

  app.use('/api/commandes/checkout', createCheckoutRateLimitMiddleware())

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
  })

  app.setGlobalPrefix('api')

  const port = process.env.PORT || 4000
  await app.listen(port)

  console.log(`API démarrée sur http://localhost:${port}`)
}

void bootstrap()
