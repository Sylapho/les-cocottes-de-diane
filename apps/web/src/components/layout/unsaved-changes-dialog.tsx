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
} from '@/components/ui/alert-dialog'

// Figma "Unsaved changes": confirm before discarding edits.
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  subject = 'cet article',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
  subject?: string
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Quitter sans enregistrer ?</AlertDialogTitle>
          <AlertDialogDescription>
            Les modifications de {subject} seront perdues si vous quittez
            maintenant.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuer la modification</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDiscard}>
            Quitter sans enregistrer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
