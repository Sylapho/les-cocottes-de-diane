export const roles = [
  'gerant',
  'vendeur',
  'production',
  'stock',
  'comptable',
] as const

export type Role = (typeof roles)[number]

export const roleLabels: Record<Role, string> = {
  gerant: 'Gerant',
  vendeur: 'Vendeur',
  production: 'Production',
  stock: 'Stock',
  comptable: 'Comptable',
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && roles.includes(value as Role)
}
