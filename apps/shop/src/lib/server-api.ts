import 'server-only'

const INTERNAL_API_URL = normalizeApiUrl(process.env.API_INTERNAL_URL)
const PUBLIC_API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL)

export async function proxyApiResponse(
  request: Request,
  targetPath: string,
  target: 'api' | 'origin' = 'api',
) {
  const headers = new Headers(request.headers)

  headers.delete('host')
  headers.delete('content-length')

  const response = await fetchApi(targetPath, target, {
    method: request.method,
    headers,
    body: hasRequestBody(request.method) ? await request.arrayBuffer() : null,
    cache: 'no-store',
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

async function fetchApi(
  path: string,
  target: 'api' | 'origin',
  init: RequestInit,
) {
  const apiUrls = [INTERNAL_API_URL, PUBLIC_API_URL].filter(
    (apiUrl): apiUrl is string => Boolean(apiUrl),
  )
  let lastError: unknown

  for (const apiUrl of [...new Set(apiUrls)]) {
    try {
      const targetBase =
        target === 'api'
          ? apiUrl
          : new URL(apiUrl, 'http://same-origin.invalid').origin

      if (targetBase === 'http://same-origin.invalid') {
        continue
      }

      return await fetch(`${targetBase}${path}`, init)
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(
    `Impossible de contacter l'API pour ${path}: ${getErrorMessage(lastError)}`,
  )
}

function normalizeApiUrl(apiUrl: string | undefined) {
  return apiUrl?.trim().replace(/\/+$/, '')
}

function hasRequestBody(method: string) {
  return method !== 'GET' && method !== 'HEAD'
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'erreur inconnue'
}
