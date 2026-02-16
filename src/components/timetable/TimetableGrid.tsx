import React, { useMemo, useState } from "react";
import { TimetableCourse } from "../../types/vtop";
import { getGridPositions, DAYS } from "../../utils/timetable-slots";
import { getCourseAcronym } from "../../utils/formatting";
import { CoursePopup } from "./CoursePopup";

export const TimetableGrid = ({ courses }: { courses: TimetableCourse[] }) => {
  const [selectedCourse, setSelectedCourse] = useState<TimetableCourse | null>(
    null,
  );

  const columns = [
    { label: "08", sub: "08:50" },
    { label: "09", sub: "09:50" },
    { label: "10", sub: "10:50" },
    { label: "11", sub: "11:50" },
    { label: "12", sub: "12:50" },
    { label: "-", sub: "LAB" },
    { label: "LN", sub: "" },
    { label: "14", sub: "14:50" },
    { label: "15", sub: "15:50" },
    { label: "16", sub: "16:50" },
    { label: "17", sub: "17:50" },
    { label: "18", sub: "18:50" },
    { label: "-", sub: "LAB" },
    { label: "19", sub: "19:50" },
  ];

  const activeDays = useMemo(() => {
    const activeIndices = new Set([0, 1, 2, 3, 4]);
    return Array.from(activeIndices)
      .sort((a, b) => a - b)
      .map((i) => DAYS[i]);
  }, [courses]);

  const gridCells: React.ReactNode[] = [];

  gridCells.push(
    <div
      key="h-corner"
      className="sticky left-0 top-0 z-30 bg-zinc-950 border-b-4 border-r-4 border-zinc-800 flex items-center justify-center shadow-md h-16"
    >
      <span className="text-[10px] font-black text-zinc-600">DAY</span>
    </div>,
  );

  columns.forEach((col, i) => {
    gridCells.push(
      <div
        key={`h-${i}`}
        className="sticky top-0 z-20 flex flex-col items-center justify-center bg-zinc-900 border-b-4 border-r-2 border-zinc-800 min-w-[50px] h-16 shadow-md"
      >
        <span className="text-xs font-black text-zinc-300">{col.label}</span>
      </div>,
    );
  });

  activeDays.forEach((day) => {
    const dIdx = DAYS.indexOf(day);
    const shortDay = day.substring(0, 3).toUpperCase();

    gridCells.push(
      <div
        key={`d-${dIdx}`}
        className="sticky left-0 z-20 flex items-center justify-center bg-zinc-950 border-b-2 border-r-4 border-zinc-800 text-zinc-500 font-black font-expanded shadow-lg"
      >
        <span className="-rotate-90 tracking-tighter text-xs md:text-sm">
          {shortDay}
        </span>
      </div>,
    );

    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      if (colIdx === 6) {
        gridCells.push(
          <div
            key={`c-${dIdx}-${colIdx}`}
            className="bg-zinc-950/80 border-b border-r border-zinc-800/50 flex items-center justify-center"
          >
            <div className="w-1 h-1 bg-zinc-800 rounded-full"></div>
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
          className="relative border-b border-r border-zinc-800/50 p-1.5 group transition-colors bg-zinc-950"
        >
          {cellContent ? (
            <button
              onClick={() => setSelectedCourse(cellContent)}
              className={`
                w-full h-full rounded-xl flex flex-col items-center justify-center text-center p-2
                transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                hover:scale-[1.1] hover:z-50 hover:shadow-[0px_10px_20px_rgba(0,0,0,0.5)] border-2
                ${
                  cellContent.type.includes("Lab")
                    ? "bg-purple-600 border-purple-400 shadow-[4px_4px_0px_rgba(88,28,135,0.4)]"
                    : "bg-blue-600 border-blue-400 shadow-[4px_4px_0px_rgba(30,58,138,0.4)]"
                }
              `}
            >
              <span className="text-xs md:text-sm font-black text-white leading-none tracking-tight drop-shadow-md">
                {getCourseAcronym(cellContent.title)}
              </span>
              <span className="text-[9px] text-white/90 mt-1 font-bold bg-black/20 px-1.5 rounded hidden md:block">
                {cellContent.venue}
              </span>
            </button>
          ) : (
            <div className="w-full h-full rounded-lg hover:bg-zinc-900/50 transition-colors"></div>
          )}
        </div>,
      );
    }
  });

  return (
    <>
      <div className="h-full w-full rounded-[2.5rem] border-4 border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden p-2 relative">
        <div className="h-full w-full overflow-auto custom-scrollbar rounded-[2rem]">
          <div className="grid min-w-[900px] h-full grid-cols-[48px_repeat(14,1fr)] grid-rows-[64px_repeat(5,minmax(140px,1fr))]">
            {gridCells}
          </div>
        </div>
      </div>
      <CoursePopup
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
    </>
  );
};
