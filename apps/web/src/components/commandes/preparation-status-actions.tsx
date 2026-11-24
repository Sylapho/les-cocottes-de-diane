'use client'

import { Button } from '@/components/ui/button'
import type { CommandeStatut } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useCommandeStatusUpdate } from './use-commande-status-update'

type PreparationStatusActionsProps = {
  commandeId: number
  statut: CommandeStatut
  canManage: boolean
  className?: string
}

export default function PreparationStatusActions({
  commandeId,
  statut,
  canManage,
  className,
}: PreparationStatusActionsProps) {
  const { pendingStatus, updateStatus } = useCommandeStatusUpdate(commandeId)
  const pending = pendingStatus !== null
  const nextStatus = getNextStatus(statut)

  if (!canManage || !nextStatus) {
    return null
  }

  return (
    <div className={cn('flex w-full flex-col gap-2 sm:w-56', className)}>
      <Button
        onClick={() => void updateStatus(nextStatus)}
        disabled={pending}
        aria-busy={pendingStatus === nextStatus}
      >
        {pendingStatus === nextStatus
          ? 'Mise à jour…'
          : nextStatus === 'preparee'
            ? 'Marquer préparée'
            : 'Marquer traitée'}
      </Button>
      {statut === 'preparee' ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void updateStatus('nouvelle')}
          disabled={pending}
          aria-busy={pendingStatus === 'nouvelle'}
        >
          Remettre à préparer
        </Button>
      ) : null}
    </div>
  )
}

function getNextStatus(statut: CommandeStatut): CommandeStatut | null {
  if (statut === 'nouvelle') {
    return 'preparee'
  }

  if (statut === 'preparee') {
    return 'traitee'
  }

  return null
}
