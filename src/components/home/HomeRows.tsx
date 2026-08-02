import React from "react";
import { motion, Variants } from "framer-motion";
import {
  LocationOn,
  Schedule,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { CourseSummary, Assignment, Event } from "../../types/vtop";
import { UpcomingClass } from "../../utils/timetable-slots";
import { ExamEntry } from "../../parsers/exam-schedule";
import { formatTimeStr } from "../../utils/formatting";
import { MarqueeText } from "../common/MarqueeText";
import { SPRING_SNAPPY } from "../../utils/motion";
import { useSettingsStore, MATERIAL_ACCENTS, getMaterialThemeColor, getMaterialOnThemeColor } from "../../utils/settings-store";

const rowVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
};

export const AttendanceRow = ({ course }: { course: CourseSummary }) => {
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
    <div className="relative flex items-center justify-between px-3.5 py-2.5 rounded-xl first:rounded-t-2xl last:rounded-b-2xl bg-(--bg-surface) hover:bg-(--bg-highlight) transition-colors cursor-pointer group/row select-none overflow-hidden border border-(--border-dim)/40">
      <div
        className={`absolute top-0 left-0 h-full ${barColor} transition-all duration-fast`}
        style={{ width: `${displayVal}%` }}
      />
      <div className="relative z-10 flex items-center gap-2 min-w-0 flex-1 pr-3">
        <MarqueeText
          text={course.name}
          className="text-xs font-black text-(--text-main) transition-colors"
        />
        {course.type && (
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-(--bg-main) text-(--text-muted) leading-none shrink-0 border border-(--border-dim)">
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
};

export const ScheduleRow = ({
  item,
  onClick,
  use24HourTime = true,
  className,
}: {
  item: UpcomingClass;
  onClick?: (e: React.MouseEvent, item: UpcomingClass) => void;
  use24HourTime?: boolean;
  className?: string;
}) => {
  const isLab = item.course?.type?.includes("Lab") || false;
  const isNow = item.status === "Now";
  const formattedTime = formatTimeStr(item.time, use24HourTime);
  const timeParts = formattedTime.split(" - ");
  const startTime = timeParts[0];
  const { settings } = useSettingsStore();

  const [isHovered, setIsHovered] = React.useState(false);

  const sysDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = settings.themeMode === "dark" || settings.themeMode === "amoled" || (settings.themeMode === "auto" && sysDark && settings.pureBlack) || (settings.themeMode === "auto" && sysDark);
  const cardBg = getMaterialThemeColor(settings.calendarClassColor, isDark);
  const cardFg = getMaterialOnThemeColor(settings.calendarClassColor, isDark);

  return (
    <motion.div
      layout
      variants={rowVariants}
      onClick={(e) => onClick?.(e, item)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`flex flex-col p-3 shadow-none cursor-pointer select-none overflow-hidden relative border-0 ${isNow ? "bg-(--accent-base) text-(--text-inverse)" : ""} ${className || "rounded-xl"}`}
      style={{
        backgroundColor: isNow ? undefined : cardBg,
        color: isNow ? undefined : cardFg,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <motion.div
            layout="position"
            animate={{ width: isHovered ? 0 : "auto", opacity: isHovered ? 0 : 1, x: isHovered ? -16 : 0 }}
            transition={SPRING_SNAPPY}
            className="font-mono text-[11px] font-bold shrink-0 overflow-hidden whitespace-nowrap"
          >
            {startTime}
          </motion.div>
          <motion.div
            layout="position"
            transition={SPRING_SNAPPY}
            className="text-sm font-black leading-tight flex-1 truncate"
          >
            {item.course.title}
          </motion.div>
        </div>
        <motion.div layout="position" transition={SPRING_SNAPPY} className="text-[10px] font-bold font-mono shrink-0 px-1 py-0.5 flex items-center gap-1">
          <LocationOn className="w-3 h-3" />
          {item.course.venue}
        </motion.div>
      </div>
      
      <motion.div
        layout
        initial={{ height: 0, opacity: 0, marginTop: 0 }}
        animate={{ height: isHovered ? "auto" : 0, opacity: isHovered ? 1 : 0, marginTop: isHovered ? 8 : 0 }}
        transition={SPRING_SNAPPY}
        className="flex items-center justify-between overflow-hidden"
      >
        <motion.div 
          animate={{ x: isHovered ? 0 : -16 }}
          transition={SPRING_SNAPPY}
          className="font-mono text-[10px] font-bold opacity-80 flex items-center gap-1"
        >
          <Schedule className="w-3 h-3" />
          {formattedTime}
        </motion.div>
        <div className={`text-[9px] font-black uppercase px-1 py-0.5 rounded leading-none shrink-0 opacity-80`}>
          {item.course.slot}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const AssignmentRow = ({
  assignment,
  onClick,
  className,
}: {
  assignment: Assignment;
  onClick?: () => void;
  className?: string;
}) => {
  const getFormattedDates = (dateStr: string) => {
    if (!dateStr) return { days: "", exact: "" };
    const cleanStr = dateStr.replace(/[-/]/g, " ").trim();
    const parts = cleanStr.split(" ");
    let target: Date;
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      target = new Date(year, month, day);
    } else {
      target = new Date(cleanStr);
    }

    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    let exact = "";
    if (!isNaN(target.getTime())) {
      const dayNum = target.getDate().toString().padStart(2, "0");
      const monthName = target.toLocaleDateString("en-US", { month: "short" });
      exact = `${dayNum} ${monthName}`;
    } else {
      exact = dateStr;
    }

    if (isNaN(target.getTime())) return { days: `Due ${dateStr}`, exact };

    const diffMs = target.getTime() - now.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let daysText = "";
    if (days < 0) daysText = "Overdue";
    else if (days === 0) daysText = "Due Today";
    else if (days === 1) daysText = "Due Tomorrow";
    else daysText = `Due in ${days} Day${days > 1 ? "s" : ""}`;

    return { days: daysText, exact };
  };

  const { days, exact } = getFormattedDates(assignment.dueDate);

  return (
    <motion.div
      layout
      variants={rowVariants}
      onClick={onClick}
      className={`group p-3 bg-(--bg-surface) hover:bg-(--bg-highlight) shadow-none relative transition-colors overflow-hidden border-0 ${onClick ? "cursor-pointer" : ""} ${className || "rounded-xl"}`}
    >
      <div className="flex flex-col relative z-10">
        <div className="flex justify-between items-start gap-2">
          <span className="text-sm font-black text-(--text-main) leading-tight flex-1 line-clamp-2">
            {assignment.title}
          </span>
          <span className="shrink-0 text-[10px] font-bold font-mono text-(--text-muted)">
            {assignment.course}
          </span>
        </div>
        <div className="flex justify-end mt-2">
          <span className="text-[10px] font-black font-mono text-(--accent-base) transition-all">
            <span className="inline group-hover:hidden">{days}</span>
            <span className="hidden group-hover:inline">{exact}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export const EventRow = ({ event, className }: { event: Event; className?: string }) => {
  const { settings } = useSettingsStore();

  const sysDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = settings.themeMode === "dark" || settings.themeMode === "amoled" || (settings.themeMode === "auto" && sysDark && settings.pureBlack) || (settings.themeMode === "auto" && sysDark);
  const cardBg = getMaterialThemeColor(settings.calendarEventColor, isDark);
  const cardFg = getMaterialOnThemeColor(settings.calendarEventColor, isDark);

  return (
    <motion.div
      layout
      variants={rowVariants}
      className={`p-3 shadow-none cursor-pointer select-none relative border-0 ${className || "rounded-xl"}`}
      style={{
        backgroundColor: cardBg,
        color: cardFg,
      }}
    >
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-black leading-tight flex-1">
            {event.title}
          </span>
          <span className="shrink-0 text-[10px] font-bold opacity-80 text-right">
            {event.organizer}
          </span>
        </div>
        <div className="flex justify-end mt-1">
          <span className="shrink-0 text-[9px] font-black uppercase opacity-80 text-right">
            {event.category}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export const ExamRow = ({
  exam,
  groupType,
  onClick,
  className,
}: {
  exam: ExamEntry;
  groupType?: string;
  onClick?: () => void;
  className?: string;
}) => {
  const { settings } = useSettingsStore();

  const sysDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = settings.themeMode === "dark" || settings.themeMode === "amoled" || (settings.themeMode === "auto" && sysDark);
  const cardBg = getMaterialThemeColor("purple", isDark);
  const cardFg = getMaterialOnThemeColor("purple", isDark);

  return (
    <motion.div
      layout
      variants={rowVariants}
      onClick={onClick}
      className={`p-3 shadow-none select-none relative border-0 transition-all ${onClick ? "cursor-pointer" : ""} ${className || "rounded-xl"}`}
      style={{
        backgroundColor: cardBg,
        color: cardFg,
      }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-black/15 text-[9px] font-black font-mono uppercase tracking-wider shrink-0">
              {groupType || "EXAM"}
            </span>
            <span className="text-xs font-mono font-bold opacity-80 shrink-0">
              {exam.courseCode}
            </span>
            <span className="text-sm font-black leading-tight flex-1 truncate">
              {exam.courseTitle}
            </span>
          </div>
          {exam.slot && (
            <span className="text-[10px] font-mono font-bold shrink-0 opacity-80">
              SLOT: {exam.slot}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] font-bold opacity-90 pt-1.5 border-t border-black/10">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono">
              <Schedule className="w-3.5 h-3.5 opacity-80" />
              {exam.examTime} ({exam.examSession})
            </span>
            {exam.venue && (
              <span className="flex items-center gap-1">
                <LocationOn className="w-3.5 h-3.5 opacity-80" />
                {exam.venue} {exam.seatNo ? `(Seat: ${exam.seatNo})` : ""}
              </span>
            )}
          </div>
          {exam.reportingTime && (
            <span className="text-[10px] font-mono font-bold opacity-80">
              RPT: {exam.reportingTime}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const CustomEventRow = ({
  event,
  onDelete,
  className,
}: {
  event: any;
  onDelete?: () => void;
  className?: string;
}) => {
  const { settings } = useSettingsStore();
  const sysDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark =
    settings.themeMode === "dark" ||
    settings.themeMode === "amoled" ||
    (settings.themeMode === "auto" && sysDark);

  const colorMap: Record<string, string> = {
    quiz: "violet",
    assessment: "cyan",
    event: "amber",
    task: "emerald",
    note: "pink",
  };

  const colorKey = colorMap[event.type] || "blue";
  const cardBg = getMaterialThemeColor(colorKey, isDark);
  const cardFg = getMaterialOnThemeColor(colorKey, isDark);

  return (
    <motion.div
      layout
      variants={rowVariants}
      className={`p-3 shadow-none select-none relative border-0 ${className || "rounded-xl"}`}
      style={{
        backgroundColor: cardBg,
        color: cardFg,
      }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-black/15 text-[9px] font-black font-mono uppercase tracking-wider shrink-0">
              {event.type}
            </span>
            <span className="text-sm font-black leading-tight truncate">
              {event.title}
            </span>
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-xs opacity-60 hover:opacity-100 p-0.5 rounded transition-opacity"
              title="Delete Custom Event"
            >
              ✕
            </button>
          )}
        </div>
        {(event.time || event.venue) && (
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold opacity-85 mt-0.5">
            {event.time && <span>⏰ {event.time}</span>}
            {event.venue && <span>📍 {event.venue}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
};
