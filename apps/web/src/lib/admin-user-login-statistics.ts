type AdminUserLoginStatisticsApiSource = {
  id: string
  name: string
  email: string
  role: string | null
  createdAt: Date
  loginCount: number
  lastLoginAt: Date | null
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
