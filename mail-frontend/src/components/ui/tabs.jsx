import * as React from "react"
import { cn } from "../../lib/utils"

const Tabs = React.forwardRef(({ className, value, onValueChange, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("w-full", className)} {...props}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child, { _value: value, _onValueChange: onValueChange })
      })}
    </div>
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef(({ className, children, _value, _onValueChange, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-start gap-1 rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child, { _value, _onValueChange })
      })}
    </div>
  )
})
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value, _value, _onValueChange, children, ...props }, ref) => {
  const isActive = _value === value
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => _onValueChange?.(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "hover:bg-background/50 hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, value, _value, children, ...props }, ref) => {
  if (_value !== value) return null
  return (
    <div
      ref={ref}
      role="tabpanel"
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
