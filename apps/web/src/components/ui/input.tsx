import * as React from "react"
import { cn } from "cn"

// Figma "Input": 44 px, 6 px radius, primary border on focus,
// danger border when aria-invalid, soft background when disabled.
const inputClassName =
  "h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm text-foreground transition-colors outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-primary focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-danger data-[valid=true]:border-success"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputClassName, className)}
      {...props}
    />
  )
}

export { Input, inputClassName }
