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

  // Ref for click-outside detection
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // If clicking inside the grid container (which includes tiles),
      // the tile click handler will run first (React event vs Native) or bubble.
      // But we need to detect clicking on *empty space* or *outside*.
      // If clicking on a tile button, we don't want to close (we switch).
      // The tile button sets the state.
      // If clicking "outside" the popup AND outside the tile buttons...
      // The popup itself stops propagation on click.
      // The tile buttons stop propagation? If they don't, the click bubbles to document.
      // Easiest logic:
      // If target is NOT inside a tile button AND NOT inside the popup, close it.
      // BUT popup is rendered as sibling.
      // The popup has stopPropagation on its container.
      // So clicks inside popup won't reach here if we attach to window/document.
      // Wait, native events vs React.
      // Let's rely on the fact that if we click a tile, we set state.
      // If we click empty space, we want to clear state.
    };

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isTileButton = target.closest('button[data-tile="true"]');
      const isPopup = target.closest(".course-popup-container"); // We need to add this class to popup

      // If clicking a tile, let the tile logic handle it (which sets state)
      if (isTileButton) return;

      // If inside popup (which we'll add a check for), ignore
      // Actually, we removed the overlay. The popup content should stop propagation?
      // Yes, typical modal behavior.

      // If clicking anywhere else (empty grid, outside grid), close.
      setSelectedCourse(null);
    };

    // We actually need this on window to catch clicks outside the grid too.
    // However, the popup handles its own clicks with stopPropagation?
    // In CoursePopup.tsx: <div onClick={(e) => e.stopPropagation()} ...>
    // So clicks inside popup won't reach document listener if we use React onClick?
    // No, React events bubble to document usually.
    // But native stopPropagation prevents it.

    // Let's try adding a simple global click listener.
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

  const activeDays = useMemo(() => {
    // Show all 5 days for consistency
    const activeIndices = new Set([0, 1, 2, 3, 4]);
    return Array.from(activeIndices)
      .sort((a, b) => a - b)
      .map((i) => DAYS[i]);
  }, [courses]);

  const gridCells: React.ReactNode[] = [];

  // Corner Header
  gridCells.push(
    <div
      key="h-corner"
      className="sticky left-0 top-0 z-30 bg-zinc-950 border-b-2 border-r-2 border-zinc-900 flex items-center justify-center shadow-md h-12"
    >
      <span className="text-[10px] font-black text-zinc-600 tracking-wider">
        DAY
      </span>
    </div>,
  );

  // Column Headers
  columns.forEach((col, i) => {
    // Lunch Header
    if (i === 6) {
      gridCells.push(
        <div
          key={`h-${i}`}
          className="sticky top-0 z-20 flex flex-col items-center justify-center bg-zinc-900 border-b-2 border-zinc-800 h-12 shadow-sm"
        >
          {/* Empty header for Lunch column */}
        </div>,
      );
      return;
    }

    gridCells.push(
      <div
        key={`h-${i}`}
        className="sticky top-0 z-20 flex flex-col items-center justify-center bg-zinc-900 border-b-2 border-r-2 border-zinc-800 h-12 shadow-sm px-1"
      >
        <span className="text-[10px] font-bold text-zinc-400 whitespace-nowrap">
          {col.label}
        </span>
      </div>,
    );
  });

  // Grid Body
  activeDays.forEach((day) => {
    const dIdx = DAYS.indexOf(day);
    const shortDay = day.substring(0, 3).toUpperCase();

    // Day Row Header
    gridCells.push(
      <div
        key={`d-${dIdx}`}
        className="sticky left-0 z-20 flex items-center justify-center bg-zinc-950 border-b border-r-2 border-zinc-900 text-zinc-500 font-black font-expanded shadow-lg"
      >
        <span className="-rotate-90 tracking-tighter text-xs md:text-sm">
          {shortDay}
        </span>
      </div>,
    );

    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      // Lunch Column check
      if (colIdx === 6) {
        gridCells.push(
          <div
            key={`c-${dIdx}-${colIdx}`}
            className="bg-zinc-900 border-b border-zinc-800 flex items-center justify-center overflow-hidden"
          >
            <div className="h-full w-full flex items-center justify-center">
              <span
                className="text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase opacity-70 whitespace-nowrap"
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
          className="relative border-b border-r border-zinc-800 p-1 group transition-colors bg-zinc-950/50"
        >
          {cellContent ? (
            <button
              data-tile="true"
              onClick={(e) => {
                e.stopPropagation(); // Stop propagation to document click
                const rect = e.currentTarget.getBoundingClientRect();
                setSelectedCourse({
                  data: cellContent,
                  position: { x: rect.left, y: rect.bottom + 10 },
                });
              }}
              className={`
                w-full h-full rounded-xl flex flex-col items-start justify-start text-left p-2 md:p-3
                transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                hover:scale-[1.02] hover:z-50 hover:shadow-2xl border-2
                ${
                  cellContent.type.includes("Lab")
                    ? "bg-purple-950/30 text-purple-300 border-purple-900/50 shadow-[4px_4px_0px_0px_rgba(168,85,247,0.1)] hover:border-purple-500 hover:bg-purple-900/40 hover:shadow-[6px_6px_0px_0px_rgba(168,85,247,0.2)]"
                    : "bg-blue-950/30 text-blue-300 border-blue-900/50 shadow-[4px_4px_0px_0px_rgba(59,130,246,0.1)] hover:border-blue-500 hover:bg-blue-900/40 hover:shadow-[6px_6px_0px_0px_rgba(59,130,246,0.2)]"
                }
              `}
            >
              <span className="text-xl md:text-2xl font-black font-expanded leading-[0.85] tracking-tight mb-auto w-full wrap-break-word">
                {getCourseAcronym(cellContent.title)}
              </span>
              <span className="text-[10px] md:text-xs uppercase font-bold tracking-widest opacity-80 mt-1 bg-black/40 px-2 py-1 rounded-md border border-white/10 w-fit truncate max-w-full">
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
        className="h-full w-full rounded-4xl border-4 border-zinc-900 bg-(--bg-main) shadow-2xl overflow-hidden relative"
      >
        <div className="h-full w-full overflow-auto custom-scrollbar rounded-xl">
          {/* 
            Grid Cols:
            1. Day Label (40px)
            2. First 6 slots (1fr each)
            3. Lunch (32px fixed narrow)
            4. Last 7 slots (1fr each)
            
            Grid Rows:
            1. Header (48px)
            2. 5 Days (minmax 120px)
           */}
          <div className="grid min-w-250 h-full grid-cols-[40px_repeat(6,minmax(0,1fr))_32px_repeat(7,minmax(0,1fr))] grid-rows-[48px_repeat(5,minmax(120px,1fr))]">
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
