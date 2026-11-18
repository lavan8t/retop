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

/** Semantic surface roles for the connected, segmented course column. */
const listSurfaceStyle = {
  '--m3e-segmented-list-item-container-color':
    'var(--md-sys-color-surface-variant, var(--bg-surface))',
  '--m3e-list-item-selected-container-color':
    'var(--md-sys-color-surface-container-highest, var(--bg-highlight))',
  '--m3e-list-item-selected-label-text-color': 'var(--text-main)',
  '--m3e-list-item-selected-supporting-text-color': 'var(--text-muted)',
  '--m3e-list-item-selected-trailing-color': 'var(--text-main)',
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
    <div
      style={listSurfaceStyle}
      className="rounded-2xl bg-(--bg-surface) p-0.5 min-h-0"
    >
      <M3eSelectionList
        hide-selection-indicator
        aria-label="Courses"
        variant="segmented"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="rounded-2xl h-full custom-scrollbar"
      >
        {courses.map((course) => {
          const key = courseKey(course);
          const tone = attendanceTone(course.percentage, isNinePointer);
          const selected = key === selectedKey;
          return (
            <M3eListOption
              key={key}
              value={key}
              selected={selected}
              data-course-key={key}
              aria-label={`${course.courseTitle}, ${course.courseCode}, ${displayPercentage(course.percentage, course.total)} attendance, ${TONE_LABEL[tone]}`}
              aria-current={selected ? 'true' : undefined}
            >
              <span
                slot="supporting-text"
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="font-bold">{course.courseCode}</span>
                <span aria-hidden="true">·</span>
                <span>{course.classType}</span>
                {course.debarStatus !== '-' && (
                  <span className="text-(--att-danger) font-bold">
                    Debarred
                  </span>
                )}
              </span>
              <span className="font-expanded font-black text-base leading-tight wrap-break-word">
                {course.courseTitle}
              </span>
              <div slot="trailing" className="shrink-0 text-right pl-2">
                <span
                  className={`block font-expanded font-black text-xl leading-none tabular-nums ${TONE_TEXT[tone]}`}
                >
                  {displayPercentage(course.percentage, course.total)}
                </span>
                <span className="block text-[10px] font-bold uppercase text-(--text-muted) mt-0.5">
                  {TONE_LABEL[tone]}
                </span>
              </div>
            </M3eListOption>
          );
        })}
      </M3eSelectionList>
    </div>
  );
};
