'use client'

import ErrorState from '@/components/layout/error-state'
import { Button } from '@/components/ui/button'

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorState
      code="500"
      title="Un petit contretemps."
      description="La boutique rencontre un problème temporaire. Réessayez dans quelques instants."
      action={
        <Button onClick={() => retry()} fullWidth>
          Réessayer
        </Button>
      }
    />
  )
}
