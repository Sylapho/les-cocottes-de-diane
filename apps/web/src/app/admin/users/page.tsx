import { UserAccessSheet } from '@/components/admin/user-access-sheet'
import {
  Callout,
  PageContainer,
  PageHeading,
} from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { filterAdminUsers, formatLastLogin } from '@/lib/admin-user-list'
import {
  listAdminUsers,
  listAdminUsersWithLoginStatistics,
  type AdminUser,
} from '@/lib/admin-users'
import { requireUiPermission } from '@/lib/auth-session'
import {
  canCreateUsers,
  canManageUsers,
  canViewUserLoginStatistics,
  canViewUsers,
} from '@/lib/permissions'
import { roleLabels, roles, type Role } from '@/lib/roles'
import Link from 'next/link'

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type UserRow = AdminUser & {
  loginCount?: number
  lastLoginAt?: Date | null
}

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function getRoleLabel(role: Role | null) {
  return role ? roleLabels[role] : 'Rôle inconnu'
}

// Only administrators manage accounts; the admin role cannot be granted by
// anyone else (enforced again by the API route).
function getAssignableRoles(currentRole: Role | null, target: UserRow) {
  return roles.filter(
    (role) =>
      currentRole === 'admin' || role !== 'admin' || target.role === 'admin',
  )
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const session = await requireUiPermission(canViewUsers)
  const currentUser = session.user
  const userCanCreateUsers = canCreateUsers(currentUser)
  const userCanManageUsers = canManageUsers(currentUser)
  const showLoginStatistics = canViewUserLoginStatistics(currentUser)
  const params = (await searchParams) ?? {}
  const query = getSearchParam(params.q).trim()
  const users: UserRow[] = showLoginStatistics
    ? await listAdminUsersWithLoginStatistics(currentUser)
    : await listAdminUsers()
  const visibleUsers = filterAdminUsers(users, query)
  const now = new Date()

  function renderAction(user: UserRow) {
    if (user.id === currentUser.id) {
      return (
        <Link
          href="/mon-compte"
          className="rounded-sm text-sm leading-5 text-muted-foreground hover:text-foreground hover:underline"
          aria-label={`Voir mon compte (${user.name})`}
        >
          Voir <span aria-hidden="true">→</span>
        </Link>
      )
    }

    if (!userCanManageUsers) {
      return null
    }

    return (
      <UserAccessSheet
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }}
        availableRoles={getAssignableRoles(currentUser.role, user)}
        trigger={
          <button
            type="button"
            className="rounded-sm text-sm leading-5 text-muted-foreground hover:text-foreground hover:underline"
            aria-label={`Modifier les accès de ${user.name}`}
          >
            Modifier <span aria-hidden="true">→</span>
          </button>
        }
      />
    )
  }

  return (
    <PageContainer>
      <PageHeading
        context="Utilisateurs"
        title="Utilisateurs"
        description="Attribuez à chacun les accès utiles à son activité."
      />

      <div className="flex flex-wrap items-start gap-4">
        <form
          action="/admin/users"
          role="search"
          className="min-w-0 flex-1 basis-72 lg:max-w-[580px]"
        >
          <label htmlFor="users-search" className="sr-only">
            Rechercher un utilisateur
          </label>
          <Input
            id="users-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Rechercher un nom ou un e-mail…"
          />
        </form>
        {userCanCreateUsers ? (
          <Button asChild className="w-full sm:w-[210px]">
            <Link href="/admin/users/new">Créer un compte</Link>
          </Button>
        ) : null}
      </div>

      {visibleUsers.length === 0 ? (
        <Empty className="rounded-lg border border-border bg-card">
          <EmptyHeader>
            <EmptyTitle>
              {query ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
            </EmptyTitle>
            <EmptyDescription>
              {query
                ? `Aucun nom ni e-mail ne correspond à « ${query} ».`
                : 'Créez un premier compte pour répartir les accès au back-office.'}
            </EmptyDescription>
          </EmptyHeader>
          {query ? (
            <Button asChild variant="secondary">
              <Link href="/admin/users">Effacer la recherche</Link>
            </Button>
          ) : null}
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Rôle</TableHead>
                  {showLoginStatistics ? (
                    <>
                      <TableHead>Dernière connexion</TableHead>
                      <TableHead>Connexions</TableHead>
                    </>
                  ) : null}
                  <TableHead>
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name}
                      {user.id === currentUser.id ? ' · vous' : null}
                    </TableCell>
                    <TableCell className="break-all text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getRoleLabel(user.role)}
                    </TableCell>
                    {showLoginStatistics ? (
                      <>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatLastLogin(
                            user.lastLoginAt?.toISOString() ?? null,
                            now,
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {user.loginCount ?? 0}
                        </TableCell>
                      </>
                    ) : null}
                    <TableCell className="whitespace-nowrap">
                      {renderAction(user)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-4 md:hidden">
            {visibleUsers.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm leading-5 font-medium">
                    {user.name}
                    {user.id === currentUser.id ? ' · vous' : null}
                  </h2>
                  {renderAction(user)}
                </div>
                <p className="text-sm leading-5 break-all text-muted-foreground">
                  {user.email}
                </p>
                <p className="text-sm leading-5 text-muted-foreground">
                  {getRoleLabel(user.role)}
                </p>
                {showLoginStatistics ? (
                  <p className="text-xs leading-[17px] text-muted-foreground">
                    Dernière connexion :{' '}
                    {formatLastLogin(
                      user.lastLoginAt?.toISOString() ?? null,
                      now,
                    )}{' '}
                    · {user.loginCount ?? 0} connexion
                    {(user.loginCount ?? 0) > 1 ? 's' : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <Callout title="Sept rôles">
        Administrateur, gérant, vendeur, production, stock, comptable et
        lecture seule. Chaque rôle n’ouvre que les écrans utiles à son
        activité.
      </Callout>

      {showLoginStatistics ? null : (
        <p className="text-xs leading-[17px] text-muted-foreground">
          Les statistiques de connexion sont réservées aux administrateurs.
        </p>
      )}
    </PageContainer>
  )
}
