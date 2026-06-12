import { getCurrentAuthSession } from '@/lib/admin-users'
import { getStripeReconciliations, type StripeReconciliation } from '@/lib/api'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  manual_review: 'Revue manuelle',
  resolved: 'Resolue',
  failed: 'Echec',
}

const operationLabels: Record<string, string> = {
  expire_checkout_session: 'Expiration Checkout',
  review_paid_pending_checkout: 'Paiement sur commande en attente',
  review_paid_cancelled_checkout: 'Paiement sur commande annulee',
  review_checkout_payment_mismatch: 'Paiement incoherent',
  review_checkout_attachment_conflict: 'Rattachement conflit',
  review_missing_checkout_session: 'Session manquante',
  review_unmatched_checkout_session: 'Session sans commande',
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStatusClass(status: string) {
  if (status === 'resolved') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (status === 'manual_review') {
    return 'bg-amber-50 text-amber-800'
  }

  if (status === 'failed') {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-sky-50 text-sky-700'
}

function getCommandeLabel(reconciliation: StripeReconciliation) {
  if (!reconciliation.commande) {
    return 'Aucune commande'
  }

  return `#${reconciliation.commande.id} - ${reconciliation.commande.nom}`
}

export default async function StripeReconciliationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getCurrentAuthSession()

  if (!session) {
    redirect('/sign-in')
  }

  if (session.user.role !== 'gerant') {
    notFound()
  }

  const params = await searchParams
  const filters = {
    status: typeof params.status === 'string' ? params.status : undefined,
    operation:
      typeof params.operation === 'string' ? params.operation : undefined,
    stripeSessionId:
      typeof params.stripeSessionId === 'string'
        ? params.stripeSessionId
        : undefined,
    commandeId:
      typeof params.commandeId === 'string' ? params.commandeId : undefined,
    page: typeof params.page === 'string' ? params.page : undefined,
  }
  const reconciliations = await getStripeReconciliations(filters)

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold">Reconciliations Stripe</h1>
          <p className="mt-2 max-w-2xl text-zinc-600">
            Suivi des sessions Checkout qui demandent une reprise automatique ou
            une decision manuelle.
          </p>
        </div>
      </div>

      <form className="mb-6 grid gap-3 rounded border bg-white p-4 shadow-sm md:grid-cols-[180px_260px_1fr_140px_auto]">
        <select
          name="status"
          defaultValue={filters.status ?? ''}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          name="operation"
          defaultValue={filters.operation ?? ''}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">Toutes les operations</option>
          {Object.entries(operationLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          name="stripeSessionId"
          defaultValue={filters.stripeSessionId ?? ''}
          placeholder="cs_..."
          className="rounded border px-3 py-2 text-sm"
        />

        <input
          name="commandeId"
          defaultValue={filters.commandeId ?? ''}
          placeholder="Commande"
          className="rounded border px-3 py-2 text-sm"
        />

        <button className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Filtrer
        </button>
      </form>

      <section className="overflow-hidden rounded border bg-white shadow-sm">
        <div className="grid grid-cols-[120px_1.5fr_1.2fr_120px_150px_90px] gap-4 border-b bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-600">
          <span>Statut</span>
          <span>Operation</span>
          <span>Commande</span>
          <span>Essais</span>
          <span>Prochaine action</span>
          <span></span>
        </div>

        {reconciliations.items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600">
            Aucune reconciliation Stripe pour ces filtres.
          </p>
        ) : (
          <div className="divide-y">
            {reconciliations.items.map((reconciliation) => (
              <div
                key={reconciliation.id}
                className="grid grid-cols-[120px_1.5fr_1.2fr_120px_150px_90px] items-center gap-4 px-4 py-3 text-sm"
              >
                <span
                  className={`w-fit rounded px-2 py-1 text-xs font-medium ${getStatusClass(
                    reconciliation.status,
                  )}`}
                >
                  {statusLabels[reconciliation.status]}
                </span>
                <div>
                  <p className="font-medium">
                    {operationLabels[reconciliation.operation] ??
                      reconciliation.operation}
                  </p>
                  <p className="break-all text-xs text-zinc-500">
                    {reconciliation.stripeSessionId}
                  </p>
                </div>
                <span className="text-zinc-700">
                  {getCommandeLabel(reconciliation)}
                </span>
                <span className="text-zinc-600">{reconciliation.attempts}</span>
                <span className="text-zinc-600">
                  {formatDate(reconciliation.nextAttemptAt)}
                </span>
                <Link
                  href={`/admin/stripe-reconciliations/${reconciliation.id}`}
                  className="text-sm font-medium text-zinc-900"
                >
                  Ouvrir
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-4 text-sm text-zinc-500">
        {reconciliations.total} reconciliation(s) au total.
      </p>
    </main>
  )
}
