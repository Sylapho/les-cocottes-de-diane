import { isRole, type Role } from '@/lib/roles'

export const READ_ONLY_MODE_LABEL = 'Mode consultation'
const READ_ONLY_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export type UserWithRole =
  | {
      role?: unknown
    }
  | null
  | undefined

export function getUserRole(user: UserWithRole): Role | null {
  return isRole(user?.role) ? user.role : null
}

export function canAccessBackOffice(user: UserWithRole) {
  return getUserRole(user) !== null
}

export function canAccessAdmin(user: UserWithRole) {
  return hasRole(user, ['gerant'])
}

export function isReadOnlyUser(user: UserWithRole) {
  return getUserRole(user) === 'read_only'
}

export function getAccessModeLabel(user: UserWithRole) {
  return isReadOnlyUser(user) ? READ_ONLY_MODE_LABEL : null
}

export function canUseBackOfficeHttpMethod(
  user: UserWithRole,
  method = 'GET',
) {
  return (
    !isReadOnlyUser(user) || READ_ONLY_HTTP_METHODS.has(method.toUpperCase())
  )
}

export function canViewUsers(user: UserWithRole) {
  return hasRole(user, ['read_only'])
}

export function canManageUsers(user: UserWithRole) {
  return getUserRole(user) === 'admin'
}

export function canViewUserLoginStatistics(user: UserWithRole) {
  return getUserRole(user) === 'admin'
}

export function canViewShopAnalytics(user: UserWithRole) {
  return getUserRole(user) === 'admin'
}

export function canCreateUsers(user: UserWithRole) {
  return canManageUsers(user)
}

export function canViewOrders(user: UserWithRole) {
  return hasRole(user, [
    'gerant',
    'vendeur',
    'production',
    'comptable',
    'read_only',
  ])
}

export function canManageOrders(user: UserWithRole) {
  return hasRole(user, ['gerant', 'vendeur', 'production'])
}

export function canRefundOrders(user: UserWithRole) {
  return hasRole(user, ['gerant'])
}

export function canViewArticles(user: UserWithRole) {
  return hasRole(user, [
    'gerant',
    'vendeur',
    'production',
    'stock',
    'read_only',
  ])
}

export function canViewArticleCategories(user: UserWithRole) {
  return canViewArticles(user)
}

export function canManageArticles(user: UserWithRole) {
  return hasRole(user, ['gerant'])
}

export function canUpdateArticlePrice(user: UserWithRole) {
  return getUserRole(user) === 'admin'
}

export function canDeleteArticle(user: UserWithRole) {
  return getUserRole(user) === 'admin'
}

export function canManageArticleProduction(user: UserWithRole) {
  return hasRole(user, ['gerant', 'production'])
}

export function canViewStock(user: UserWithRole) {
  return hasRole(user, ['gerant', 'production', 'stock', 'read_only'])
}

export function canManageStock(user: UserWithRole) {
  return hasRole(user, ['gerant', 'stock'])
}

export function canViewCashRegister(user: UserWithRole) {
  return hasRole(user, ['gerant', 'vendeur', 'comptable', 'read_only'])
}

export function canViewCashRegisterHistory(user: UserWithRole) {
  return hasRole(user, ['gerant', 'comptable', 'read_only'])
}

export function canViewPickupPoints(user: UserWithRole) {
  return hasRole(user, ['gerant', 'read_only'])
}

export function canManagePickupPoints(user: UserWithRole) {
  return hasRole(user, ['gerant'])
}

export function canManageCashRegister(user: UserWithRole) {
  return hasRole(user, ['gerant', 'comptable'])
}

export function canCreateSales(user: UserWithRole) {
  return hasRole(user, ['gerant', 'vendeur'])
}

function hasRole(user: UserWithRole, allowedRoles: Role[]) {
  const role = getUserRole(user)

  return role === 'admin' || (role !== null && allowedRoles.includes(role))
}
