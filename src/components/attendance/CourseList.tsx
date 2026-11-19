import type { KeyboardEvent } from 'react';
import type { DetailedAttendanceCourse } from '../../types/vtop';
import {
  attendanceTone,
  displayPercentage,
  TONE_LABEL,
  type AttendanceTone,
} from './attendanceView';
import { selectableRowProps } from '../ui/SelectableRow';

const TONE_TEXT: Record<AttendanceTone, string> = {
  na: 'text-(--text-muted)',
  critical: 'text-(--att-danger)',
  warning: 'text-(--att-warn)',
  safe: 'text-(--att-safe)',
  neutral: 'text-(--text-muted)',
};

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
  // Arrow/Home/End move focus and selection together, as in the Android list.
  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'),
    );
    const current = options.indexOf(document.activeElement as HTMLElement);
    if (current < 0) return;
    event.preventDefault();
    let next = current;
    if (event.key === 'ArrowDown')
      next = Math.min(options.length - 1, current + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, current - 1);
    else if (event.key === 'Home') next = 0;
    else next = options.length - 1;
    options[next].focus();
    const key = options[next].dataset.courseKey;
    if (key && key !== selectedKey) onSelect(key);
  };

  return (
    <div className="rounded-2xl bg-(--bg-surface) p-0.5 min-h-0">
      <ul
        role="listbox"
        aria-label="Courses"
        onKeyDown={handleKeyDown}
        className="custom-scrollbar flex h-full flex-col gap-1 rounded-2xl"
      >
        {courses.map((course) => {
          const key = courseKey(course);
          const tone = attendanceTone(course.percentage, isNinePointer);
          const selected = key === selectedKey;
          const row = selectableRowProps({
            onActivate: () => onSelect(key),
            role: 'option',
            selected,
            label: `${course.courseTitle}, ${course.courseCode}, ${displayPercentage(course.percentage, course.total)} attendance, ${TONE_LABEL[tone]}`,
            className: `rounded-xl px-3 py-2 ${selected ? 'bg-(--bg-highlight)' : 'bg-transparent'}`,
          });
          return (
            <li
              key={key}
              {...row}
              data-course-key={key}
              aria-current={selected ? 'true' : undefined}
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold">{course.courseCode}</span>
                    <span aria-hidden="true">·</span>
                    <span>{course.classType}</span>
                    {course.debarStatus !== '-' && (
                      <span className="text-(--att-danger) font-bold">
                        Debarred
                      </span>
                    )}
                  </span>
                  <span className="block font-expanded font-black text-base leading-tight wrap-break-word">
                    {course.courseTitle}
                  </span>
                </div>
                <div className="shrink-0 text-right pl-2">
                  <span
                    className={`block font-expanded font-black text-xl leading-none tabular-nums ${TONE_TEXT[tone]}`}
                  >
                    {displayPercentage(course.percentage, course.total)}
                  </span>
                  <span className="block text-[10px] font-bold uppercase text-(--text-muted) mt-0.5">
                    {TONE_LABEL[tone]}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
