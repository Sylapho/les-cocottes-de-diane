import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type Availability = 'available' | 'unavailable' | 'pending'

const defaultLabels: Record<Availability, string> = {
  available: 'Disponible',
  unavailable: 'Indisponible',
  pending: 'En attente',
}

export function AvailabilityBadge({
  status,
  children,
  className,
}: {
  status: Availability
  children?: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex w-fit items-center rounded-sm p-2 text-small text-ink',
        status === 'available' ? 'bg-blush' : 'bg-sand',
        className,
      )}
    >
      {children ?? defaultLabels[status]}
    </span>
  )
}
