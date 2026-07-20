import { HttpStatus } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX_REQUESTS = 120

export function createAnalyticsRateLimitMiddleware(
  env: NodeJS.ProcessEnv = process.env,
) {
  const entries = new Map<string, RateLimitEntry>()
  const windowMs = parsePositiveInteger(
    env.ANALYTICS_RATE_LIMIT_WINDOW_MS,
    DEFAULT_WINDOW_MS,
  )
  const maxRequests = parsePositiveInteger(
    env.ANALYTICS_RATE_LIMIT_MAX,
    DEFAULT_MAX_REQUESTS,
  )

  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now()
    const key = getRequestKey(request)
    const current = entries.get(key)

    if (!current || current.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    if (current.count >= maxRequests) {
      response.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil((current.resetAt - now) / 1_000))),
      )
      response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Trop de requetes',
        error: 'Too Many Requests',
      })
      return
    }

    entries.set(key, { ...current, count: current.count + 1 })
    next()
  }
}

function getRequestKey(request: Request) {
  const address = request.ip || request.socket.remoteAddress

  if (!address) {
    return `analytics:unresolved:${randomUUID()}`
  }

  return `analytics:${createHash('sha256').update(address).digest('hex')}`
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
