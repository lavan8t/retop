import React, { useMemo, useState, useEffect, useRef } from "react";
import { TimetableCourse, CourseSummary } from "../../types/vtop";
import {
  getGridPositions,
  DAYS,
  CAMPUS_SLOT_TIMINGS,
  CAMPUS_SLOTS,
} from "../../utils/timetable-slots";
import { getCourseAcronym, formatTimeStr, TimeFormatMode } from "../../utils/formatting";

import { LocationOn } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { Pill } from "../ui/Pill";
import { useDataStore } from "../../store/dataStore";

const getAttendanceEmoji = (attendanceStr?: string) => {
  return "";
};

export const TimetableGrid = React.memo(({
  courses,
  attendance,
  use24HourTime = "12h" as TimeFormatMode,

  onSelectCourse,
}: {
  courses: TimetableCourse[];
  attendance: CourseSummary[];
  use24HourTime?: TimeFormatMode;

  onSelectCourse?: (code: string) => void;
}) => {
  const [selectedCourse, setSelectedCourse] = useState<{
    data: TimetableCourse;
    position: { x: number; y: number };
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isTileButton = target.closest('button[data-tile="true"]');
      if (isTileButton) return;
      setSelectedCourse(null);
    };
    window.addEventListener("click", handleDocumentClick);
    return () => window.removeEventListener("click", handleDocumentClick);
  }, []);

  // Logic for the 6 Days (Mon - Sat)
  const activeDays = useMemo(() => {
    const hasSaturday = courses.some((c) =>
      getGridPositions(c.slot).some((p) => p.day === 5),
    );
    const indices = hasSaturday ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4];
    return indices.map((i) => DAYS[i]);
  }, [courses]);

  const gridCells: React.ReactNode[] = [];

  // Corner
  gridCells.push(
    <div
      key="h-corner"
      className="sticky left-0 top-0 z-30 bg-(--bg-main) flex items-center justify-center w-full h-full"
    >
      <span className="text-[11px] md:text-xs font-black text-(--text-muted)">
        DAY
      </span>
      <div className="absolute top-0 bottom-0 left-full w-4 md:w-6 bg-linear-to-r from-(--bg-main) to-transparent pointer-events-none" />
      <div className="absolute top-full left-0 right-0 h-4 md:h-6 bg-linear-to-b from-(--bg-main) to-transparent pointer-events-none" />
    </div>,
  );

  // Headers
  Array.from({ length: 14 }).forEach((_, i) => {
    if (i === 6) {
      gridCells.push(
        <div
          key={`h-${i}`}
          className="sticky top-0 z-20 flex flex-col items-center justify-center bg-(--bg-main) w-full h-full"
        >
          <div className="absolute top-full left-0 right-0 h-4 md:h-6 bg-linear-to-b from-(--bg-main) to-transparent pointer-events-none" />
        </div>,
      );
      return;
    }

    const th = CAMPUS_SLOT_TIMINGS.Theory[i];
    const lb = CAMPUS_SLOT_TIMINGS.Lab[i];
    const isSame = th.start === lb.start && th.end === lb.end;
    const thStr =
      th.start !== "-"
        ? formatTimeStr(`${th.start} - ${th.end}`, use24HourTime)
        : null;
    const lbStr =
      lb.start !== "-"
        ? formatTimeStr(`${lb.start} - ${lb.end}`, use24HourTime)
        : null;

    let hasTheory = false;
    let hasLab = false;
    courses.forEach((c) => {
      if (getGridPositions(c.slot).some((p) => p.col === i)) {
        if (c.type.includes("Lab")) hasLab = true;
        else hasTheory = true;
      }
    });

    gridCells.push(
      <div
        key={`h-${i}`}
        className="sticky top-0 z-20 flex flex-col items-center justify-center gap-0.5 bg-(--bg-main) px-2 w-full h-full py-1"
      >
        <div className="absolute top-full left-0 right-0 h-4 md:h-6 bg-linear-to-b from-(--bg-main) to-transparent pointer-events-none" />
        {isSame && thStr && (hasTheory || hasLab) ? (
          <span className="text-[10px] md:text-xs font-bold text-(--text-muted) whitespace-nowrap">
            {thStr}
          </span>
        ) : (
          <>
            {thStr && hasTheory && (
              <span className="text-[9px] md:text-[10px] font-bold text-(--text-muted) whitespace-nowrap flex items-center gap-1">
                <span className="text-[8px] bg-(--bg-highlight) px-1 rounded text-(--text-main)">
                  T
                </span>{" "}
                {thStr}
              </span>
            )}
            {lbStr && hasLab && (
              <span className="text-[9px] md:text-[10px] font-bold text-(--text-muted) whitespace-nowrap flex items-center gap-1">
                <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded">
                  L
                </span>{" "}
                {lbStr}
              </span>
            )}
          </>
        )}
      </div>,
    );
  });

  // Rows
  activeDays.forEach((day) => {
    const dIdx = DAYS.indexOf(day);
    const shortDay = day.substring(0, 3).toUpperCase();

    gridCells.push(
      <div
        key={`d-${dIdx}`}
        className="sticky left-0 z-20 flex items-center justify-center bg-(--bg-main) text-(--text-muted) font-black font-expanded w-full h-full"
      >
        <span className="-rotate-90 text-sm md:text-base">{shortDay}</span>
        <div className="absolute top-0 bottom-0 left-full w-4 md:w-6 bg-linear-to-r from-(--bg-main) to-transparent pointer-events-none" />
      </div>,
    );

    for (let colIdx = 0; colIdx < 14; colIdx++) {
      if (colIdx === 6) {
        if (dIdx === 0) {
          const rowsToSpan = activeDays.length;
          gridCells.push(
            <div
              key={`c-lunch`}
              className="flex items-center justify-center overflow-hidden w-full h-full p-2"
              style={{ gridRow: `span ${rowsToSpan} / span ${rowsToSpan}` }}
            >
              <div className="h-full w-full flex items-center justify-center bg-(--bg-highlight)/50 rounded-2xl">
                <span
                  className="text-xs md:text-sm font-black text-(--text-muted) uppercase opacity-50 whitespace-nowrap tracking-widest"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  LUNCH
                </span>
              </div>
            </div>,
          );
        }
        continue;
      }

      const activeCourses = courses.filter((c) =>
        getGridPositions(c.slot).some(
          (p) => p.day === dIdx && p.col === colIdx,
        ),
      );
      const cellContent = activeCourses[0];

      if (cellContent) {
        const isLab = cellContent.type.includes("Lab");
        const attStr = attendance?.find(
          (a) => a.code === cellContent.code,
        )?.attendance;
        const emoji = getAttendanceEmoji(attStr);

        const lastCharMatch = cellContent.code.match(/[a-zA-Z]+$/);
        const courseBadge = lastCharMatch
          ? lastCharMatch[0].slice(-1).toUpperCase()
          : isLab
            ? "P"
            : "L";

        let colSpan = 1;
        // Look ahead to merge identical adjacent blocks (especially for labs)
        while (colIdx + colSpan < 14 && colIdx + colSpan !== 6) {
          const nextCourses = courses.filter((c) =>
            getGridPositions(c.slot).some(
              (p) => p.day === dIdx && p.col === colIdx + colSpan,
            ),
          );
          if (nextCourses[0] && nextCourses[0].code === cellContent.code) {
            colSpan++;
          } else {
            break;
          }
        }

        // --- Styled according to theme ---
        const colorClasses =
          "bg-(--bg-highlight) hover:bg-(--border-dim)";
        const titleColor = "text-(--text-main)";
        const slotColor = "text-(--text-muted)";
        const footerText = "text-(--text-muted)";

        gridCells.push(
          <div
            key={`c-${dIdx}-${colIdx}`}
            className="relative pt-2 pl-2 pr-1 pb-1 md:pt-2.5 md:pl-2.5 md:pr-1.5 md:pb-1.5 group bg-(--bg-main) h-full flex items-center justify-center"
            style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
          >
            <button
              data-tile="true"
              onClick={(e) => {
                e.stopPropagation();
                if (cellContent?.code) {
                  useDataStore.getState().setHighlightedCourseCode(cellContent.code);
                  onSelectCourse?.(cellContent.code);
                }
              }}
              className={`
                w-full h-full rounded-2xl flex flex-col items-start justify-start text-left overflow-hidden
                hover:-translate-y-0.5 group/cell
                ${colorClasses}
              `}
              style={{ transition: 'background-color var(--duration-slow) 0.075s, transform var(--duration-slow) var(--easing-overshoot), box-shadow var(--duration-slow) var(--easing-overshoot)' }}
            >
              <div className="mb-auto w-full flex flex-col items-start p-2.5 md:p-3 relative z-10">
                <div
                  className={`text-base sm:text-lg md:text-lg font-black font-expanded leading-tight md:leading-snug w-full flex items-start justify-between gap-1 ${titleColor}`}
                >
                  <span className="wrap-break-word pr-1">
                    {getCourseAcronym(cellContent.title)}
                  </span>
                  <span className="shrink-0 text-sm">{emoji}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Pill variant={isLab ? "main" : "surface"}>
                    {courseBadge}
                  </Pill>
                  <span
                    className={`text-[9px] sm:text-[10px] md:text-[11px] font-bold uppercase opacity-0 group-hover/cell:opacity-100 transition-opacity duration-fast ${slotColor}`}
                  >
                    {cellContent.slot}
                  </span>
                </div>
              </div>

              <div
                className={`flex items-center justify-center gap-1.5 w-full text-[8px] sm:text-[9px] md:text-[10px] uppercase font-black px-2.5 pt-1.5 pb-2 md:px-3 md:pt-2 md:pb-2 mt-auto relative z-10 ${footerText}`}
              >
                <LocationOn size={15} className={"shrink-0"} />
                <span className="truncate">{cellContent.venue}</span>
              </div>
            </button>
          </div>,
        );

        // Skip the columns we just spanned over
        colIdx += colSpan - 1;
      } else {
        gridCells.push(
          <div
            key={`c-${dIdx}-${colIdx}`}
            className="relative p-1 md:p-1.5 transition-colors bg-(--bg-main) w-full h-full flex items-center justify-center group/empty"
          >
            <div className="w-full h-full rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-fast delay-75 flex items-center justify-center">
              <span className="text-[10px] md:text-xs font-bold text-(--text-muted) opacity-0 group-hover/grid:opacity-50 group-hover/empty:opacity-100 transition-opacity duration-fast text-center flex flex-col pointer-events-none">
                <span>{CAMPUS_SLOTS[day as string]?.Theory[colIdx]}</span>
                {CAMPUS_SLOTS[day as string]?.Lab[colIdx] !== "-" &&
                  CAMPUS_SLOTS[day as string]?.Lab[colIdx] !==
                    CAMPUS_SLOTS[day as string]?.Theory[colIdx] && (
                    <span className="text-[8px] mt-0.5">
                      {CAMPUS_SLOTS[day as string]?.Lab[colIdx]}
                    </span>
                  )}
              </span>
            </div>
          </div>,
        );
      }
    }
  });

  return (
    <>
      <div
        ref={gridRef}
        className="h-full w-full bg-(--bg-main) overflow-hidden relative group/grid"
      >
        <div
          className="h-full w-full overflow-auto custom-scrollbar touch-pan-x touch-pan-y overscroll-none"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="grid min-w-400 md:min-w-475 xl:min-w-550 h-full grid-cols-[40px_repeat(6,minmax(0,1fr))_32px_repeat(7,minmax(0,1fr))] md:grid-cols-[50px_repeat(6,minmax(0,1fr))_40px_repeat(7,minmax(0,1fr))] grid-rows-[40px_repeat(6,minmax(120px,1fr))]">
            {gridCells}
          </div>
        </div>
      </div>
    </>
  );
});
