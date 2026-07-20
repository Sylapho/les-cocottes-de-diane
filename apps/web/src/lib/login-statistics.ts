export const UPDATE_LOGIN_STATISTICS_SQL = `
  UPDATE "user"
  SET
    "loginCount" = "loginCount" + 1,
    "lastLoginAt" = $2
  WHERE id = $1
`

type LoginStatisticsDatabase = {
  query(
    text: string,
    values: unknown[],
  ): Promise<{ rowCount: number | null }>
}

type CreatedSession = {
  userId?: string | null
}

type AuthenticationContext = {
  path?: string
} | null

export function isLoginAuthenticationPath(path?: string) {
  return (
    path === '/sign-in/email' ||
    path === '/sign-in/social' ||
    path?.startsWith('/callback/') === true ||
    path?.startsWith('/oauth2/callback/') === true
  )
}

export async function trackSuccessfulLogin(options: {
  database: LoginStatisticsDatabase
  session: CreatedSession | null
  context: AuthenticationContext
  now?: () => Date
}) {
  const { database, session, context, now = () => new Date() } = options

  if (!session?.userId || !isLoginAuthenticationPath(context?.path)) {
    return false
  }

  const result = await database.query(UPDATE_LOGIN_STATISTICS_SQL, [
    session.userId,
    now(),
  ])

  if (result.rowCount !== 1) {
    throw new Error('Authenticated user was not found while tracking login')
  }

  return true
}
