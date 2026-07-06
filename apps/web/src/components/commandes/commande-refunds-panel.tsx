'use client'

import { getApiErrorMessage, getUnknownErrorMessage } from '@/lib/api-error'
import type {
  CommandeRefundReason,
  CommandeRefundSummary,
  RefundAggregateStatus,
  RefundStatus,
} from '@/lib/api'
import { useSessionFetch } from '@/lib/use-session-fetch'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type FormEvent } from 'react'

type CommandeRefundsPanelProps = {
  commandeId: number
  refunds: CommandeRefundSummary
  canRefund: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

const refundReasonLabels: Record<CommandeRefundReason, string> = {
  requested_by_customer: 'Demande client',
  duplicate: 'Paiement en double',
  fraudulent: 'Paiement frauduleux',
  other: 'Autre',
}

const refundStatusLabels: Record<RefundStatus, string> = {
  pending: 'En attente',
  requires_action: 'Action requise',
  succeeded: 'Reussi',
  failed: 'Echoue',
  canceled: 'Annule',
}

const aggregateStatusLabels: Record<RefundAggregateStatus, string> = {
  none: 'Aucun',
  partial: 'Partiel',
  full: 'Complet',
  failed: 'Echec',
  pending: 'En attente',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value / 100)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function parseEurosToCents(value: string) {
  const normalized = value.trim().replace(',', '.')

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return undefined
  }

  return Math.round(Number(normalized) * 100)
}

export default function CommandeRefundsPanel({
  commandeId,
  refunds,
  canRefund,
}: CommandeRefundsPanelProps) {
  const router = useRouter()
  const sessionFetch = useSessionFetch()
  const [formOpen, setFormOpen] = useState(false)
  const [mode, setMode] = useState<'total' | 'partial'>('total')
  const [amount, setAmount] = useState('')
  const [reason, setReason] =
    useState<CommandeRefundReason>('requested_by_customer')
  const [internalNote, setInternalNote] = useState('')
  const [requestId, setRequestId] = useState(createRequestId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const refundableAmountLabel = useMemo(
    () => formatCurrency(refunds.refundableAmountCents),
    [refunds.refundableAmountCents],
  )
  const canSubmitRefund =
    canRefund && refunds.isRefundable && refunds.refundableAmountCents > 0

  function openForm() {
    setFormOpen(true)
    setRequestId(createRequestId())
    setError('')
  }

  async function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const amountCents =
      mode === 'partial' ? parseEurosToCents(amount) : undefined

    if (mode === 'partial' && !amountCents) {
      setError('Montant invalide.')
      return
    }

    if (
      amountCents !== undefined &&
      amountCents > refunds.refundableAmountCents
    ) {
      setError('Le montant depasse le restant remboursable.')
      return
    }

    const confirmedAmount =
      mode === 'total'
        ? refunds.refundableAmountCents
        : (amountCents ?? refunds.refundableAmountCents)

    if (
      !window.confirm(
        `Confirmer le remboursement de ${formatCurrency(confirmedAmount)} ? Le stock ne sera pas remis automatiquement.`,
      )
    ) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await sessionFetch(
        `${API_URL}/commandes/${commandeId}/refunds`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amountCents,
            reason,
            internalNote: internalNote.trim() || undefined,
            requestId,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response))
      }

      setFormOpen(false)
      setMode('total')
      setAmount('')
      setInternalNote('')
      setRequestId(createRequestId())
      router.refresh()
    } catch (err) {
      setError(getUnknownErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <RefundMetric label="Total" value={formatCurrency(refunds.totalAmountCents)} />
        <RefundMetric
          label="Rembourse"
          value={formatCurrency(refunds.refundedAmountCents)}
        />
        <RefundMetric
          label="En attente"
          value={formatCurrency(refunds.pendingAmountCents)}
        />
        <RefundMetric label="Restant" value={refundableAmountLabel} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-700">
          Statut : {aggregateStatusLabels[refunds.refundStatus]}
        </p>

        {canRefund ? (
          <button
            type="button"
            onClick={openForm}
            disabled={!canSubmitRefund || submitting}
            className="lc-button lc-button-primary disabled:opacity-50"
          >
            Rembourser
          </button>
        ) : null}
      </div>

      {formOpen && canSubmitRefund ? (
        <form onSubmit={submitRefund} className="grid gap-4 rounded border p-4">
          <div className="flex w-fit rounded border bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setMode('total')}
              className={
                mode === 'total'
                  ? 'rounded bg-white px-3 py-2 text-sm font-semibold shadow-sm'
                  : 'px-3 py-2 text-sm font-medium text-gray-600'
              }
            >
              Total
            </button>
            <button
              type="button"
              onClick={() => setMode('partial')}
              className={
                mode === 'partial'
                  ? 'rounded bg-white px-3 py-2 text-sm font-semibold shadow-sm'
                  : 'px-3 py-2 text-sm font-medium text-gray-600'
              }
            >
              Partiel
            </button>
          </div>

          {mode === 'partial' ? (
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Montant</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="rounded border px-3 py-2"
                disabled={submitting}
              />
            </label>
          ) : null}

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Raison</span>
            <select
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as CommandeRefundReason)
              }
              className="rounded border px-3 py-2"
              disabled={submitting}
            >
              {Object.entries(refundReasonLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Note interne</span>
            <textarea
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              className="min-h-24 rounded border px-3 py-2"
              maxLength={500}
              disabled={submitting}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="lc-button lc-button-danger disabled:opacity-50"
            >
              {submitting ? 'Remboursement...' : 'Confirmer'}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
              className="lc-button lc-button-secondary disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {refunds.refunds.length > 0 ? (
        <ul className="divide-y">
          {refunds.refunds.map((refund) => (
            <li key={refund.id} className="grid gap-2 py-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {formatCurrency(refund.amountCents)} -{' '}
                    {refundStatusLabels[refund.status]}
                  </p>
                  <p className="text-gray-600">
                    {refundReasonLabels[
                      refund.reason as CommandeRefundReason
                    ] ?? refund.reason}
                  </p>
                </div>
                <time className="text-gray-500">
                  {formatDateTime(refund.createdAt)}
                </time>
              </div>
              {refund.internalNote ? (
                <p className="rounded bg-gray-50 px-3 py-2 text-gray-700">
                  {refund.internalNote}
                </p>
              ) : null}
              {refund.failureReason ? (
                <p className="text-red-600">{refund.failureReason}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">Aucun remboursement.</p>
      )}
    </div>
  )
}

function RefundMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-gray-50 px-3 py-2">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}
