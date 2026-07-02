import React, { useMemo, useState, useEffect, useRef } from "react";
import { TimetableCourse, CourseSummary } from "../../types/vtop";
import { getGridPositions, DAYS, CAMPUS_SLOT_TIMINGS } from "../../utils/timetable-slots";
import { getCourseAcronym, formatTimeStr } from "../../utils/formatting";
import { CoursePopup } from "./CoursePopup";
import { Icon } from "@iconify-icon/react";

const getAttendanceEmoji = (attendanceStr?: string) => {
  if (!attendanceStr) return "";
  const val = parseFloat(attendanceStr);
  if (isNaN(val)) return "";
  if (val > 90) return "😎";
  if (val > 80) return "😄";
  if (val > 75) return "😐";
  return "😭";
};

export const TimetableGrid = ({
  courses,
  attendance,
  use24HourTime = true,
}: {
  courses: TimetableCourse[];
  attendance: CourseSummary[];
  use24HourTime?: boolean;
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
      className="sticky left-0 top-0 z-30 bg-zinc-950 border-b-2 border-r-2 border-zinc-900 flex items-center justify-center shadow-md w-full h-full"
    >
      <span className="text-[11px] md:text-xs font-black text-zinc-600 ">
        DAY
      </span>
    </div>,
  );

  // Headers
  Array.from({ length: 14 }).forEach((_, i) => {
    if (i === 6) {
      gridCells.push(
        <div
          key={`h-${i}`}
          className="sticky top-0 z-20 flex flex-col items-center justify-center bg-zinc-900 border-b-2 border-zinc-800 shadow-sm w-full h-full"
        ></div>,
      );
      return;
    }
    
    const th = CAMPUS_SLOT_TIMINGS.Theory[i];
    const lb = CAMPUS_SLOT_TIMINGS.Lab[i];
    const isSame = th.start === lb.start && th.end === lb.end;
    const thStr = th.start !== "-" ? formatTimeStr(`${th.start} - ${th.end}`, use24HourTime) : null;
    const lbStr = lb.start !== "-" ? formatTimeStr(`${lb.start} - ${lb.end}`, use24HourTime) : null;

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
        className="sticky top-0 z-20 flex flex-col items-center justify-center gap-0.5 bg-zinc-900 border-b-2 border-r-2 border-zinc-800 shadow-sm px-2 w-full h-full py-1"
      >
        {isSame && thStr && (hasTheory || hasLab) ? (
          <span className="text-[10px] md:text-xs font-bold text-zinc-400 whitespace-nowrap">
            {thStr}
          </span>
        ) : (
          <>
            {thStr && hasTheory && (
              <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 whitespace-nowrap flex items-center gap-1">
                <span className="text-[8px] bg-zinc-800 px-1 rounded text-zinc-500">T</span> {thStr}
              </span>
            )}
            {lbStr && hasLab && (
              <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 whitespace-nowrap flex items-center gap-1">
                <span className="text-[8px] bg-purple-900/50 text-purple-400 px-1 rounded">L</span> {lbStr}
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
        className="sticky left-0 z-20 flex items-center justify-center bg-zinc-950 border-b border-r-2 border-zinc-900 text-zinc-500 font-black font-expanded shadow-lg w-full h-full"
      >
        <span className="-rotate-90  text-sm md:text-base">
          {shortDay}
        </span>
      </div>,
    );

    for (let colIdx = 0; colIdx < 14; colIdx++) {
      if (colIdx === 6) {
        gridCells.push(
          <div
            key={`c-${dIdx}-${colIdx}`}
            className="bg-zinc-900 border-b border-zinc-800 flex items-center justify-center overflow-hidden w-full h-full"
          >
            <div className="h-full w-full flex items-center justify-center">
              <span
                className="text-xs md:text-sm font-black text-zinc-600  uppercase opacity-70 whitespace-nowrap"
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

        // --- Solid Neon Theme Colors (Home Screen Style) ---
        const colorClasses = isLab
          ? "bg-purple-400 border-(--border-main) hover:shadow-[4px_4px_0px_0px_var(--shadow-main)]"
          : "bg-cyan-400 border-(--border-main) hover:shadow-[4px_4px_0px_0px_var(--shadow-main)]";

        const titleColor = "text-black";
        const slotColor = "text-black/70";

        // Footer styling
        const footerBg = "bg-white/30 border-(--border-main)";
        const footerText = "text-black/80";

        gridCells.push(
          <div
            key={`c-${dIdx}-${colIdx}`}
            className="relative border-b border-r border-zinc-800 p-1 md:p-1.5 group transition-colors bg-(--bg-main) w-full h-full"
          >
            <button
              data-tile="true"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setSelectedCourse({
                  data: cellContent,
                  position: { x: rect.left, y: rect.bottom + 10 },
                });
              }}
              className={`
                w-full h-full rounded-xl flex flex-col items-start justify-start text-left overflow-hidden
                transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                hover:-translate-y-0.5 border-2
                ${colorClasses}
              `}
            >
              <div className="mb-auto w-full flex flex-col items-start p-2.5 md:p-3">
                <div
                  className={`text-base sm:text-lg md:text-lg font-black font-expanded leading-tight md:leading-snug  w-full flex items-start justify-between gap-1 ${titleColor}`}
                >
                  <span className="wrap-break-word pr-1">
                    {getCourseAcronym(cellContent.title)}
                  </span>
                  <span className="shrink-0 text-sm">{emoji}</span>
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] md:text-[11px] font-bold mt-1 uppercase  ${slotColor}`}
                >
                  {cellContent.slot}
                </span>
              </div>

              <div
                className={`flex items-center gap-1.5 w-full text-[8px] sm:text-[9px] md:text-[10px] uppercase font-black  px-2.5 pt-1.5 pb-2 md:px-3 md:pt-2 md:pb-2 border-t-2 mt-auto ${footerBg} ${footerText}`}
              >
                <Icon
                  icon="heroicons:map-pin-20-solid"
                  width="15"
                  height="15"
                  className="shrink-0"
                />
                <span className="truncate">{cellContent.venue}</span>
              </div>
            </button>
          </div>,
        );
      } else {
        gridCells.push(
          <div
            key={`c-${dIdx}-${colIdx}`}
            className="relative border-b border-r border-zinc-800 p-1 md:p-1.5 group transition-colors bg-(--bg-main) w-full h-full"
          >
            <div className="w-full h-full rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"></div>
          </div>,
        );
      }
    }
  });

  return (
    <>
      <div
        ref={gridRef}
        className="h-full w-full bg-(--bg-main) overflow-hidden relative"
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
      <CoursePopup
        course={selectedCourse?.data || null}
        position={selectedCourse?.position || null}
        attendance={
          attendance?.find((a) => a.code === selectedCourse?.data.code)
            ?.attendance
        }
        onClose={() => setSelectedCourse(null)}
      />
    </>
  );
};
