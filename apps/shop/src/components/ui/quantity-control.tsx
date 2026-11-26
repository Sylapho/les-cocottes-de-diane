import { cx } from '@/lib/cx'

type QuantityControlProps = {
  value: number
  onDecrease: () => void
  onIncrease: () => void
  /** Used in the button labels, e.g. the product name. */
  itemLabel?: string
  decreaseDisabled?: boolean
  increaseDisabled?: boolean
  className?: string
}

const stepButtonClassName =
  'flex size-12 shrink-0 items-center justify-center rounded-lg text-body text-ink enabled:hover:bg-cream disabled:text-muted'

export function QuantityControl({
  value,
  onDecrease,
  onIncrease,
  itemLabel,
  decreaseDisabled = false,
  increaseDisabled = false,
  className,
}: QuantityControlProps) {
  const suffix = itemLabel ? ` de ${itemLabel}` : ''

  return (
    <div
      role="group"
      aria-label={`Quantité${suffix}`}
      className={cx(
        'inline-flex h-12 w-36 items-center rounded-lg border border-line bg-paper',
        className,
      )}
    >
      <button
        type="button"
        className={stepButtonClassName}
        onClick={onDecrease}
        disabled={decreaseDisabled}
        aria-label={`Diminuer la quantité${suffix}`}
      >
        −
      </button>
      <output
        aria-live="polite"
        className="flex h-12 min-w-12 flex-1 items-center justify-center text-body text-ink tabular-nums"
      >
        {value}
      </output>
      <button
        type="button"
        className={stepButtonClassName}
        onClick={onIncrease}
        disabled={increaseDisabled}
        aria-label={`Augmenter la quantité${suffix}`}
      >
        +
      </button>
    </div>
  )
}
