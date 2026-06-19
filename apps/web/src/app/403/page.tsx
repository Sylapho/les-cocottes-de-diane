import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-[60vh] place-items-center p-8">
      <section className="max-w-lg rounded border bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Accès refusé
        </p>
        <h1 className="mt-2 text-2xl font-bold">
          Tu n’as pas les droits nécessaires
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Cette page ou cette action est réservée à un autre rôle. La sécurité
          reste vérifiée côté API, mais l’interface masque aussi les accès non
          autorisés.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Retour au tableau de bord
        </Link>
      </section>
    </main>
  )
}
