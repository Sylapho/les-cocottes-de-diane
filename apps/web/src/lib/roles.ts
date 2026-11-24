export const roles = [
  'admin',
  'gerant',
  'vendeur',
  'production',
  'stock',
  'comptable',
  'read_only',
] as const

export type Role = (typeof roles)[number]

export const roleLabels: Record<Role, string> = {
  admin: 'Administrateur',
  gerant: 'Gérant',
  vendeur: 'Vendeur',
  production: 'Production',
  stock: 'Stock',
  comptable: 'Comptable',
  read_only: 'Lecture seule',
}

// Keep in sync with lib/permissions.ts: these sentences describe what each
// role unlocks in the back-office.
export const roleDescriptions: Record<Role, string> = {
  admin:
    'Accès complet : gestion des comptes, statistiques, modification des prix et suppression d’articles.',
  gerant:
    'Commandes, remboursements, catalogue, stock, caisse et points de retrait. Aucun accès à la gestion des comptes. Prix existants verrouillés.',
  vendeur:
    'Commandes, caisse et ventes. Consultation du catalogue.',
  production:
    'Commandes et préparation, production des articles. Consultation du catalogue et du stock.',
  stock: 'Stock et matières premières. Consultation du catalogue.',
  comptable:
    'Consultation des commandes, caisse et historique des journées de caisse.',
  read_only: 'Consultation de toutes les rubriques, sans aucune modification.',
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && roles.includes(value as Role)
}
