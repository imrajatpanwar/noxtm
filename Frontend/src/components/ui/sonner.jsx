import { Toaster as Sonner } from "sonner"

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      className="toaster group"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:tw-bg-white group-[.toaster]:tw-text-neutral-950 group-[.toaster]:tw-border-neutral-200 group-[.toaster]:tw-shadow-lg",
          description: "group-[.toast]:tw-text-neutral-500",
          actionButton:
            "group-[.toast]:tw-bg-neutral-900 group-[.toast]:tw-text-neutral-50",
          cancelButton:
            "group-[.toast]:tw-bg-neutral-100 group-[.toast]:tw-text-neutral-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
