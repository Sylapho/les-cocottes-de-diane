import AdminUsersTable from '@/components/admin/admin-users-table'
import CreateEmployeeForm from '@/components/admin/create-employee-form'
import {
  EmptyState,
  Page,
  PageHeader,
  SectionCard,
  StatCard,
} from '@/components/ui/dashboard'
import { listAdminUsers } from '@/lib/admin-users'
import { requireUiPermission } from '@/lib/auth-session'
import { canAccessAdmin } from '@/lib/permissions'
import { roleLabels } from '@/lib/roles'

export default async function AdminUsersPage() {
  const session = await requireUiPermission(canAccessAdmin)
  const users = await listAdminUsers()
  const activeRoles = new Set(users.map((user) => user.role))

  return (
    <Page>
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs"
        description="Gérez les comptes équipe et les rôles qui donnent accès aux actions sensibles du back-office."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Comptes" value={users.length} detail="Utilisateurs internes" />
        <StatCard
          label="Rôles actifs"
          value={activeRoles.size}
          detail="Profils utilisés"
          tone="info"
        />
        <StatCard
          label="Compte courant"
          value="Protégé"
          detail="Votre propre rôle n'est pas modifiable ici"
          tone="success"
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <CreateEmployeeForm />

        <SectionCard
          title="Rôles disponibles"
          description="Chaque rôle ouvre uniquement les écrans nécessaires au métier concerné."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(roleLabels).map(([role, label]) => (
              <div
                key={role}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3"
              >
                <p className="font-bold">{label}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Code rôle : {role}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        className="mt-6"
        title="Comptes équipe"
        description="Modifiez les rôles avec prudence : ils contrôlent l'accès à la caisse, au stock, aux commandes et à l'administration."
      >
        {users.length === 0 ? (
          <EmptyState
            title="Aucun utilisateur pour le moment"
            description="Créez un premier compte employé pour commencer à répartir les accès au back-office."
          />
        ) : (
          <AdminUsersTable
            users={users.map((user) => ({
              ...user,
              createdAt: user.createdAt.toISOString(),
            }))}
            currentUserId={session.user.id}
          />
        )}
      </SectionCard>
    </Page>
  )
}
