'use client'

import { getApiErrorMessage, getUnknownErrorMessage } from '@/lib/api-error'
import type { CommandeStatut } from '@/lib/api'
import { useSessionFetch } from '@/lib/use-session-fetch'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL

const successMessages: Partial<Record<CommandeStatut, string>> = {
  nouvelle: 'remise à préparer',
  preparee: 'marquée préparée',
  traitee: 'marquée traitée',
  annulee: 'annulée',
}

// Shared PATCH /commandes/:id/statut with toasts. Marking an order as prepared
// offers an immediate undo, in case of a misclick.
export function useCommandeStatusUpdate(commandeId: number) {
  const router = useRouter()
  const sessionFetch = useSessionFetch()
  const [pendingStatus, setPendingStatus] = useState<CommandeStatut | null>(
    null,
  )

  async function updateStatus(nextStatus: CommandeStatut) {
    setPendingStatus(nextStatus)

    try {
      const response = await sessionFetch(
        `${API_URL}/commandes/${commandeId}/statut`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statut: nextStatus }),
        },
      )

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response))
      }

      toast.success(`Commande #${commandeId} ${successMessages[nextStatus]}`, {
        action:
          nextStatus === 'preparee'
            ? {
                label: 'Annuler',
                onClick: () => void updateStatus('nouvelle'),
              }
            : undefined,
      })
      router.refresh()

      return true
    } catch (err) {
      toast.error('La commande n’a pas été mise à jour', {
        description: getUnknownErrorMessage(err),
      })

      return false
    } finally {
      setPendingStatus(null)
    }
  }

  return { pendingStatus, updateStatus }
}
