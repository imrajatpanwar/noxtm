import * as React from "react";
import { cn } from "../../lib/utils";

const Separator = React.forwardRef(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn(
      "tw-shrink-0 tw-bg-[#e4e4e7]",
      orientation === "horizontal" ? "tw-h-[1px] tw-w-full" : "tw-h-full tw-w-[1px]",
      className
    )}
    {...props}
  />
));
Separator.displayName = "Separator";

export { Separator };
