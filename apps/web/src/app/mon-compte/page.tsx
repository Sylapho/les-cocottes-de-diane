import { SignOutButton } from '@/components/auth/sign-out-button'
import {
  Callout,
  PageContainer,
  PageHeading,
  Panel,
} from '@/components/layout/page-layout'
import { requireUiPermission } from '@/lib/auth-session'
import { canAccessBackOffice, getAccessModeLabel } from '@/lib/permissions'
import { roleDescriptions, roleLabels } from '@/lib/roles'

export default async function MonComptePage() {
  const session = await requireUiPermission(canAccessBackOffice)
  const { user } = session
  const accessModeLabel = getAccessModeLabel(user)
  const profile = [
    { label: 'Nom', value: user.name || 'Sans nom' },
    { label: 'E-mail', value: user.email || 'Non renseigné' },
    {
      label: 'Rôle',
      value: user.role
        ? [roleLabels[user.role], accessModeLabel].filter(Boolean).join(' · ')
        : 'Rôle inconnu',
    },
  ]

  return (
    <PageContainer>
      <PageHeading
        context="Mon compte"
        title="Mon compte"
        description="Informations de votre session et accès à l’application."
      />

      <Panel title="Profil" className="max-w-[736px]">
        <dl className="flex flex-col gap-4">
          {profile.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <dt className="text-xs leading-[17px] text-muted-foreground">
                {item.label}
              </dt>
              <dd className="text-sm leading-5 font-medium break-words">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        {user.role ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {roleDescriptions[user.role]}
          </p>
        ) : null}
        <SignOutButton className="w-full sm:w-[190px]" />
      </Panel>

      <Callout title="Modification du profil">
        Le nom, l’e-mail et le mot de passe ne se modifient pas encore depuis
        cet écran. Pour tout changement, contactez un administrateur.
      </Callout>
    </PageContainer>
  )
}
