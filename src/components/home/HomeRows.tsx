import React from "react";
import { motion, Variants } from "framer-motion";
import {
  LocationOn,
  ArrowForward,
  Schedule,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { CourseSummary, Assignment, Event } from "../../types/vtop";
import { UpcomingClass } from "../../utils/timetable-slots";
import { formatTimeStr } from "../../utils/formatting";
import { MarqueeText } from "../common/MarqueeText";

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
};

export const AttendanceRow = ({ course }: { course: CourseSummary }) => {
  const val = parseFloat(course.attendance);
  const displayVal = isNaN(val) ? 0 : Math.round(val);

  let badgeBg = "bg-(--att-safe) text-(--text-inverse) border-(--border-main)";
  let barColor = "bg-(--att-safe)";

  if (isNaN(val)) {
    badgeBg = "bg-(--bg-highlight) text-(--text-muted) border-(--border-dim)";
    barColor = "bg-(--bg-highlight)";
  } else if (val < 75) {
    badgeBg = "bg-(--att-danger) text-(--text-inverse) border-(--border-main)";
    barColor = "bg-(--att-danger)";
  } else if (val < 80) {
    badgeBg = "bg-(--att-warn) text-(--text-inverse) border-(--border-main)";
    barColor = "bg-(--att-warn)";
  }

  return (
    <div className="relative flex items-center justify-between p-2 rounded-xl bg-(--bg-surface) hover:bg-(--bg-highlight) transition-colors cursor-pointer group select-none overflow-hidden">
      <div
        className={`absolute top-0 left-0 h-full ${barColor} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}
        style={{ width: `${displayVal}%` }}
      />
      <div className="relative z-10 flex items-center gap-2 min-w-0 flex-1 pr-3">
        <MarqueeText
          text={course.name}
          className="text-xs font-black text-(--text-main) transition-colors"
        />
        {course.type && (
          <span className="text-[9px] font-black uppercase px-1 py-0.5 rounded bg-(--bg-main) text-(--text-muted) leading-none shrink-0">
            {course.type}
          </span>
        )}
      </div>

      <div
        className={`relative z-10 shrink-0 font-black font-expanded text-sm leading-none px-2 py-1 rounded-md border-2 ${badgeBg}`}
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
}: {
  item: UpcomingClass;
  onClick?: (e: React.MouseEvent, item: UpcomingClass) => void;
  use24HourTime?: boolean;
}) => {
  const isLab = item.course?.type?.includes("Lab") || false;
  const isNow = item.status === "Now";

  return (
    <motion.div
      layout
      variants={rowVariants}
      onClick={(e) => onClick?.(e, item)}
      className={`p-3 rounded-xl shadow-none cursor-pointer select-none overflow-hidden relative border-2 border-transparent hover:border-(--border-main) ${isNow ? "bg-(--accent-base) text-(--text-inverse)" : "bg-(--bg-surface) text-(--text-main)"}`}
    >
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-start gap-2 mb-1.5">
          <span
            className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-md leading-none mt-0.5 ${
              isNow
                ? "bg-(--text-main) text-(--bg-main) shadow-none"
                : isLab
                  ? "bg-purple-500 text-white shadow-none"
                  : "bg-(--text-main) text-(--bg-main) shadow-none"
            }`}
          >
            {item.course.slot}
          </span>
          <span
            className={`text-sm font-black leading-tight flex-1 ${isNow ? "text-(--text-inverse)" : "text-(--text-main)"}`}
          >
            {item.course.title}
          </span>
        </div>

        <div
          className={`flex flex-wrap items-center gap-3 text-[11px] font-bold font-mono mt-1 ${isNow ? "text-(--text-inverse)/90" : "text-(--text-muted)"}`}
        >
          <span className="flex items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded-md">
            <Schedule className="w-3 h-3 opacity-80" />
            {formatTimeStr(item.time, use24HourTime)}
          </span>
          <span className="flex items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded-md">
            <LocationOn className="w-3 h-3" />
            {item.course.venue}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export const AssignmentRow = ({ assignment }: { assignment: Assignment }) => (
  <motion.div
    layout
    variants={rowVariants}
    className="p-3 rounded-xl bg-(--bg-surface) shadow-none cursor-pointer select-none relative border-2 border-transparent hover:border-(--border-main)"
  >
    <div className="flex justify-between items-start gap-3">
      <div className="flex-1 min-w-0 pr-6">
        <div className="text-sm font-black text-(--text-main) leading-tight transition-colors line-clamp-2">
          {assignment.title}
        </div>
        <div className="text-[10px] font-bold font-mono text-(--bg-main) mt-2 truncate bg-(--text-main) inline-block px-2 py-1 rounded-md shadow-none">
          {assignment.course}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end">
        <span className="text-[10px] font-black font-mono uppercase text-white bg-(--att-danger) px-2 py-1 rounded-md shadow-none leading-none">
          {assignment.dueDate}
        </span>
      </div>
    </div>
  </motion.div>
);

export const EventRow = ({ event }: { event: Event }) => (
  <motion.div
    layout
    variants={rowVariants}
    className="p-3 rounded-xl bg-(--bg-surface) shadow-none cursor-pointer select-none relative border-2 border-transparent hover:border-(--border-main)"
  >
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-black text-(--text-main) leading-tight">
          {event.title}
        </span>
        <span className="shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-md leading-none bg-blue-500 text-white shadow-none">
          {event.category}
        </span>
      </div>
      <div className="text-[11px] font-bold text-(--text-muted) truncate">
        {event.organizer}
      </div>
    </div>
  </motion.div>
);
