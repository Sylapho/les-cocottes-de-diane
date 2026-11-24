'use client'

import { PasswordInput } from '@/components/auth/password-input'
import { Callout } from '@/components/layout/page-layout'
import { UnsavedChangesDialog } from '@/components/layout/unsaved-changes-dialog'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiErrorMessage, getUnknownErrorMessage } from '@/lib/api-error'
import {
  isRole,
  roleDescriptions,
  roleLabels,
  roles,
  type Role,
} from '@/lib/roles'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

const MIN_PASSWORD_LENGTH = 8

export default function CreateUserForm() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('vendeur')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: String(formData.get('email') ?? ''),
          password: String(formData.get('password') ?? ''),
          role,
        }),
      })

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response))
      }

      setDirty(false)
      toast.success(`Compte de ${name} créé`, {
        description: 'Transmettez-lui le mot de passe temporaire.',
      })
      router.push('/admin/users')
      router.refresh()
    } catch (err) {
      setError(getUnknownErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        onChange={() => setDirty(true)}
        className="flex w-full max-w-[736px] flex-col gap-4 rounded-lg border border-border bg-card p-6"
      >
        <h2 className="text-lg leading-[26px] font-semibold">
          Identité et accès
        </h2>

        <Field>
          <FieldLabel htmlFor="user-name">Nom complet *</FieldLabel>
          <Input
            id="user-name"
            name="name"
            autoComplete="off"
            maxLength={120}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="user-email">Adresse e-mail *</FieldLabel>
          <Input
            id="user-email"
            name="email"
            type="email"
            autoComplete="off"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="user-password">
            Mot de passe temporaire *
          </FieldLabel>
          <PasswordInput
            id="user-password"
            name="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            aria-describedby="user-password-help"
          />
          <FieldDescription id="user-password-help">
            {MIN_PASSWORD_LENGTH} caractères minimum, à transmettre à la
            personne concernée.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="user-role">Rôle *</FieldLabel>
          <Select
            value={role}
            onValueChange={(value) => {
              if (isRole(value)) {
                setRole(value)
                setDirty(true)
              }
            }}
          >
            <SelectTrigger id="user-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((item) => (
                <SelectItem key={item} value={item}>
                  {roleLabels[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Callout title={`Accès : ${roleLabels[role].toLowerCase()}`}>
          {roleDescriptions[role]}
        </Callout>

        {error ? <FieldError role="alert">{error}</FieldError> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="sm:w-[220px]"
          >
            {loading ? 'Création…' : 'Créer le compte'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            className="sm:w-[160px]"
            onClick={() => {
              if (dirty) {
                setLeaveOpen(true)
              } else {
                router.push('/admin/users')
              }
            }}
          >
            Annuler
          </Button>
        </div>
      </form>

      <UnsavedChangesDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        subject="ce compte"
        onDiscard={() => {
          setDirty(false)
          router.push('/admin/users')
        }}
      />
    </>
  )
}
