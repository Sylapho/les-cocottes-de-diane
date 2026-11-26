import type { ComponentProps } from 'react'
import { cx } from '@/lib/cx'

type CategoryChipProps = Omit<ComponentProps<'button'>, 'aria-pressed'> & {
  selected?: boolean
}

export function CategoryChip({
  selected = false,
  className,
  type = 'button',
  ...props
}: CategoryChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        'inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-6 py-3 text-label font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-raspberry',
        selected ? 'bg-ink text-paper' : 'bg-cream text-ink hover:bg-blush',
        className,
      )}
      {...props}
    />
  )
}
