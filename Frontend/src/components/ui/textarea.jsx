import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "tw-flex tw-min-h-20 tw-w-full tw-rounded-lg tw-border tw-border-[#e4e4e7] tw-bg-white tw-px-3 tw-py-2 tw-text-sm",
      "tw-transition-colors placeholder:tw-text-[#a1a1aa]",
      "focus:tw-outline-none focus:tw-border-[#a1a1aa] focus:tw-ring-2 focus:tw-ring-[rgba(0,0,0,0.05)]",
      "disabled:tw-cursor-not-allowed disabled:tw-opacity-50",
      className
    )}
    style={{ fontFamily: "'Switzer', sans-serif", boxSizing: "border-box" }}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
