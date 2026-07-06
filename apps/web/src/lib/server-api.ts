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
