import * as React from "react";
import { cn } from "../../lib/utils";
import { useIsMobile } from "../../hooks/use-mobile";

/**
 * Lightweight shadcn-inspired Sidebar primitives, adapted to plain JS.
 *
 * Design notes:
 * - The Sidebar supports `collapsible="icon"` (narrow icon-only rail),
 *   `collapsible="offcanvas"` (pushed off-screen), and `collapsible="none"`.
 * - Collapse state is persisted to localStorage (key: `noxtm-sidebar-state`).
 * - On mobile (<768px), collapse acts as an overlay via `data-mobile="true"`.
 * - The outer `<Sidebar>` sets `data-state="expanded|collapsed"` on its DOM,
 *   which is used by Sidebar.css to hide text labels in icon mode.
 * - A CSS variable `--sidebar-width` is set on `<SidebarProvider>` so that
 *   `<SidebarInset>` can reflow with zero extra side space when collapsed.
 */

const SIDEBAR_STORAGE_KEY = "noxtm-sidebar-state";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const SIDEBAR_WIDTH_EXPANDED = "260px";
const SIDEBAR_WIDTH_COLLAPSED = "56px";
const SIDEBAR_WIDTH_MOBILE = "260px";

const SidebarContext = React.createContext(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return ctx;
}

function readStoredState() {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "expanded";
  } catch (e) {
    return true;
  }
}

function writeStoredState(open) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? "expanded" : "collapsed");
  } catch (e) {
    /* ignore */
  }
}

export const SidebarProvider = React.forwardRef(function SidebarProvider(
  {
    defaultOpen = true,
    open: openProp,
    onOpenChange: setOpenProp,
    className,
    style,
    children,
    ...props
  },
  ref
) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // Internal uncontrolled state (desktop)
  const [_open, _setOpen] = React.useState(() => {
    const stored = readStoredState();
    return typeof stored === "boolean" ? stored : defaultOpen;
  });

  // On mobile, force collapsed desktop state so <768px defaults to icon-only
  // when the user first resizes to mobile. We only flip once.
  const mobileAutoCollapsed = React.useRef(false);
  React.useEffect(() => {
    if (isMobile && !mobileAutoCollapsed.current && _open) {
      mobileAutoCollapsed.current = true;
      _setOpen(false);
    }
  }, [isMobile, _open]);

  const open = openProp !== undefined ? openProp : _open;
  const setOpen = React.useCallback(
    (value) => {
      const next = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(next);
      } else {
        _setOpen(next);
      }
      writeStoredState(next);
    },
    [open, setOpenProp]
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((v) => !v);
    } else {
      setOpen((v) => !v);
    }
  }, [isMobile, setOpen]);

  // Keyboard shortcut: Cmd/Ctrl + B
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        // Avoid hijacking Cmd+B in input/textarea/contentEditable contexts
        const target = event.target;
        const tag = target && target.tagName ? target.tagName.toLowerCase() : "";
        const isEditable =
          tag === "input" ||
          tag === "textarea" ||
          (target && target.isContentEditable);
        if (isEditable) return;
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        ref={ref}
        data-sidebar-wrapper=""
        data-state={state}
        data-mobile={isMobile ? "true" : "false"}
        style={{
          "--sidebar-width": SIDEBAR_WIDTH_EXPANDED,
          "--sidebar-width-collapsed": SIDEBAR_WIDTH_COLLAPSED,
          "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
          ...style,
        }}
        className={cn(
          "tw-flex tw-min-h-[calc(100vh-56px)] tw-w-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
});

