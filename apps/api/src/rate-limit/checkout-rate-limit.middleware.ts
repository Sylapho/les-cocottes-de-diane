import { HttpStatus } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import type { NextFunction, Request, Response } from 'express'

export type RateLimitEntry = {
  count: number
  resetAt: number
}

export type CheckoutRateLimitStore = {
  get(key: string): RateLimitEntry | undefined
  set(key: string, entry: RateLimitEntry): void
}

export type CheckoutRateLimitOptions = {
  windowMs?: number
  maxRequests?: number
  store?: CheckoutRateLimitStore
  now?: () => number
}

type CheckoutRateLimitConfig = {
  windowMs: number
  maxRequests: number
}

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX_REQUESTS = 10
const CHECKOUT_KEY_PREFIX = 'checkout'

export class InMemoryCheckoutRateLimitStore implements CheckoutRateLimitStore {
  private readonly entries = new Map<string, RateLimitEntry>()

  get(key: string) {
    return this.entries.get(key)
  }

  set(key: string, entry: RateLimitEntry) {
    this.entries.set(key, entry)
  }
}

export function getCheckoutRateLimitOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): CheckoutRateLimitConfig {
  return {
    windowMs: parsePositiveInteger(
      env.CHECKOUT_RATE_LIMIT_WINDOW_MS,
      DEFAULT_WINDOW_MS,
    ),
    maxRequests: parsePositiveInteger(
      env.CHECKOUT_RATE_LIMIT_MAX,
      DEFAULT_MAX_REQUESTS,
    ),
  }
}

export function createCheckoutRateLimitMiddleware(
  options: CheckoutRateLimitOptions = {},
) {
  const envOptions = getCheckoutRateLimitOptionsFromEnv()
  const store = options.store ?? new InMemoryCheckoutRateLimitStore()
  const now = options.now ?? Date.now
  const windowMs = options.windowMs ?? envOptions.windowMs
  const maxRequests = options.maxRequests ?? envOptions.maxRequests

  return (request: Request, response: Response, next: NextFunction) => {
    const currentTime = now()
    const key = getRequestKey(request)
    const current = store.get(key)

    if (!current || current.resetAt <= currentTime) {
      store.set(key, {
        count: 1,
        resetAt: currentTime + windowMs,
      })
      next()
      return
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - currentTime) / 1_000),
      )

      response.setHeader('Retry-After', String(retryAfterSeconds))
      response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Trop de tentatives de paiement, veuillez reessayer bientot',
        error: 'Too Many Requests',
      })
      return
    }

    store.set(key, {
      ...current,
      count: current.count + 1,
    })
    next()
  }
}

function getRequestKey(request: Request) {
  const clientIp = normalizeIpAddress(
    request.ip || request.socket.remoteAddress || '',
  )

  if (!clientIp) {
    return `${CHECKOUT_KEY_PREFIX}:unresolved:${randomUUID()}`
  }

  return `${CHECKOUT_KEY_PREFIX}:${clientIp}`
}

function normalizeIpAddress(address: string) {
  const ipv4MappedPrefix = '::ffff:'
  const normalized = address.toLowerCase().startsWith(ipv4MappedPrefix)
    ? address.slice(ipv4MappedPrefix.length)
    : address
  const ipVersion = isIP(normalized)

  if (ipVersion === 4) {
    return normalized
  }

  if (ipVersion === 6) {
    const hostname = new URL(`http://[${normalized}]/`).hostname

    return hostname.slice(1, -1).toLowerCase()
  }

  return undefined
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
