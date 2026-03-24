import * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = {
  default: "tw-bg-[#09090b] tw-text-white hover:tw-bg-[#27272a]",
  outline: "tw-border tw-border-[#e4e4e7] tw-bg-white tw-text-[#09090b] hover:tw-bg-[#f4f4f5]",
  ghost: "tw-bg-transparent tw-text-[#71717a] hover:tw-bg-[#f4f4f5] hover:tw-text-[#09090b]",
  secondary: "tw-bg-[#f4f4f5] tw-text-[#09090b] hover:tw-bg-[#e4e4e7]",
  destructive: "tw-bg-[#ef4444] tw-text-white hover:tw-bg-[#dc2626]",
  link: "tw-bg-transparent tw-text-[#3b82f6] hover:tw-underline tw-p-0",
};

const buttonSizes = {
  default: "tw-h-9 tw-px-4 tw-py-2 tw-text-sm",
  sm: "tw-h-8 tw-px-3 tw-text-xs",
  lg: "tw-h-11 tw-px-8 tw-text-base",
  icon: "tw-h-9 tw-w-9",
};

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "tw-inline-flex tw-items-center tw-justify-center tw-gap-2 tw-whitespace-nowrap tw-rounded-lg tw-font-medium tw-transition-colors tw-cursor-pointer tw-border-0",
      "focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-[#09090b] focus-visible:tw-ring-offset-2",
      "disabled:tw-pointer-events-none disabled:tw-opacity-50",
      buttonVariants[variant],
      buttonSizes[size],
      className
    )}
    style={{ fontFamily: "'Switzer', sans-serif" }}
    {...props}
  />
));
Button.displayName = "Button";

export { Button, buttonVariants };
