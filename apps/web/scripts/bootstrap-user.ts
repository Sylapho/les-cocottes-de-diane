import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { roles, type Role } from '../src/lib/roles'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(scriptDir, '..')
const repoRoot = resolve(webRoot, '..', '..')

for (const envFile of [
  resolve(webRoot, '.env.local'),
  resolve(webRoot, '.env'),
  resolve(repoRoot, '.env'),
]) {
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile)
  }
}

const email = process.env.BOOTSTRAP_USER_EMAIL?.trim().toLowerCase()
const password = process.env.BOOTSTRAP_USER_PASSWORD
const name = process.env.BOOTSTRAP_USER_NAME?.trim() || 'Admin'
const role = process.env.BOOTSTRAP_USER_ROLE?.trim() || 'admin'

function isRole(value: string): value is Role {
  return roles.includes(value as Role)
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }

  if (!email) {
    throw new Error('BOOTSTRAP_USER_EMAIL is required')
  }

  if (!password) {
    throw new Error('BOOTSTRAP_USER_PASSWORD is required')
  }

  if (password.length < 8) {
    throw new Error(
      'BOOTSTRAP_USER_PASSWORD must contain at least 8 characters',
    )
  }

  if (!isRole(role)) {
    throw new Error(`BOOTSTRAP_USER_ROLE must be one of: ${roles.join(', ')}`)
  }

  const pool = new Pool({ connectionString: databaseUrl })
  try {
    const existingUser = await pool.query<{ id: string }>(
      'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
      [email],
    )

    if (existingUser.rows[0]) {
      await pool.query(
        'UPDATE "user" SET role = $1, "updatedAt" = NOW() WHERE id = $2',
        [role, existingUser.rows[0].id],
      )
      console.log(`User updated: ${email} (${role})`)
      return
    }
  } finally {
    await pool.end()
  }

  const { auth } = await import('../src/lib/auth')

  const result = await auth.api.createUser({
    body: {
      email,
      password,
      name,
      role,
    },
  })

  console.log(`User created: ${result.user.email} (${role})`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
