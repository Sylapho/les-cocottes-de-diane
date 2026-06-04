'use client'

import type { CreateCommandePayload, ShopArticle } from '@/lib/api'
import {
  buildCartLines,
  clearStoredCart,
  formatCurrency,
  readStoredCart,
  type Cart,
} from '@/lib/cart'
import { formatPickupPoint, pickupPoints } from '@/lib/pickup-points'
import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'

type CheckoutClientProps = {
  articles: ShopArticle[]
  apiUrl: string
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

export default function CheckoutClient({
  articles,
  apiUrl,
}: CheckoutClientProps) {
  const [cart] = useState<Cart>(() => readStoredCart())
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [tel, setTel] = useState('')
  const [lieu, setLieu] = useState(formatPickupPoint(pickupPoints[0]))
  const [dateRetrait, setDateRetrait] = useState(todayInputValue())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lines = useMemo(() => buildCartLines(cart, articles), [cart, articles])
  const total = lines.reduce((sum, line) => sum + line.total, 0)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (lines.length === 0) {
      setError('Votre panier est vide.')
      return
    }

    setLoading(true)

    try {
      const payload: CreateCommandePayload = {
        nom,
        email,
        tel: tel || undefined,
        lieu,
        dateRetrait,
        lignes: lines.map((line) => ({
          articleId: line.article.id,
          quantite: line.quantite,
        })),
      }

      const response = await fetch(`${apiUrl}/commandes/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Impossible de préparer le paiement')
      }

      const checkout = (await response.json()) as {
        url: string
      }

      clearStoredCart()
      window.location.assign(checkout.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#faf7f8] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm font-bold text-[#b5006e] hover:text-[#8c0055]"
          >
            ← Retour à la boutique
          </Link>

          <h1 className="mt-4 text-4xl font-black text-[#181014]">
            Finaliser ma commande
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7a6d73]">
            Renseignez vos informations, choisissez votre retrait, puis vous
            serez redirigé vers le paiement sécurisé.
          </p>
        </div>

        {lines.length === 0 ? (
          <div className="rounded-[1.5rem] border border-[#eee2e7] bg-white p-8">
            <h2 className="text-xl font-black text-[#181014]">
              Votre panier est vide
            </h2>
            <p className="mt-2 text-sm text-[#7a6d73]">
              Ajoutez au moins un produit avant de passer au paiement.
            </p>
            <Link
              href="/#produits"
              className="mt-5 inline-flex rounded-full bg-[#b5006e] px-5 py-3 text-sm font-bold text-white"
            >
              Voir les produits
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
            <form
              onSubmit={handleSubmit}
              className="grid gap-5 rounded-[1.5rem] border border-[#eee2e7] bg-white p-5 shadow-sm"
            >
              <section>
                <p className="text-sm font-bold uppercase tracking-wide text-[#b5006e]">
                  Étape 1
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#181014]">
                  Vos informations
                </h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1 sm:col-span-2">
                    <label htmlFor="nom" className="text-sm font-bold">
                      Nom / Prénom *
                    </label>
                    <input
                      id="nom"
                      value={nom}
                      onChange={(event) => setNom(event.target.value)}
                      className="rounded-xl border border-[#e8e1e4] px-3 py-3"
                      required
                    />
                  </div>

                  <div className="grid gap-1">
                    <label htmlFor="email" className="text-sm font-bold">
                      Email *
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="rounded-xl border border-[#e8e1e4] px-3 py-3"
                      required
                    />
                  </div>

                  <div className="grid gap-1">
                    <label htmlFor="tel" className="text-sm font-bold">
                      Téléphone
                    </label>
                    <input
                      id="tel"
                      type="tel"
                      value={tel}
                      onChange={(event) => setTel(event.target.value)}
                      className="rounded-xl border border-[#e8e1e4] px-3 py-3"
                    />
                  </div>
                </div>
              </section>

              <section className="border-t border-[#eee2e7] pt-5">
                <p className="text-sm font-bold uppercase tracking-wide text-[#b5006e]">
                  Étape 2
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#181014]">
                  Retrait
                </h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <label htmlFor="lieu" className="text-sm font-bold">
                      Lieu de retrait *
                    </label>
                    <select
                      id="lieu"
                      value={lieu}
                      onChange={(event) => setLieu(event.target.value)}
                      className="rounded-xl border border-[#e8e1e4] px-3 py-3"
                      required
                    >
                      {pickupPoints.map((point) => {
                        const value = formatPickupPoint(point)

                        return (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div className="grid gap-1">
                    <label htmlFor="dateRetrait" className="text-sm font-bold">
                      Date souhaitée *
                    </label>
                    <input
                      id="dateRetrait"
                      type="date"
                      min={todayInputValue()}
                      value={dateRetrait}
                      onChange={(event) => setDateRetrait(event.target.value)}
                      className="rounded-xl border border-[#e8e1e4] px-3 py-3"
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl bg-[#fceef6] p-4 text-sm leading-6 text-[#8c0055]">
                Vous allez être redirigé vers le paiement sécurisé. Vos
                informations sont utilisées uniquement pour traiter cette
                commande.
              </section>

              {error ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[#b5006e] px-5 py-4 font-black text-white transition hover:bg-[#8c0055] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Préparation du paiement...' : 'Payer ma commande'}
              </button>
            </form>

            <aside className="rounded-[1.5rem] border border-[#eee2e7] bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <p className="text-sm font-bold uppercase tracking-wide text-[#b5006e]">
                Récapitulatif
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#181014]">
                Votre panier
              </h2>

              <ul className="mt-4 grid gap-3">
                {lines.map((line) => (
                  <li
                    key={line.article.id}
                    className="flex items-start justify-between gap-3 border-b border-[#eee2e7] pb-3"
                  >
                    <div>
                      <p className="font-bold text-[#181014]">
                        {line.article.nom}
                      </p>
                      <p className="text-sm text-[#7a6d73]">
                        {line.quantite} x {formatCurrency(line.article.prix)}
                      </p>
                    </div>
                    <p className="font-black text-[#b5006e]">
                      {formatCurrency(line.total)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-5 grid gap-3 rounded-2xl bg-[#faf7f8] p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#7a6d73]">Retrait</span>
                  <span className="text-right font-bold text-[#181014]">
                    {lieu}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-[#7a6d73]">Date</span>
                  <span className="font-bold text-[#181014]">
                    {dateRetrait}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#7a6d73]">
                  Total TTC
                </span>
                <strong className="text-3xl text-[#181014]">
                  {formatCurrency(total)}
                </strong>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}