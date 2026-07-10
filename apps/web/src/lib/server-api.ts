import 'server-only'

const INTERNAL_API_URL = normalizeApiUrl(process.env.API_INTERNAL_URL)
const PUBLIC_API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL)

export async function serverApiFetch(path: string, init: RequestInit = {}) {
  const apiUrls = getServerApiUrlCandidates()
  let lastError: unknown

  for (const apiUrl of apiUrls) {
    try {
      return await fetch(`${apiUrl}${path}`, init)
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(
    `Impossible de contacter l'API pour ${path}: ${getErrorMessage(lastError)}`,
  )
}

export async function serverApiOriginFetch(
  path: string,
  init: RequestInit = {},
) {
  const apiUrls = getServerApiUrlCandidates()
  let lastError: unknown

  for (const apiUrl of apiUrls) {
    try {
      const apiOrigin = new URL(apiUrl, 'http://same-origin.invalid').origin

      if (apiOrigin === 'http://same-origin.invalid') {
        continue
      }

      return await fetch(`${apiOrigin}${path}`, init)
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(
    `Impossible de contacter l'API pour ${path}: ${getErrorMessage(lastError)}`,
  )
}

export async function proxyApiResponse(
  request: Request,
  targetPath: string,
  target: 'api' | 'origin' = 'api',
) {
  const headers = new Headers(request.headers)

  headers.delete('host')
  headers.delete('content-length')

  const fetchApi = target === 'api' ? serverApiFetch : serverApiOriginFetch
  const response = await fetchApi(targetPath, {
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

function getServerApiUrlCandidates() {
  const apiUrls = [INTERNAL_API_URL, PUBLIC_API_URL].filter(
    (apiUrl): apiUrl is string => Boolean(apiUrl),
  )
  const uniqueApiUrls = [...new Set(apiUrls)]

  if (uniqueApiUrls.length === 0) {
    throw new Error('API_INTERNAL_URL ou NEXT_PUBLIC_API_URL est manquante')
  }

  return uniqueApiUrls
}

function normalizeApiUrl(apiUrl: string | undefined) {
  return apiUrl?.trim().replace(/\/+$/, '')
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'erreur inconnue'
}

function hasRequestBody(method: string) {
  return method !== 'GET' && method !== 'HEAD'
}