export const Sidebar = React.forwardRef(function Sidebar(
  {
    side = "left",
    variant = "sidebar",
    collapsible = "icon",
    className,
    children,
    ...props
  },
  ref
) {
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <aside
        ref={ref}
        data-sidebar="sidebar"
        data-state={state}
        data-collapsible={collapsible}
        data-side={side}
        className={cn("dashboard-sidebar", className)}
        {...props}
      >
        {children}
      </aside>
    );
  }

  if (isMobile) {
    return (
      <>
        {/* Mobile overlay backdrop */}
        {openMobile && (
          <div
            role="button"
            aria-label="Close sidebar"
            onClick={() => setOpenMobile(false)}
            className="tw-fixed tw-inset-0 tw-z-[20] tw-bg-black/40"
            style={{ top: 56 }}
          />
        )}
        <aside
          ref={ref}
          data-sidebar="sidebar"
          data-state={openMobile ? "expanded" : "collapsed"}
          data-collapsible={collapsible}
          data-mobile="true"
          data-side={side}
          className={cn("dashboard-sidebar", className)}
          style={{
            width: "var(--sidebar-width-mobile)",
            transform: openMobile ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s ease",
          }}
          {...props}
        >
          {children}
        </aside>
      </>
    );
  }

  return (
    <aside
      ref={ref}
      data-sidebar="sidebar"
      data-state={state}
      data-collapsible={collapsible}
      data-side={side}
      data-variant={variant}
      className={cn("dashboard-sidebar", className)}
      {...props}
    >
      {children}
    </aside>
  );
});

export const SidebarInset = React.forwardRef(function SidebarInset(
  { className, children, ...props },
  ref
) {
  return (
    <main
      ref={ref}
      data-sidebar="inset"
      className={cn("dashboard-main", className)}
      {...props}
    >
      {children}
    </main>
  );
});

export const SidebarHeader = React.forwardRef(function SidebarHeader(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("noxtm-sidebar-header", className)}
      {...props}
    >
      {children}
    </div>
  );
});


export const SidebarContent = React.forwardRef(function SidebarContent(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn("sidebar-content-area", className)}
      {...props}
    >
      {children}
    </div>
  );
});

export const SidebarFooter = React.forwardRef(function SidebarFooter(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn("sidebar-footer", className)}
      {...props}
    >
      {children}
    </div>
  );
});

export const SidebarGroup = React.forwardRef(function SidebarGroup(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("sidebar-section", className)}
      {...props}
    >
      {children}
    </div>
  );
});

export const SidebarGroupLabel = React.forwardRef(function SidebarGroupLabel(
  { className, children, ...props },
  ref
) {
  return (
    <h4
      ref={ref}
      data-sidebar="group-label"
      className={cn("Dash-noxtm-sidebar-section-title", className)}
      {...props}
    >
      {children}
    </h4>
  );
});

export const SidebarGroupContent = React.forwardRef(function SidebarGroupContent(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      data-sidebar="group-content"
      className={cn("sidebar-group-content", className)}
      {...props}
    >
      {children}
    </div>
  );
});

export const SidebarMenu = React.forwardRef(function SidebarMenu(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      data-sidebar="menu"
      className={cn("sidebar-menu", className)}
      {...props}
    >
      {children}
    </div>
  );
});

export const SidebarMenuItem = React.forwardRef(function SidebarMenuItem(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      data-sidebar="menu-item"
      className={cn("sidebar-item-container", className)}
      {...props}
    >
      {children}
    </div>
  );
});

export const SidebarMenuButton = React.forwardRef(function SidebarMenuButton(
  {
    isActive = false,
    tooltip,
    className,
    children,
    onClick,
    asChild,
    ...props
  },
  ref
) {
  // Plain div acting as button to keep parity with the legacy markup & styling.
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      data-sidebar="menu-button"
      data-active={isActive ? "true" : "false"}
      title={typeof tooltip === "string" ? tooltip : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (onClick) onClick(e);
        }
      }}
      className={cn(
        "Dash-noxtm-sidebar-item",
        isActive && "active",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * SidebarTrigger — the collapse/expand button. Renders a panel/chevron icon.
 * Use inside SidebarHeader on the right side.
 */
export const SidebarTrigger = React.forwardRef(function SidebarTrigger(
  { className, onClick, children, ...props },
  ref
) {
  const { toggleSidebar, state } = useSidebar();
  return (
    <button
      ref={ref}
      type="button"
      aria-label={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
      title={state === "expanded" ? "Collapse sidebar (Ctrl/Cmd+B)" : "Expand sidebar (Ctrl/Cmd+B)"}
      data-sidebar="trigger"
      data-state={state}
      onClick={(e) => {
        if (onClick) onClick(e);
        toggleSidebar();
      }}
      className={cn("sidebar-trigger-btn", className)}
      {...props}
    >
      {children || (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Panel-left-close icon; rotates when collapsed via CSS */}
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <path
            d="M16 15l-3-3 3-3"
            className="sidebar-trigger-chevron"
          />
        </svg>
      )}
    </button>
  );
});
