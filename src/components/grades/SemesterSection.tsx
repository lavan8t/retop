import React from 'react';
import { KeyboardArrowDown } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

interface SemesterSectionProps {
  number: number;
  term: string;
  cgpa: string | null;
  gpa: string | null;
  expanded: boolean;
  onToggle: () => void;
  onHeaderKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
  headerId: string;
  panelId: string;
  hasPredictions?: boolean;
  onResetPredictions?: () => void;
  children: React.ReactNode;
}

/** Three-column semester header: Cgpa · #n, term · Gpa. */
export const SemesterSection: React.FC<SemesterSectionProps> = ({
  number,
  term,
  cgpa,
  gpa,
  expanded,
  onToggle,
  onHeaderKeyDown,
  buttonRef,
  headerId,
  panelId,
  hasPredictions,
  onResetPredictions,
  children,
}) => (
  <section className="flex flex-col gap-1">
    <div className="flex items-center gap-2">
      <button
        ref={buttonRef}
        id={headerId}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        onKeyDown={onHeaderKeyDown}
        className="group flex min-h-12 flex-1 items-center gap-4 rounded-2xl bg-(--md-sys-color-surface-container-low) px-4 text-left outline-none transition-colors hover:bg-(--md-sys-color-surface-container-high) focus-visible:ring-2 focus-visible:ring-(--md-sys-color-primary)"
      >
        <span className="flex w-20 shrink-0 flex-col">
          <span className="text-2xl font-bold tabular-nums leading-none text-(--md-sys-color-on-surface)">
            {cgpa ?? '—'}
          </span>
          <span className="text-[11px] text-(--md-sys-color-on-surface-variant)">
            Cgpa
          </span>
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-(--md-sys-color-on-surface)">
          #{number}, {term}
        </span>
        <span className="flex w-16 shrink-0 flex-col items-end">
          <span className="text-lg font-bold tabular-nums leading-none text-(--md-sys-color-primary)">
            {gpa ?? '—'}
          </span>
          <span className="text-[11px] text-(--md-sys-color-on-surface-variant)">
            Gpa
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`inline-flex w-5 shrink-0 justify-center text-(--md-sys-color-on-surface-variant) transition-all group-hover:text-(--md-sys-color-primary) ${
            expanded ? 'rotate-180' : ''
          }`}
        >
          <KeyboardArrowDown className="w-5 h-5" />
        </span>
      </button>

      {hasPredictions && onResetPredictions && (
        <button
          type="button"
          onClick={onResetPredictions}
          className="shrink-0 rounded-xl px-2 py-1 text-[11px] text-(--md-sys-color-primary) outline-none hover:bg-(--md-sys-color-surface-container-high) focus-visible:ring-2 focus-visible:ring-(--md-sys-color-primary)"
        >
          Reset predictions
        </button>
      )}
    </div>

    <div
      id={panelId}
      role="region"
      aria-labelledby={headerId}
      hidden={!expanded}
    >
      {children}
    </div>
  </section>
);
