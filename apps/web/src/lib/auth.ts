import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins'
import { authAccessControl, betterAuthRoles } from '@/lib/auth-access'
import { trackSuccessfulLogin } from '@/lib/login-statistics'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL est manquante')
}

const socialProviders = {
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
}

const database = new Pool({
  connectionString: databaseUrl,
})

export const auth = betterAuth({
  database,
  databaseHooks: {
    session: {
      create: {
        async after(session, context) {
          try {
            await trackSuccessfulLogin({ database, session, context })
          } catch (error) {
            console.error('Failed to record successful login', error)
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  socialProviders,
  plugins: [
    admin({
      ac: authAccessControl,
      roles: betterAuthRoles,
      defaultRole: 'vendeur',
    }),
  ],
})

export default auth
