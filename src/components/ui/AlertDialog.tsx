import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getAppRoot } from '../../utils/bridge';
import { M3eButton, M3eDialog, M3eDialogAction } from '../attendance/m3eTags';

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
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const rememberFocus = () => {
      returnFocusRef.current = document.activeElement as HTMLElement;
    };

    globalSetDialog = (st) => {
      rememberFocus();
      setDialog(st);
    };

    const handleEvent = (e: any) => {
      if (e.detail) {
        rememberFocus();
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

  const handleClosed = useCallback(
    (e: any) => {
      if (!dialog) return;
      const confirmed = (e.target as any)?.returnValue === 'confirm';
      dialog.resolve(confirmed);
      returnFocusRef.current?.focus();
      setDialog(null);
    },
    [dialog],
  );

  if (!dialog || typeof document === 'undefined') return null;

  // The dialog only renders from inside retop, so the app root must exist.
  // Never fall back to document.body: it is outside #retop-host and renders
  // unstyled on native VTOP pages (agents.md rule 13).
  const portalRoot = getAppRoot();
  if (!portalRoot) return null;
  const isDestructive = dialog.variant === 'error';

  return createPortal(
    <M3eDialog
      open
      alert={!dialog.cancelText}
      dismissible={!dialog.cancelText}
      onClosed={handleClosed}
      style={
        {
          zIndex: 100000,
          '--m3e-dialog-container-color':
            'var(--md-sys-color-surface-container-high)',
          '--m3e-dialog-shape': '28px',
          '--m3e-dialog-max-width': '384px',
          '--m3e-dialog-header-color': 'var(--md-sys-color-on-surface)',
          '--m3e-dialog-content-color': 'var(--md-sys-color-on-surface-variant)',
        } as React.CSSProperties
      }
    >
      <span
        slot="header"
        className="text-left text-lg font-black font-expanded text-(--text-main) tracking-tight"
      >
        {dialog.title || 'Alert'}
      </span>
      <span className="text-left text-sm font-medium text-(--text-muted) leading-relaxed whitespace-pre-wrap">
        {dialog.message}
      </span>
      <div slot="actions" className="flex items-center justify-end gap-2">
        {dialog.cancelText && (
          <M3eButton variant="text">
            <M3eDialogAction returnValue="cancel">
              {dialog.cancelText}
            </M3eDialogAction>
          </M3eButton>
        )}
        <M3eButton
          variant="filled"
          style={
            {
              '--m3e-button-container-height': '48px',
              '--m3e-button-container-color': isDestructive
                ? 'var(--md-sys-color-error)'
                : 'var(--md-sys-color-primary)',
              '--m3e-button-label-text-color': isDestructive
                ? 'var(--md-sys-color-on-error)'
                : 'var(--md-sys-color-on-primary)',
            } as React.CSSProperties
          }
        >
          <M3eDialogAction returnValue="confirm">
            {dialog.confirmText || 'OK'}
          </M3eDialogAction>
        </M3eButton>
      </div>
    </M3eDialog>,
    // Stay inside the shadow root: retop's Tailwind and token styles only apply
    // under #retop-host.
    portalRoot,
  );
};
