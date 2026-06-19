import { getMatieresPremieres } from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import { formatCurrencyFromCents } from '@/lib/money'
import { canManageStock, canViewStock } from '@/lib/permissions'
import Link from 'next/link'

export default async function MatieresPremieresPage() {
  const session = await requireUiPermission(canViewStock)
  const userCanManageStock = canManageStock(session.user)
  const matieres = await getMatieresPremieres()

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Matières premières</h1>
        {userCanManageStock ? (
          <Link
            href="/matieres-premieres/new"
            className="rounded bg-black px-4 py-2 text-white"
          >
            Nouvelle matière première
          </Link>
        ) : null}
      </div>

      {matieres.length === 0 ? (
        <p>Aucune matière première.</p>
      ) : (
        <ul className="grid gap-4">
          {matieres.map((matiere) => (
            <li key={matiere.id} className="rounded border p-4 shadow-sm">
              <h2 className="text-lg font-semibold">{matiere.nom}</h2>
              <p className="mt-2">
                Stock : {matiere.stock} {matiere.unite}
              </p>
              <p>
                Coût unitaire :{' '}
                {formatCurrencyFromCents(matiere.coutUnitaireCents)}
              </p>
              <p>Seuil : {matiere.seuil}</p>
              <p>Conditionnement : {matiere.conditionnement}</p>

              <div className="mt-4 flex gap-3">
                <Link
                  href={`/matieres-premieres/${matiere.id}`}
                  className="rounded border px-3 py-2 text-sm"
                >
                  Voir
                </Link>
                {userCanManageStock ? (
                  <Link
                    href={`/matieres-premieres/${matiere.id}/edit`}
                    className="rounded border px-3 py-2 text-sm"
                  >
                    Modifier
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
