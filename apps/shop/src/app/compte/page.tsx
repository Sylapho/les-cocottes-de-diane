import Link from 'next/link'

const fakeOrders = [
  {
    id: 'CMD-LOCALCO-001',
    status: 'Confirmée',
    date: 'À venir',
    pickup: 'Point de retrait choisi au paiement',
    total: '—',
  },
]

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-[#faf7f8] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-sm font-bold text-[#b5006e] hover:text-[#8c0055]"
        >
          ← Retour à la boutique
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-[1.5rem] border border-[#eee2e7] bg-white p-4 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-[#b5006e]">
              Compte
            </p>

            <nav className="mt-4 grid gap-2 text-sm font-bold text-[#4a3d43]">
              <a className="rounded-xl bg-[#fceef6] px-3 py-2 text-[#8c0055]">
                Mes commandes
              </a>
              <a className="rounded-xl px-3 py-2 text-[#7a6d73]">
                Informations
              </a>
              <a className="rounded-xl px-3 py-2 text-[#7a6d73]">
                Préférences
              </a>
              <a className="rounded-xl px-3 py-2 text-[#7a6d73]">Aide</a>
            </nav>
          </aside>

          <section className="rounded-[1.5rem] border border-[#eee2e7] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-[#b5006e]">
              Suivi
            </p>

            <h1 className="mt-1 text-4xl font-black text-[#181014]">
              Mes commandes
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7a6d73]">
              Cette page prépare l’espace client. Quand l’authentification et les
              commandes client seront reliées, elle affichera les vraies commandes
              avec leurs statuts.
            </p>

            <div className="mt-6 grid gap-3">
              {fakeOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-[#eee2e7] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-black text-[#181014]">{order.id}</p>
                      <p className="mt-1 text-sm text-[#7a6d73]">
                        {order.pickup}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[#7a6d73]">Date : {order.date}</p>
                    <button
                      type="button"
                      className="w-fit rounded-full border border-[#e8e1e4] px-4 py-2 font-bold text-[#4a3d43]"
                    >
                      Signaler un problème
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}