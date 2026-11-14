'use client'

import {
  savePickupPointAction,
  setPickupPointActiveAction,
} from '@/app/admin/pickup-points/actions'
import { UnsavedChangesDialog } from '@/components/layout/unsaved-changes-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import type { PickupPoint } from '@/lib/api'
import { weekdays } from '@/lib/pickup-points'
import {
  initialFormActionState,
  type FormActionState,
} from '@/lib/form-action-state'
import {
  startTransition,
  useActionState,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

// Activate / deactivate a pickup point, with a toast on completion.
export function PickupPointActiveButton({
  pickupPoint,
  children,
  className,
  variant = 'secondary',
  onDone,
}: {
  pickupPoint: PickupPoint
  children: ReactNode
  className?: string
  variant?: 'secondary' | 'ghost' | 'link'
  onDone?: () => void
}) {
  const [, action, pending] = useActionState(
    async (previousState: FormActionState, formData: FormData) => {
      const result = await setPickupPointActiveAction(previousState, formData)

      if (result.status === 'success') {
        toast.success(`${result.message} : ${pickupPoint.label}`)
        onDone?.()
      } else {
        toast.error('Le point de retrait n’a pas été modifié', {
          description: result.message,
        })
      }

      return result
    },
    initialFormActionState,
  )

  return (
    <form action={action}>
      <input type="hidden" name="id" value={pickupPoint.id} />
      <input type="hidden" name="active" value={String(!pickupPoint.active)} />
      <Button
        type="submit"
        variant={variant}
        className={className}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? 'En cours…' : children}
      </Button>
    </form>
  )
}

export function PickupPointSheet({
  pickupPoint,
  trigger,
}: {
  // Absent in creation mode.
  pickupPoint?: PickupPoint
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [, action, saving] = useActionState(
    async (previousState: FormActionState, formData: FormData) => {
      const result = await savePickupPointAction(previousState, formData)

      setFormError(result.status === 'error' ? (result.message ?? '') : '')

      if (result.status === 'success') {
        toast.success(result.message)
        setDirty(false)
        setOpen(false)
      }

      return result
    },
    initialFormActionState,
  )

  function handleOpenChange(next: boolean) {
    if (!next && dirty && !saving) {
      setLeaveOpen(true)
      return
    }

    if (next) {
      setDirty(false)
      setFormError('')
    }

    setOpen(next)
  }

  const prefix = pickupPoint ? `pickup-${pickupPoint.id}` : 'pickup-new'

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="gap-5 p-8 sm:max-w-[600px]">
          <SheetTitle className="text-3xl leading-[42px]">
            {pickupPoint ? 'Modifier le point de retrait' : 'Créer un point de retrait'}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Nom, adresse, informations et jours de retrait proposés aux clients.
          </SheetDescription>

          <form
            // onSubmit (not action=) so React keeps the fields after an error.
            onSubmit={(event) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)
              startTransition(() => action(formData))
            }}
            onChange={() => setDirty(true)}
            className="flex flex-col gap-5"
          >
            {pickupPoint ? (
              <input type="hidden" name="id" value={pickupPoint.id} />
            ) : null}

            <Field>
              <FieldLabel htmlFor={`${prefix}-label`}>Nom *</FieldLabel>
              <Input
                id={`${prefix}-label`}
                name="label"
                required
                maxLength={120}
                defaultValue={pickupPoint?.label}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`${prefix}-address`}>Adresse *</FieldLabel>
              <Input
                id={`${prefix}-address`}
                name="address"
                required
                maxLength={240}
                defaultValue={pickupPoint?.address}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`${prefix}-schedule`}>
                Informations de retrait *
              </FieldLabel>
              <Input
                id={`${prefix}-schedule`}
                name="schedule"
                required
                maxLength={120}
                defaultValue={pickupPoint?.schedule}
                placeholder="Vendredi · 16 h à 19 h"
                aria-describedby={`${prefix}-schedule-help`}
              />
              <FieldDescription id={`${prefix}-schedule-help`}>
                Affiché aux clients au moment de choisir le retrait.
              </FieldDescription>
            </Field>

            <FieldSet>
              <FieldLegend className="text-sm leading-5 font-medium">
                Jours autorisés *
              </FieldLegend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {weekdays.map((weekday) => (
                  <label
                    key={weekday.value}
                    className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm leading-5"
                  >
                    <Checkbox
                      name="allowedWeekdays"
                      value={String(weekday.value)}
                      defaultChecked={
                        pickupPoint
                          ? pickupPoint.allowedWeekdays.includes(weekday.value)
                          : false
                      }
                      onCheckedChange={() => setDirty(true)}
                    />
                    {weekday.label}
                  </label>
                ))}
              </div>
            </FieldSet>

            <Field>
              <FieldLabel htmlFor={`${prefix}-anchor`}>
                Ancrage d’alternance (facultatif)
              </FieldLabel>
              <Input
                id={`${prefix}-anchor`}
                type="date"
                name="alternatingWeekAnchorDate"
                defaultValue={pickupPoint?.alternatingWeekAnchorDate ?? ''}
                aria-describedby={`${prefix}-anchor-help`}
              />
              <FieldDescription id={`${prefix}-anchor-help`}>
                Pour un retrait une semaine sur deux : une date de retrait de
                référence. Laissez vide si aucune alternance ne s’applique.
              </FieldDescription>
            </Field>

            {!pickupPoint ? (
              <label
                htmlFor={`${prefix}-active`}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3 text-sm leading-5 font-medium"
              >
                Actif dès sa création
                <Switch id={`${prefix}-active`} name="active" defaultChecked />
              </label>
            ) : null}

            {formError ? <FieldError role="alert">{formError}</FieldError> : null}

            <div className="flex flex-col gap-3">
              <Button type="submit" disabled={saving} aria-busy={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              {!pickupPoint ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleOpenChange(false)}
                  disabled={saving}
                >
                  Annuler
                </Button>
              ) : null}
            </div>
          </form>

          {pickupPoint?.active ? (
            <PickupPointActiveButton
              pickupPoint={pickupPoint}
              className="w-full"
              onDone={() => {
                setDirty(false)
                setOpen(false)
              }}
            >
              Désactiver le point
            </PickupPointActiveButton>
          ) : null}
        </SheetContent>
      </Sheet>

      <UnsavedChangesDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        subject="ce point de retrait"
        onDiscard={() => {
          setDirty(false)
          setOpen(false)
        }}
      />
    </>
  )
}
