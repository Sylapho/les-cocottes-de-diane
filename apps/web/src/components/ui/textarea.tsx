import * as React from "react"
import { cn } from "cn"

// Figma "Textarea": same states as Input, multi-line.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-md border border-input bg-card px-3 py-3 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-danger data-[valid=true]:border-success",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
