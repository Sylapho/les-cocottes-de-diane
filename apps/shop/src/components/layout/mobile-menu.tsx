'use client'

import { Button } from '@/components/ui/button'
import { contactEmail, mainNavigation } from '@/lib/site-nav'
import { X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

type MobileMenuProps = {
  open: boolean
  onClose: () => void
  onOpenCart: () => void
}

export default function MobileMenu({ open, onClose, onOpenCart }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      id="mobile-menu"
      aria-labelledby="mobile-menu-title"
      onClose={onClose}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-cream p-6 text-ink backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-6">
          <h2 id="mobile-menu-title" className="font-serif text-h2">
            Menu
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex size-12 items-center justify-center rounded-lg hover:bg-sand"
          >
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>

        <nav aria-label="Navigation principale">
          <ul className="flex flex-col gap-8">
            {mainNavigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="font-serif text-h3 underline-offset-4 hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Button
          fullWidth
          onClick={() => {
            onClose()
            onOpenCart()
          }}
        >
          Voir mon panier
        </Button>

        <a
          href={`mailto:${contactEmail}`}
          className="w-fit text-small text-muted underline-offset-4 hover:underline"
        >
          {contactEmail}
        </a>
      </div>
    </dialog>
  )
}
