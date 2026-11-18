import React, { useId, useState } from 'react';
import { KeyboardArrowDown } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import type { CGPADetails } from '../../types/vtop';
import { gradeColorVar, gradeContainerVar, LETTER_GRADES } from './gradeLogic';

interface GradeBreakdownProps {
  cgpa: CGPADetails | null;
}

/** Accordion: S→N counts as letter chips over tonal containers. */
export const GradeBreakdown: React.FC<GradeBreakdownProps> = ({ cgpa }) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-3xl bg-(--bg-surface) overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="group flex min-h-12 w-full items-center justify-between px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) hover:bg-(--bg-highlight) transition-colors"
      >
        <span className="text-sm font-bold text-(--text-main)">
          Grade Breakdown
        </span>
        <span
          aria-hidden="true"
          className={`inline-flex w-6 h-6 items-center justify-center text-(--text-muted) group-hover:text-(--accent-base) transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <KeyboardArrowDown className="w-5 h-5" />
        </span>
      </button>

      <div id={panelId} hidden={!open} className="px-4 pb-4">
        <div className="grid grid-cols-4 gap-2">
          {LETTER_GRADES.map((letter) => {
            const count = (cgpa as unknown as Record<string, string> | null)?.[
              letter.toLowerCase()
            ];
            const isZero = !count || count === '0';
            return (
              <div
                key={letter}
                className="flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2"
                style={{ backgroundColor: gradeContainerVar(letter) }}
              >
                <span
                  className="text-base font-black font-expanded leading-none"
                  style={{ color: gradeColorVar(letter) }}
                >
                  {letter}
                </span>
                <span
                  className={`text-xs font-bold tabular-nums ${isZero ? 'text-(--text-dim)' : 'text-(--text-main)'}`}
                >
                  {count && count !== '0' ? count : '0'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
