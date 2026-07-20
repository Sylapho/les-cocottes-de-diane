'use client'

import UserRoleSelect from '@/components/admin/user-role-select'
import {
  formatAdminUserDate,
  formatFullAdminUserDate,
  formatLastLoginAt,
  getLoginStatisticsColumnLabels,
} from '@/lib/admin-user-login-statistics'
import { getApiErrorMessage, getUnknownErrorMessage } from '@/lib/api-error'
import { canDeleteAdminUser } from '@/lib/admin-user-permissions'
import { roleLabels, roles, type Role } from '@/lib/roles'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export type AdminUsersTableUser = {
  id: string
  name: string
  email: string
  role: Role | null
  createdAt: string
  loginCount?: number
  lastLoginAt?: string | null
}

type AdminUsersTableProps = {
  users: AdminUsersTableUser[]
  currentUserId: string
  currentUserRole: Role | null
  canManage: boolean
  showLoginStatistics: boolean
}

export default function AdminUsersTable({
  users: initialUsers,
  currentUserId,
  currentUserRole,
  canManage,
  showLoginStatistics,
}: AdminUsersTableProps) {
  const router = useRouter()
  const [deletedUserIds, setDeletedUserIds] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<AdminUsersTableUser | null>(
    null,
  )
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const users = initialUsers.filter((user) => !deletedUserIds.includes(user.id))

  async function confirmDelete() {
    if (!deleteTarget) return

    setDeletingUserId(deleteTarget.id)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response))
      }

      setDeletedUserIds((currentIds) => [...currentIds, deleteTarget.id])
      setMessage(`${deleteTarget.name} a été supprimé.`)
      setDeleteTarget(null)
      router.refresh()
    } catch (err) {
      setError(getUnknownErrorMessage(err))
    } finally {
      setDeletingUserId(null)
    }
  }

  function openDeleteDialog(user: AdminUsersTableUser) {
    setError('')
    setMessage('')
    setDeleteTarget(user)
  }

  return (
    <>
      {message ? (
        <p className="mb-4 text-sm text-green-700">{message}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table
          className={`lc-data-table ${showLoginStatistics ? 'min-w-[1120px]' : 'min-w-[860px]'}`}
        >
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Création</th>
              {getLoginStatisticsColumnLabels(showLoginStatistics).map(
                (label) => (
                  <th key={label}>{label}</th>
                ),
              )}
              {canManage ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId
              const canDelete =
                canManage && canDeleteAdminUser(user.id, currentUserId)

              return (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--primary-soft)] text-xs font-black text-[var(--primary)]">
                        {user.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span>
                        <span className="block font-bold">{user.name}</span>
                        {isCurrentUser ? (
                          <span className="text-xs text-[var(--muted)]">
                            Compte connecté
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className="break-all text-[var(--muted)]">
                    {user.email}
                  </td>
                  <td>
                    {canManage ? (
                      <UserRoleSelect
                        userId={user.id}
                        role={user.role}
                        disabled={isCurrentUser}
                        availableRoles={roles.filter(
                          (role) =>
                            currentUserRole === 'admin' ||
                            role !== 'admin' ||
                            user.role === 'admin',
                        )}
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {user.role ? roleLabels[user.role] : 'Rôle inconnu'}
                      </span>
                    )}
                  </td>
                  <td className="text-[var(--muted)]">
                    {formatAdminUserDate(user.createdAt)}
                  </td>
                  {showLoginStatistics ? (
                    <td className="font-semibold tabular-nums">
                      {user.loginCount ?? 0}
                    </td>
                  ) : null}
                  {showLoginStatistics ? (
                    <td className="text-[var(--muted)]">
                      {user.lastLoginAt ? (
                        <time
                          dateTime={user.lastLoginAt}
                          title={formatFullAdminUserDate(user.lastLoginAt)}
                          className="whitespace-nowrap"
                        >
                          {formatLastLoginAt(user.lastLoginAt)}
                        </time>
                      ) : (
                        'Jamais'
                      )}
                    </td>
                  ) : null}
                  {canManage ? (
                    <td>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(user)}
                          disabled={deletingUserId === user.id}
                          className="lc-button lc-button-danger min-h-0 px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          {deletingUserId === user.id
                            ? 'Suppression...'
                            : 'Supprimer'}
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">
                          Protégé
                        </span>
                      )}
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-dialog-title"
            aria-describedby="delete-user-dialog-description"
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xl"
          >
            <h2 id="delete-user-dialog-title" className="text-lg font-bold">
              Supprimer cet utilisateur ?
            </h2>
            <p
              id="delete-user-dialog-description"
              className="mt-2 text-sm leading-6 text-[var(--muted)]"
            >
              Voulez-vous vraiment supprimer cet utilisateur ? Cette action est
              irréversible.
            </p>
            <div className="mt-4 rounded-xl bg-[var(--surface-soft)] p-3 text-sm">
              <p className="font-bold">{deleteTarget.name}</p>
              <p className="break-all text-[var(--muted)]">
                {deleteTarget.email}
              </p>
            </div>

            {error ? (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingUserId === deleteTarget.id}
                className="lc-button lc-button-secondary disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingUserId === deleteTarget.id}
                className="lc-button lc-button-danger disabled:opacity-50"
              >
                {deletingUserId === deleteTarget.id
                  ? 'Suppression...'
                  : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
