import { isIP } from 'node:net'
import type { NestExpressApplication } from '@nestjs/platform-express'

const TRUSTED_PROXIES_ENV = 'TRUSTED_PROXIES'

export function getTrustedProxiesFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const configuredProxies = env[TRUSTED_PROXIES_ENV]?.trim()

  if (!configuredProxies) {
    return []
  }

  const proxies = configuredProxies.split(',').map((proxy) => proxy.trim())

  for (const proxy of proxies) {
    if (!isValidIpOrCidr(proxy)) {
      throw new Error(
        `Invalid ${TRUSTED_PROXIES_ENV} entry "${proxy}": expected an IP address or CIDR`,
      )
    }
  }

  return [...new Set(proxies)]
}

export function configureTrustedProxies(
  app: NestExpressApplication,
  env: NodeJS.ProcessEnv = process.env,
) {
  const trustedProxies = getTrustedProxiesFromEnv(env)

  app.set('trust proxy', trustedProxies.length > 0 ? trustedProxies : false)
}

function isValidIpOrCidr(value: string) {
  if (!value) {
    return false
  }

  const separatorIndex = value.lastIndexOf('/')

  if (separatorIndex === -1) {
    return isIP(value) !== 0
  }

  const address = value.slice(0, separatorIndex)
  const prefix = value.slice(separatorIndex + 1)
  const ipVersion = isIP(address)
  const parsedPrefix = Number(prefix)
  const maxPrefix = ipVersion === 4 ? 32 : 128

  return (
    ipVersion !== 0 &&
    /^\d+$/.test(prefix) &&
    Number.isInteger(parsedPrefix) &&
    parsedPrefix >= 0 &&
    parsedPrefix <= maxPrefix
  )
}
