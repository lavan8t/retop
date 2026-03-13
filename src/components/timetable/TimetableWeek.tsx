// TimetableWeek.tsx
import React, { useMemo, useState, useEffect } from "react";
import { TimetableCourse } from "../../types/vtop";
import { getGridPositions, DAYS } from "../../utils/timetable-slots";
import { getCourseAcronym } from "../../utils/formatting";
import { User, MapPin, GraduationCap, Clock, Hash } from "lucide-react";

// Vertical Time Slots (Rows)
const TIME_ROWS = [
  { label: "08:00", hour: 8 },
  { label: "09:00", hour: 9 },
  { label: "10:00", hour: 10 },
  { label: "11:00", hour: 11 },
  { label: "12:00", hour: 12 },
  { label: "13:00", hour: 13 },
  { label: "14:00", hour: 14 },
  { label: "15:00", hour: 15 },
  { label: "16:00", hour: 16 },
  { label: "17:00", hour: 17 },
  { label: "18:00", hour: 18 },
  { label: "19:00", hour: 19 },
];

export const TimetableWeek = ({ courses }: { courses: TimetableCourse[] }) => {
  const weekDays = DAYS.slice(0, 5); // Mon-Fri
  // Track selected state to expand tiles
  const [selectedCell, setSelectedCell] = useState<{
    day: number;
    hour: number;
  } | null>(null);

  // Track current time
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const currentDayIndex = now.getDay() - 1; // 0=Mon, 4=Fri (JS Mon=1)
  const currentHour = now.getHours();

  // Structure: Day Index -> Hour -> Course
  const schedule = useMemo(() => {
    const map: Record<number, Record<number, TimetableCourse>> = {};

    // Initialize
    weekDays.forEach((_, i) => (map[i] = {}));

    courses.forEach((course) => {
      const positions = getGridPositions(course.slot);
      positions.forEach((pos) => {
        // Map column to hour
        let startHour = -1;
        if (pos.col <= 4)
          startHour = 8 + pos.col; // 0=8, 1=9... 4=12
        else if (pos.col === 5)
          startHour = 12; // Overlap for safe rendering visually
        else if (pos.col === 6)
          startHour = 13; // Lunch
        else if (pos.col >= 7) startHour = 14 + (pos.col - 7);

        if (startHour !== -1) {
          if (!map[pos.day]) map[pos.day] = {};
          map[pos.day][startHour] = course;
        }
      });
    });
    return map;
  }, [courses]);

  return (
    <div
      className="h-full w-full overflow-hidden flex flex-col bg-zinc-950 border-4 border-zinc-800 rounded-4xl shadow-xl relative"
      onClick={() => setSelectedCell(null)}
    >
      <div className="overflow-auto custom-scrollbar flex-1 relative w-full h-full">
        {/* Grid Container */}
        <div className="grid grid-cols-[50px_repeat(5,minmax(140px,1fr))] border-b-2 border-zinc-800 bg-zinc-950 min-h-full">
          {/* Corner (Time/Day intersection) */}
          <div className="sticky left-0 top-0 z-40 bg-zinc-950 border-r-2 border-b-2 border-zinc-800 flex items-center justify-center p-2 shadow-sm">
            <span className="text-[10px] font-black text-zinc-600 -rotate-45">
              TIME
            </span>
          </div>

          {/* Day Headers (Sticky Top) */}
          {weekDays.map((day, i) => {
            const isToday = currentDayIndex === i;
            return (
              <div
                key={`header-${day}`}
                className={`sticky top-0 z-30 border-b-2 border-r-2 last:border-r-0 p-3 text-center shadow-sm transition-colors ${
                  isToday
                    ? "bg-blue-950/30 border-blue-900/50 text-blue-400"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400"
                }`}
              >
                <span className="text-xl font-expanded font-bold uppercase tracking-widest block">
                  {day.substring(0, 3)}
                </span>
              </div>
            );
          })}

          {/* Time Labels (Sticky Left) & Grid Content */}
          {TIME_ROWS.map((time) => {
            const isCurrentHour = currentHour === time.hour;

            return (
              <React.Fragment key={`row-${time.hour}`}>
                {/* Time Label */}
                <div
                  className={`sticky left-0 z-20 border-r-2 border-b-2 border-zinc-800 flex flex-col items-center justify-start pt-2 ${
                    isCurrentHour
                      ? "bg-blue-950/20 text-blue-400"
                      : "bg-zinc-950 text-zinc-500"
                  }`}
                >
                  <span className="text-xs font-bold font-mono">
                    {time.label}
                  </span>
                </div>

                {/* Day Cells for this Hour */}
                {weekDays.map((day, dIdx) => {
                  const event = schedule[dIdx]?.[time.hour];
                  const isLunch = time.hour === 13;

                  // Check if this specific cell is selected
                  const isSelected =
                    selectedCell?.day === dIdx &&
                    selectedCell?.hour === time.hour;
                  const isCurrent =
                    currentDayIndex === dIdx && currentHour === time.hour;

                  // Determine colors based on type and status
                  // Use dark background (no transparency) for neutral state
                  // Border matches parent (zinc-800) by default
                  // Accent color (purple/blue) only on hover/selected

                  const isLab = event?.type.includes("Lab");
                  const baseBg = "bg-zinc-900"; // Dark, no transparency

                  // Hover effects: subtle border color change
                  const hoverClasses = isLab
                    ? "hover:border-purple-500/80 hover:bg-zinc-800"
                    : "hover:border-blue-500/80 hover:bg-zinc-800";

                  const selectedClasses = isLab
                    ? "bg-zinc-900 border-purple-500 text-purple-200"
                    : "bg-zinc-900 border-blue-500 text-blue-200";

                  const currentClasses =
                    isCurrent && !isSelected
                      ? isLab
                        ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-zinc-950"
                        : "ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-950"
                      : "";

                  return (
                    <div
                      key={`cell-${dIdx}-${time.hour}`}
                      className={`relative border-b-2 border-r-2 border-zinc-800/50 p-1 h-32 group transition-colors ${
                        // Use z-50 for parent when selected to ensure it sits on top of siblings
                        isSelected ? "z-60" : "z-10"
                      } ${
                        currentDayIndex === dIdx
                          ? "bg-zinc-800/20"
                          : "bg-transparent"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (event)
                          setSelectedCell({ day: dIdx, hour: time.hour });
                      }}
                    >
                      {isLunch ? (
                        <div className="w-full h-full flex items-center justify-center opacity-10 pointer-events-none">
                          <span className="text-xs font-black uppercase -rotate-45 tracking-widest text-zinc-600">
                            Lunch
                          </span>
                        </div>
                      ) : event ? (
                        <div
                          className={`
                                 w-full rounded-xl border-2 flex flex-col justify-between p-3
                                 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                                 cursor-default relative
                                 ${
                                   isSelected
                                     ? `h-auto min-h-full absolute left-1 right-1 scale-[1.02] z-70 ${selectedClasses} ${time.hour >= 15 ? "bottom-1" : "top-1"}`
                                     : `h-full ${baseBg} border-zinc-700/60 text-zinc-300 hover:text-zinc-50 ${hoverClasses} ${
                                         isCurrent ? currentClasses : ""
                                       }`
                                 }
                              `}
                        >
                          {/* Basic View (Always Visible) */}
                          <div className="flex justify-between items-start">
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded border-2 ${
                                isLab
                                  ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                                  : "border-blue-500/50 bg-blue-500/10 text-blue-300"
                              }`}
                            >
                              {event.slot}
                            </span>
                            {isCurrent && !isSelected && (
                              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            )}
                            {!isSelected && (
                              <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                                {elementTimeRange(time.hour)}
                              </span>
                            )}
                          </div>

                          <div
                            className={`mt-1 transition-all ${isSelected ? "mb-4" : ""}`}
                          >
                            <h3
                              className={`text-sm md:text-base font-expanded font-bold leading-tight ${isSelected ? "" : "line-clamp-2"}`}
                            >
                              {isSelected
                                ? event.title
                                : getCourseAcronym(event.title)}
                            </h3>
                            <p className="text-[10px] font-bold opacity-70 mt-0.5 truncate">
                              {event.code}
                            </p>
                          </div>

                          {/* Expanded Content (Only on Selected) */}
                          {isSelected && (
                            <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-300 text-zinc-100">
                              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/20 border border-white/10">
                                <div className="p-1 rounded bg-black/40 text-inherit opacity-80">
                                  <User className="w-3 h-3" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] font-bold opacity-60 uppercase tracking-wider line-clamp-1">
                                    Faculty
                                  </p>
                                  <p className="text-[10px] font-bold truncate">
                                    {event.faculty}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/20 border border-white/10">
                                  <div className="p-1 rounded bg-black/40 text-inherit opacity-80">
                                    <Hash className="w-3 h-3" />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-wider">
                                      Class ID
                                    </p>
                                    <p className="text-[10px] font-bold">
                                      {event.classId}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/20 border border-white/10">
                                  <div className="p-1 rounded bg-black/40 text-inherit opacity-80">
                                    <GraduationCap className="w-3 h-3" />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-wider">
                                      Credits
                                    </p>
                                    <p className="text-[10px] font-bold">
                                      {event.credits}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/20 border border-white/10 col-span-2">
                                  <div className="p-1 rounded bg-black/40 text-inherit opacity-80">
                                    <Clock className="w-3 h-3" />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-wider">
                                      Time
                                    </p>
                                    <p className="text-[10px] font-bold">
                                      {elementTimeRange(time.hour)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div
                            className={`flex items-center gap-2 ${isSelected ? "mt-3 pt-3 border-t border-white/10" : "mt-auto"}`}
                          >
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 bg-black/20 flex items-center gap-1.5 text-inherit opacity-90">
                              <MapPin className="w-3 h-3 opacity-70" />
                              {event.venue}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const elementTimeRange = (hour: number) => {
  return `${hour}:00 - ${hour}:50`;
};
