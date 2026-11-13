import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Figma "Button" / "Icon button": 44 px controls, 6 px radius, Label typography.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 disabled:pointer-events-none aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground",
        secondary:
          "border border-border bg-card text-foreground hover:bg-muted/60 active:bg-muted disabled:bg-muted disabled:text-muted-foreground",
        // Alias kept for shadcn/ui components that reference `outline`.
        outline:
          "border border-border bg-card text-foreground hover:bg-muted/60 active:bg-muted disabled:bg-muted disabled:text-muted-foreground",
        destructive:
          "bg-danger text-white hover:bg-danger/90 active:bg-danger/90 focus-visible:ring-danger/40 disabled:bg-muted disabled:text-muted-foreground",
        ghost:
          "text-foreground hover:bg-muted active:bg-muted disabled:text-muted-foreground",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline disabled:text-muted-foreground",
      },
      size: {
        default: "h-11 px-3",
        sm: "h-9 gap-1.5 px-3",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
