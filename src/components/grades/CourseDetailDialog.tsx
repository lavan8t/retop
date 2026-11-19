import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Close } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { getAppRoot } from '../../utils/bridge';

/**
 * Compact-screen course detail sheet: scrim, Escape-to-close and focus return
 * are owned here, matching the dialog behaviour of the ported Android UI.
 */
export const CourseDetailDialog = ({
  header,
  onClose,
  children,
}: {
  header: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        const items = Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ) || [],
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-100000 flex items-center justify-center p-4"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-black/60"
      />
      <div
        ref={panelRef}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-(--bg-surface) text-(--text-main) shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
          <div id={titleId} className="flex min-w-0 flex-col gap-1">
            {header}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close course details"
            onClick={onClose}
            className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full text-(--text-muted) outline-none cursor-pointer transition-colors hover:bg-(--bg-highlight) hover:text-(--text-main) focus-visible:ring-2 focus-visible:ring-(--accent-base)"
          >
            <Close aria-hidden="true" />
          </button>
        </div>
        <div className="custom-scrollbar min-h-0 overflow-y-auto px-5 pb-5 pt-2">
          {children}
        </div>
      </div>
    </div>,
    getAppRoot() || document.body,
  );
};
