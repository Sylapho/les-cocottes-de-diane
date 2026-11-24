'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage, getUnknownErrorMessage } from '@/lib/api-error'
import { useSessionFetch } from '@/lib/use-session-fetch'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type DeleteArticleButtonProps = {
  articleId: number
  articleName: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function DeleteArticleButton({
  articleId,
  articleName,
}: DeleteArticleButtonProps) {
  const router = useRouter()
  const sessionFetch = useSessionFetch()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)

    try {
      const response = await sessionFetch(`${API_URL}/articles/${articleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, 'Erreur lors de la suppression.'),
        )
      }

      setOpen(false)
      toast.success(`« ${articleName} » supprimé ou archivé`)
      router.push('/articles')
      router.refresh()
    } catch (err) {
      toast.error('L’article n’a pas été supprimé', {
        description: getUnknownErrorMessage(err),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" className="sm:min-w-44">
          Supprimer l’article…
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {articleName} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            S’il apparaît dans l’historique des ventes ou des commandes,
            l’article est archivé au lieu d’être supprimé : il disparaît du
            catalogue mais l’historique reste intact.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Conserver l’article</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={loading}
            onClick={(event) => {
              event.preventDefault()
              void handleDelete()
            }}
          >
            {loading ? 'Suppression…' : 'Supprimer l’article'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
