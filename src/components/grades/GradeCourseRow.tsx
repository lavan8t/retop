import React from 'react';
import type { GradeCourse } from '../../types/vtop';
import { gradeColorVar } from './gradeLogic';

interface GradeCourseRowProps {
  course: GradeCourse;
  currentGrade: string;
  isPredicted: boolean;
  isFirst: boolean;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
  buttonId: string;
  panelId: string;
  children?: React.ReactNode;
}

/** Plain grouped list row on surfaceVariant — not a bordered card. */
export const GradeCourseRow: React.FC<GradeCourseRowProps> = ({
  course,
  currentGrade,
  isPredicted,
  isFirst,
  isLast,
  expanded,
  onToggle,
  buttonId,
  panelId,
  children,
}) => {
  const credits = parseFloat(course.c || course.credits || '0').toString();

  return (
    <div className="flex flex-col">
      <button
        id={buttonId}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className={`group flex min-h-12 w-full items-center gap-3 bg-(--bg-surface) px-4 py-2.5 text-left outline-none transition-colors hover:bg-(--bg-highlight) focus-visible:ring-2 focus-visible:ring-(--accent-base) ${
          isFirst ? 'rounded-t-2xl' : ''
        } ${isLast ? 'rounded-b-2xl' : ''} ${
          expanded ? 'bg-(--bg-highlight)' : ''
        } ${course.notIncludedInGpa ? 'opacity-75 hover:opacity-100' : ''}`}
      >
        <span className="min-w-0 flex-1">
          <span className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-(--bg-highlight) px-2 py-0.5 text-[10px] font-bold uppercase text-(--text-muted)">
              {course.code}
            </span>
            <span className="rounded-full bg-(--bg-highlight) px-2 py-0.5 text-[10px] font-bold uppercase text-(--text-muted)">
              {course.type}
            </span>
            {course.notIncludedInGpa && (
              <span className="rounded-full bg-(--bg-highlight) px-2 py-0.5 text-[10px] font-bold uppercase text-(--text-muted)">
                NGCR
              </span>
            )}
            {isPredicted && (
              <span className="rounded-full bg-(--bg-primary-container) px-2 py-0.5 text-[10px] font-bold text-(--text-on-primary-container)">
                Predicted
              </span>
            )}
          </span>
          <span className="line-clamp-2 text-sm font-bold leading-tight text-(--text-main)">
            {course.title}
          </span>
        </span>

        <span className="shrink-0 text-xs font-bold tabular-nums text-(--text-muted)">
          {credits} <span className="text-[9px] uppercase">CR</span>
        </span>
        <span
          className="shrink-0 text-2xl font-black font-expanded tabular-nums leading-none"
          style={{ color: gradeColorVar(currentGrade) }}
        >
          {currentGrade}
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!expanded}
      >
        {children}
      </div>
    </div>
  );
};
