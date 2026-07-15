export const roles = [
  'admin',
  'gerant',
  'vendeur',
  'production',
  'stock',
  'comptable',
] as const

export type Role = (typeof roles)[number]

export const roleLabels: Record<Role, string> = {
  admin: 'Administrateur',
  gerant: 'Gerant',
  vendeur: 'Vendeur',
  production: 'Production',
  stock: 'Stock',
  comptable: 'Comptable',
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && roles.includes(value as Role)
}
