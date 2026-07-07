import { serverApiFetch } from '@/lib/server-api'

type RouteContext = {
  params: Promise<{
    path: string[]
  }>
}

export async function GET(request: Request, context: RouteContext) {
  return proxyApiRequest(request, context)
}

export async function POST(request: Request, context: RouteContext) {
  return proxyApiRequest(request, context)
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyApiRequest(request, context)
}

export async function PUT(request: Request, context: RouteContext) {
  return proxyApiRequest(request, context)
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyApiRequest(request, context)
}

async function proxyApiRequest(request: Request, context: RouteContext) {
  const { path } = await context.params
  const targetPath = buildTargetPath(request, path)
  const headers = new Headers(request.headers)

  headers.delete('host')
  headers.delete('content-length')

  const response = await serverApiFetch(targetPath, {
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

function buildTargetPath(request: Request, path: string[]) {
  const requestUrl = new URL(request.url)
  const targetPath = path.map(encodeURIComponent).join('/')

  return `/${targetPath}${requestUrl.search}`
}

function hasRequestBody(method: string) {
  return method !== 'GET' && method !== 'HEAD'
}
