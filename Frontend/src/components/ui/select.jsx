import * as React from 'react';
import { cn } from '../../lib/utils';

// Lightweight headless-style Select built on native <select>
// Matches the visual pattern of shadcn Select without Radix dependency.

const Select = ({ value, onValueChange, children, disabled }) => {
  return (
    <SelectContext.Provider value={{ value, onValueChange, disabled }}>
      {children}
    </SelectContext.Provider>
  );
};

const SelectContext = React.createContext({});

const SelectTrigger = React.forwardRef(function SelectTrigger(
  { className, children, 'aria-label': ariaLabel, ...props },
  ref
) {
  const { value, onValueChange, disabled } = React.useContext(SelectContext);
  const [options, setOptions] = React.useState([]);
  const nativeRef = React.useRef(null);

  // Collect option values from SelectContent children via context
  return (
    <SelectTriggerContext.Provider value={{ setOptions }}>
      <div className={cn('tw-relative tw-inline-flex tw-items-center', className)} {...props}>
        {/* Render children (SelectValue) as label — purely visual */}
        <div className="tw-pointer-events-none tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-medium tw-text-[#09090b]" style={{ fontFamily: "'Switzer', sans-serif" }}>
          {children}
        </div>
        {/* The actual native select overlaid, invisible but interactive */}
        <SelectContentPortal setOptions={setOptions} value={value} onValueChange={onValueChange} disabled={disabled} ariaLabel={ariaLabel} />
      </div>
    </SelectTriggerContext.Provider>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

const SelectTriggerContext = React.createContext({});

// Portals the native select on top of the trigger
function SelectContentPortal({ value, onValueChange, disabled, ariaLabel, setOptions }) {
  return null; // handled by SelectContent
}

// We actually use a simpler approach: a styled native <select>
// Override: replace the complex headless approach with a clean native select wrapper

// ── Simplified re-export that actually works ──────────────────────────────────

function SelectRoot({ value, onValueChange, children, className, disabled, 'aria-label': ariaLabel }) {
  const options = [];
  // Collect options from SelectItem children
  React.Children.forEach(children, child => {
    if (child?.type === SelectContent) {
      React.Children.forEach(child.props.children, item => {
        if (item?.type === SelectItem) {
          options.push({ value: item.props.value, label: item.props.children });
        }
      });
    }
  });

  return (
    <div className={cn('tw-relative', className)}>
      <select
        value={value}
        onChange={e => onValueChange?.(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          'tw-appearance-none tw-h-9 tw-rounded-lg tw-border tw-border-[#e4e4e7]',
          'tw-bg-white tw-px-3 tw-pr-8 tw-text-sm tw-font-medium tw-text-[#09090b]',
          'focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-[#09090b] focus:tw-ring-offset-1',
          'disabled:tw-opacity-50 disabled:tw-cursor-not-allowed',
          'tw-cursor-pointer'
        )}
        style={{ fontFamily: "'Switzer', sans-serif" }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {/* Chevron icon */}
      <div className="tw-pointer-events-none tw-absolute tw-right-2 tw-top-1/2 tw--translate-y-1/2 tw-text-[#71717a]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

function SelectContent({ children, className }) {
  return <>{children}</>;
}

function SelectItem({ value, children, className }) {
  return null; // rendered via native <option> inside SelectRoot
}

function SelectValue({ placeholder }) {
  return <span className="tw-text-[#71717a]">{placeholder}</span>;
}

// Re-export with consistent names
export {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
};
