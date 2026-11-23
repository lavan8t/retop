import React from 'react';
import {
  LocationOn,
  Schedule,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { CourseSummary, Assignment, Event } from '../../types/vtop';
import { UpcomingClass } from '../../utils/timetable-slots';
import { ExamEntry } from '../../parsers/exam-schedule';
import {
  formatTimeStr,
  parseVtopDate,
  TimeFormatMode,
} from '../../utils/formatting';
import { SelectableRow } from '../ui/SelectableRow';
import {
  useSettingsStore,
  MATERIAL_ACCENTS,
  getMaterialThemeColor,
  getMaterialOnThemeColor,
  getMaterialChipStyle,
} from '../../utils/settings-store';
import { useIsDark } from '../../hooks/useTheme';
import { useDataStore } from '../../store/dataStore';

export const AttendanceRow = React.memo(
  ({ course }: { course: CourseSummary }) => {
    const val = parseFloat(course.attendance);
    const displayVal = isNaN(val) ? 0 : Math.round(val);
    const tone =
      isNaN(val) || val >= 90
        ? 'text-(--attendance-green)'
        : val <= 75
          ? 'text-(--attendance-red)'
          : 'text-(--attendance-blue)';

    return (
      <div className="group flex items-center justify-between p-3 bg-(--bg-highlight) hover:bg-(--border-dim) border-0 transition-all cursor-pointer rounded-sm first:rounded-t-2xl last:rounded-b-2xl">
        <div className="flex flex-col flex-1 min-w-0 pr-2">
          <span className="text-xs font-medium text-(--text-main) truncate leading-snug">
            {course.name}
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-3 text-(--text-muted)">
          {course.type && (
            <span className="w-5 text-center text-[10px] font-medium">
              {course.type}
            </span>
          )}
          <span className={`text-xs font-medium tabular-nums ${tone}`}>
            {isNaN(val) ? '--' : `${displayVal}%`}
          </span>
        </div>
      </div>
    );
  },
);

export const ScheduleRow = React.memo(
  ({
    item,
    onClick,
    use24HourTime = '12h' as TimeFormatMode,

    className,
    progress = 0,
  }: {
    item: UpcomingClass;
    onClick?: (item: UpcomingClass) => void;
    use24HourTime?: TimeFormatMode;

    className?: string;
    progress?: number;
  }) => {
    const isNow = item.status === 'Now';
    const formattedTime = formatTimeStr(item.time, use24HourTime);

    const { settings } = useSettingsStore();
    const { attendance, stats } = useDataStore();
    const cgpaVal = parseFloat(stats?.cgpa || '0');
    const isNinePointer = !isNaN(cgpaVal) && cgpaVal >= 9.0;

    const attObj = (attendance || []).find(
      (a: any) =>
        a.code === item.course?.code ||
        (item.course?.title && a.name && item.course.title.includes(a.name)),
    );
    const attVal = attObj ? parseFloat(attObj.attendance) : NaN;
    const isCriticalAtt = !isNinePointer && !isNaN(attVal) && attVal <= 75;

    const isDark = useIsDark();
    const cardBg = getMaterialThemeColor(settings.calendarClassColor, isDark);
    const cardFg = getMaterialOnThemeColor(settings.calendarClassColor, isDark);

    const venue =
      item.course?.venue || (item as any).venue || (item as any).location || '';
    return (
      <SelectableRow
        label={`${item.course.title}, ${formattedTime}`}
        onActivate={() => onClick?.(item)}
        className={`@container flex items-center justify-between p-3 shadow-none select-none overflow-hidden relative border-0 shrink-0 ${isNow ? 'bg-(--accent-base) text-(--text-inverse)' : ''} ${className || 'rounded-xl'}`}
        style={{
          backgroundColor: isNow ? undefined : cardBg,
          color: isNow ? undefined : cardFg,
        }}
      >
        {/* Depleting fill overlay level-wise based on time elapsed */}
        {progress > 0 && progress < 1 && (
          <div
            className="absolute top-0 left-0 bottom-0 bg-black/35 pointer-events-none transition-all duration-500 z-0"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        )}

        <div className="relative z-10 flex flex-col gap-[2px] w-full min-w-0">
          {/* Line 1: title (left) + venue (right) */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-sm md:text-base font-medium leading-tight truncate min-w-0">
              {item.course.title}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {isCriticalAtt && (
                <span
                  className="text-[0.5625rem] font-mono font-medium uppercase px-1.5 py-0.5 rounded-full shrink-0 leading-none border"
                  style={getMaterialChipStyle('red', isDark)}
                >
                  ⚠️ {Math.round(attVal)}%
                </span>
              )}
              {venue && (
                <span className="text-xs md:text-sm font-medium leading-tight whitespace-nowrap">
                  {venue}
                </span>
              )}
            </div>
          </div>

          {/* Line 2: time range, duller hierarchy */}
          <div
            className={`text-[11px] md:text-xs font-medium leading-tight ${isNow ? 'opacity-80' : 'text-(--text-muted)'}`}
          >
            {formattedTime}
          </div>
        </div>
      </SelectableRow>
    );
  },
);

export const AssignmentRow = React.memo(
  ({
    assignment,
    onClick,
    className,
    progress = 0,
  }: {
    assignment: Assignment;
    onClick?: (assignment: Assignment) => void;
    className?: string;
    progress?: number;
  }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const getDueDaysText = (assignment: Assignment) => {
      const ms =
        assignment.dueDateMs ??
        parseVtopDate(assignment.dueDate)?.getTime() ??
        null;
      if (ms === null)
        return { days: 'DUE SOON', exact: assignment.dueDate, diffDays: 99 };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(ms);
      target.setHours(0, 0, 0, 0);

      const diffDays = Math.round(
        (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      let days = '';
      if (diffDays < 0) days = `${Math.abs(diffDays)}d OVERDUE`;
      else if (diffDays === 0) days = 'DUE TODAY';
      else if (diffDays === 1) days = 'DUE TOMORROW';
      else days = `DUE IN ${diffDays}d`;

      return { days, exact: assignment.dueDate, diffDays };
    };

    const { days, exact, diffDays } = getDueDaysText(assignment);

    // Urgency badge styling
    let badgeStyle =
      'bg-(--accent-base)/15 text-(--accent-base) border-(--accent-base)/30';
    if (diffDays < 0) {
      badgeStyle =
        'bg-(--att-danger-container) text-(--att-danger) border-(--att-danger)/30';
    } else if (diffDays <= 1) {
      badgeStyle =
        'bg-(--att-warn-container) text-(--att-warn) border-(--att-warn)/30';
    }

    return (
      <SelectableRow
        label={`${assignment.title}, ${isHovered ? exact : days}`}
        onActivate={() => onClick?.(assignment)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`p-3 bg-(--bg-surface) hover:bg-(--bg-highlight) select-none overflow-hidden group transition-colors relative border border-(--border-dim)/40 shrink-0 ${className || 'rounded-xl'}`}
      >
        {progress > 0 && progress < 1 && (
          <div
            className="absolute top-0 left-0 bottom-0 bg-(--accent-base)/20 pointer-events-none transition-all duration-500 z-0"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        )}
        <div className="flex flex-col relative z-10 gap-[2px] w-full min-w-0">
          {/* Line 1: title (left) + course (right) */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-sm md:text-base font-medium text-(--text-main) leading-tight truncate min-w-0">
              {assignment.title}
            </span>
            {assignment.course && (
              <span className="text-xs md:text-sm font-medium text-(--text-main) leading-tight truncate shrink-0 max-w-[40%]">
                {assignment.course}
              </span>
            )}
          </div>

          {/* Line 2: due timing, duller hierarchy */}
          <div className="text-[11px] md:text-xs font-medium text-(--text-muted) leading-tight">
            <span
              className={`font-medium font-mono px-2 py-0.5 rounded-full border leading-none transition-all ${badgeStyle}`}
            >
              {isHovered ? exact : days}
            </span>
          </div>
        </div>
      </SelectableRow>
    );
  },
);

export const EventRow = React.memo(
  ({
    event,
    className,
    progress = 0,
  }: {
    event: Event;
    className?: string;
    progress?: number;
  }) => {
    const { settings } = useSettingsStore();

    const isDark = useIsDark();
    const cardBg = getMaterialThemeColor(settings.calendarEventColor, isDark);
    const cardFg = getMaterialOnThemeColor(settings.calendarEventColor, isDark);

    return (
      <div
        className={`p-3 shadow-none select-none relative border-0 overflow-hidden shrink-0 ${className || 'rounded-xl'}`}
        style={{
          backgroundColor: cardBg,
          color: cardFg,
        }}
      >
        {progress > 0 && progress < 1 && (
          <div
            className="absolute top-0 left-0 bottom-0 bg-black/35 pointer-events-none transition-all duration-500 z-0"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        )}
        <div className="flex flex-col gap-[2px] relative z-10 w-full min-w-0">
          {/* Line 1: title */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-sm md:text-base font-medium leading-tight truncate min-w-0">
              {event.title}
            </span>
          </div>

          {/* Line 2: organizer + category, duller hierarchy */}
          <div className="flex items-center justify-between gap-2 text-[11px] md:text-xs font-medium text-(--text-muted) leading-tight">
            {event.organizer && (
              <span className="truncate min-w-0">{event.organizer}</span>
            )}
            {event.category && (
              <span className="uppercase tracking-wider shrink-0">
                {event.category}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export const ExamRow = React.memo(
  ({
    exam,
    groupType,
    onClick,
    className,
    use24HourTime = '12h' as TimeFormatMode,

    progress = 0,
    showGroupPill = true,
  }: {
    exam: ExamEntry;
    groupType?: string;
    onClick?: () => void;
    className?: string;
    use24HourTime?: TimeFormatMode;

    progress?: number;
    showGroupPill?: boolean;
  }) => {
    const { settings } = useSettingsStore();
    const [isHovered, setIsHovered] = React.useState(false);

    const isDark = useIsDark();
    const cardBg = getMaterialThemeColor(settings.calendarEventColor, isDark);
    const cardFg = getMaterialOnThemeColor(settings.calendarEventColor, isDark);

    const formatExamTime = (rawTime?: string, rawSession?: string) => {
      if (rawTime) {
        return formatTimeStr(rawTime, use24HourTime);
      }
      if (rawSession) {
        const sessionMap: Record<string, string> = {
          FN1: '09:00 AM',
          FN2: '10:45 AM',
          FN: '09:00 AM',
          AN1: '02:00 PM',
          AN2: '03:45 PM',
          AN: '02:00 PM',
        };
        const mapped = sessionMap[rawSession.toUpperCase()];
        if (mapped) return formatTimeStr(mapped, use24HourTime);
        return rawSession;
      }
      return 'EXAM';
    };

    const displayTime = formatExamTime(exam.examTime, exam.examSession);
    const shortSlot = (exam.slot || '').split('+')[0].trim();
    const hoverTime = exam.examTime
      ? `${exam.examTime}${exam.examSession ? ` (${exam.examSession})` : ''}`
      : displayTime;

    return (
      <SelectableRow
        label={`${exam.courseTitle}, ${isHovered ? hoverTime : displayTime}`}
        onActivate={() => onClick?.()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`@container flex items-center justify-between p-3 shadow-none select-none overflow-hidden relative border-0 shrink-0 ${className || 'rounded-xl'}`}
        style={{
          backgroundColor: cardBg,
          color: cardFg,
        }}
      >
        {progress > 0 && progress < 1 && (
          <div
            className="absolute top-0 left-0 bottom-0 bg-black/35 pointer-events-none transition-all duration-500 z-0"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        )}

        <div className="relative z-10 flex flex-col gap-[2px] w-full min-w-0">
          {/* Line 1: title (left) + group pill and venue (right) */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-sm md:text-base font-medium leading-tight truncate min-w-0">
              {exam.courseTitle}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {showGroupPill && (
                <span className="px-1.5 py-0.5 rounded-full bg-black/15 text-[10px] md:text-xs font-medium font-mono uppercase tracking-wider shrink-0 leading-none">
                  {groupType || 'EXAM'}
                </span>
              )}
              {exam.venue && (
                <span className="text-xs md:text-sm font-medium leading-tight whitespace-nowrap">
                  {exam.venue} {exam.seatNo ? `(${exam.seatNo})` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Line 2: time + slot, duller hierarchy */}
          <div className="flex items-center gap-2 text-[11px] md:text-xs font-medium leading-tight text-(--text-muted)">
            <span className="truncate min-w-0">{displayTime}</span>
            {shortSlot && (
              <span className="font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-black/15 shrink-0 leading-none">
                {shortSlot}
              </span>
            )}
          </div>
        </div>
      </SelectableRow>
    );
  },
);
