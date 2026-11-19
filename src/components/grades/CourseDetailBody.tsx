import React from 'react';
import type { GradeCourse } from '../../types/vtop';
import { WhatIfGradeCalculator } from '../course-page/WhatIfGradeCalculator';
import { VTOPNetwork } from '../../utils/network';
import {
  distributionPosition,
  gradeColorVar,
  gradeContainerVar,
  gradePoints,
  normalizeGrade,
} from './gradeLogic';

const BANDS = ['S', 'A', 'B', 'C', 'D', 'E', 'F'] as const;

interface SpectrumProps {
  grade: string;
  mean?: string;
}

/** Native, labelled spectrum: band colours plus text "You"/"Mean" pins. */
const GradeSpectrum: React.FC<SpectrumProps> = ({ grade, mean }) => {
  const points = gradePoints(grade);
  const youPos = points === null ? null : distributionPosition(points);
  const meanVal = parseFloat(mean || '');
  const meanPos = Number.isFinite(meanVal)
    ? distributionPosition(meanVal)
    : null;

  const description =
    `Grade distribution from S to F. ` +
    (youPos === null
      ? 'Your grade is not available.'
      : `Your grade ${normalizeGrade(grade)}.`) +
    ` ${meanPos === null ? '' : `Class mean ${mean}.`}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
          Grade Distribution
        </span>
        <span className="text-[10px] font-bold text-(--text-muted)">
          Mean {mean && mean !== '-' ? mean : '—'}
        </span>
      </div>

      <div className="relative h-3 w-full mt-5">
        <div
          role="img"
          aria-label={description}
          className="flex h-full w-full overflow-hidden rounded-full"
        >
          {BANDS.map((band) => (
            <span
              key={band}
              aria-hidden="true"
              className="flex-1 border-r border-(--bg-surface)"
              style={{ backgroundColor: gradeContainerVar(band) }}
            />
          ))}
        </div>

        {youPos !== null && (
          <span
            className="absolute -top-5 -translate-x-1/2 text-[10px] font-black whitespace-nowrap tabular-nums"
            style={{ left: `${youPos * 100}%`, color: gradeColorVar(grade) }}
          >
            You
          </span>
        )}
        {meanPos !== null && (
          <span
            className="absolute -top-5 -translate-x-1/2 text-[10px] font-bold text-(--text-main) whitespace-nowrap tabular-nums"
            style={{ left: `${meanPos * 100}%` }}
          >
            Mean
          </span>
        )}
      </div>

      <div className="flex justify-between text-[9px] font-bold text-(--text-muted)">
        {BANDS.map((band) => (
          <span key={band}>{band}</span>
        ))}
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-[9px] font-bold uppercase tracking-wide text-(--text-muted) text-center">
      {label}
    </span>
    <span className="text-sm font-black tabular-nums text-(--text-main)">
      {value && value !== '-' ? value : '—'}
    </span>
  </div>
);

interface CourseDetailBodyProps {
  course: GradeCourse;
  currentGrade: string;
  isPredicted: boolean;
  network: VTOPNetwork;
  selectedSem: string;
  isLatestSem: boolean;
  onGradePredicted: (grade: string | null) => void;
  /** Inline pane owns the calculator; the dialog view omits it. */
  showCalculator?: boolean;
}

/** Shared detail content used by the inline pane and the M3E dialog. */
export const CourseDetailBody: React.FC<CourseDetailBodyProps> = ({
  course,
  currentGrade,
  isPredicted,
  network,
  selectedSem,
  isLatestSem,
  onGradePredicted,
  showCalculator = false,
}) => {
  const stats = [
    { label: 'Class Strength', value: course.classStrength },
    { label: 'Grade Strength', value: course.gradingStrength },
    { label: 'Mean', value: course.mean },
    { label: 'SD', value: course.sd },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Grade hero banner — surfaceContainerHighest */}
      <div
        className="flex items-center justify-between gap-4 rounded-3xl px-5 py-4"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-highest)',
        }}
      >
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">
            Your Grade
            {isPredicted ? ' · Predicted' : ''}
          </span>
          <span
            className="text-5xl font-black font-expanded tabular-nums leading-none"
            style={{ color: gradeColorVar(currentGrade) }}
          >
            {currentGrade}
          </span>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {(['l', 'p', 'j', 'c'] as const).map((key) => (
            <span
              key={key}
              className="rounded-lg bg-(--bg-highlight) px-2 py-1 text-[10px] font-bold text-(--text-muted) tabular-nums"
            >
              {key.toUpperCase()} {course[key] || '0'}
            </span>
          ))}
        </div>
      </div>

      <GradeSpectrum grade={currentGrade} mean={course.mean} />

      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>

      {course.gradesRange && (
        <div className="rounded-2xl bg-(--bg-surface) p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
            Grade Cut-offs
          </span>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {Object.entries(course.gradesRange).map(([letter, range]) => (
              <div key={letter} className="flex flex-col gap-0.5">
                <span
                  className="text-xs font-black"
                  style={{ color: gradeColorVar(letter) }}
                >
                  {letter}
                </span>
                <span className="text-[10px] font-bold text-(--text-muted) tabular-nums">
                  {range.replace('#', '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {course.assessments && course.assessments.length > 0 && (
        <div className="rounded-2xl bg-(--bg-surface) overflow-hidden">
          {course.assessments.map((asm, idx) => {
            const isTotal = asm.title.toLowerCase().includes('total');
            const isAbsent = !isTotal && asm.status !== 'Present';
            return (
              <div
                key={idx}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 text-xs border-b border-(--border-dim)/50 last:border-b-0 ${
                  isTotal
                    ? 'bg-(--bg-primary-container) text-(--text-on-primary-container) font-black'
                    : 'text-(--text-main)'
                }`}
              >
                <span className="min-w-0 truncate font-bold">{asm.title}</span>
                {isAbsent ? (
                  <span className="shrink-0 rounded-full bg-(--att-danger-container) px-2 py-0.5 text-[10px] font-bold text-(--att-danger)">
                    Absent
                  </span>
                ) : (
                  <span className="shrink-0 font-bold tabular-nums">
                    {asm.scoredMark}
                    <span className="text-(--text-muted)">/{asm.maxMark}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCalculator && (
        <WhatIfGradeCalculator
          network={network}
          courseCode={course.code}
          classId={course.courseId}
          selectedSem={selectedSem}
          isLatestSem={isLatestSem}
          onGradePredicted={onGradePredicted}
        />
      )}
    </div>
  );
};
