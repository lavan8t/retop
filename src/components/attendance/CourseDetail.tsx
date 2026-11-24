import { M3eButton, M3eChip } from './m3eTags';
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
      <M3eButton variant="text" onClick={onBack} className="self-start">
        <ArrowBack slot="icon" aria-hidden="true" />
        Back to courses
      </M3eButton>
    )}

    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <M3eChip variant="outlined">{course.courseCode}</M3eChip>
        <M3eChip variant="outlined">{course.classType}</M3eChip>
        {course.debarStatus !== '-' && (
          <M3eChip variant="outlined" aria-label="Debarred">
            Debarred
          </M3eChip>
        )}
      </div>
      <h2 className="text-2xl font-black font-expanded leading-tight text-(--md-sys-color-on-surface) wrap-break-word">
        {course.courseTitle}
      </h2>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--md-sys-color-on-surface-variant)">
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
      noClasses={course.total <= 0}
      onSortChange={onSortChange}
    />
  </div>
);
