'use client'

import { PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getUnknownErrorMessage } from '@/lib/api-error'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

export default function AuthForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: '/',
      })

      if (result.error) {
        throw new Error(result.error.message || 'Authentification impossible')
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      setError(getUnknownErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-[440px] flex-col gap-4 rounded-lg border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-4">
        <h1 className="text-lg leading-[26px] font-semibold">
          Bienvenue dans votre espace.
        </h1>
        <p className="text-sm leading-5 text-muted-foreground">
          Connectez-vous pour gérer l’activité du commerce.
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="email">Adresse e-mail</FieldLabel>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>

      {error ? <FieldError role="alert">{error}</FieldError> : null}

      <Button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </Button>

      <p className="text-xs leading-[17px] text-muted-foreground">
        Besoin d’accès ? Contactez l’administrateur.
      </p>
    </form>
  )
}
