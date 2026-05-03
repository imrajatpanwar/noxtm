import * as React from 'react';
import { cn } from '../../lib/utils';

const SelectTrigger = React.forwardRef(function SelectTrigger(
  { className, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn('tw-relative tw-inline-flex tw-items-center', className)} {...props}>
      <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-medium tw-text-[#09090b]" style={{ fontFamily: "'Switzer', sans-serif" }}>
        {children}
      </div>
    </div>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

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
          'tw-bg-white tw-px-3 tw-text-sm tw-font-medium tw-text-[#09090b]',
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
