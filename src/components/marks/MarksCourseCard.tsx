import type { CSSProperties } from 'react';
import { KeyboardArrowDown } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import {
  M3eCard,
  M3eChip,
  M3eListOption,
  M3eSelectionList,
} from '../attendance/m3eTags';
import type { AssessmentMark, CourseMarks } from '../../types/vtop';

const tagChipStyle = {
  '--m3e-chip-container-height': '20px',
  '--m3e-chip-container-shape': '6px',
  '--m3e-chip-label-text-font-size': '10px',
  '--m3e-chip-label-text-font-weight': '500',
  '--m3e-elevated-chip-container-color': 'var(--bg-highlight)',
  '--m3e-elevated-chip-elevation': '0',
  '--m3e-elevated-chip-hover-elevation': '0',
} as CSSProperties;

const absentChipStyle = {
  '--m3e-chip-container-height': '20px',
  '--m3e-chip-container-shape': '6px',
  '--m3e-chip-label-text-font-size': '10px',
  '--m3e-chip-label-text-font-weight': '500',
  '--m3e-elevated-chip-container-color': 'var(--md-sys-color-error)',
  '--m3e-chip-label-text-color': 'var(--md-sys-color-on-error)',
  '--m3e-elevated-chip-elevation': '0',
  '--m3e-elevated-chip-hover-elevation': '0',
} as CSSProperties;

/** Connected segmented rows: 2px gaps, small inner corners like Android. */
const assessmentListStyle = {
  '--m3e-segmented-list-segment-gap': '2px',
  '--m3e-segmented-list-container-shape': '14px',
  '--m3e-segmented-list-item-container-color': 'var(--bg-highlight)',
  '--m3e-segmented-list-item-container-shape': '4px',
  '--m3e-list-item-padding-block': '0.625rem',
  '--m3e-list-item-padding-inline': '0.875rem',
  '--m3e-list-item-font-weight': '500',
  '--m3e-list-item-font-size': '0.8125rem',
  '--m3e-list-item-label-text-color': 'var(--text-main)',
  '--m3e-list-item-supporting-text-font-weight': '500',
  '--m3e-list-item-trailing-text-font-weight': '500',
} as CSSProperties;

const groupShape = (index: number, total: number): string => {
  if (total === 1) return '18px';
  if (index === 0) return '18px 18px 4px 4px';
  if (index === total - 1) return '4px 4px 18px 18px';
  return '4px';
};

const AssessmentRow = ({
  assessment,
  isModernView,
}: {
  assessment: AssessmentMark;
  isModernView: boolean;
}) => {
  const isAbsent = assessment.status !== 'Present';
  const score = assessment.scoredMark || '-';
  const max = assessment.maxMark || '-';
  const detail = isModernView
    ? `${assessment.scoredPercentage || '-'} / ${assessment.weightage || '-'}`
    : `${assessment.status || '-'} · W ${assessment.weightage || '-'} · ${assessment.scoredPercentage || '-'}`;

  return (
    <M3eListOption
      className="min-h-0"
      aria-label={`${assessment.title}, ${isAbsent ? 'absent' : `${score} out of ${max}, ${detail}`}`}
    >
      <span className="text-xs font-medium text-(--text-main) wrap-break-words">
        {assessment.title}
      </span>
      {isModernView && isAbsent ? (
        <M3eChip variant="elevated" slot="trailing" style={absentChipStyle}>
          Absent
        </M3eChip>
      ) : (
        <div slot="trailing" className="shrink-0 pl-2 text-right">
          <div className="whitespace-nowrap leading-tight">
            <span className="text-sm font-medium text-(--text-main)">
              {score}
            </span>
            <span className="text-xs text-(--text-muted)"> / {max}</span>
          </div>
          <div className="text-[10px] font-medium text-(--text-muted) whitespace-nowrap">
            {detail}
          </div>
        </div>
      )}
    </M3eListOption>
  );
};

export const MarksCourseCard = ({
  course,
  isModernView,
  expanded,
  onToggle,
  index,
  total,
}: {
  course: CourseMarks;
  isModernView: boolean;
  expanded: boolean;
  onToggle: () => void;
  index: number;
  total: number;
}) => {
  const cardStyle = {
    '--m3e-card-padding': '0px',
    '--m3e-card-shape': groupShape(index, total),
    '--m3e-filled-card-container-color': 'var(--bg-surface)',
    '--m3e-filled-card-text-color': 'var(--text-main)',
    '--m3e-filled-card-hover-state-layer-color': 'transparent',
  } as CSSProperties;

  return (
    <M3eCard variant="filled" style={cardStyle} className="w-full text-left">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex flex-col gap-1.5 px-4 py-3 text-left cursor-pointer"
      >
        <span className="text-sm font-medium text-(--text-main) wrap-break-words">
          {course.title}
        </span>
        <span className="flex items-center gap-1.5 w-full">
          <M3eChip variant="elevated" style={tagChipStyle}>
            {course.code}
          </M3eChip>
          {course.type && (
            <M3eChip variant="elevated" style={tagChipStyle}>
              {course.type}
            </M3eChip>
          )}
          <span className="flex-1" />
          <KeyboardArrowDown
            aria-hidden="true"
            className={`w-4 h-4 shrink-0 text-(--text-muted) transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {course.assessments.length === 0 ? (
            <p className="text-xs text-(--text-muted) py-3 px-1">
              No assessments recorded yet.
            </p>
          ) : (
            <M3eSelectionList
              hide-selection-indicator
              variant="segmented"
              style={assessmentListStyle}
              aria-label={`${course.title} assessments`}
              className="rounded-xl overflow-hidden"
            >
              {course.assessments.map((assessment, i) => (
                <AssessmentRow
                  key={i}
                  assessment={assessment}
                  isModernView={isModernView}
                />
              ))}
            </M3eSelectionList>
          )}
        </div>
      )}
    </M3eCard>
  );
};
