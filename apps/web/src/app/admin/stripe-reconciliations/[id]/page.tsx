import {
  getStripeReconciliation,
  resolveStripeReconciliation,
  retryStripeReconciliation,
  type StripeReconciliation,
} from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import { canAccessAdmin } from '@/lib/permissions'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'

function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function canResolveManually(reconciliation: StripeReconciliation) {
  return (
    reconciliation.status === 'manual_review' ||
    reconciliation.status === 'failed'
  )
}

export default async function StripeReconciliationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireUiPermission(canAccessAdmin)
  const { id } = await params
  const reconciliationId = Number(id)

  if (!Number.isInteger(reconciliationId)) {
    notFound()
  }

  const reconciliation = await getStripeReconciliation(reconciliationId)

  async function retryAction() {
    'use server'

    await retryStripeReconciliation(reconciliationId)
    revalidatePath(`/admin/stripe-reconciliations/${reconciliationId}`)
    revalidatePath('/admin/stripe-reconciliations')
  }

  async function resolveAction(formData: FormData) {
    'use server'

    const justification = String(formData.get('justification') ?? '').trim()
    await resolveStripeReconciliation(reconciliationId, justification)
    revalidatePath(`/admin/stripe-reconciliations/${reconciliationId}`)
    revalidatePath('/admin/stripe-reconciliations')
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/stripe-reconciliations" className="text-sm">
            Retour aux reconciliations
          </Link>
          <h1 className="mt-2 text-3xl font-bold">
            Reconciliation #{reconciliation.id}
          </h1>
          <p className="mt-2 break-all text-sm text-zinc-600">
            {reconciliation.stripeSessionId}
          </p>
        </div>

        <form action={retryAction}>
          <button className="rounded border px-4 py-2 text-sm font-medium">
            Relancer
          </button>
        </form>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Etat</h2>
          <dl className="mt-4 grid grid-cols-[160px_1fr] gap-3 text-sm">
            <dt className="text-zinc-500">Statut</dt>
            <dd className="font-medium">{reconciliation.status}</dd>
            <dt className="text-zinc-500">Operation</dt>
            <dd>{reconciliation.operation}</dd>
            <dt className="text-zinc-500">Essais</dt>
            <dd>{reconciliation.attempts}</dd>
            <dt className="text-zinc-500">Dernier essai</dt>
            <dd>{formatDate(reconciliation.lastAttemptedAt)}</dd>
            <dt className="text-zinc-500">Prochain essai</dt>
            <dd>{formatDate(reconciliation.nextAttemptAt)}</dd>
            <dt className="text-zinc-500">Lease</dt>
            <dd>{reconciliation.claimedBy ?? '-'}</dd>
          </dl>
        </div>

        <div className="rounded border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Commande</h2>
          {reconciliation.commande ? (
            <dl className="mt-4 grid grid-cols-[160px_1fr] gap-3 text-sm">
              <dt className="text-zinc-500">Commande</dt>
              <dd>
                <Link
                  href={`/commandes/${reconciliation.commande.id}`}
                  className="font-medium"
                >
                  #{reconciliation.commande.id}
                </Link>
              </dd>
              <dt className="text-zinc-500">Client</dt>
              <dd>{reconciliation.commande.nom}</dd>
              <dt className="text-zinc-500">Email</dt>
              <dd className="break-all">{reconciliation.commande.email}</dd>
              <dt className="text-zinc-500">Statut</dt>
              <dd>{reconciliation.commande.statut}</dd>
              <dt className="text-zinc-500">Stripe local</dt>
              <dd className="break-all">
                {reconciliation.commande.stripeId ?? '-'}
              </dd>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-zinc-600">
              Aucune commande locale n&apos;est rattachee a cette session
              Stripe.
            </p>
          )}
        </div>
      </section>

      <section className="mb-6 rounded border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Analyse</h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-[180px_1fr]">
          <dt className="text-zinc-500">Derniere erreur</dt>
          <dd>{reconciliation.lastError ?? '-'}</dd>
          <dt className="text-zinc-500">Raison revue manuelle</dt>
          <dd>{reconciliation.manualReviewReason ?? '-'}</dd>
          <dt className="text-zinc-500">Resolution manuelle</dt>
          <dd>{reconciliation.manualResolution ?? '-'}</dd>
        </dl>
      </section>

      {canResolveManually(reconciliation) ? (
        <section className="mb-6 rounded border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Cloture manuelle</h2>
          <form action={resolveAction} className="mt-4 grid gap-3">
            <textarea
              name="justification"
              required
              minLength={10}
              rows={4}
              className="rounded border px-3 py-2 text-sm"
              placeholder="Decision prise, reference Stripe, remboursement ou action comptable realisee..."
            />
            <button className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
              Cloturer avec justification
            </button>
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded border bg-white shadow-sm">
        <div className="grid grid-cols-[90px_120px_1fr_130px_160px] gap-4 border-b bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-600">
          <span>Essai</span>
          <span>Origine</span>
          <span>Resultat</span>
          <span>Stripe</span>
          <span>Date</span>
        </div>

        {reconciliation.attemptsHistory?.length ? (
          <div className="divide-y">
            {reconciliation.attemptsHistory.map((attempt) => (
              <div
                key={attempt.id}
                className="grid grid-cols-[90px_120px_1fr_130px_160px] gap-4 px-4 py-3 text-sm"
              >
                <span>{attempt.attemptNumber}</span>
                <span>{attempt.origin}</span>
                <div>
                  <p>{attempt.result ?? '-'}</p>
                  {attempt.error ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {attempt.error}
                    </p>
                  ) : null}
                </div>
                <span>{attempt.stripeState ?? '-'}</span>
                <span>{formatDate(attempt.startedAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-zinc-600">
            Aucun historique de tentative.
          </p>
        )}
      </section>
    </main>
  )
}
