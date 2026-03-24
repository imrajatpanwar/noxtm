import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "tw-inline-flex tw-h-10 tw-items-center tw-justify-center tw-rounded-md tw-bg-[#f4f4f5] tw-p-1 tw-text-[#71717a]",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "tw-inline-flex tw-items-center tw-justify-center tw-whitespace-nowrap tw-rounded-sm tw-px-3 tw-py-1.5 tw-text-sm tw-font-medium tw-ring-offset-white tw-transition-all",
      "data-[state=active]:tw-bg-white data-[state=active]:tw-text-[#09090b] data-[state=active]:tw-shadow-sm",
      "focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-[#09090b] focus-visible:tw-ring-offset-2",
      "disabled:tw-pointer-events-none disabled:tw-opacity-50",
      className
    )}
    style={{ fontFamily: "'Switzer', sans-serif" }}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "tw-mt-2 tw-ring-offset-white focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-[#09090b] focus-visible:tw-ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
