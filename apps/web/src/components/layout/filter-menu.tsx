'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import Link from 'next/link'

export type FilterMenuOption = {
  label: string
  href: string
  active: boolean
}

// Link-based filter dropdown: filters live in the URL so server pages stay
// the source of truth and results can be shared or reloaded.
export function FilterMenu({
  label,
  ariaLabel,
  options,
  variant = 'secondary',
  className,
}: {
  label: string
  ariaLabel: string
  options: FilterMenuOption[]
  variant?: 'default' | 'secondary'
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          aria-label={`${ariaLabel} : ${label}`}
          className={cn('justify-between gap-2', className)}
        >
          {label}
          <ChevronDownIcon className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {options.map((option) => (
          <DropdownMenuItem key={option.href} asChild>
            <Link
              href={option.href}
              aria-current={option.active ? 'true' : undefined}
              className="justify-between"
            >
              {option.label}
              {option.active ? (
                <CheckIcon className="size-4 text-primary" aria-hidden="true" />
              ) : null}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
