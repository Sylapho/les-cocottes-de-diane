'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useState, type ComponentProps } from 'react'

// Password field with the "Afficher / Masquer" toggle from the redesign.
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-24', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-3 text-sm leading-5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {visible ? 'Masquer' : 'Afficher'}
        <span className="sr-only"> le mot de passe</span>
      </button>
    </div>
  )
}
