'use client'

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
  return async function sessionFetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
  ) {
    const headers = new Headers(init.headers)

    return fetch(toSameOriginApiUrl(input), {
      ...init,
      headers,
      credentials: 'include',
    })
  }
}