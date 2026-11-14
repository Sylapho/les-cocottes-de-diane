import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

// Page primitives from the redesign (Context, Page heading, Key figures,
// callouts and section titles). Older screens keep using ui/dashboard.

export function PageContainer({ className, ...props }: ComponentProps<'main'>) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-[1216px] flex-col gap-6 px-5 pt-6 pb-10 md:p-7 xl:p-10',
        className,
      )}
      {...props}
    />
  )
}

export function PageHeading({
  context,
  contextHref,
  title,
  description,
  actions,
}: {
  context?: string
  contextHref?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <>
      {context ? (
        <p className="hidden text-xs leading-[17px] text-muted-foreground md:block print:hidden">
          Gestion /{' '}
          {contextHref ? (
            <Link href={contextHref} className="hover:text-foreground hover:underline">
              {context}
            </Link>
          ) : (
            context
          )}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-3xl leading-[42px] font-semibold">{title}</h1>
          {description ? (
            <p className="text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-3 print:hidden">{actions}</div>
        ) : null}
      </div>
    </>
  )
}

export type KeyFigure = {
  label: string
  value: ReactNode
  detail?: string
}

export function KeyFigures({
  items,
  className,
}: {
  items: KeyFigure[]
  className?: string
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card',
        items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1 p-5">
          <dt className="text-xs leading-[17px] text-muted-foreground">
            {item.label}
          </dt>
          <dd className="text-4xl leading-[51px] font-medium">{item.value}</dd>
          {item.detail ? (
            <dd className="text-xs leading-[17px] text-muted-foreground">
              {item.detail}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}

const calloutTones = {
  primary: 'bg-primary-soft text-primary',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
} as const

export function Callout({
  tone = 'info',
  title,
  children,
  action,
  size = 'default',
  className,
}: {
  tone?: keyof typeof calloutTones
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  size?: 'default' | 'large'
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-lg sm:flex-row sm:items-center sm:justify-between',
        size === 'large' ? 'p-6' : 'p-4',
        calloutTones[tone],
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2
          className={
            size === 'large'
              ? 'text-lg leading-[26px] font-semibold'
              : 'text-sm leading-5 font-medium'
          }
        >
          {title}
        </h2>
        {children ? <div className="text-sm leading-5">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 print:hidden">{action}</div> : null}
    </section>
  )
}

export function SectionHeading({
  title,
  action,
}: {
  title: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-lg leading-[26px] font-semibold">{title}</h2>
      {action}
    </div>
  )
}

export function Panel({
  title,
  children,
  footer,
  className,
}: {
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-border bg-card p-6',
        className,
      )}
    >
      {title ? (
        <h2 className="text-lg leading-[26px] font-semibold">{title}</h2>
      ) : null}
      {children}
      {footer ? (
        <p className="text-xs leading-[17px] text-muted-foreground">{footer}</p>
      ) : null}
    </section>
  )
}
