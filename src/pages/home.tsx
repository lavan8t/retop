import React, { useState, useEffect, useMemo, useRef } from "react";
import { AppSettings } from "../utils/settings-store";
import {
  CourseSummary,
  Assignment,
  QuickLink,
  MenuCategory,
  TimetableCourse,
  Event,
} from "../types/vtop";
import { UpcomingClass } from "../utils/timetable-slots";
import { useDataStore } from "../store/dataStore";

// Extracted Component Imports
import { CoursePopup } from "../components/timetable/CoursePopup";
import { LazyCalendarDay } from "../components/home/LazyCalendarDay";
import { QuickLinksMenu } from "../components/home/QuickLinksMenu";
import { HomeWidgets } from "../components/home/HomeWidgets";
import { getClassesForDate } from "../utils/timetable-helpers";

interface HomeViewProps {
  settings: AppSettings;
  stats: {
    cgpa: string;
    credits: string;
    totalCredits?: string;
    nonGraded?: string;
    placement?: string;
  };
  attendance: CourseSummary[];
  assignments: Assignment[];
  events: Event[];
  upcoming: UpcomingClass[];
  dayName: string;
  menuCategories: MenuCategory[];
  onNavigate: (link: QuickLink) => void;
  ttCourses: TimetableCourse[]; // Added to pass full timetable
  use24HourTime?: boolean;
  calSemesters?: { id: string; label: string }[];
  calSelectedSem?: string;
  pinnedLinks?: QuickLink[];
  handleTogglePin?: (link: QuickLink) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  settings,
  stats,
  attendance,
  assignments,
  events,
  upcoming,
  dayName,
  menuCategories,
  onNavigate,
  ttCourses,
  use24HourTime = true,
  calSemesters = [],
  calSelectedSem = "",
  pinnedLinks = [],
  handleTogglePin,
}) => {
  const [eventFilter, setEventFilter] = useState<
    "all" | "classes" | "assignments" | "events"
  >("all");
  const [daysToShow, setDaysToShow] = useState(15);

  const { calGridData } = useDataStore();

  const [selectedCourse, setSelectedCourse] = useState<{
    data: UpcomingClass;
    pos: { x: number; y: number };
  } | null>(null);

  const progressInfo = useMemo(() => {
    let firstDay: Date | null = null;
    let lastDay: Date | null = null;

    for (const month of calGridData) {
      for (const day of month.days) {
        if (day.isInstructional && day.dateObj) {
          const d = new Date(day.dateObj);
          if (!firstDay || d < firstDay) firstDay = d;
          if (!lastDay || d > lastDay) lastDay = d;
        }
      }
    }

    if (!firstDay || !lastDay) return { percentage: 0, lastDay: null };

    const start = firstDay.getTime();
    const end = lastDay.getTime();
    const now = new Date().getTime();

    if (now < start) return { percentage: 0, lastDay };
    if (now > end) return { percentage: 100, lastDay };
    return {
      percentage: Math.round(((now - start) / (end - start)) * 100),
      lastDay,
    };
  }, [calGridData]);
  const progress = progressInfo.percentage;

  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  }, [daysToShow]);

  const monthDisplay = useMemo(() => {
    if (calendarDays.length === 0) return { text: "", semName: "" };
    const startM = calendarDays[0].toLocaleDateString("en-US", {
      month: "long",
    });
    const endM = calendarDays[calendarDays.length - 1].toLocaleDateString(
      "en-US",
      { month: "long", year: "numeric" },
    );

    let base = "";
    if (startM === endM.split(" ")[0]) {
      base = endM;
    } else {
      base = `${startM} - ${endM}`;
    }

    const semName =
      calSemesters.find((s) => s.id === calSelectedSem)?.label || "";
    return { text: base, semName };
  }, [calendarDays, calSemesters, calSelectedSem]);

  const todayRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  useEffect(() => {
    if (initialScrollDone.current) return;
    const t = setTimeout(() => {
      if (nowRef.current || todayRef.current) {
        if (nowRef.current) {
          nowRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (todayRef.current) {
          todayRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        initialScrollDone.current = true;
      }
    }, 300);
    return () => clearTimeout(t);
  }, [calendarDays]);

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-6 py-0 pl-4 pr-0 md:py-0 md:pl-6 md:pr-0 lg:py-0 lg:px-8 overflow-y-auto lg:overflow-hidden bg-(--bg-main) max-w-425 mx-auto relative">
      <QuickLinksMenu
        menuCategories={menuCategories}
        onNavigate={onNavigate}
        pinnedLinks={pinnedLinks}
        handleTogglePin={handleTogglePin}
        attendance={attendance}
        ttCourses={ttCourses}
      />

      {/* CENTER PANE: Surface Level Unified Event CalendarMonth */}
      <div className="flex-none lg:flex-1 w-full flex flex-col gap-6 md:gap-8 overflow-hidden pt-1 pl-1 md:pl-0 min-h-0">
        <div className="flex flex-col items-center mb-2 lg:mb-4 px-2 w-full relative z-[95] pointer-events-auto pt-20 md:pt-24 lg:pt-28">
          <div className="flex flex-col items-center w-full">
            {/* Month Header and Filter Chips in a 3-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 w-full items-center mb-6 px-1 pt-4 gap-4 md:gap-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate({ title: "Academic Calendar", url: "academics/common/CalendarPreview", category: "Academics" });
                }}
                className="text-base md:text-lg font-bold text-(--text-main) hover:text-(--accent-hover) cursor-pointer transition-colors text-left flex justify-start focus:outline-none"
              >
                {monthDisplay.text}
              </button>

              {/* Filter Chips */}
              <div className="flex items-center justify-center gap-0.5 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEventFilter("all");
                  }}
                  className={`px-3 md:px-5 py-1.5 text-xs font-bold transition-all duration-fast ${
                    eventFilter === "all"
                      ? "bg-(--text-main) text-(--bg-main) rounded-[20px] shadow-none"
                      : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) rounded-l-[20px] rounded-r-md shadow-none"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEventFilter("classes");
                  }}
                  className={`px-3 md:px-5 py-1.5 text-xs font-bold transition-all duration-fast ${
                    eventFilter === "classes"
                      ? "bg-(--text-main) text-(--bg-main) rounded-[20px] shadow-none"
                      : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) rounded-md shadow-none"
                  }`}
                >
                  Classes
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEventFilter("assignments");
                  }}
                  className={`px-3 md:px-5 py-1.5 text-xs font-bold transition-all duration-fast ${
                    eventFilter === "assignments"
                      ? "bg-(--text-main) text-(--bg-main) rounded-[20px] shadow-none"
                      : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) rounded-md shadow-none"
                  }`}
                >
                  Tasks
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEventFilter("events");
                  }}
                  className={`px-3 md:px-5 py-1.5 text-xs font-bold transition-all duration-fast ${
                    eventFilter === "events"
                      ? "bg-(--text-main) text-(--bg-main) rounded-[20px] shadow-none"
                      : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) rounded-l-md rounded-r-[20px] shadow-none"
                  }`}
                >
                  Events
                </button>
              </div>

              {monthDisplay.semName ? (
                <div className="flex justify-end items-start h-8 relative z-20 pt-1">
                  <style>{`
                    .sem-text { font-variation-settings: "wdth" 151, "wght" 800; transition: font-variation-settings 300ms ease-out; }
                    .sem-group:hover .sem-text { font-variation-settings: "wdth" 75, "wght" 1; }
                  `}</style>
                  <div 
                    className="flex flex-col items-end justify-start group sem-group relative"
                    style={{ "--progress": `${progress}%` } as any}
                  >
                    <div className="relative text-right flex flex-col w-full min-w-[120px]">
                      <div className="relative text-sm md:text-base leading-none transition-all duration-fast ease-out font-expanded sem-text">
                        <span className="text-(--text-main) group-hover:text-(--text-muted) group-hover:opacity-50 whitespace-nowrap transition-all duration-fast">
                          {monthDisplay.semName}
                        </span>
                        <span
                          className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-(--text-main) pointer-events-none transition-[width,opacity] duration-normal ease-out opacity-0 group-hover:opacity-100 w-0 group-hover:w-[var(--progress)]"
                        >
                          {monthDisplay.semName}
                        </span>
                      </div>
                      <div className="w-full bg-(--border-dim) mt-1 relative transition-all duration-normal ease-out h-[0px] opacity-0 group-hover:h-[6px] group-hover:opacity-100 rounded-full overflow-hidden">
                         <div className="absolute left-0 top-0 h-full bg-(--accent-base) transition-[width] duration-normal ease-out w-0 group-hover:w-[var(--progress)]" />
                      </div>
                    </div>
                    
                    <div className="absolute top-full left-0 right-0 mt-1 transition-all duration-normal ease-out opacity-0 -translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 flex justify-between items-center whitespace-nowrap">
                      <span className="text-[10px] md:text-[11px] font-bold flex items-center justify-between w-full pt-1 drop-shadow-md">
                        <span className="font-black text-(--accent-base) text-left">
                          {progress}%
                        </span>
                        <span className="font-black text-(--accent-base) text-right">
                          {progressInfo.lastDay
                            ? progressInfo.lastDay.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
                            : "N/A"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>

        {/* Surface level list (no card wrapper) */}
        <div
          className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-3 pb-32 pt-37.5 -mt-30 -mb-12 relative z-0 pointer-events-auto"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)",
          }}
        >
          {calendarDays.map((d, dIdx) => (
            <LazyCalendarDay
              key={dIdx}
              d={d}
              dIdx={dIdx}
              calGridData={calGridData}
              eventFilter={eventFilter}
              assignments={assignments}
              events={events}
              getClassesForDate={(date: Date, evt: any) => getClassesForDate(date, ttCourses, evt)}
              use24HourTime={use24HourTime}
              todayRef={todayRef}
              nowRef={nowRef}
              setSelectedCourse={setSelectedCourse}
            />
          ))}

        </div>
      </div>

      <HomeWidgets settings={settings} stats={stats} onNavigate={onNavigate} />

      <CoursePopup
        course={selectedCourse?.data.course || null}
        position={selectedCourse?.pos || null}
        attendance={
          attendance?.find((a) => a.code === selectedCourse?.data.course.code)
            ?.attendance
        }
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
};
