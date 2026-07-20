import 'server-only'

import { auth } from '@/lib/auth'
import { getCurrentAuthSession } from '@/lib/auth-session'
import { canDeleteAdminUser } from '@/lib/admin-user-permissions'
import {
  canManageUsers,
  canViewUserLoginStatistics,
  type UserWithRole,
} from '@/lib/permissions'
import { isRole, type Role } from '@/lib/roles'
import { headers } from 'next/headers'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL est manquante')
}

const pool = new Pool({
  connectionString: databaseUrl,
})

export type AdminUser = {
  id: string
  name: string
  email: string
  role: Role | null
  createdAt: Date
}

export type AdminUserWithLoginStatistics = AdminUser & {
  loginCount: number
  lastLoginAt: Date | null
}

export class AdminUserDeletionError extends Error {
  constructor(
    readonly code: 'USER_NOT_FOUND' | 'SELF_DELETE_FORBIDDEN',
    message: string,
  ) {
    super(message)
    this.name = 'AdminUserDeletionError'
  }
}

export async function requireAdminUserManagementSession() {
  const session = await getCurrentAuthSession()

  if (!session || !canManageUsers(session.user)) {
    return null
  }

  return session
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const result = await pool.query<{
    id: string
    name: string | null
    email: string
    role: string | null
    createdAt: Date
  }>(
    'SELECT id, name, email, role, "createdAt" FROM "user" ORDER BY "createdAt" DESC',
  )

  return result.rows.map((user) => ({
    id: user.id,
    name: user.name ?? 'Sans nom',
    email: user.email,
    role: isRole(user.role) ? user.role : null,
    createdAt: user.createdAt,
  }))
}

export async function listAdminUsersWithLoginStatistics(
  currentUser: UserWithRole,
): Promise<AdminUserWithLoginStatistics[]> {
  if (!canViewUserLoginStatistics(currentUser)) {
    throw new Error('Forbidden user login statistics access')
  }

  const result = await pool.query<{
    id: string
    name: string | null
    email: string
    role: string | null
    createdAt: Date
    loginCount: number
    lastLoginAt: Date | null
  }>(
    `SELECT
      id,
      name,
      email,
      role,
      "createdAt",
      "loginCount",
      "lastLoginAt"
    FROM "user"
    ORDER BY "createdAt" DESC`,
  )

  return result.rows.map((user) => ({
    id: user.id,
    name: user.name ?? 'Sans nom',
    email: user.email,
    role: isRole(user.role) ? user.role : null,
    createdAt: user.createdAt,
    loginCount: user.loginCount,
    lastLoginAt: user.lastLoginAt,
  }))
}

export async function getAdminUserById(userId: string) {
  const result = await pool.query<{ id: string }>(
    'SELECT id FROM "user" WHERE id = $1 LIMIT 1',
    [userId],
  )

  return result.rows[0] ?? null
}

export async function updateUserRole(userId: string, role: Role) {
  await pool.query(
    'UPDATE "user" SET role = $1, "updatedAt" = NOW() WHERE id = $2',
    [role, userId],
  )
}

export async function createEmployee(data: {
  name: string
  email: string
  password: string
  role: Role
}) {
  const requestHeaders = await headers()

  const user = await auth.api.createUser({
    body: {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
    },
    headers: requestHeaders,
  })

  return user
}

export async function deleteAdminUser(userId: string, currentUserId: string) {
  if (!canDeleteAdminUser(userId, currentUserId)) {
    throw new AdminUserDeletionError(
      'SELF_DELETE_FORBIDDEN',
      'Tu ne peux pas supprimer ton propre compte.',
    )
  }

  const user = await getAdminUserById(userId)

  if (!user) {
    throw new AdminUserDeletionError(
      'USER_NOT_FOUND',
      "L'utilisateur demandé est introuvable.",
    )
  }

  await auth.api.removeUser({
    body: {
      userId,
    },
    headers: await headers(),
  })
}
