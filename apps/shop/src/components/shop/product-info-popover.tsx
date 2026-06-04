'use client'

import { useState } from 'react'

type ProductInfoPopoverProps = {
  ingredients?: string | null
  allergenes?: string | null
}

export default function ProductInfoPopover({
  ingredients,
  allergenes,
}: ProductInfoPopoverProps) {
  const [open, setOpen] = useState(false)

  const hasInfo = Boolean(ingredients || allergenes)

  if (!hasInfo) {
    return null
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="Voir les ingrédients et allergènes"
        className="grid h-7 w-7 place-items-center rounded-full border border-[#e8e1e4] bg-white text-xs font-black text-[#8c0055] shadow-sm transition hover:border-[#b5006e] hover:bg-[#fceef6]"
      >
        i
      </button>

      {open ? (
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="absolute bottom-9 left-1/2 z-20 w-72 -translate-x-1/2 rounded-2xl border border-[#eee2e7] bg-white p-4 text-left shadow-xl"
        >
          <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-[#eee2e7] bg-white" />

          {ingredients ? (
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#b5006e]">
                Ingrédients
              </p>
              <p className="mt-1 text-sm leading-6 text-[#4a3d43]">
                {ingredients}
              </p>
            </div>
          ) : null}

          {allergenes ? (
            <div className={ingredients ? 'mt-4' : ''}>
              <p className="text-xs font-black uppercase tracking-wide text-red-600">
                Allergènes
              </p>
              <p className="mt-1 text-sm leading-6 text-[#4a3d43]">
                {allergenes}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}