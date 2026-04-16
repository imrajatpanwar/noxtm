import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

/* ─── Internal state singleton ──────────────────────────────────────────────
   confirm() is called imperatively anywhere in the app. It pushes a request
   into the queue; the mounted <AlertDialogProvider> picks it up and renders
   the dialog, resolving the promise when the user clicks.
──────────────────────────────────────────────────────────────────────────── */

let _setDialog = null;

/**
 * Imperative confirm dialog.
 * Usage:  if (!await confirm('Delete this?')) return;
 *         if (!await confirm('Send now?', { title: 'Confirm Send', confirmText: 'Send', variant: 'default' })) return;
 */
export function confirm(message, options = {}) {
  return new Promise((resolve) => {
    if (!_setDialog) {
      // Fallback if provider not mounted
      resolve(window.confirm(message));
      return;
    }
    _setDialog({ message, options, resolve });
  });
}

/* ─── Provider (mount once in App) ──────────────────────────────────────── */

export function AlertDialogProvider() {
  const [dialog, setDialog] = React.useState(null);

  React.useEffect(() => {
    _setDialog = setDialog;
    return () => { _setDialog = null; };
  }, []);

  const handleResolve = (value) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  if (!dialog) return null;

  const { message, options } = dialog;
  const title = options.title || 'Are you sure?';
  const confirmText = options.confirmText || 'Confirm';
  const cancelText = options.cancelText || 'Cancel';
  const variant = options.variant || 'destructive'; // 'destructive' | 'default'

  return createPortal(
    <div className="nxt-ad-backdrop" onClick={() => handleResolve(false)}>
      <div
        className="nxt-ad-content"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`nxt-ad-icon-wrap ${variant === 'destructive' ? 'nxt-ad-icon--danger' : 'nxt-ad-icon--info'}`}>
          {variant === 'destructive' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="nxt-ad-body">
          <h3 className="nxt-ad-title">{title}</h3>
          <p className="nxt-ad-message">{message}</p>
        </div>

        {/* Actions */}
        <div className="nxt-ad-footer">
          <button className="nxt-ad-btn nxt-ad-btn--cancel" onClick={() => handleResolve(false)}>
            {cancelText}
          </button>
          <button
            className={`nxt-ad-btn ${variant === 'destructive' ? 'nxt-ad-btn--danger' : 'nxt-ad-btn--confirm'}`}
            onClick={() => handleResolve(true)}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── CSS injected once ──────────────────────────────────────────────────── */

const STYLES = `
.nxt-ad-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: nxtAdFadeIn 0.15s ease;
}

@keyframes nxtAdFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.nxt-ad-content {
  background: #ffffff;
  border-radius: 16px;
  padding: 28px 28px 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: nxtAdSlideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  margin: 16px;
}

@keyframes nxtAdSlideUp {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.nxt-ad-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nxt-ad-icon--danger {
  background: #fef2f2;
  color: #ef4444;
}

.nxt-ad-icon--info {
  background: #eff6ff;
  color: #3b82f6;
}

.nxt-ad-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nxt-ad-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  font-family: 'Switzer', sans-serif;
  line-height: 1.3;
}

.nxt-ad-message {
  margin: 0;
  font-size: 13.5px;
  color: #6b7280;
  font-family: 'Switzer', sans-serif;
  line-height: 1.5;
}

.nxt-ad-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.nxt-ad-btn {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  font-family: 'Switzer', sans-serif;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
  outline: none;
}

.nxt-ad-btn--cancel {
  background: #f3f4f6;
  color: #374151;
}

.nxt-ad-btn--cancel:hover {
  background: #e5e7eb;
}

.nxt-ad-btn--danger {
  background: #ef4444;
  color: #fff;
}

.nxt-ad-btn--danger:hover {
  background: #dc2626;
}

.nxt-ad-btn--confirm {
  background: #111827;
  color: #fff;
}

.nxt-ad-btn--confirm:hover {
  background: #000;
}
`;

if (typeof document !== 'undefined') {
  const id = 'nxt-alert-dialog-styles';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = STYLES;
    document.head.appendChild(style);
  }
}
