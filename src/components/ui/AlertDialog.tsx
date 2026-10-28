import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface AlertDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

type DialogState =
  | (AlertDialogOptions & {
      resolve: (value: boolean) => void;
    })
  | null;

let globalSetDialog: ((state: DialogState) => void) | null = null;
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
  const [dialog, setDialog] = useState<DialogState>(null);
  const [isClosing, setIsClosing] = useState(false);

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
        setDialog(null);
        setIsClosing(false);
      }, 150);
    },
    [dialog, isClosing],
  );

  useEffect(() => {
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, handleClose]);

  if (!dialog || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-100000 flex items-center justify-center p-4 select-none"
    >
      {/* Dark overlay without blur */}
      <div
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
        className="relative bg-(--bg-surface) border-2 border-(--border-dim) rounded-[28px] p-6 shadow-2xl w-full max-w-95 z-10 flex flex-col text-left"
        style={{
          animation: isClosing
            ? 'retop-dialog-zoom-out 150ms cubic-bezier(0.32, 0.72, 0, 1) forwards'
            : 'retop-dialog-zoom-in 150ms cubic-bezier(0.32, 0.72, 0, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title (Left-aligned) */}
        <h3 className="text-left text-lg font-black font-expanded text-(--text-main) tracking-tight mb-2 leading-snug">
          {dialog.title || 'Alert'}
        </h3>

        {/* Message / Subject (Left-aligned) */}
        <p className="text-left text-sm font-medium text-(--text-muted) leading-relaxed mb-6 whitespace-pre-wrap">
          {dialog.message}
        </p>

        {/* Pill Buttons Row */}
        <div className="flex items-center justify-end gap-2 mt-auto">
          {dialog.cancelText && (
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="rounded-full px-5 py-2.5 text-xs font-bold text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight) transition-colors bg-transparent border-0 cursor-pointer"
            >
              {dialog.cancelText}
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => handleClose(true)}
            className="rounded-full px-6 py-2.5 text-xs font-bold bg-(--accent-base) text-(--text-inverse) hover:opacity-90 active:scale-95 transition-all shadow-none border-0 cursor-pointer"
          >
            {dialog.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
