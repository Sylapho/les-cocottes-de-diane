"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Figma "Toast": soft tone background, coloured Label title, muted description.
// Light theme only, so no next-themes dependency.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-border !bg-card !p-5 !font-sans !text-foreground !shadow-md",
          title: "!text-sm !font-medium",
          description: "!text-sm !text-muted-foreground",
          success: "!bg-success-soft [&_[data-title]]:!text-success [&_[data-icon]]:!text-success",
          error: "!bg-danger-soft [&_[data-title]]:!text-danger [&_[data-icon]]:!text-danger",
          warning: "!bg-warning-soft [&_[data-title]]:!text-warning [&_[data-icon]]:!text-warning",
          info: "!bg-info-soft [&_[data-title]]:!text-info [&_[data-icon]]:!text-info",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
