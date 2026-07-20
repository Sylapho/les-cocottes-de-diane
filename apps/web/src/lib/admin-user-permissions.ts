import { getUserRole, type UserWithRole } from '@/lib/permissions'
import type { Role } from '@/lib/roles'

export type UserCreationAuthorization =
  { allowed: true } | { allowed: false; status: 401 | 403 }

export function getUserCreationAuthorization(
  user: UserWithRole,
): UserCreationAuthorization {
  const role = getUserRole(user)

  if (!user) {
    return { allowed: false, status: 401 }
  }

  return role === 'admin' ? { allowed: true } : { allowed: false, status: 403 }
}

export function getUserLoginStatisticsAuthorization(
  user: UserWithRole,
): UserCreationAuthorization {
  const role = getUserRole(user)

  if (!user) {
    return { allowed: false, status: 401 }
  }

  return role === 'admin' ? { allowed: true } : { allowed: false, status: 403 }
}

export function canAssignUserRole(user: UserWithRole, role: Role) {
  return getUserRole(user) === 'admin' && role.length > 0
}

export function canDeleteAdminUser(
  targetUserId: string,
  currentUserId: string,
) {
  return targetUserId.length > 0 && targetUserId !== currentUserId
}
