import {
  ArrowBack,
  Event,
  Person,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import type {
  AttendanceRecord,
  DetailedAttendanceCourse,
} from '../../types/vtop';
import { ClassHistory } from './ClassHistory';
import { WhatIfCalculator } from './WhatIfCalculator';

const chipClass =
  'inline-flex items-center rounded-full border border-(--border-dim) px-2.5 py-1 text-xs font-bold text-(--text-main)';

export const CourseDetail = ({
  course,
  records,
  recordsLoading,
  sortOrder,
  onSortChange,
  isNinePointer,
  compact,
  onBack,
}: {
  course: DetailedAttendanceCourse;
  records: AttendanceRecord[] | null;
  recordsLoading: boolean;
  sortOrder: 'asc' | 'desc';
  onSortChange: (order: 'asc' | 'desc') => void;
  isNinePointer: boolean;
  compact: boolean;
  onBack: () => void;
}) => (
  <div className="flex flex-col gap-5">
    {compact && (
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-12 items-center gap-1 self-start rounded-full px-3 text-sm font-bold text-(--accent-base) outline-none cursor-pointer transition-colors hover:bg-(--bg-highlight) focus-visible:ring-2 focus-visible:ring-(--accent-base)"
      >
        <ArrowBack aria-hidden="true" />
        Back to courses
      </button>
    )}

    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={chipClass}>{course.courseCode}</span>
        <span className={chipClass}>{course.classType}</span>
        {course.debarStatus !== '-' && (
          <span className={chipClass} aria-label="Debarred">
            Debarred
          </span>
        )}
      </div>
      <h2 className="text-2xl font-black font-expanded leading-tight text-(--text-main) wrap-break-word">
        {course.courseTitle}
      </h2>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--text-muted)">
        <span className="inline-flex items-center gap-1.5">
          <Person aria-hidden="true" />
          {course.faculty}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Event aria-hidden="true" />
          {course.classDetail}
        </span>
      </div>
    </header>

    <WhatIfCalculator course={course} isNinePointer={isNinePointer} />

    <ClassHistory
      records={records}
      sortOrder={sortOrder}
      loading={recordsLoading}
      onSortChange={onSortChange}
    />
  </div>
);
