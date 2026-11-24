'use client'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/sign-in')
          router.refresh()
        },
        onError: () => {
          setPending(false)
          toast.error('La déconnexion a échoué. Réessayez.')
        },
      },
    })
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className={className}
      onClick={handleSignOut}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? 'Déconnexion…' : 'Se déconnecter'}
    </Button>
  )
}
