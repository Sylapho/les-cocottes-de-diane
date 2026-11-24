import CreateUserForm from '@/components/admin/create-user-form'
import { PageContainer, PageHeading } from '@/components/layout/page-layout'
import { requireUiPermission } from '@/lib/auth-session'
import { canCreateUsers } from '@/lib/permissions'

export default async function NewUserPage() {
  await requireUiPermission(canCreateUsers)

  return (
    <PageContainer>
      <PageHeading
        context="Utilisateurs"
        contextHref="/admin/users"
        title="Créer un compte"
        description="Un accès individuel pour chaque membre de l’équipe."
      />
      <CreateUserForm />
    </PageContainer>
  )
}
