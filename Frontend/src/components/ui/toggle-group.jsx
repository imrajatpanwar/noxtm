import * as React from "react";
import { cn } from "../../lib/utils";

const ToggleGroupContext = React.createContext({ value: null, onValueChange: () => {}, type: "single" });

const ToggleGroup = React.forwardRef(({ className, type = "single", value, onValueChange, children, ...props }, ref) => (
  <ToggleGroupContext.Provider value={{ value, onValueChange, type }}>
    <div
      ref={ref}
      role="group"
      className={cn("tw-flex tw-items-center tw-gap-1", className)}
      {...props}
    >
      {children}
    </div>
  </ToggleGroupContext.Provider>
));
ToggleGroup.displayName = "ToggleGroup";

const ToggleGroupItem = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);

  const isActive = context.type === "multiple"
    ? Array.isArray(context.value) && context.value.includes(value)
    : context.value === value;

  const handleClick = () => {
    if (context.type === "multiple") {
      const current = Array.isArray(context.value) ? context.value : [];
      context.onValueChange(
        isActive ? current.filter(v => v !== value) : [...current, value]
      );
    } else {
      context.onValueChange(isActive ? null : value);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isActive}
      onClick={handleClick}
      className={cn(
        "tw-inline-flex tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-md tw-px-2.5 tw-py-1.5 tw-text-sm tw-font-medium tw-transition-all tw-border-0 tw-cursor-pointer",
        "tw-text-[#71717a] tw-bg-transparent hover:tw-bg-[#f4f4f5] hover:tw-text-[#09090b]",
        isActive && "tw-bg-[#09090b] tw-text-white hover:tw-bg-[#27272a] hover:tw-text-white",
        className
      )}
      style={{ fontFamily: "'Switzer', sans-serif" }}
      {...props}
    >
      {children}
    </button>
  );
});
ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
