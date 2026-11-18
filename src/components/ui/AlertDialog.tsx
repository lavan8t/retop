import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { getAppRoot } from '../../utils/bridge';

export interface AlertDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Destructive actions use the M3 error tonal role. */
  variant?: 'default' | 'error';
}

type DialogState = AlertDialogOptions & {
  resolve: (value: boolean) => void;
};

type InternalDialogState = DialogState | null;

let globalSetDialog: ((state: InternalDialogState) => void) | null = null;
let globalPendingResolve: ((value: boolean) => void) | null = null;

/**
 * Programmatically display a Material 3 alert / confirm dialog box.
 */
export function showAlertDialog(
  options: string | AlertDialogOptions,
): Promise<boolean> {
  const opts: AlertDialogOptions =
    typeof options === 'string' ? { message: options } : options;

  return new Promise<boolean>((resolve) => {
    if (globalSetDialog) {
      globalSetDialog({
        title: opts.title || 'Alert',
        message: opts.message,
        confirmText: opts.confirmText || 'OK',
        cancelText: opts.cancelText,
        variant: opts.variant || 'default',
        resolve,
      });
    } else {
      globalPendingResolve = resolve;
      window.dispatchEvent(
        new CustomEvent('retop-show-alert-dialog', {
          detail: { ...opts, resolve },
        }),
      );
    }
  });
}

/**
 * Global Alert Dialog Manager Component.
 */
export const AlertDialogManager: React.FC = () => {
  const [dialog, setDialog] = useState<InternalDialogState>(null);
  const [isClosing, setIsClosing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    globalSetDialog = (st) => {
      setIsClosing(false);
      setDialog(st);
    };

    const handleEvent = (e: any) => {
      if (e.detail) {
        setIsClosing(false);
        setDialog({
          title: e.detail.title || 'Alert',
          message: e.detail.message,
          confirmText: e.detail.confirmText || 'OK',
          cancelText: e.detail.cancelText,
          variant: e.detail.variant || 'default',
          resolve: e.detail.resolve || globalPendingResolve || (() => {}),
        });
      }
    };

    window.addEventListener('retop-show-alert-dialog', handleEvent);

    return () => {
      globalSetDialog = null;
      window.removeEventListener('retop-show-alert-dialog', handleEvent);
    };
  }, []);

  const handleClose = useCallback(
    (confirmed: boolean) => {
      if (!dialog || isClosing) return;
      setIsClosing(true);
      setTimeout(() => {
        dialog.resolve(confirmed);
        returnFocusRef.current?.focus();
        setDialog(null);
        setIsClosing(false);
      }, 150);
    },
    [dialog, isClosing],
  );

  useEffect(() => {
    if (!dialog) return;
    returnFocusRef.current = document.activeElement as HTMLElement;

    const focusable = () =>
      Array.from(
        cardRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled])',
        ) || [],
      );

    // Move focus into the dialog once it is mounted.
    const raf = requestAnimationFrame(() => {
      const items = focusable();
      (
        items.find((el) => el.dataset.confirm !== undefined) || items[0]
      )?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleClose(true);
      } else if (e.key === 'Tab') {
        const items = focusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialog, handleClose]);

  if (!dialog || typeof document === 'undefined') return null;

  const isDestructive = dialog.variant === 'error';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      className="fixed inset-0 z-100000 flex items-center justify-center p-4 select-none"
    >
      {/* Dark overlay without blur */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/60"
        style={{
          animation: isClosing
            ? 'retop-dialog-fade-out 150ms cubic-bezier(0.32, 0.72, 0, 1) forwards'
            : 'retop-dialog-fade-in 150ms cubic-bezier(0.32, 0.72, 0, 1) forwards',
        }}
        onClick={() => handleClose(false)}
      />

      {/* Material 3 Dialog Card */}
      <div
        ref={cardRef}
        className="relative bg-(--bg-surface) border-2 border-(--border-dim) rounded-[28px] p-6 shadow-2xl w-full max-w-95 z-10 flex flex-col text-left"
        style={{
          animation: isClosing
            ? 'retop-dialog-zoom-out 150ms cubic-bezier(0.32, 0.72, 0, 1) forwards'
            : 'retop-dialog-zoom-in 150ms cubic-bezier(0.32, 0.72, 0, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id={titleId}
          className="text-left text-lg font-black font-expanded text-(--text-main) tracking-tight mb-2 leading-snug"
        >
          {dialog.title || 'Alert'}
        </h3>

        <p
          id={messageId}
          className="text-left text-sm font-medium text-(--text-muted) leading-relaxed mb-6 whitespace-pre-wrap"
        >
          {dialog.message}
        </p>

        <div className="flex items-center justify-end gap-2 mt-auto">
          {dialog.cancelText && (
            <button
              type="button"
              aria-label={dialog.cancelText}
              onClick={() => handleClose(false)}
              className="min-h-12 rounded-full px-5 py-2.5 text-xs font-bold text-(--text-muted) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) hover:text-(--text-main) hover:bg-(--bg-highlight) transition-colors bg-transparent border-0 cursor-pointer"
            >
              {dialog.cancelText}
            </button>
          )}
          <button
            type="button"
            data-confirm
            aria-label={dialog.confirmText || 'OK'}
            onClick={() => handleClose(true)}
            className={`min-h-12 rounded-full px-6 py-2.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface) transition-all shadow-none border-0 cursor-pointer ${
              isDestructive
                ? 'bg-(--md-sys-color-error) text-(--md-sys-color-on-error) focus-visible:ring-(--md-sys-color-error) hover:opacity-90'
                : 'bg-(--accent-base) text-(--text-inverse) focus-visible:ring-(--accent-base) hover:opacity-90'
            }`}
          >
            {dialog.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>,
    getAppRoot() || document.body,
  );
};
