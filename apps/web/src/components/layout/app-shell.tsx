'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { authClient } from '@/lib/auth-client'
import {
  canAccessBackOffice,
  canViewArticleCategories,
  canViewArticles,
  canViewOrders,
  canViewPickupPoints,
  canViewUsers,
  getAccessModeLabel,
  getUserRole,
  type UserWithRole,
} from '@/lib/permissions'
import { roleLabels } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { LogInIcon, LogOutIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { NavIcon, type NavIconName } from './nav-icons'

type NavItem = {
  label: string
  href: string
  icon: NavIconName
  canAccess: (user: UserWithRole) => boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

// Cash register, sales, stock, cash history and Stripe reconciliation pages
// are not part of the redesign: they stay reachable by URL but hidden here.
const navGroups: NavGroup[] = [
  {
    label: 'Opérations',
    items: [
      {
        label: 'Vue d’ensemble',
        href: '/',
        icon: 'home',
        canAccess: canAccessBackOffice,
      },
      {
        label: 'Commandes',
        href: '/commandes',
        icon: 'orders',
        canAccess: canViewOrders,
      },
      {
        label: 'Préparation',
        href: '/preparation',
        icon: 'prep',
        canAccess: canViewOrders,
      },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      {
        label: 'Articles',
        href: '/articles',
        icon: 'articles',
        canAccess: canViewArticles,
      },
      {
        label: 'Catégories',
        href: '/article-categories',
        icon: 'category',
        canAccess: canViewArticleCategories,
      },
      {
        label: 'Points de retrait',
        href: '/admin/pickup-points',
        icon: 'pickup',
        canAccess: canViewPickupPoints,
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        label: 'Utilisateurs',
        href: '/admin/users',
        icon: 'users',
        canAccess: canViewUsers,
      },
    ],
  },
]

function isActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function navItemClassName(active: boolean) {
  return cn(
    'flex items-center rounded-md text-sm leading-5 font-medium transition-colors',
    active
      ? 'bg-primary-soft text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )
}

type ShellNavProps = {
  groups: NavGroup[]
  pathname: string
}

function DesktopSidebar({
  groups,
  pathname,
  account,
}: ShellNavProps & { account: ReactNode }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-2 overflow-y-auto border-r border-border bg-card p-3 xl:flex print:hidden">
      <Link
        href="/"
        aria-label="Les Cocottes de Diane, vue d’ensemble"
        className="flex flex-col gap-1 rounded-md p-3"
      >
        <span className="text-sm leading-5 font-medium text-primary uppercase">
          Les Cocottes
        </span>
        <span className="text-lg leading-[26px] font-semibold">de Diane</span>
        <span className="text-xs leading-[17px] text-muted-foreground uppercase">
          Espace de gestion
        </span>
      </Link>

      <div className="h-[22px] shrink-0" aria-hidden="true" />

      <nav aria-label="Navigation principale" className="flex flex-col gap-2">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <p className="p-3 text-xs leading-[17px] text-muted-foreground uppercase">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(navItemClassName(active), 'h-11 gap-2 p-3')}
                >
                  <NavIcon
                    name={item.icon}
                    className="shrink-0 text-muted-foreground"
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {account}
    </aside>
  )
}

function TabletRail({
  groups,
  pathname,
  footer,
}: ShellNavProps & { footer: ReactNode }) {
  const items = groups.flatMap((group) => group.items)

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col gap-2 overflow-y-auto border-r border-border bg-card p-4 md:flex xl:hidden print:hidden">
      <Link
        href="/"
        aria-label="Les Cocottes de Diane, vue d’ensemble"
        className="flex size-11 items-center justify-center rounded-md text-lg leading-[26px] font-semibold text-primary"
      >
        CD
      </Link>

      <div className="h-[22px] shrink-0" aria-hidden="true" />

      <TooltipProvider>
        <nav aria-label="Navigation principale" className="flex flex-col gap-2">
          {items.map((item) => {
            const active = isActive(pathname, item.href)

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      navItemClassName(active),
                      'size-11 shrink-0 justify-center',
                    )}
                  >
                    <NavIcon
                      name={item.icon}
                      className="text-muted-foreground"
                    />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        <div className="mt-auto">{footer}</div>
      </TooltipProvider>
    </aside>
  )
}

function MobileHeader({
  groups,
  pathname,
  accountName,
  accessModeLabel,
  onSignOut,
  showSignIn,
}: ShellNavProps & {
  accountName: string | null
  accessModeLabel: string | null
  onSignOut: () => void
  showSignIn: boolean
}) {
  const [open, setOpen] = useState(false)
  const items = groups.flatMap((group) => group.items)

  return (
    <header className="flex items-center gap-3 px-5 pt-5 md:hidden print:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="-m-1.5 text-muted-foreground"
            aria-label="Ouvrir la navigation"
          >
            <NavIcon name="menu" className="size-6" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="gap-4 p-6 sm:max-w-[390px]"
        >
          <SheetTitle className="text-primary">Les Cocottes de Diane</SheetTitle>
          <SheetDescription className="sr-only">
            Navigation principale du back-office
          </SheetDescription>
          <SheetClose asChild>
            <Button variant="secondary" className="w-full">
              Fermer <span aria-hidden="true">×</span>
            </Button>
          </SheetClose>

          {items.length > 0 ? (
            <nav aria-label="Navigation mobile" className="flex flex-col gap-4">
              {items.map((item) => {
                const active = isActive(pathname, item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex h-10 items-center gap-4 rounded-md px-2 text-sm leading-5 font-medium transition-colors',
                      active
                        ? 'bg-primary-soft text-primary'
                        : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <NavIcon
                      name={item.icon}
                      className="shrink-0 text-muted-foreground"
                    />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          ) : null}

          {accountName ? (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <p className="text-sm leading-5 font-medium">{accountName}</p>
                {accessModeLabel ? (
                  <Badge variant="info" className="w-fit" role="status">
                    {accessModeLabel}
                  </Badge>
                ) : null}
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setOpen(false)
                  onSignOut()
                }}
              >
                Se déconnecter
              </Button>
            </>
          ) : null}

          {showSignIn ? (
            <Button asChild className="w-full">
              <Link href="/sign-in" onClick={() => setOpen(false)}>
                Se connecter
              </Link>
            </Button>
          ) : null}
        </SheetContent>
      </Sheet>

      <Link href="/" className="text-sm leading-5 font-medium">
        Les Cocottes de Diane
      </Link>
    </header>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const user = session?.user
  const role = getUserRole(user)
  const accessModeLabel = getAccessModeLabel(user)
  const hasSession = Boolean(session)
  const isLoaded = !isPending
  const showAccount = isLoaded && hasSession
  const showSignIn = isLoaded && !hasSession
  const accountName = showAccount
    ? [user?.name ?? 'Compte équipe', role ? roleLabels[role] : null]
        .filter(Boolean)
        .join(' · ')
    : null

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.canAccess(user)),
    }))
    .filter((group) => group.items.length > 0)

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

  const desktopAccount = (
    <div className="flex flex-col gap-2 p-3">
      {accountName ? (
        <>
          <p className="text-sm leading-5 font-medium">{accountName}</p>
          {accessModeLabel ? (
            <Badge variant="info" className="w-fit" role="status">
              {accessModeLabel}
            </Badge>
          ) : null}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-fit rounded-sm text-left text-xs leading-[17px] text-muted-foreground hover:text-foreground hover:underline"
          >
            Déconnexion <span aria-hidden="true">↗</span>
          </button>
        </>
      ) : null}
      {showSignIn ? (
        <Button asChild size="sm">
          <Link href="/sign-in">Se connecter</Link>
        </Button>
      ) : null}
    </div>
  )

  const railFooter = (
    <>
      {showAccount ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Se déconnecter"
              className="text-muted-foreground"
              onClick={handleSignOut}
            >
              <LogOutIcon className="size-6" strokeWidth={1.7} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {accountName} · Se déconnecter
          </TooltipContent>
        </Tooltip>
      ) : null}
      {showSignIn ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon" className="text-primary">
              <Link href="/sign-in" aria-label="Se connecter">
                <LogInIcon className="size-6" strokeWidth={1.7} />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Se connecter
          </TooltipContent>
        </Tooltip>
      ) : null}
    </>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DesktopSidebar
        groups={visibleGroups}
        pathname={pathname}
        account={desktopAccount}
      />
      <TabletRail
        groups={visibleGroups}
        pathname={pathname}
        footer={railFooter}
      />

      <div className="min-h-screen md:pl-[76px] xl:pl-56 print:pl-0">
        <MobileHeader
          groups={visibleGroups}
          pathname={pathname}
          accountName={accountName}
          accessModeLabel={accessModeLabel}
          onSignOut={handleSignOut}
          showSignIn={showSignIn}
        />
        <div className="lc-content">{children}</div>
      </div>
    </div>
  )
}
