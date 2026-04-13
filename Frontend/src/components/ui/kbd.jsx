import * as React from "react"
import { cn } from "../../lib/utils"

const Kbd = React.forwardRef(({ className, ...props }, ref) => (
  <kbd
    ref={ref}
    className={cn(
      "tw-pointer-events-none tw-inline-flex tw-h-5 tw-select-none tw-items-center tw-gap-1 tw-rounded tw-border tw-border-neutral-200 tw-bg-neutral-100 tw-px-1.5 tw-font-mono tw-text-[10px] tw-font-medium tw-text-neutral-500",
      className
    )}
    {...props}
  />
))
Kbd.displayName = "Kbd"

export { Kbd }
