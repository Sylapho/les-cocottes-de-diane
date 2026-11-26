import { ChevronDown } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { controlClassName } from './field'

type SelectProps = Omit<ComponentProps<'select'>, 'id'> & {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  id?: string
}

// Native <select>: keeps keyboard, screen reader and mobile picker behaviour for free.
export function Select({
  label,
  hint,
  error,
  id,
  className,
  disabled,
  children,
  ...selectProps
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const hintId = hint ? `${selectId}-hint` : undefined
  const errorId = error ? `${selectId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('flex flex-col gap-2', disabled && 'opacity-50', className)}>
      <label htmlFor={selectId} className="text-label font-bold text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className={cx(controlClassName, 'appearance-none pr-12')}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...selectProps}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink"
        />
      </div>
      {hint ? (
        <p id={hintId} className="text-small text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-small text-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
