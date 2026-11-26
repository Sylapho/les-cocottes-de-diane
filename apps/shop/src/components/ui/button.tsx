import Link from 'next/link'
import type { ComponentProps } from 'react'
import { cx } from '@/lib/cx'

export type ButtonAppearance = 'primary' | 'secondary' | 'tertiary'

const baseClassName =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg p-4 text-center text-label font-bold transition-colors aria-busy:cursor-wait'

// Kept separate so a loading button stays in its normal colours (Figma "Loading" state).
const disabledClassName =
  'disabled:bg-sand disabled:text-muted aria-disabled:pointer-events-none aria-disabled:bg-sand aria-disabled:text-muted'

const appearanceClassNames: Record<ButtonAppearance, string> = {
  primary: 'bg-raspberry text-paper',
  secondary: 'border border-ink bg-paper text-ink',
  tertiary: 'text-ink underline-offset-4',
}

// Buttons only get hover styles while enabled; links are never disabled.
const buttonHoverClassNames: Record<ButtonAppearance, string> = {
  primary: 'enabled:hover:bg-raspberry-dark',
  secondary: 'enabled:hover:bg-cream',
  tertiary: 'enabled:hover:underline',
}

const linkHoverClassNames: Record<ButtonAppearance, string> = {
  primary: 'hover:bg-raspberry-dark',
  secondary: 'hover:bg-cream',
  tertiary: 'hover:underline',
}

export function buttonClassName({
  appearance = 'primary',
  fullWidth = false,
  loading = false,
  asLink = false,
  className,
}: {
  appearance?: ButtonAppearance
  fullWidth?: boolean
  loading?: boolean
  asLink?: boolean
  className?: string
} = {}) {
  return cx(
    baseClassName,
    appearanceClassNames[appearance],
    asLink ? linkHoverClassNames[appearance] : buttonHoverClassNames[appearance],
    !loading && disabledClassName,
    fullWidth && 'w-full',
    className,
  )
}

type ButtonProps = ComponentProps<'button'> & {
  appearance?: ButtonAppearance
  fullWidth?: boolean
  loading?: boolean
  loadingLabel?: string
}

export function Button({
  appearance,
  fullWidth,
  loading = false,
  loadingLabel = 'Chargement…',
  className,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ appearance, fullWidth, loading, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? loadingLabel : children}
    </button>
  )
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  appearance?: ButtonAppearance
  fullWidth?: boolean
}

export function ButtonLink({
  appearance,
  fullWidth,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClassName({ appearance, fullWidth, asLink: true, className })}
      {...props}
    />
  )
}
