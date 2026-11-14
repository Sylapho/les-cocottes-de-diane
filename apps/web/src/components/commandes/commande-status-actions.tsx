'use client'

import CommandeStatusBadge from '@/components/commandes/commande-status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CommandeStatut } from '@/lib/api'
import { ChevronDownIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useCommandeStatusUpdate } from './use-commande-status-update'

type CommandeStatusActionsProps = {
  commandeId: number
  statut: CommandeStatut
  canManage: boolean
}

// The single primary action of the order detail, per status.
const primaryActions: Partial<
  Record<CommandeStatut, { next: CommandeStatut; label: string }>
> = {
  nouvelle: { next: 'preparee', label: 'Marquer préparée' },
  preparee: { next: 'traitee', label: 'Marquer traitée' },
}

export default function CommandeStatusActions({
  commandeId,
  statut,
  canManage,
}: CommandeStatusActionsProps) {
  const { pendingStatus, updateStatus } = useCommandeStatusUpdate(commandeId)
  const [cancelOpen, setCancelOpen] = useState(false)
  const isDone = statut === 'traitee' || statut === 'annulee'
  const primary = primaryActions[statut]

  async function cancelCommande() {
    if (await updateStatus('annulee')) {
      setCancelOpen(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <CommandeStatusBadge statut={statut} className="min-w-[190px]" />

      {canManage && primary ? (
        <Button
          className="min-w-52"
          onClick={() => updateStatus(primary.next)}
          disabled={pendingStatus !== null}
          aria-busy={pendingStatus === primary.next}
        >
          {pendingStatus === primary.next ? 'Mise à jour…' : primary.label}
        </Button>
      ) : null}

      {isDone ? (
        <Button asChild variant="secondary">
          <Link href="/commandes">Retour aux commandes</Link>
        </Button>
      ) : null}

      {canManage && !isDone ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              className="min-w-44"
              disabled={pendingStatus !== null}
            >
              Autres actions
              <ChevronDownIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            {statut === 'preparee' ? (
              <DropdownMenuItem onSelect={() => void updateStatus('nouvelle')}>
                Remettre à préparer
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              className="text-danger focus:text-danger"
              onSelect={() => setCancelOpen(true)}
            >
              Annuler la commande…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la commande #{commandeId} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le stock réservé sera remis en vente. Le paiement n’est pas
              remboursé automatiquement : utilisez « Rembourser… » si besoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingStatus !== null}>
              Garder la commande
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pendingStatus !== null}
              onClick={(event) => {
                // Keep the dialog open until the request settles.
                event.preventDefault()
                void cancelCommande()
              }}
            >
              {pendingStatus === 'annulee' ? 'Annulation…' : 'Annuler la commande'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
