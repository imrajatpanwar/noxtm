import * as React from "react";
import { cn } from "../../lib/utils";

const InputGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "tw-flex tw-w-full tw-items-stretch tw-overflow-hidden tw-rounded-lg tw-border tw-border-[#e4e4e7] tw-bg-white",
      "focus-within:tw-ring-2 focus-within:tw-ring-[rgba(0,0,0,0.05)] focus-within:tw-border-[#a1a1aa]",
      className
    )}
    {...props}
  />
));
InputGroup.displayName = "InputGroup";

const InputGroupAddon = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "tw-inline-flex tw-items-center tw-border-l tw-border-[#e4e4e7] tw-bg-[#fafafa] tw-px-3 tw-text-sm tw-text-[#71717a]",
      className
    )}
    style={{ fontFamily: "'Switzer', sans-serif" }}
    {...props}
  />
));
InputGroupAddon.displayName = "InputGroupAddon";

const InputGroupText = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("tw-whitespace-nowrap tw-font-medium", className)}
    style={{ fontFamily: "'Switzer', sans-serif" }}
    {...props}
  />
));
InputGroupText.displayName = "InputGroupText";

export { InputGroup, InputGroupAddon, InputGroupText };
