export const ROLES = {
  ADMIN: 'admin',
  GERANT: 'gerant',
  VENDEUR: 'vendeur',
  PRODUCTION: 'production',
  STOCK: 'stock',
  COMPTABLE: 'comptable',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ALL_ROLES = Object.values(ROLES)

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ALL_ROLES.includes(value as Role)
}
