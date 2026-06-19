import 'server-only'

import { auth } from '@/lib/auth'
import { getUserRole } from '@/lib/permissions'
import type { Role } from '@/lib/roles'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export type CurrentAuthSession = {
  user: {
    id: string
    role: Role
  }
}

type BetterAuthSession = {
  user: {
    id: string
    role?: unknown
  }
}

export async function getCurrentAuthSession() {
  const session = (await auth.api.getSession({
    headers: await headers(),
  })) as BetterAuthSession | null

  if (!session) {
    return null
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: getUserRole(session.user),
    },
  } satisfies CurrentAuthSession
}

export async function requireUiPermission(
  canAccess: (user: CurrentAuthSession['user']) => boolean,
) {
  const session = await getCurrentAuthSession()

  if (!session) {
    redirect('/sign-in')
  }

  if (!canAccess(session.user)) {
    redirect('/403')
  }

  return session
}
