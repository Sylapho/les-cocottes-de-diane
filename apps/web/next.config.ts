import type { NextConfig } from 'next'

const apiUrl = getAbsoluteApiUrl()

function getAbsoluteApiUrl() {
  const configuredApiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

  try {
    return new URL(configuredApiUrl)
  } catch {
    return null
  }
}

function getApiImageRemotePattern() {
  if (!apiUrl) return null

  return {
    protocol: apiUrl.protocol.replace(':', '') as 'http' | 'https',
    hostname: apiUrl.hostname,
    port: apiUrl.port,
    pathname: '/uploads/**',
  }
}

function isLocalApiHost() {
  if (!apiUrl) return false

  return ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(
    apiUrl.hostname,
  )
}

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    dangerouslyAllowLocalIP: isLocalApiHost(),
    remotePatterns: [getApiImageRemotePattern()].filter(
      (pattern): pattern is NonNullable<typeof pattern> => pattern !== null,
    ),
  },
}

export default nextConfig
