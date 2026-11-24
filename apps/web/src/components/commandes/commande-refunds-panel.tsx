'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
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
import { Textarea } from '@/components/ui/textarea'
import { getApiErrorMessage, getUnknownErrorMessage } from '@/lib/api-error'
import type {
  CommandeRefundReason,
  CommandeRefundSummary,
  RefundAggregateStatus,
  RefundStatus,
} from '@/lib/api'
import { formatOrderDateTime } from '@/lib/commande-list'
import { formatCurrencyFromCents } from '@/lib/money'
import { useSessionFetch } from '@/lib/use-session-fetch'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

type CommandeRefundsPanelProps = {
  commandeId: number
  refunds: CommandeRefundSummary
  canRefund: boolean
  paymentConfirmed: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

const refundReasonLabels: Record<CommandeRefundReason, string> = {
  requested_by_customer: 'Demandé par le client',
  duplicate: 'Paiement en double',
  fraudulent: 'Paiement frauduleux',
  other: 'Autre',
}

const refundStatusLabels: Record<RefundStatus, string> = {
  pending: 'en attente',
  requires_action: 'action requise',
  succeeded: 'réussi',
  failed: 'échoué',
  canceled: 'annulé',
}

const aggregateStatusTexts: Record<RefundAggregateStatus, string> = {
  none: 'aucun remboursement enregistré',
  partial: 'remboursement partiel',
  full: 'remboursée intégralement',
  failed: 'dernier remboursement en échec',
  pending: 'remboursement en attente',
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
  paymentConfirmed,
}: CommandeRefundsPanelProps) {
  const router = useRouter()
  const sessionFetch = useSessionFetch()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'total' | 'partial'>('total')
  const [amount, setAmount] = useState('')
  const [reason, setReason] =
    useState<CommandeRefundReason>('requested_by_customer')
  const [internalNote, setInternalNote] = useState('')
  const [requestId, setRequestId] = useState(createRequestId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmitRefund =
    canRefund && refunds.isRefundable && refunds.refundableAmountCents > 0
  const partialAmountCents = parseEurosToCents(amount)
  const confirmAmountCents =
    mode === 'total' ? refunds.refundableAmountCents : partialAmountCents
  const statusTone =
    refunds.refundStatus === 'failed'
      ? 'text-danger'
      : refunds.refundStatus === 'none' && paymentConfirmed
        ? 'text-success'
        : 'text-foreground'

  function openDialog() {
    setMode('total')
    setAmount('')
    setReason('requested_by_customer')
    setInternalNote('')
    setRequestId(createRequestId())
    setError('')
    setOpen(true)
  }

  async function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const amountCents = mode === 'partial' ? partialAmountCents : undefined

    if (mode === 'partial' && !amountCents) {
      setError('Saisissez un montant valide, par exemple 7,50.')
      return
    }

    if (
      amountCents !== undefined &&
      amountCents > refunds.refundableAmountCents
    ) {
      setError(
        `Le montant dépasse le restant remboursable (${formatCurrencyFromCents(refunds.refundableAmountCents)}).`,
      )
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await sessionFetch(
        `${API_URL}/commandes/${commandeId}/refunds`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

      setOpen(false)
      toast.success('Remboursement demandé à Stripe', {
        description: `Commande #${commandeId} · ${formatCurrencyFromCents(amountCents ?? refunds.refundableAmountCents)}`,
      })
      router.refresh()
    } catch (err) {
      setError(getUnknownErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className={cn('text-sm leading-5', statusTone)}>
        {paymentConfirmed ? 'Paiement confirmé' : 'Paiement non confirmé'} ·{' '}
        {aggregateStatusTexts[refunds.refundStatus]}
        {refunds.refundedAmountCents > 0
          ? ` · ${formatCurrencyFromCents(refunds.refundedAmountCents)} remboursés`
          : ''}
        {refunds.pendingAmountCents > 0
          ? ` · ${formatCurrencyFromCents(refunds.pendingAmountCents)} en attente`
          : ''}
      </p>

      {canRefund ? (
        <Button
          variant="secondary"
          className="w-full sm:w-44"
          onClick={openDialog}
          disabled={!canSubmitRefund}
        >
          Rembourser…
        </Button>
      ) : null}

      {refunds.refunds.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {refunds.refunds.map((refund) => (
            <li key={refund.id} className="flex flex-col gap-1 py-3 text-sm">
              <p className="leading-5 font-medium">
                {formatCurrencyFromCents(refund.amountCents)} ·{' '}
                {refundStatusLabels[refund.status]}
              </p>
              <p className="text-xs leading-[17px] text-muted-foreground">
                {formatOrderDateTime(refund.createdAt)} ·{' '}
                {refundReasonLabels[refund.reason as CommandeRefundReason] ??
                  refund.reason}
              </p>
              {refund.internalNote ? (
                <p className="leading-5 text-muted-foreground">
                  {refund.internalNote}
                </p>
              ) : null}
              {refund.failureReason ? (
                <p className="leading-5 text-danger">{refund.failureReason}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl leading-[42px]">
              Rembourser la commande #{commandeId}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Remboursement total ou partiel demandé à Stripe.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitRefund} className="flex flex-col gap-5">
            <dl className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <dt className="text-xs leading-[17px] text-muted-foreground">
                  Total payé
                </dt>
                <dd className="text-sm leading-5 font-medium">
                  {formatCurrencyFromCents(refunds.totalAmountCents)}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs leading-[17px] text-muted-foreground">
                  Déjà remboursé / en attente
                </dt>
                <dd className="text-sm leading-5 font-medium">
                  {formatCurrencyFromCents(refunds.refundedAmountCents)} /{' '}
                  {formatCurrencyFromCents(refunds.pendingAmountCents)}
                </dd>
              </div>
            </dl>

            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="refund-mode">Type</FieldLabel>
                <Select
                  value={mode}
                  onValueChange={(value) =>
                    setMode(value as 'total' | 'partial')
                  }
                  disabled={submitting}
                >
                  <SelectTrigger id="refund-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">
                      Remboursement total (
                      {formatCurrencyFromCents(refunds.refundableAmountCents)})
                    </SelectItem>
                    <SelectItem value="partial">Remboursement partiel</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {mode === 'partial' ? (
                <Field data-invalid={Boolean(error) || undefined}>
                  <FieldLabel htmlFor="refund-amount">Montant (€) *</FieldLabel>
                  <Input
                    id="refund-amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    inputMode="decimal"
                    placeholder="0,00"
                    required
                    disabled={submitting}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby="refund-amount-help"
                  />
                  <FieldDescription id="refund-amount-help">
                    Restant remboursable :{' '}
                    {formatCurrencyFromCents(refunds.refundableAmountCents)}
                  </FieldDescription>
                </Field>
              ) : null}

              <Field>
                <FieldLabel htmlFor="refund-reason">Motif *</FieldLabel>
                <Select
                  value={reason}
                  onValueChange={(value) =>
                    setReason(value as CommandeRefundReason)
                  }
                  disabled={submitting}
                >
                  <SelectTrigger id="refund-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(refundReasonLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="refund-note">Note interne</FieldLabel>
                <Textarea
                  id="refund-note"
                  value={internalNote}
                  onChange={(event) => setInternalNote(event.target.value)}
                  maxLength={500}
                  disabled={submitting}
                />
              </Field>
            </FieldGroup>

            {error ? <FieldError role="alert">{error}</FieldError> : null}

            <div className="flex flex-col gap-1 rounded-lg bg-warning-soft p-4 text-sm leading-5 text-warning">
              <p className="font-medium">Confirmer l’opération</p>
              <p>
                Le remboursement sera demandé à Stripe. Vérifiez le montant et
                le motif avant validation. Le stock n’est pas remis
                automatiquement.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                variant="destructive"
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting
                  ? 'Remboursement en cours…'
                  : confirmAmountCents
                    ? `Confirmer ${formatCurrencyFromCents(confirmAmountCents)}`
                    : 'Confirmer'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
