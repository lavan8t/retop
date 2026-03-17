import React from "react";
import { motion, Variants } from "framer-motion"; // <-- Imported Variants
import { MapPin, Clock, ArrowRight } from "lucide-react";
import { CourseSummary, Assignment } from "../../types/vtop";
import { UpcomingClass } from "../../utils/timetable-slots";
import { getCourseAcronym } from "../../utils/formatting";

// <-- Explicitly typed as Variants
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

  // Bold Neo-Brutalist Badge Colors
  let badgeBg = "bg-green-400";
  let barColor = "bg-green-500";

  if (isNaN(val)) {
    badgeBg = "bg-zinc-300";
    barColor = "bg-zinc-400";
  } else if (val < 75) {
    badgeBg = "bg-red-400";
    barColor = "bg-red-500";
  } else if (val < 80) {
    badgeBg = "bg-yellow-400";
    barColor = "bg-yellow-500";
  }

  return (
    <motion.div
      layout
      variants={rowVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="relative flex items-center justify-between p-3.5 rounded-2xl border-2 border-black bg-(--bg-surface) shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] transition-shadow cursor-pointer group select-none overflow-hidden"
    >
      {/* Subtle background liquid fill */}
      <div
        className={`absolute top-0 left-0 h-full ${barColor} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}
        style={{ width: `${displayVal}%` }}
      />

      <div className="relative z-10 min-w-0 flex-1 pr-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-sm font-black text-(--text-main) truncate group-hover:text-blue-500 transition-colors">
            {course.name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-bold font-mono text-(--text-muted) truncate uppercase bg-(--bg-highlight) px-1.5 py-0.5 rounded border border-(--border-dim)">
            {course.code}
          </div>
          {course.type && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-(--border-dim) bg-(--bg-main) text-(--text-muted) leading-none shrink-0">
              {course.type}
            </span>
          )}
        </div>
      </div>

      {/* The Chunky Neo-Brutalist Badge */}
      <div
        className={`relative z-10 shrink-0 font-black font-expanded text-lg md:text-xl leading-none text-black px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] ${badgeBg}`}
      >
        {isNaN(val) ? "--" : `${displayVal}%`}
      </div>
    </motion.div>
  );
};

export const ScheduleRow = ({ item }: { item: UpcomingClass }) => {
  const isLab = item.course?.type?.includes("Lab") || false;
  const isNow = item.status === "Now";

  return (
    <motion.div
      layout
      variants={rowVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="flex p-0 rounded-2xl border-2 border-black bg-(--bg-surface) shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] transition-shadow group cursor-pointer select-none overflow-hidden"
    >
      {/* Ticket-style Left Edge */}
      <div
        className={`w-20 shrink-0 flex flex-col items-center justify-center border-r-2 border-black p-2 ${isNow ? "bg-yellow-300" : "bg-(--bg-highlight)"}`}
      >
        <span
          className={`text-sm font-black font-expanded leading-none ${isNow ? "text-black" : "text-(--text-main)"}`}
        >
          {item.time}
        </span>
        <span
          className={`text-[9px] font-black uppercase mt-1.5 px-2 py-0.5 rounded-md border-2 leading-none ${
            isNow
              ? "bg-red-500 text-white border-black shadow-[2px_2px_0px_0px_#000] animate-pulse"
              : "bg-(--bg-main) text-(--text-muted) border-(--border-dim)"
          }`}
        >
          {item.status}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center p-3 relative">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000] leading-none ${
              isLab ? "bg-purple-300 text-black" : "bg-cyan-300 text-black"
            }`}
          >
            {item.course.slot}
          </span>
          <span className="text-sm font-black text-(--text-main) truncate leading-none mt-0.5 group-hover:text-blue-500 transition-colors">
            {getCourseAcronym(item.course.title)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold font-mono text-(--text-muted) mt-0.5">
          <span className="flex items-center gap-1.5 bg-(--bg-highlight) px-1.5 py-0.5 rounded border border-(--border-dim)">
            <MapPin className="w-3 h-3 text-blue-400" />
            {item.course.venue}
          </span>
        </div>

        {/* Hover Arrow Indicator */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
          <ArrowRight className="w-4 h-4 text-blue-500" />
        </div>
      </div>
    </motion.div>
  );
};

export const AssignmentRow = ({ assignment }: { assignment: Assignment }) => (
  <motion.div
    layout
    variants={rowVariants}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.97 }}
    className="p-3.5 rounded-2xl border-2 border-black bg-(--bg-surface) shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] transition-shadow group cursor-pointer select-none"
  >
    <div className="flex justify-between items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-(--text-main) leading-tight group-hover:text-blue-500 transition-colors line-clamp-2">
          {assignment.title}
        </div>
        <div className="text-[10px] font-bold font-mono text-(--text-muted) mt-2 truncate bg-(--bg-highlight) inline-block px-1.5 py-0.5 rounded border border-(--border-dim)">
          {assignment.course}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end">
        <span className="text-[10px] font-black font-mono uppercase text-black bg-blue-300 border-2 border-black px-2 py-1 rounded-lg shadow-[2px_2px_0px_0px_#000] leading-none group-hover:bg-blue-400 transition-colors">
          {assignment.dueDate}
        </span>
      </div>
    </div>
  </motion.div>
);
