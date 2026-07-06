import { isRole, type Role } from '@/lib/roles'

export type UserWithRole = {
  role?: unknown
} | null | undefined

export function getUserRole(user: UserWithRole): Role {
  return isRole(user?.role) ? user.role : 'vendeur'
}

export function canAccessAdmin(user: UserWithRole) {
  return getUserRole(user) === 'gerant'
}

export function canViewOrders(user: UserWithRole) {
  return hasRole(user, ['gerant', 'vendeur', 'production', 'comptable'])
}

export function canManageOrders(user: UserWithRole) {
  return hasRole(user, ['gerant', 'vendeur', 'production'])
}

export function canRefundOrders(user: UserWithRole) {
  return getUserRole(user) === 'gerant'
}

export function canViewArticles(user: UserWithRole) {
  return hasRole(user, ['gerant', 'vendeur', 'production', 'stock'])
}

export function canManageArticles(user: UserWithRole) {
  return getUserRole(user) === 'gerant'
}

export function canManageArticleProduction(user: UserWithRole) {
  return hasRole(user, ['gerant', 'production'])
}

export function canViewStock(user: UserWithRole) {
  return hasRole(user, ['gerant', 'production', 'stock'])
}

export function canManageStock(user: UserWithRole) {
  return hasRole(user, ['gerant', 'stock'])
}

export function canViewCashRegister(user: UserWithRole) {
  return hasRole(user, ['gerant', 'vendeur', 'comptable'])
}

export function canManageCashRegister(user: UserWithRole) {
  return hasRole(user, ['gerant', 'comptable'])
}

export function canCreateSales(user: UserWithRole) {
  return hasRole(user, ['gerant', 'vendeur'])
}

function hasRole(user: UserWithRole, allowedRoles: Role[]) {
  return allowedRoles.includes(getUserRole(user))
}
