import * as React from "react"
import { cn } from "../../lib/utils"

const Kbd = React.forwardRef(({ className, ...props }, ref) => (
  <kbd
    ref={ref}
    className={cn(
      "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-neutral-200 bg-neutral-100 px-1.5 font-mono text-[10px] font-medium text-neutral-500",
      className
    )}
    {...props}
  />
))
Kbd.displayName = "Kbd"

export { Kbd }
