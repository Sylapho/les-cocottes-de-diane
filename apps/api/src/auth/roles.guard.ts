import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from './roles.decorator'
import { isRole, ROLES, Role } from './roles'

type RequestWithRole = {
  method?: string
  userRole?: string
}

const READ_ONLY_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const FORBIDDEN_MESSAGE =
  'Vous ne disposez pas des permissions nécessaires pour effectuer cette action.'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithRole>()
    const userRole = request.userRole

    if (
      userRole === ROLES.READ_ONLY &&
      (!request.method ||
        !READ_ONLY_HTTP_METHODS.has(request.method.toUpperCase()))
    ) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE)
    }

    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? []

    if (requiredRoles.length === 0) {
      return true
    }

    if (
      !isRole(userRole) ||
      (userRole !== ROLES.ADMIN && !requiredRoles.includes(userRole))
    ) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE)
    }

    return true
  }
}
