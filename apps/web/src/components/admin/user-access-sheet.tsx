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
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Callout } from '@/components/layout/page-layout'
import { getApiErrorMessage, getUnknownErrorMessage } from '@/lib/api-error'
import { isRole, roleDescriptions, roleLabels, type Role } from '@/lib/roles'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

export type UserAccessSheetUser = {
  id: string
  name: string
  email: string
  role: Role | null
}

export function UserAccessSheet({
  user,
  availableRoles,
  trigger,
}: {
  user: UserAccessSheetUser
  availableRoles: readonly Role[]
  trigger: ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Role | ''>(user.role ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const busy = saving || deleting
  const prefix = `user-${user.id}`

  function handleOpenChange(next: boolean) {
    if (busy) return

    if (next) {
      setRole(user.role ?? '')
      setError('')
    }

    setOpen(next)
  }

  async function saveRole() {
    if (!isRole(role)) return

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response))
      }

      toast.success(`${user.name} est maintenant ${roleLabels[role].toLowerCase()}`)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(getUnknownErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser() {
    setDeleting(true)

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response))
      }

      toast.success(`Le compte de ${user.name} a été supprimé`)
      setDeleteOpen(false)
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error('Le compte n’a pas été supprimé', {
        description: getUnknownErrorMessage(err),
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="gap-5 overflow-y-auto p-8 sm:max-w-[560px]">
          <SheetTitle className="text-3xl leading-[42px]">
            Accès de {user.name}
          </SheetTitle>
          <SheetDescription className="text-sm leading-5 break-all text-muted-foreground">
            {user.email}
          </SheetDescription>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void saveRole()
            }}
            className="flex flex-col gap-5"
          >
            <Field>
              <FieldLabel htmlFor={`${prefix}-role`}>Rôle</FieldLabel>
              <Select
                value={role}
                onValueChange={(value) => {
                  if (isRole(value)) setRole(value)
                }}
                disabled={busy}
              >
                <SelectTrigger
                  id={`${prefix}-role`}
                  aria-describedby={`${prefix}-roles`}
                >
                  <SelectValue placeholder="Choisir un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((item) => (
                    <SelectItem key={item} value={item}>
                      {roleLabels[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription id={`${prefix}-roles`}>
                {availableRoles.map((item) => roleLabels[item]).join(' · ')}
              </FieldDescription>
            </Field>

            {isRole(role) ? (
              <Callout title={`Permissions : ${roleLabels[role].toLowerCase()}`}>
                {roleDescriptions[role]}
              </Callout>
            ) : null}

            {error ? <FieldError role="alert">{error}</FieldError> : null}

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={busy || !isRole(role) || role === user.role}
                aria-busy={saving}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer le rôle'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleOpenChange(false)}
                disabled={busy}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-danger hover:text-danger"
                onClick={() => setDeleteOpen(true)}
                disabled={busy}
              >
                Supprimer le compte…
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(next) => !deleting && setDeleteOpen(next)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le compte de {user.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {user.email} ne pourra plus se connecter au back-office. Cette
              action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Conserver le compte
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault()
                void deleteUser()
              }}
            >
              {deleting ? 'Suppression…' : 'Supprimer le compte'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
