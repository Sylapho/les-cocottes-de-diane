'use client'

import { Button, ButtonLink } from '@/components/ui/button'
import { Feedback } from '@/components/ui/feedback'
import { buildCartLines, formatCurrency } from '@/lib/cart'
import { shopRoutes } from '@/lib/site-nav'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import CartLine from './cart-line'
import { useCart, type ArticlesState } from './cart-provider'

type CartDrawerProps = {
  open: boolean
  onClose: () => void
  articlesState: ArticlesState
  onRetry: () => void
}

export default function CartDrawer({
  open,
  onClose,
  articlesState,
  onRetry,
}: CartDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Native modal dialog: focus trap, Escape and inert background for free.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cart-drawer-title"
      onClose={onClose}
      onClick={(event) => {
        // Clicks on the backdrop target the dialog element itself.
        if (event.target === event.currentTarget) onClose()
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-120 overflow-y-auto bg-paper p-5 text-ink backdrop:bg-ink/40 sm:p-8"
    >
      {/* Mounted only while open so a closed drawer leaves no content in the page. */}
      {open ? (
        <CartDrawerContent
          onClose={onClose}
          articlesState={articlesState}
          onRetry={onRetry}
        />
      ) : null}
    </dialog>
  )
}

function CartDrawerContent({
  onClose,
  articlesState,
  onRetry,
}: Omit<CartDrawerProps, 'open'>) {
  const { cart, count, changeQuantity, removeItem } = useCart()

  const lines =
    articlesState.status === 'ready'
      ? buildCartLines(cart, articlesState.articles)
      : []
  const total = lines.reduce((sum, line) => sum + line.totalCents, 0)
  // Stored items may no longer exist in the catalogue (archived articles).
  const isEmpty =
    count === 0 || (articlesState.status === 'ready' && lines.length === 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id="cart-drawer-title" className="font-serif text-h2">
          Votre panier
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-12 items-center gap-2 rounded-lg px-2 text-label font-bold text-ink hover:bg-cream"
        >
          Fermer
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      {isEmpty ? (
        <>
          <Feedback>Votre panier est vide.</Feedback>
          <ButtonLink href={shopRoutes.catalogue} onClick={onClose} fullWidth>
            Découvrir la boutique
          </ButtonLink>
        </>
      ) : articlesState.status === 'error' ? (
        <>
          <Feedback tone="error" live>
            Impossible de charger votre panier pour le moment.
          </Feedback>
          <Button appearance="secondary" onClick={onRetry} fullWidth>
            Réessayer
          </Button>
        </>
      ) : articlesState.status !== 'ready' ? (
        <p role="status" className="text-body text-muted">
          Chargement de votre panier…
        </p>
      ) : (
        <>
          <ul className="flex flex-col">
            {lines.map((line) => (
              <li
                key={line.article.id}
                className="border-b border-line py-6 first:pt-0"
              >
                <CartLine
                  article={line.article}
                  quantity={line.quantite}
                  totalCents={line.totalCents}
                  onDecrease={() => changeQuantity(line.article.id, -1)}
                  onIncrease={() => changeQuantity(line.article.id, 1)}
                  onRemove={() => removeItem(line.article.id)}
                />
              </li>
            ))}
          </ul>

          <p className="flex items-baseline justify-between gap-4 text-price font-bold">
            <span>Total TTC</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </p>

          <ButtonLink href={shopRoutes.checkout} onClick={onClose} fullWidth>
            Choisir mon retrait
          </ButtonLink>
          <p className="text-small text-muted">
            Retrait uniquement. Lieu et date à l’étape suivante.
          </p>
        </>
      )}
    </div>
  )
}
