'use client'

import { QuantityControl } from '@/components/ui/quantity-control'
import type { ShopArticle } from '@/lib/api'
import { formatCurrency, MAX_CART_QUANTITY } from '@/lib/cart'
import { getImageUrl } from '@/lib/image-url'
import { CookingPot } from 'lucide-react'
import Image from 'next/image'

type CartLineProps = {
  article: ShopArticle
  quantity: number
  totalCents: number
  onDecrease: () => void
  onIncrease: () => void
  onRemove: () => void
}

export default function CartLine({
  article,
  quantity,
  totalCents,
  onDecrease,
  onIncrease,
  onRemove,
}: CartLineProps) {
  const imageUrl = getImageUrl(article.imageUrl)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="relative flex size-22 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="88px"
              className="object-cover"
            />
          ) : (
            <CookingPot
              aria-hidden="true"
              className="size-10 text-ink"
              strokeWidth={1.25}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-body text-ink">{article.nom}</p>
          <p className="text-small text-muted">
            Prix unitaire : {formatCurrency(article.prixCents)}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="w-fit text-small text-error underline-offset-4 hover:underline"
            aria-label={`Supprimer ${article.nom} du panier`}
          >
            Supprimer
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-6">
        <QuantityControl
          value={quantity}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          itemLabel={article.nom}
          increaseDisabled={quantity >= MAX_CART_QUANTITY}
        />
        <p className="text-price font-bold text-ink tabular-nums">
          {formatCurrency(totalCents)}
        </p>
      </div>
    </div>
  )
}
