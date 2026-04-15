import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

const DialogContext = React.createContext({});

function Dialog({ open, onOpenChange, children }) {
  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onOpenChange?.(false); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  if (!open) return null;
  return <DialogContext.Provider value={{ onOpenChange }}>{children}</DialogContext.Provider>;
}

function DialogPortal({ children }) {
  return createPortal(children, document.body);
}

function DialogOverlay({ className, ...props }) {
  const { onOpenChange } = React.useContext(DialogContext);
  return (
    <div
      className={cn('tw-fixed tw-inset-0 tw-z-[9990] tw-bg-black/50 tw-backdrop-blur-sm', className)}
      onClick={() => onOpenChange?.(false)}
      {...props}
    />
  );
}

function DialogContent({ className, children, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        className={cn(
          'tw-fixed tw-left-1/2 tw-top-1/2 tw-z-[9991] tw-w-full tw-max-w-md tw-max-h-[85vh]',
          'tw--translate-x-1/2 tw--translate-y-1/2',
          'tw-bg-white tw-rounded-xl tw-shadow-2xl tw-flex tw-flex-col',
          'tw-overflow-hidden',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn('tw-flex tw-flex-col tw-gap-1.5 tw-px-6 tw-pt-6 tw-pb-4 tw-border-b tw-border-zinc-100', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }) {
  return (
    <h2
      className={cn('tw-text-base tw-font-semibold tw-text-zinc-900 tw-m-0', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <p
      className={cn('tw-text-sm tw-text-zinc-500 tw-m-0', className)}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }) {
  return (
    <div
      className={cn('tw-flex-1 tw-overflow-y-auto tw-px-6 tw-py-5', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn('tw-flex tw-items-center tw-justify-end tw-gap-2 tw-px-6 tw-py-4 tw-border-t tw-border-zinc-100', className)}
      {...props}
    />
  );
}

function DialogClose({ className, children, ...props }) {
  const { onOpenChange } = React.useContext(DialogContext);
  return (
    <button
      className={cn('tw-absolute tw-right-4 tw-top-4 tw-p-1 tw-rounded-md tw-text-zinc-400 hover:tw-text-zinc-900 hover:tw-bg-zinc-100 tw-transition-colors tw-border-0 tw-bg-transparent tw-cursor-pointer', className)}
      onClick={() => onOpenChange?.(false)}
      {...props}
    >
      {children ?? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
    </button>
  );
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose };
