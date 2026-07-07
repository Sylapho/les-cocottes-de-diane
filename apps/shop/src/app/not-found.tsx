import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] bg-stone-50 px-6 py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <p className="mb-4 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
          Erreur 404
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
          Cette page a quitté le poulailler
        </h1>

        <p className="mt-6 max-w-xl text-base leading-7 text-stone-600">
          La page que vous cherchez n’existe pas ou a été déplacée. Vous pouvez
          retourner à la boutique pour retrouver nos produits.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-full bg-[#b5006e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
          >
            Retour à la boutique
          </Link>

          <Link
            href="/panier"
            className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-white"
          >
            Voir mon panier
          </Link>
        </div>
      </div>
    </main>
  );
}