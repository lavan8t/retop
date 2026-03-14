import React, { useMemo, useState, useEffect, useRef } from "react";
import { TimetableCourse } from "../../types/vtop";
import { getGridPositions, DAYS } from "../../utils/timetable-slots";
import { getCourseAcronym } from "../../utils/formatting";
import { CoursePopup } from "./CoursePopup";

export const TimetableGrid = ({ courses }: { courses: TimetableCourse[] }) => {
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

  const columns = [
    { label: "8 - 8:50" },
    { label: "9 - 9:50" },
    { label: "10 - 10:50" },
    { label: "11 - 11:50" },
    { label: "12 - 12:50" },
    { label: "12:30 - 1:20", sub: "LAB" },
    { label: "LUNCH" },
    { label: "2 - 2:50" },
    { label: "3 - 3:50" },
    { label: "4 - 4:50" },
    { label: "5 - 5:50" },
    { label: "6 - 6:50" },
    { label: "6:30 - 7:20", sub: "LAB" },
    { label: "7 - 7:50" },
  ];

  // Logic for the 6 Days (Mon - Sat)
  const activeDays = useMemo(() => {
    return [0, 1, 2, 3, 4, 5].map((i) => DAYS[i]);
  }, []);

  const gridCells: React.ReactNode[] = [];

  // Corner
  gridCells.push(
    <div
      key="h-corner"
      className="sticky left-0 top-0 z-30 bg-zinc-950 border-b-2 border-r-2 border-zinc-900 flex items-center justify-center shadow-md w-full h-full"
    >
      <span className="text-[11px] md:text-xs font-black text-zinc-600 tracking-wider">
        DAY
      </span>
    </div>,
  );

  // Headers
  columns.forEach((col, i) => {
    if (i === 6) {
      gridCells.push(
        <div
          key={`h-${i}`}
          className="sticky top-0 z-20 flex flex-col items-center justify-center bg-zinc-900 border-b-2 border-zinc-800 shadow-sm w-full h-full"
        ></div>,
      );
      return;
    }
    gridCells.push(
      <div
        key={`h-${i}`}
        className="sticky top-0 z-20 flex flex-col items-center justify-center bg-zinc-900 border-b-2 border-r-2 border-zinc-800 shadow-sm px-2 w-full h-full"
      >
        <span className="text-[11px] md:text-xs font-bold text-zinc-400 whitespace-nowrap">
          {col.label}
        </span>
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
        <span className="-rotate-90 tracking-tighter text-sm md:text-base">
          {shortDay}
        </span>
      </div>,
    );

    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      if (colIdx === 6) {
        gridCells.push(
          <div
            key={`c-${dIdx}-${colIdx}`}
            className="bg-zinc-900 border-b border-zinc-800 flex items-center justify-center overflow-hidden w-full h-full"
          >
            <div className="h-full w-full flex items-center justify-center">
              <span
                className="text-xs md:text-sm font-black text-zinc-600 tracking-[0.2em] uppercase opacity-70 whitespace-nowrap"
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

      gridCells.push(
        <div
          key={`c-${dIdx}-${colIdx}`}
          className="relative border-b border-r border-zinc-800 p-1 md:p-1.5 group transition-colors bg-zinc-950/50 w-full h-full"
        >
          {cellContent ? (
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
                w-full h-full rounded-xl flex flex-col items-start justify-start text-left p-2.5 md:p-3
                transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                hover:scale-[1.02] hover:z-50 hover:shadow-2xl border-2
                ${cellContent.type.includes("Lab") ? "bg-purple-950/30 text-purple-300 border-purple-900/50 shadow-[4px_4px_0px_0px_rgba(168,85,247,0.1)] hover:border-purple-500 hover:bg-purple-900/40" : "bg-blue-950/30 text-blue-300 border-blue-900/50 shadow-[4px_4px_0px_0px_rgba(59,130,246,0.1)] hover:border-blue-500 hover:bg-blue-900/40"}
              `}
            >
              <span className="text-base sm:text-lg md:text-lg font-black font-expanded leading-tight md:leading-snug tracking-tight mb-auto w-full wrap-break-word">
                {getCourseAcronym(cellContent.title)}
              </span>
              <span className="text-[10px] sm:text-[11px] md:text-xs uppercase font-bold tracking-widest opacity-90 mt-1.5 bg-black/40 px-2 py-1 rounded-md border border-white/10 w-fit truncate max-w-full">
                {cellContent.venue}
              </span>
            </button>
          ) : (
            <div className="w-full h-full rounded hover:bg-zinc-900/30 transition-colors"></div>
          )}
        </div>,
      );
    }
  });

  return (
    <>
      <div
        ref={gridRef}
        className="h-full w-full rounded-2xl md:rounded-4xl border-2 md:border-4 border-zinc-900 bg-(--bg-main) shadow-2xl overflow-hidden relative"
      >
        <div
          className="h-full w-full overflow-auto custom-scrollbar rounded-xl pb-32 xl:pb-0 touch-pan-x touch-pan-y overscroll-none cursor-grab active:cursor-grabbing"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="grid min-w-400 md:min-w-350 xl:min-w-400 h-full grid-cols-[40px_repeat(6,minmax(0,1fr))_32px_repeat(7,minmax(0,1fr))] md:grid-cols-[50px_repeat(6,minmax(0,1fr))_40px_repeat(7,minmax(0,1fr))] grid-rows-[40px_repeat(6,minmax(85px,1fr))]">
            {gridCells}
          </div>
        </div>
      </div>
      <CoursePopup
        course={selectedCourse?.data || null}
        position={selectedCourse?.position || null}
        onClose={() => setSelectedCourse(null)}
      />
    </>
  );
};
