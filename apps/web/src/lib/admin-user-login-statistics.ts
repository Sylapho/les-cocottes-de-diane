export const LOGIN_STATISTICS_COLUMN_LABELS = [
  'Connexions',
  'Dernière connexion',
] as const

type AdminUserLoginStatisticsApiSource = {
  id: string
  name: string
  email: string
  role: string | null
  createdAt: Date
  loginCount: number
  lastLoginAt: Date | null
}

export function getLoginStatisticsColumnLabels(visible: boolean) {
  return visible ? LOGIN_STATISTICS_COLUMN_LABELS : []
}

export function formatAdminUserDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function formatLastLoginAt(date: string | null | undefined) {
  return date ? formatAdminUserDate(date) : 'Jamais'
}

export function formatFullAdminUserDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'long',
  }).format(new Date(date))
}

export function serializeAdminUserLoginStatistics(
  user: AdminUserLoginStatisticsApiSource,
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    loginCount: user.loginCount,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  }
}
