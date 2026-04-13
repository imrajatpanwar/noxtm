import { cn } from "../../lib/utils"

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("tw-animate-pulse tw-rounded-md tw-bg-neutral-900/10", className)}
      {...props}
    />
  )
}

export { Skeleton }
