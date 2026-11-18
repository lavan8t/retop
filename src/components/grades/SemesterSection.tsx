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

/** Three-column semester header: CGPA · #n, term · GPA. */
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
        className="group flex min-h-12 flex-1 items-center gap-4 rounded-2xl bg-(--bg-surface) px-4 text-left outline-none transition-colors hover:bg-(--bg-highlight) focus-visible:ring-2 focus-visible:ring-(--accent-base)"
      >
        <span className="flex w-20 shrink-0 flex-col">
          <span className="text-2xl font-black font-expanded tabular-nums leading-none text-(--text-main)">
            {cgpa ?? '—'}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-(--text-muted)">
            CGPA
          </span>
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-(--text-main)">
          #{number}, {term}
        </span>
        <span className="flex w-16 shrink-0 flex-col items-end">
          <span className="text-lg font-black tabular-nums leading-none text-(--color-success)">
            {gpa ?? '—'}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-(--text-muted)">
            GPA
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`inline-flex w-5 shrink-0 justify-center text-(--text-muted) transition-all group-hover:text-(--accent-base) ${
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
          className="shrink-0 rounded-xl px-2 py-1 text-[10px] font-bold text-(--accent-base) outline-none hover:bg-(--bg-highlight) focus-visible:ring-2 focus-visible:ring-(--accent-base)"
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
