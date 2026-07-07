'use client'

import { authClient } from '@/lib/auth-client'
import {
  canAccessAdmin,
  canCreateSales,
  canManageCashRegister,
  canManageArticles,
  canViewArticles,
  canViewCashRegister,
  canViewOrders,
  canViewStock,
  getUserRole,
  type UserWithRole,
} from '@/lib/permissions'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, type ReactNode, type SVGProps } from 'react'

type NavIconName =
  | 'home'
  | 'cash-register'
  | 'sale'
  | 'orders'
  | 'preparation'
  | 'articles'
  | 'stock'
  | 'history'
  | 'users'
  | 'pickup'
  | 'stripe'

type NavItem = {
  label: string
  href: string
  short: string
  icon: NavIconName
  description: string
  canAccess: (user: UserWithRole) => boolean
}

const navItems: NavItem[] = [
  {
    label: 'Accueil',
    href: '/',
    short: 'Home',
    icon: 'home',
    description: 'Vue générale',
    canAccess: () => true,
  },
  // {
  //   label: 'Caisse',
  //   href: '/caisse',
  //   short: 'Caisse',
  //   icon: 'cash-register',
  //   description: 'Journée en cours',
  //   canAccess: canViewCashRegister,
  // },
  // {
  //   label: 'Ventes',
  //   href: '/ventes/new',
  //   short: 'Vente',
  //   icon: 'sale',
  //   description: 'Encaissement rapide',
  //   canAccess: canCreateSales,
  // },
  {
    label: 'Commandes',
    href: '/commandes',
    short: 'Cmd',
    icon: 'orders',
    description: 'Click & Collect',
    canAccess: canViewOrders,
  },
  // {
  //   label: 'Préparation',
  //   href: '/preparation',
  //   short: 'Prep',
  //   icon: 'preparation',
  //   description: 'Retraits à servir',
  //   canAccess: canViewOrders,
  // },
  {
    label: 'Articles',
    href: '/articles',
    short: 'Arts',
    icon: 'articles',
    description: 'Catalogue boutique',
    canAccess: canViewArticles,
  },
  {
    label: 'Catégories',
    href: '/article-categories',
    short: 'Cat.',
    icon: 'articles',
    description: 'Familles produits',
    canAccess: canManageArticles,
  },
  // {
  //   label: 'Stock',
  //   href: '/stock',
  //   short: 'Stock',
  //   icon: 'stock',
  //   description: 'Lots, DLC et alertes',
  //   canAccess: canViewStock,
  // },
  // {
  //   label: 'Historique',
  //   href: '/caisse/journees',
  //   short: 'Hist.',
  //   icon: 'history',
  //   description: 'Clôtures de caisse',
  //   canAccess: canManageCashRegister,
  // },
]

const adminNavItems: NavItem[] = [
  {
    label: 'Utilisateurs',
    href: '/admin/users',
    short: 'Admin',
    icon: 'users',
    description: 'Rôles et accès',
    canAccess: canAccessAdmin,
  },
  {
    label: 'Retraits',
    href: '/admin/pickup-points',
    short: 'Lieu',
    icon: 'pickup',
    description: 'Points de retrait',
    canAccess: canAccessAdmin,
  },
  // {
  //   label: 'Stripe',
  //   href: '/admin/stripe-reconciliations',
  //   short: 'Pay',
  //   icon: 'stripe',
  //   description: 'Paiements à vérifier',
  //   canAccess: canAccessAdmin,
  // },
]

function NavIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: NavIconName }) {
  const commonProps = {
    'aria-hidden': true,
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    ...props,
  }

  switch (name) {
    case 'home':
      return (
        <svg {...commonProps}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13v-9.5" />
          <path d="M9.5 20v-5h5v5" />
        </svg>
      )
    case 'cash-register':
      return (
        <svg {...commonProps}>
          <path d="M6 9V4h9l3 5" />
          <path d="M4 9h16v11H4z" />
          <path d="M7 13h4" />
          <path d="M7 16h2" />
          <path d="M14 16h3" />
        </svg>
      )
    case 'sale':
      return (
        <svg {...commonProps}>
          <path d="M4 7h16l-2 9H7L4 7Z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
          <path d="M9 20h.01" />
          <path d="M17 20h.01" />
        </svg>
      )
    case 'orders':
      return (
        <svg {...commonProps}>
          <path d="M7 4h10l2 3v13H5V7l2-3Z" />
          <path d="M7 7h10" />
          <path d="M9 11h6" />
          <path d="M9 15h4" />
        </svg>
      )
    case 'preparation':
      return (
        <svg {...commonProps}>
          <path d="M5 13h14" />
          <path d="M7 13a5 5 0 0 1 10 0" />
          <path d="M4 17h16" />
          <path d="M12 4v3" />
          <path d="M9 4h6" />
        </svg>
      )
    case 'articles':
      return (
        <svg {...commonProps}>
          <path d="M4 7h16" />
          <path d="M6 7v13h12V7" />
          <path d="M8 7a4 4 0 0 1 8 0" />
          <path d="M9 13h6" />
          <path d="M9 16h4" />
        </svg>
      )
    case 'stock':
      return (
        <svg {...commonProps}>
          <path d="M12 3 4 7l8 4 8-4-8-4Z" />
          <path d="m4 12 8 4 8-4" />
          <path d="m4 17 8 4 8-4" />
        </svg>
      )
    case 'history':
      return (
        <svg {...commonProps}>
          <path d="M4 12a8 8 0 1 0 2.35-5.65" />
          <path d="M4 5v5h5" />
          <path d="M12 8v5l3 2" />
        </svg>
      )
    case 'users':
      return (
        <svg {...commonProps}>
          <path d="M16 20v-1.5a4 4 0 0 0-8 0V20" />
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M20 20v-1a3 3 0 0 0-3-3" />
          <path d="M17 5.2a3 3 0 0 1 0 5.6" />
        </svg>
      )
    case 'pickup':
      return (
        <svg {...commonProps}>
          <path d="M4 10h16l-1.2 10H5.2L4 10Z" />
          <path d="M8 10a4 4 0 0 1 8 0" />
          <path d="M9 14h6" />
          <path d="M12 14v3" />
        </svg>
      )
    case 'stripe':
      return (
        <svg {...commonProps}>
          <path d="M4 7h16v10H4z" />
          <path d="M4 10h16" />
          <path d="M7 14h4" />
          <path d="M15 14h2" />
        </svg>
      )
  }
}

function isActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }

  if (href === '/ventes/new') {
    return pathname.startsWith('/ventes')
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href)

  return (
    <Link
      href={item.href}
      className={active ? 'lc-nav-item active' : 'lc-nav-item'}
      aria-current={active ? 'page' : undefined}
    >
      <span className="lc-nav-mark" aria-hidden="true">
        <NavIcon name={item.icon} className="lc-nav-icon" />
      </span>
      <span>
        <span className="lc-nav-label">{item.label}</span>
        <span className="lc-nav-desc">{item.description}</span>
      </span>
    </Link>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const user = session?.user
  const role = getUserRole(user)
  const hasSession = Boolean(session)
  const isLoaded = !isPending
  const visibleNavItems = navItems.filter((item) => item.canAccess(user))
  const visibleAdminNavItems = adminNavItems.filter((item) =>
    item.canAccess(user),
  )
  const visibleMobileNavItems = [...visibleNavItems, ...visibleAdminNavItems]
  const activeMobileLinkRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    activeMobileLinkRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [pathname])

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/')
          router.refresh()
        },
      },
    })
  }

  return (
    <div className="lc-shell">
      <aside className="lc-sidebar">
        <Link href="/" className="lc-brand" aria-label="Les cocottes de Diane accueil">
          <span className="lc-brand-kicker">Back-office</span>
          <strong>Les cocottes de Diane</strong>
          <small>Commandes, stock, caisse et production</small>
        </Link>

        <nav className="lc-nav" aria-label="Navigation principale">
          <p className="lc-nav-section">Pilotage</p>
          {visibleNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}

          {visibleAdminNavItems.length > 0 ? (
            <>
              <p className="lc-nav-section">Administration</p>
              {visibleAdminNavItems.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </>
          ) : null}
        </nav>

        <div className="lc-sidebar-foot">
          {isLoaded && hasSession ? (
            <div className="lc-user-chip">
              <button
                type="button"
                onClick={handleSignOut}
                className="lc-avatar"
                title="Se déconnecter"
                aria-label="Se déconnecter"
              >
                {user?.name?.slice(0, 2).toUpperCase() ?? 'LD'}
              </button>
              <span>
                <strong>{user?.name ?? 'Compte équipe'}</strong>
                <small>Rôle : {role}</small>
              </span>
            </div>
          ) : null}

          {isLoaded && !hasSession ? (
            <Link href="/sign-in" className="lc-auth-primary">
              Se connecter
            </Link>
          ) : null}
        </div>
      </aside>

      <div className="lc-workspace">
        <header className="lc-topbar">
          <div>
            <strong>Interface de gestion</strong>
            {isLoaded && hasSession ? (
              <span>Connecté au back-office Les cocottes de Diane</span>
            ) : null}
            {isLoaded && !hasSession ? (
              <span>Connecte-toi pour accéder aux opérations internes</span>
            ) : null}
          </div>
          {isLoaded && hasSession && canCreateSales(user) ? (
            <Link href="/ventes/new" className="lc-topbar-action">
              Nouvelle vente
            </Link>
          ) : null}
        </header>

        <div className="lc-content">{children}</div>

        <nav className="lc-mobile-nav" aria-label="Navigation mobile">
          {visibleMobileNavItems.map((item) => {
            const active = isActive(pathname, item.href)

            return (
              <Link
                key={item.href}
                ref={active ? activeMobileLinkRef : undefined}
                href={item.href}
                className={active ? 'active' : undefined}
                aria-current={active ? 'page' : undefined}
              >
                <span>
                  <NavIcon name={item.icon} className="lc-nav-icon" />
                </span>
                <small>{item.short}</small>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
