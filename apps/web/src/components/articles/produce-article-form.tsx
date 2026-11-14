'use client'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage, getUnknownErrorMessage } from '@/lib/api-error'
import { useSessionFetch } from '@/lib/use-session-fetch'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

type Props = {
  articleId: number
  maxQuantity?: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function ProduceArticleForm({ articleId, maxQuantity }: Props) {
  const router = useRouter()
  const sessionFetch = useSessionFetch()
  const [quantite, setQuantite] = useState('1')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await sessionFetch(`${API_URL}/articles/${articleId}/produce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantite: Number(quantite),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, 'Erreur lors de la production.'),
        )
      }

      setMessage(`Production de ${quantite} article(s) réussie`)
      setQuantite('1')
      router.refresh()
    } catch (err) {
      setError(getUnknownErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="produce-quantity">Quantité à produire</FieldLabel>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="produce-quantity"
            type="number"
            min="1"
            max={maxQuantity && maxQuantity > 0 ? maxQuantity : undefined}
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            className="sm:max-w-40"
            required
          />
          <Button
            type="submit"
            disabled={loading || Number(quantite) <= 0}
            aria-busy={loading}
          >
            {loading ? 'Production…' : 'Produire'}
          </Button>
        </div>
        {typeof maxQuantity === 'number' ? (
          <FieldDescription>
            Production max possible : {maxQuantity} unité(s)
          </FieldDescription>
        ) : null}
      </Field>

      {message ? (
        <p role="status" className="text-sm leading-5 text-success">
          {message}
        </p>
      ) : null}
      {error ? <FieldError role="alert">{error}</FieldError> : null}
    </form>
  )
}
