import { useId, type ComponentProps, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

export const controlClassName =
  'w-full rounded-lg border border-muted bg-paper p-4 text-body text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:cursor-not-allowed disabled:bg-sand aria-invalid:border-error aria-invalid:focus:ring-error'

type FieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  id?: string
}

export function Field({
  label,
  hint,
  error,
  id,
  className,
  ...inputProps
}: FieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-label font-bold text-ink">
        {label}
      </label>
      <input
        id={inputId}
        className={controlClassName}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
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
