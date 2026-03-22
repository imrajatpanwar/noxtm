import * as React from "react"
import { cn } from "../../lib/utils"

const badgeVariants = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  destructive: "border-transparent bg-destructive text-destructive-foreground",
  outline: "text-foreground",
  success: "border-transparent bg-emerald-500/15 text-emerald-700",
  warning: "border-transparent bg-amber-500/15 text-amber-700",
}

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        badgeVariants[variant] || badgeVariants.default,
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge, badgeVariants }
