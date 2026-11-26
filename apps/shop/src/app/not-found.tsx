import ErrorState from '@/components/layout/error-state'
import { ButtonLink } from '@/components/ui/button'
import { shopRoutes } from '@/lib/site-nav'

export default function NotFound() {
  return (
    <ErrorState
      code="404"
      title={
        <>
          Cette page s’est
          <br className="hidden sm:inline" /> échappée du poulailler.
        </>
      }
      description="La page recherchée est introuvable. Retrouvez tous nos produits dans la boutique."
      action={
        <ButtonLink href={shopRoutes.catalogue} fullWidth>
          Retour à la boutique
        </ButtonLink>
      }
    />
  )
}
