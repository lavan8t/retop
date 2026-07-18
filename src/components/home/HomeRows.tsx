import React from "react";
import { motion, Variants } from "framer-motion";
import {
  LocationOn,
  ArrowForward,
  Schedule,
  PriorityHigh,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { CourseSummary, Assignment, Event } from "../../types/vtop";
import { UpcomingClass } from "../../utils/timetable-slots";
import { formatTimeStr } from "../../utils/formatting";
import { MarqueeText } from "../common/MarqueeText";
import { SPRING_SNAPPY } from "../../utils/motion";

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
  let barColor = "bg-(--attendance-green)";

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
    <div className="relative flex items-center justify-between p-2 rounded-xl bg-(--bg-surface) hover:bg-(--bg-highlight) transition-colors cursor-pointer group/row select-none overflow-hidden">
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
          <span className="text-[9px] font-black uppercase px-1 py-0.5 rounded bg-(--bg-main) text-(--text-muted) leading-none shrink-0">
            {course.type}
          </span>
        )}
      </div>

      <div
        className={`relative z-10 shrink-0 font-black font-expanded text-sm leading-none px-2 py-1 rounded-md ${badgeBg}`}
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
  const formattedTime = formatTimeStr(item.time, use24HourTime);
  const timeParts = formattedTime.split(" - ");
  const startTime = timeParts[0];

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      layout
      variants={rowVariants}
      onClick={(e) => onClick?.(e, item)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`flex flex-col p-3 rounded-xl shadow-none cursor-pointer select-none overflow-hidden relative border-2 border-transparent hover:border-(--border-main) ${isNow ? "bg-(--accent-base) text-(--text-inverse)" : "bg-(--bg-surface) text-(--text-main)"}`}
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
        <motion.div layout="position" transition={SPRING_SNAPPY} className="text-[10px] font-bold font-mono shrink-0 bg-black/10 px-1.5 py-0.5 rounded-md flex items-center gap-1">
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
        <div className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded leading-none shrink-0 ${isNow ? "bg-(--text-main) text-(--bg-main)" : "bg-black/10"}`}>
          {item.course.slot}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const AssignmentRow = ({
  assignment,
  onClick,
}: {
  assignment: Assignment;
  onClick?: () => void;
}) => (
  <motion.div
    layout
    variants={rowVariants}
    onClick={onClick}
    className="p-3 rounded-xl bg-(--bg-surface) hover:bg-(--bg-highlight) shadow-none cursor-pointer select-none relative transition-colors overflow-hidden"
  >
    <div className="flex flex-col relative z-10">
      <div className="flex justify-between items-start gap-2">
        <span className="text-sm font-black text-(--text-main) leading-tight flex-1 line-clamp-2">
          {assignment.title}
        </span>
        <span className="shrink-0 text-[10px] font-bold font-mono text-(--text-muted) bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">
          {assignment.course}
        </span>
      </div>
      <div className="flex justify-end mt-2">
        <span className="text-[10px] font-black font-mono uppercase text-(--accent-base)">
          Due {assignment.dueDate}
        </span>
      </div>
    </div>
    <motion.div
      animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
      transition={{ repeat: Infinity, duration: 1, repeatDelay: 3 }}
      className="absolute -bottom-4 -left-2 z-20 pointer-events-none opacity-100 mix-blend-overlay"
    >
      <PriorityHigh 
        className="w-20 h-20 text-red-500"
      />
    </motion.div>
  </motion.div>
);

export const EventRow = ({ event }: { event: Event }) => (
  <motion.div
    layout
    variants={rowVariants}
    className="p-3 rounded-xl bg-(--bg-surface) shadow-none cursor-pointer select-none relative border-2 border-transparent hover:border-(--border-main)"
  >
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-black text-(--text-main) leading-tight flex-1">
          {event.title}
        </span>
        <span className="shrink-0 text-[10px] font-bold text-(--text-muted) text-right">
          {event.organizer}
        </span>
      </div>
      <div className="flex justify-end mt-1">
        <span className="shrink-0 text-[9px] font-black uppercase text-(--text-muted) text-right">
          {event.category}
        </span>
      </div>
    </div>
  </motion.div>
);
