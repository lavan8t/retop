import { M3eListOption, M3eSelectionList } from './m3eTags';
import type React from 'react';
import type { KeyboardEvent } from 'react';
import type { DetailedAttendanceCourse } from '../../types/vtop';
import {
  attendanceTone,
  displayPercentage,
  TONE_LABEL,
  type AttendanceTone,
} from './attendanceView';

const TONE_TEXT: Record<AttendanceTone, string> = {
  na: 'text-(--text-muted)',
  critical: 'text-(--att-danger)',
  warning: 'text-(--att-warn)',
  safe: 'text-(--att-safe)',
  neutral: 'text-(--text-muted)',
};

/** Spotlight-style connected rows: 2px gaps, p-3, rounded, no per-row card. */
const listSurfaceStyle = {
  '--m3e-segmented-list-segment-gap': '2px',
  '--m3e-segmented-list-container-shape': '1rem',
  '--m3e-segmented-list-item-container-shape': '0.25rem',
  '--m3e-list-item-padding-block': '0.75rem',
  '--m3e-list-item-padding-inline': '0.75rem',
  '--m3e-list-item-font-weight': '500',
  '--m3e-list-item-supporting-text-font-weight': '500',
  '--m3e-list-item-trailing-text-font-weight': '500',
} as React.CSSProperties;

export const courseKey = (course: DetailedAttendanceCourse): string =>
  `${course.courseId}-${course.classType}`;

export const CourseList = ({
  courses,
  selectedKey,
  isNinePointer,
  onSelect,
}: {
  courses: DetailedAttendanceCourse[];
  selectedKey: string | null;
  isNinePointer: boolean;
  onSelect: (key: string) => void;
}) => {
  // M3E moves focus on Arrow/Home/End; selection follows that focus.
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const option = (document.activeElement as HTMLElement | null)?.closest?.(
      'm3e-list-option',
    ) as (HTMLElement & { dataset: DOMStringMap }) | null;
    const key = option?.dataset.courseKey;
    if (key && key !== selectedKey) onSelect(key);
  };

  const handleChange = (event: { target: EventTarget | null }) => {
    const value = (event.target as HTMLElement & { value?: string })?.value;
    if (typeof value === 'string' && value && value !== selectedKey) {
      onSelect(value);
    }
  };

  return (
    <M3eSelectionList
      hide-selection-indicator
      aria-label="Courses"
      variant="segmented"
      style={listSurfaceStyle}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className="rounded-2xl overflow-hidden pt-1 pr-1"
    >
      {courses.map((course) => {
        const key = courseKey(course);
        const tone = attendanceTone(
          course.percentage,
          isNinePointer,
          course.total,
        );
        const selected = key === selectedKey;
        return (
          <M3eListOption
            key={key}
            value={key}
            selected={selected}
            data-course-key={key}
            onClick={() => onSelect(key)}
            aria-label={`${course.courseTitle}, ${course.courseCode}, ${displayPercentage(course.percentage, course.total)} attendance, ${TONE_LABEL[tone]}`}
            aria-current={selected ? 'true' : undefined}
            className="group first:rounded-t-2xl last:rounded-b-2xl"
          >
            <span
              slot="supporting-text"
              className="flex items-center gap-1.5 text-xs text-(--text-muted)"
            >
              <span className="font-medium">{course.courseCode}</span>
              {course.debarStatus !== '-' && (
                <span className="text-(--att-danger) font-medium">
                  Debarred
                </span>
              )}
            </span>
            <span className="text-xs font-medium text-(--text-main) group-hover:text-(--accent-base) transition-colors wrap-break-words">
              {course.courseTitle}
            </span>
            <div slot="trailing" className="shrink-0 text-right pl-2">
              <span
                className={`block font-medium text-sm leading-none tabular-nums group-hover:text-(--accent-base) transition-colors ${TONE_TEXT[tone]}`}
              >
                {displayPercentage(course.percentage, course.total)}
              </span>
            </div>
          </M3eListOption>
        );
      })}
    </M3eSelectionList>
  );
};
