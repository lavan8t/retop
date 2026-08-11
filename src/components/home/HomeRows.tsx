import React from "react";
import {
  LocationOn,
  Schedule,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { CourseSummary, Assignment, Event } from "../../types/vtop";
import { UpcomingClass } from "../../utils/timetable-slots";
import { ExamEntry } from "../../parsers/exam-schedule";
import { formatTimeStr, parseVtopDate, TimeFormatMode } from "../../utils/formatting";

import { useSettingsStore, MATERIAL_ACCENTS, getMaterialThemeColor, getMaterialOnThemeColor } from "../../utils/settings-store";
import { useIsDark } from "../../hooks/useTheme";
import { useDataStore } from "../../store/dataStore";

export const AttendanceRow = React.memo(({ course }: { course: CourseSummary }) => {
  const val = parseFloat(course.attendance);
  const displayVal = isNaN(val) ? 0 : Math.round(val);

  let badgeBg = "bg-(--attendance-green) text-(--bg-main) border-2 border-(--border-main)";
  let barColor = "bg-(--attendance-green-bg)";

  if (isNaN(val)) {
    badgeBg = "bg-(--bg-highlight) text-(--text-muted) border-2 border-(--border-dim)";
    barColor = "bg-(--bg-highlight)";
  } else if (val <= 75) {
    badgeBg = "bg-(--attendance-red) text-(--bg-main) border-2 border-(--border-main)";
    barColor = "bg-(--attendance-red-bg)";
  } else if (val < 90) {
    badgeBg = "bg-(--attendance-blue) text-(--bg-main) border-2 border-(--border-main)";
    barColor = "bg-(--attendance-blue-bg)";
  }

  return (
    <div className="relative flex items-center justify-between px-3.5 py-2.5 rounded-xl first:rounded-t-2xl last:rounded-b-2xl bg-(--bg-surface) hover:bg-(--bg-highlight) transition-colors cursor-pointer group/row select-none overflow-hidden border border-(--border-dim)/40 shrink-0">
      <div
        className={`absolute top-0 left-0 h-full ${barColor} transition-all duration-fast`}
        style={{ width: `${displayVal}%` }}
      />
      <div className="relative z-10 flex items-center gap-2 min-w-0 flex-1 pr-3">
        <span className="text-xs font-black text-(--text-main) leading-snug truncate min-w-0">
          {course.name}
        </span>
        {course.type && (
          <span className="text-[0.5625rem] font-black uppercase px-1.5 py-0.5 rounded-md bg-(--bg-main) text-(--text-muted) leading-none shrink-0 border border-(--border-dim)">
            {course.type}
          </span>
        )}
      </div>

      <div
        className={`relative z-10 shrink-0 font-black font-expanded text-xs leading-none px-2.5 py-1 rounded-lg ${badgeBg}`}
      >
        {isNaN(val) ? "--" : `${displayVal}%`}
      </div>
    </div>
  );
});

export const ScheduleRow = React.memo(({
  item,
  onClick,
  use24HourTime = "12h" as TimeFormatMode,

  className,
  progress = 0,
}: {
  item: UpcomingClass;
  onClick?: (e: React.MouseEvent, item: UpcomingClass) => void;
  use24HourTime?: TimeFormatMode;

  className?: string;
  progress?: number;
}) => {
  const isNow = item.status === "Now";
  const formattedTime = formatTimeStr(item.time, use24HourTime);
  const timeParts = formattedTime.split(" - ");
  const startTime = timeParts[0];

  const { settings } = useSettingsStore();
  const { attendance } = useDataStore();
  const attObj = (attendance || []).find(
    (a: any) =>
      a.code === item.course?.code ||
      (item.course?.title && a.name && item.course.title.includes(a.name)),
  );
  const attVal = attObj ? parseFloat(attObj.attendance) : NaN;
  const isCriticalAtt = !isNaN(attVal) && attVal <= 75;

  const [isHovered, setIsHovered] = React.useState(false);

  const isDark = useIsDark();
  const cardBg = getMaterialThemeColor(settings.calendarClassColor, isDark);
  const cardFg = getMaterialOnThemeColor(settings.calendarClassColor, isDark);

  const venue = item.course?.venue || (item as any).venue || (item as any).location || "";
  const slot = item.course?.slot || (item as any).slot || "";

  return (
    <div
      onClick={(e) => onClick?.(e, item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`@container flex items-center justify-between p-3 sm:p-3.5 min-h-[44px] shadow-none cursor-pointer select-none overflow-hidden relative border-0 shrink-0 ${isNow ? "bg-(--accent-base) text-(--text-inverse)" : ""} ${className || "rounded-xl"}`}
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

      <div className="relative z-10 flex items-center justify-between gap-3 w-full">
        {/* Left Side: Natural width time container (pushes name on hover) */}
        <div className="flex items-center shrink-0">
          <span className="font-mono font-bold text-xs sm:text-sm whitespace-nowrap transition-all leading-tight">
            {isHovered ? formattedTime : startTime}
          </span>
        </div>

        {/* Center: Main Name (No course code) */}
        <div className="flex-1 min-w-0 px-1">
          <span className="text-xs sm:text-sm md:text-base font-black leading-tight break-words line-clamp-2">
            {item.course.title}
          </span>
        </div>

        {/* Right Side: Critical badge, Slot (left of venue), Venue on right end */}
        <div className="flex items-center gap-2 shrink-0 font-mono font-bold">
          {isCriticalAtt && (
            <span className="text-[0.5625rem] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-500 text-white shrink-0 leading-none">
              ⚠️ {Math.round(attVal)}%
            </span>
          )}

          {slot && (
            <span className="px-2 py-0.5 rounded bg-black/15 text-xs sm:text-sm font-mono font-black uppercase tracking-wider shrink-0 leading-none">
              {slot}
            </span>
          )}

          {venue && (
            <span className="text-xs sm:text-sm font-black whitespace-nowrap shrink-0 leading-none">
              {venue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export const AssignmentRow = React.memo(({
  assignment,
  onClick,
  className,
  progress = 0,
}: {
  assignment: Assignment;
  onClick?: (e: React.MouseEvent, assignment: Assignment) => void;
  className?: string;
  progress?: number;
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const getDueDaysText = (dueDateStr: string) => {
    const d = parseVtopDate(dueDateStr);
    if (!d) return { days: "DUE SOON", exact: dueDateStr, diffDays: 99 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    let days = "";
    if (diffDays < 0) days = `${Math.abs(diffDays)}d OVERDUE`;
    else if (diffDays === 0) days = "DUE TODAY";
    else if (diffDays === 1) days = "DUE TOMORROW";
    else days = `DUE IN ${diffDays}d`;

    return { days, exact: dueDateStr, diffDays };
  };

  const { days, exact, diffDays } = getDueDaysText(assignment.dueDate);

  // Urgency badge styling
  let badgeStyle = "bg-(--accent-base)/15 text-(--accent-base) border-(--accent-base)/30";
  if (diffDays < 0) {
    badgeStyle = "bg-red-500/15 text-red-500 border-red-500/30";
  } else if (diffDays <= 1) {
    badgeStyle = "bg-amber-500/15 text-amber-500 border-amber-500/30";
  }

  return (
    <div
      onClick={(e) => onClick?.(e, assignment)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`p-3 sm:p-3.5 bg-(--bg-surface) hover:bg-(--bg-highlight) cursor-pointer select-none overflow-hidden group transition-colors relative border border-(--border-dim)/40 shrink-0 ${className || "rounded-xl"}`}
    >
      {progress > 0 && progress < 1 && (
        <div
          className="absolute top-0 left-0 bottom-0 bg-(--accent-base)/20 pointer-events-none transition-all duration-500 z-0"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      )}
      <div className="flex flex-col relative z-10 gap-1.5">
        <div className="flex justify-between items-start gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-black text-(--text-main) leading-snug flex-1 break-words">
            {assignment.title}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1 gap-2">
          <span className="text-xs font-bold font-mono text-(--text-muted) truncate shrink-0">
            {assignment.course}
          </span>
          <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md border leading-none shrink-0 transition-all ${badgeStyle}`}>
            {isHovered ? exact : days}
          </span>
        </div>
      </div>
    </div>
  );
});

export const EventRow = React.memo(({ event, className, progress = 0 }: { event: Event; className?: string; progress?: number }) => {
  const { settings } = useSettingsStore();

  const isDark = useIsDark();
  const cardBg = getMaterialThemeColor(settings.calendarEventColor, isDark);
  const cardFg = getMaterialOnThemeColor(settings.calendarEventColor, isDark);

  return (
    <div
      className={`p-3.5 shadow-none cursor-pointer select-none relative border-0 overflow-hidden shrink-0 ${className || "rounded-xl"}`}
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
      <div className="flex flex-col gap-1.5 relative z-10 w-full">
        <div className="flex items-start justify-between gap-2 w-full">
          <span className="text-[clamp(0.85rem,3cqw,0.95rem)] font-black leading-tight break-words flex-1">
            {event.title}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs font-mono font-bold opacity-90">
          <span className="uppercase text-xs tracking-wider px-2 py-0.5 rounded bg-black/15 leading-none">
            {event.category}
          </span>
          {event.organizer && (
            <span className="leading-none text-xs">
              {event.organizer}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export const ExamRow = React.memo(({
  exam,
  groupType,
  onClick,
  className,
  use24HourTime = "12h" as TimeFormatMode,

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
  const cardBg = getMaterialThemeColor("purple", isDark);
  const cardFg = getMaterialOnThemeColor("purple", isDark);

  const formatExamStartTime = (rawTime?: string, rawSession?: string) => {
    if (rawTime) {
      const startPart = rawTime.split("-")[0].trim();
      return formatTimeStr(startPart, use24HourTime);
    }
    if (rawSession) {
      const sessionMap: Record<string, string> = {
        FN1: "09:00 AM",
        FN2: "10:45 AM",
        FN: "09:00 AM",
        AN1: "02:00 PM",
        AN2: "03:45 PM",
        AN: "02:00 PM",
      };
      const mapped = sessionMap[rawSession.toUpperCase()];
      if (mapped) return formatTimeStr(mapped, use24HourTime);
      return rawSession;
    }
    return "EXAM";
  };

  const displayTime = formatExamStartTime(exam.examTime, exam.examSession);
  const hoverTime = exam.examTime ? `${exam.examTime}${exam.examSession ? ` (${exam.examSession})` : ""}` : displayTime;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`@container flex items-center justify-between p-3 sm:p-3.5 min-h-[44px] shadow-none cursor-pointer select-none overflow-hidden relative border-0 shrink-0 ${className || "rounded-xl"}`}
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

      <div className="relative z-10 flex items-center justify-between gap-3 w-full">
        {/* Left Side: Natural width start time */}
        <div className="flex items-center shrink-0">
          <span className="font-mono font-bold text-xs sm:text-sm whitespace-nowrap transition-all leading-tight">
            {isHovered ? hoverTime : displayTime}
          </span>
        </div>

        {/* Center: Exam Course Title */}
        <div className="flex-1 min-w-0 px-1">
          <span className="text-xs sm:text-sm md:text-base font-black leading-tight break-words line-clamp-2">
            {exam.courseTitle}
          </span>
        </div>

        {/* Right Side: Group Pill / Slot (left of venue), Venue on right end */}
        <div className="flex items-center gap-2 shrink-0 font-mono font-bold">
          {showGroupPill && (
            <span className="px-2 py-0.5 rounded bg-black/15 text-xs sm:text-sm font-black font-mono uppercase tracking-wider shrink-0 leading-none">
              {groupType || "EXAM"}
            </span>
          )}

          {exam.slot && (
            <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/15 shrink-0 leading-none">
              {exam.slot}
            </span>
          )}

          {exam.venue && (
            <span className="text-xs sm:text-sm font-black whitespace-nowrap shrink-0 leading-none">
              {exam.venue} {exam.seatNo ? `(${exam.seatNo})` : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
