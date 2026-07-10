import { proxyApiResponse } from '@/lib/server-api'

type RouteContext = {
  params: Promise<{
    path: string[]
  }>
}

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params
  const requestUrl = new URL(request.url)
  const targetPath = path.map(encodeURIComponent).join('/')

  return proxyApiResponse(
    request,
    `/uploads/${targetPath}${requestUrl.search}`,
    'origin',
  )
}
