'use client'

import { authClient } from '@/lib/auth-client'
import { canUseBackOfficeHttpMethod } from '@/lib/permissions'

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')

function toSameOriginApiUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!PUBLIC_API_URL) {
    return input
  }

  const inputUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url

  if (inputUrl === PUBLIC_API_URL) {
    return '/api'
  }

  if (inputUrl.startsWith(`${PUBLIC_API_URL}/`)) {
    return `/api/${inputUrl.slice(PUBLIC_API_URL.length + 1)}`
  }

  return input
}

export function useSessionFetch() {
  const { data: session } = authClient.useSession()

  return async function sessionFetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
  ) {
    if (!canUseBackOfficeHttpMethod(session?.user, init.method)) {
      throw new Error(
        "Le mode consultation n'autorise pas cette opération.",
      )
    }

    const headers = new Headers(init.headers)

    return fetch(toSameOriginApiUrl(input), {
      ...init,
      headers,
      credentials: 'include',
    })
  }
}
