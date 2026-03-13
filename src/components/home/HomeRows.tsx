import React from "react";
import { MapPin, Clock } from "lucide-react";
import { CourseSummary, Assignment } from "../../types/vtop";
import { UpcomingClass } from "../../utils/timetable-slots";
import { getCourseAcronym } from "../../utils/formatting";

export const AttendanceRow = ({ course }: { course: CourseSummary }) => {
  const val = parseFloat(course.attendance);
  const displayVal = isNaN(val) ? 0 : Math.round(val);

  let barColor = "bg-(--att-safe)";
  let numColor = "text-(--att-text-safe)";

  if (isNaN(val)) {
    barColor = "bg-zinc-500";
    numColor = "text-zinc-500";
  } else if (val < 75) {
    barColor = "bg-(--att-danger)";
    numColor = "text-(--att-text-danger)";
  } else if (val < 80) {
    barColor = "bg-(--att-warn)";
    numColor = "text-(--att-text-warn)";
  }

  return (
    <div className="relative flex items-center justify-between p-3 rounded-xl border-2 border-(--border-dim) bg-(--bg-surface) hover:border-blue-500 transition-all group overflow-hidden cursor-pointer">
      {/* Horizontal Progress Bar */}
      <div
        className={`absolute top-0 left-0 h-full border-r-2 border-(--border-dim) group-hover:border-blue-500/50 ${barColor} opacity-20 group-hover:opacity-30 transition-all duration-500 ease-out`}
        style={{ width: `${displayVal}%` }}
      />

      <div className="relative z-10 min-w-0 flex-1 pr-3">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="text-xs font-bold text-(--text-main) truncate group-hover:text-blue-500 transition-colors">
            {course.name}
          </div>
          {course.type && (
            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border border-(--border-dim) bg-(--bg-main) text-(--text-muted) leading-none shrink-0 group-hover:border-blue-500/30 transition-colors">
              {course.type}
            </span>
          )}
        </div>
        <div className="text-[9px] font-mono text-(--text-muted) truncate uppercase group-hover:text-blue-400 transition-colors">
          {course.code}
        </div>
      </div>

      <div
        className={`relative z-10 font-black font-expanded text-2xl leading-none ${numColor} drop-`}
      >
        {isNaN(val) ? "--" : displayVal}
      </div>
    </div>
  );
};

export const ScheduleRow = ({ item }: { item: UpcomingClass }) => {
  const isLab = item.course?.type?.includes("Lab") || false;
  return (
    <div className="flex gap-3 p-3 rounded-xl border-2 border-(--border-dim) bg-(--bg-surface) hover:border-blue-500 transition-all group">
      <div className="w-14 shrink-0 flex flex-col items-center justify-center border-r-2 border-(--border-dim) pr-3">
        <span className="text-sm font-black font-expanded text-(--text-main) leading-none">
          {item.time}
        </span>
        <span
          className={`text-[8px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded border leading-none ${item.status === "Now" ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse" : "bg-(--bg-highlight) text-(--text-muted) border-(--border-main)"}`}
        >
          {item.status}
        </span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[9px] font-black uppercase px-1.5 rounded border leading-none py-0.5 ${isLab ? "bg-purple-500/20 text-purple-400 border-purple-500/50" : "bg-blue-500/20 text-blue-400 border-blue-500/50"}`}
          >
            {item.course.slot}
          </span>
          <span className="text-xs font-bold text-(--text-main) truncate leading-none mt-0.5">
            {getCourseAcronym(item.course.title)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-(--text-muted) mt-0.5">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {item.course.venue}
          </span>
          <span className="flex items-center gap-1 truncate">
            <Clock className="w-3 h-3" />
            50m
          </span>
        </div>
      </div>
    </div>
  );
};

export const AssignmentRow = ({ assignment }: { assignment: Assignment }) => (
  <div className="p-3.5 rounded-xl border-2 border-(--border-dim) bg-(--bg-surface) hover:border-blue-500 hover:bg-blue-500/5 transition-all group cursor-default">
    <div className="flex justify-between items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-(--text-main) leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">
          {assignment.title}
        </div>
        <div className="text-[10px] font-mono text-(--text-muted) mt-1.5 truncate">
          {assignment.course}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end">
        <span className="text-[10px] font-bold font-mono text-blue-400 bg-blue-950/30 border border-blue-900/50 px-2 py-1 rounded leading-none">
          {assignment.dueDate}
        </span>
      </div>
    </div>
  </div>
);
