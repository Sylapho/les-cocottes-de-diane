import NewMatierePremiereForm from '@/components/matieres-premieres/new-matiere-premiere-form'
import { requireUiPermission } from '@/lib/auth-session'
import { canManageStock } from '@/lib/permissions'

export default async function NewMatierePremierePage() {
  await requireUiPermission(canManageStock)

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Nouvelle matière première</h1>
      <NewMatierePremiereForm />
    </main>
  )
}
