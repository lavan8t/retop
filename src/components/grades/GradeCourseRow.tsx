import React from 'react';
import type { GradeCourse } from '../../types/vtop';
import { M3eList, M3eListItem } from '../attendance/m3eTags';
import { gradeColorVar } from './gradeLogic';

/** Compact connected rows; colours and shape come from M3E semantic roles. */
export const GRADE_LIST_STYLE = {
  '--m3e-list-item-padding-block': '0.375rem',
  '--m3e-list-item-padding-inline': '0.75rem',
  '--m3e-list-item-between-space': '0.5rem',
  '--m3e-list-item-label-text-color': 'var(--md-sys-color-on-surface)',
  '--m3e-list-item-supporting-text-color':
    'var(--md-sys-color-on-surface-variant)',
  '--m3e-list-item-trailing-color': 'var(--md-sys-color-on-surface-variant)',
} as React.CSSProperties;

interface GradeCourseRowProps {
  course: GradeCourse;
  currentGrade: string;
  isPredicted: boolean;
  expanded: boolean;
  onToggle: () => void;
  buttonId: string;
  panelId: string;
  children?: React.ReactNode;
}

/** Expandable grade row: an M3E list item wrapping a native toggle button. */
export const GradeCourseRow: React.FC<GradeCourseRowProps> = ({
  course,
  currentGrade,
  isPredicted,
  expanded,
  onToggle,
  buttonId,
  panelId,
  children,
}) => {
  const credits = parseFloat(course.c || course.credits || '0').toString();

  return (
    <div className="flex flex-col">
      <M3eList style={GRADE_LIST_STYLE}>
        <M3eListItem>
          <button
            id={buttonId}
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={onToggle}
            className="flex w-full items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-(--md-sys-color-primary)"
          >
            <span className="min-w-0 flex-1">
              <span className="mb-0.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-(--md-sys-color-surface-container-highest) px-1.5 py-0.5 text-[10px] text-(--md-sys-color-on-surface-variant)">
                  {course.code}
                </span>
                <span className="rounded-full bg-(--md-sys-color-surface-container-highest) px-1.5 py-0.5 text-[10px] text-(--md-sys-color-on-surface-variant)">
                  {course.type}
                </span>
                {course.notIncludedInGpa && (
                  <span className="rounded-full bg-(--md-sys-color-surface-container-highest) px-1.5 py-0.5 text-[10px] text-(--md-sys-color-on-surface-variant)">
                    Ngcr
                  </span>
                )}
                {isPredicted && (
                  <span className="rounded-full bg-(--md-sys-color-primary-container) px-1.5 py-0.5 text-[10px] text-(--md-sys-color-on-primary-container)">
                    Predicted
                  </span>
                )}
              </span>
              <span className="line-clamp-1 text-sm font-medium leading-tight text-(--md-sys-color-on-surface)">
                {course.title}
              </span>
            </span>

            <span className="shrink-0 text-xs tabular-nums text-(--md-sys-color-on-surface-variant)">
              {credits} <span className="text-[10px]">Cr</span>
            </span>
            <span
              className="shrink-0 text-xl font-bold tabular-nums leading-none"
              style={{ color: gradeColorVar(currentGrade) }}
            >
              {currentGrade}
            </span>
          </button>
        </M3eListItem>
      </M3eList>

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
