import * as React from "react";
import { cn } from "../../lib/utils";

const badgeVariants = {
  default: "tw-bg-[#09090b] tw-text-white",
  secondary: "tw-bg-[#f4f4f5] tw-text-[#09090b]",
  outline: "tw-border tw-border-[#e4e4e7] tw-text-[#09090b] tw-bg-transparent",
  success: "tw-bg-[#f0fdf4] tw-text-[#16a34a] tw-border tw-border-[#bbf7d0]",
  blue: "tw-bg-[#eff6ff] tw-text-[#3b82f6] tw-border tw-border-[#bfdbfe]",
  popular: "tw-bg-gradient-to-r tw-from-[#8b5cf6] tw-to-[#6366f1] tw-text-white",
};

function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "tw-inline-flex tw-items-center tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-semibold tw-transition-colors",
        badgeVariants[variant],
        className
      )}
      style={{ fontFamily: "'Switzer', sans-serif" }}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
