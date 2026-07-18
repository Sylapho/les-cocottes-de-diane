import { proxyApiResponse } from '@/lib/server-api'
import { getCurrentAuthSession } from '@/lib/auth-session'
import { canUseBackOfficeHttpMethod } from '@/lib/permissions'
import { NextResponse } from 'next/server'

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
  const session = await getCurrentAuthSession()

  if (!canUseBackOfficeHttpMethod(session?.user, request.method)) {
    return NextResponse.json(
      {
        message:
          'Vous ne disposez pas des permissions nécessaires pour effectuer cette action.',
      },
      { status: 403 },
    )
  }

  const { path } = await context.params
  const targetPath = buildTargetPath(request, path)

  return proxyApiResponse(request, targetPath)
}

function buildTargetPath(request: Request, path: string[]) {
  const requestUrl = new URL(request.url)
  const targetPath = path.map(encodeURIComponent).join('/')

  return `/${targetPath}${requestUrl.search}`
}
