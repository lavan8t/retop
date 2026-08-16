import React, { useEffect, useRef } from "react";
import { TimetableCourse, CourseSummary } from "../../types/vtop";
import { TimeFormatMode } from "../../utils/formatting";
import { Pill } from "../ui/Pill";

import {
  Person,
  Schedule,
  LocationOn,
  PieChart,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { useDataStore } from "../../store/dataStore";

interface TimetableListProps {
  courses: TimetableCourse[];
  attendance: CourseSummary[];
  use24HourTime?: TimeFormatMode;

}

const getTypeBadge = (type: string) => {
  const t = (type || "").toUpperCase();
  if (t.includes("EMBEDDED") || t === "E") {
    return { label: "E", bg: "bg-emerald-500/25 text-emerald-300 font-black" };
  }
  if (
    t.includes("LAB") ||
    t.includes("PRACTICAL") ||
    t.includes("ELA") ||
    t === "LO" ||
    t === "P"
  ) {
    return { label: "LO", bg: "bg-purple-500/25 text-purple-300 font-black" };
  }
  if (t.includes("SOFT") || t.includes("SKILL") || t === "SS") {
    return { label: "SS", bg: "bg-amber-500/25 text-amber-300 font-black" };
  }
  if (t.includes("THEORY") || t.includes("ETH") || t === "TH" || t === "L") {
    return { label: "TH", bg: "bg-blue-500/25 text-blue-300 font-black" };
  }
  return { label: t.slice(0, 2) || "TH", bg: "bg-cyan-500/25 text-cyan-300 font-black" };
};

export const TimetableList: React.FC<TimetableListProps> = React.memo(({
  courses,
  attendance,
}) => {
  const { highlightedCourseCode, setHighlightedCourseCode } = useDataStore();
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightedCourseCode && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      
      const timeout = setTimeout(() => {
        setHighlightedCourseCode(null);
      }, 1200);
      
      return () => clearTimeout(timeout);
    }
  }, [highlightedCourseCode, setHighlightedCourseCode]);

  return (
    <div className="h-full w-full bg-(--bg-main) flex flex-col overflow-hidden relative">
      {/* Sticky Header with Fade */}
      <div className="sticky top-0 z-20 bg-(--bg-main) px-6 pt-4 pb-2 border-b border-(--border-dim)/20">
        <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-mono font-bold uppercase tracking-wider text-(--text-muted) items-center px-4">
          <div className="col-span-5">Course Info</div>
          <div className="col-span-2">Slot & Venue</div>
          <div className="col-span-3">Faculty</div>
          <div className="col-span-2 text-right">Attendance</div>
        </div>
      </div>

      {/* Top Header Fade Effect */}
      <div className="pointer-events-none h-6 bg-gradient-to-b from-(--bg-main) to-transparent z-10 -mt-1 shrink-0" />

      {/* List Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 pb-32 flex flex-col gap-3 -mt-5 pt-3">
        {courses.map((c, i) => {
          const typeInfo = getTypeBadge(c.type);
          const attStr = attendance?.find((a) => a.code === c.code)?.attendance;
          const attVal = parseFloat(attStr || "0");
          const hasAtt = Boolean(attStr);
          const isLowAtt = hasAtt && attVal <= 75;
          const isHighlighted = highlightedCourseCode === c.code;

          return (
            <div
              key={c.code + "-" + i}
              ref={isHighlighted ? (el) => { (highlightedRef as any).current = el; } : undefined}
              className={`rounded-2xl p-4 md:px-5 md:py-4 flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center border transition-all duration-300 ${
                isHighlighted
                  ? "bg-(--accent-base)/25 border-(--accent-base) ring-2 ring-(--accent-base)/50 scale-[1.02]"
                  : "bg-(--bg-surface)/40 hover:bg-(--bg-surface)/80 border-transparent shadow-none"
              }`}
            >
              {/* Left Column: Pill Above Name + Attendance Next to Course */}
              <div className="col-span-5 flex flex-col gap-1.5 w-full">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Course Code Pill */}
                  <Pill variant="accent">{c.code}</Pill>

                  {/* Type Badge (TH, LO, E, SS) */}
                  <Pill variant="main">{typeInfo.label}</Pill>

                  {/* Attendance Pill next to course */}
                  <Pill
                    variant={!hasAtt ? "muted" : isLowAtt ? "error" : "success"}
                  >
                    <PieChart className="w-3.5 h-3.5" />
                    {hasAtt ? `${attStr}` : "N/A"}
                  </Pill>
                </div>

                {/* Course Name */}
                <h3 className="text-base font-bold text-(--text-main) leading-snug">
                  {c.title}
                </h3>
              </div>

              {/* Middle Column: Slot & Venue */}
              <div className="col-span-2 flex flex-col gap-1 text-xs text-(--text-muted)">
                <div className="flex items-center gap-1.5 font-mono font-semibold text-(--text-main)">
                  <Schedule className="w-4 h-4 text-(--accent-base) shrink-0" />
                  <span>{c.slot}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <LocationOn className="w-4 h-4 text-(--text-muted) shrink-0" />
                  <span className="truncate">{c.venue}</span>
                </div>
              </div>

              {/* Faculty Column */}
              <div className="col-span-3 flex items-center gap-2 text-xs text-(--text-muted)">
                <Person className="w-4 h-4 shrink-0 text-(--text-muted)" />
                <span className="truncate">{c.faculty}</span>
              </div>

              {/* Right Column: Attendance Summary (Mobile/Desktop) */}
              <div className="col-span-2 flex md:justify-end items-center w-full md:w-auto">
                <span
                  className={`text-sm font-mono font-bold px-3 py-1 rounded-full ${
                    !hasAtt
                      ? "bg-(--bg-highlight) text-(--text-muted)"
                      : isLowAtt
                        ? "bg-(--att-danger-container) text-(--att-danger)"
                        : "bg-(--att-safe-container) text-(--att-safe)"
                  }`}
                >
                  {hasAtt ? `${attStr}` : "N/A"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
