"use client"

import * as React from "react"
import { cn } from "cn"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  )
}

// Figma "Radio": 22 px; the selected state is a thick primary ring around a white dot.
function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "aspect-square size-[22px] shrink-0 rounded-full border border-input bg-muted transition-colors outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger data-[state=checked]:border-[6px] data-[state=checked]:border-primary data-[state=checked]:bg-white",
        className
      )}
      {...props}
    />
  )
}

export { RadioGroup, RadioGroupItem }
