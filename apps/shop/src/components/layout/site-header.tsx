'use client'

import { useCart } from '@/components/cart/cart-provider'
import { Button, ButtonLink } from '@/components/ui/button'
import { cx } from '@/lib/cx'
import { mainNavigation, shopRoutes } from '@/lib/site-nav'
import { Lock, Menu, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import MobileMenu from './mobile-menu'

export default function SiteHeader({ logotype }: { logotype: ReactNode }) {
  const pathname = usePathname()
  const { count, openCart } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const cartLabel = `Panier (${count})`

  if (pathname.startsWith(shopRoutes.checkout)) {
    return (
      <header className="border-b border-line bg-cream">
        <div className="mx-auto flex max-w-360 items-center gap-6 p-5 lg:gap-10 lg:p-8">
          {logotype}
          <p className="hidden flex-1 items-center gap-3 text-body text-ink md:flex">
            <Lock aria-hidden="true" className="size-5" />
            Votre commande en toute simplicité
          </p>
          <ButtonLink
            href={shopRoutes.cart}
            appearance="secondary"
            className="ml-auto w-auto lg:w-60"
          >
            Retour au panier
          </ButtonLink>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream">
      <div className="mx-auto flex max-w-360 items-center gap-3 p-5 lg:gap-10 lg:p-8">
        {logotype}

        <nav aria-label="Navigation principale" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-8">
            {mainNavigation.map((item) => {
              const current = pathname === item.match

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? 'page' : undefined}
                    className={cx(
                      'whitespace-nowrap text-ink underline-offset-4 hover:underline',
                      current ? 'text-label font-bold' : 'text-body',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="hidden lg:block">
          <Button appearance="secondary" onClick={openCart} className="w-60">
            {cartLabel}
          </Button>
        </div>

        <div className="ml-auto flex items-center lg:hidden">
          <button
            type="button"
            onClick={openCart}
            aria-label={cartLabel}
            className="relative flex size-12 items-center justify-center rounded-lg hover:bg-sand"
          >
            <ShoppingBag aria-hidden="true" className="size-6" strokeWidth={1.5} />
            {count > 0 ? (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-raspberry px-1 text-eyebrow font-bold text-paper"
              >
                {count}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="flex size-12 items-center justify-center rounded-lg hover:bg-sand"
          >
            <Menu aria-hidden="true" className="size-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenCart={openCart}
      />
    </header>
  )
}
