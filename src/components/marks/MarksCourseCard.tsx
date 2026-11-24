import type { CSSProperties } from 'react';
import {
  M3eBadge,
  M3eCard,
  M3eChip,
  M3eListOption,
  M3eSelectionList,
} from '../attendance/m3eTags';
import type { AssessmentMark, CourseMarks } from '../../types/vtop';
import { calculateCourseMarksSummary } from '../../utils/marksSummary';

const tagChipStyle = {
  '--m3e-chip-container-height': '20px',
  '--m3e-chip-container-shape': '6px',
  '--m3e-chip-label-text-font-size': '10px',
  '--m3e-chip-label-text-font-weight': '500',
} as CSSProperties;

const absentChipStyle = {
  '--m3e-chip-container-height': '20px',
  '--m3e-chip-container-shape': '6px',
  '--m3e-chip-label-text-font-size': '10px',
  '--m3e-chip-label-text-font-weight': '500',
  '--m3e-elevated-chip-container-color': 'var(--md-sys-color-error)',
  '--m3e-elevated-chip-label-text-color': 'var(--md-sys-color-on-error)',
} as CSSProperties;

const badgeStyle = {
  '--m3e-badge-container-color': 'var(--md-sys-color-primary-container)',
  '--m3e-badge-color': 'var(--md-sys-color-on-primary-container)',
  '--m3e-badge-large-font-weight': '800',
} as CSSProperties;

/** Connected segmented rows: 2px gaps, small inner corners like Android. */
const assessmentListStyle = {
  '--m3e-segmented-list-segment-gap': '2px',
  '--m3e-segmented-list-container-shape': '14px',
  '--m3e-segmented-list-item-container-shape': '4px',
  '--m3e-list-item-padding-block': '0.625rem',
  '--m3e-list-item-padding-inline': '0.875rem',
  '--m3e-list-item-font-weight': '500',
  '--m3e-list-item-font-size': '0.8125rem',
  '--m3e-list-item-supporting-text-font-weight': '500',
  '--m3e-list-item-trailing-text-font-weight': '500',
} as CSSProperties;

const cardStyle = {
  '--m3e-card-padding': '0px',
  '--m3e-card-shape': '18px',
} as CSSProperties;

const AssessmentRow = ({
  assessment,
  isModernView,
}: {
  assessment: AssessmentMark;
  isModernView: boolean;
}) => {
  const isAbsent = /absent/i.test(assessment.status || '');
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
}: {
  course: CourseMarks;
  isModernView: boolean;
}) => {
  const summary = calculateCourseMarksSummary(course.assessments);
  const badgeText =
    summary.weightMax > 0
      ? `${summary.weightScoredText} / ${summary.weightMaxText}`
      : `${summary.rawScoredText} / ${summary.rawMaxText}`;

  return (
    <M3eCard
      variant="filled"
      style={cardStyle}
      className="h-full w-full text-left"
    >
      <div
        slot="header"
        className="flex items-start justify-between gap-3 px-4 pt-3"
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-(--text-main) wrap-break-words">
            {course.title}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <M3eChip variant="elevated" style={tagChipStyle}>
              {course.code}
            </M3eChip>
            {course.type && (
              <M3eChip variant="elevated" style={tagChipStyle}>
                {course.type}
              </M3eChip>
            )}
          </div>
        </div>
        {summary.hasMarks && (
          <M3eBadge
            size="large"
            style={badgeStyle}
            aria-label={`Marks ${badgeText}`}
            className="shrink-0"
          >
            {badgeText}
          </M3eBadge>
        )}
      </div>

      <div slot="content" className="px-3 pb-3 pt-2.5">
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
    </M3eCard>
  );
};
