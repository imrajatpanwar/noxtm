import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "../../lib/utils";

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "tw-relative tw-h-2 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-black/10",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="tw-h-full tw-w-full tw-flex-1 tw-bg-black tw-transition-all tw-duration-300"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
