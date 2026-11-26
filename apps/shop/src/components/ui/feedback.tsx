import { Check, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type FeedbackTone = 'info' | 'success' | 'error'

export function Feedback({
  tone = 'info',
  children,
  className,
  live = false,
}: {
  tone?: FeedbackTone
  children: ReactNode
  className?: string
  /** Announce the message to screen readers when it appears dynamically. */
  live?: boolean
}) {
  const Icon = tone === 'success' ? Check : Info
  const role = live ? (tone === 'error' ? 'alert' : 'status') : undefined

  return (
    <div
      role={role}
      className={cx(
        'flex items-start gap-3 rounded-lg p-4 text-body',
        tone === 'error' ? 'bg-cream text-error' : 'bg-blush text-ink',
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-px size-6 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
