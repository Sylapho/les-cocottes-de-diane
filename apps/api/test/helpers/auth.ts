import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Role } from '../../src/auth/roles'

export const E2E_ROLE_HEADER = 'x-e2e-user-role'
export const E2E_USER_ID_HEADER = 'x-e2e-user-id'

export function getE2eUserId(role: string) {
  return `e2e-user-${role}`
}

function readHeader(
  request: {
    headers: Record<string, string | string[] | undefined>
    get?: (name: string) => string | undefined
  },
  name: string,
) {
  const value = request.headers[name] ?? request.get?.(name)

  return Array.isArray(value) ? value[0] : value
}

@Injectable()
export class E2eBetterAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>
      get?: (name: string) => string | undefined
      userId?: string
      userRole?: string
    }>()
    const role = readHeader(request, E2E_ROLE_HEADER)

    if (!role) {
      throw new UnauthorizedException('E2E session role missing')
    }

    request.userId =
      readHeader(request, E2E_USER_ID_HEADER) ?? getE2eUserId(role)
    request.userRole = role

    return true
  }
}

export function authAs(role: Role) {
  return { [E2E_ROLE_HEADER]: role }
}
