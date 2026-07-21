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
import { motion, AnimatePresence } from "framer-motion";

// Extracted Component Imports
import { AttendanceRow } from "../components/home/HomeRows";
import { LazyCalendarDay } from "../components/home/LazyCalendarDay";
import { QuickLinksMenu } from "../components/home/QuickLinksMenu";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { EmptyState } from "../components/EmptyState";
import { SPRING_SNAPPY } from "../utils/motion";
import { HomeWidgets } from "../components/home/HomeWidgets";
import { getClassesForDate } from "../utils/timetable-helpers";

export type EventFilterType = "all" | "classes" | "assignments" | "events";

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

  const { calGridData } = useDataStore();

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
    today.setHours(0, 0, 0, 0); // ensure accurate date comparisons

    const totalDays = 15;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

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

  const todayRef = useRef<HTMLDivElement | null>(null);
  const nowRef = useRef<HTMLDivElement | null>(null);
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
        <div className="flex flex-col items-center mb-2 lg:mb-4 px-2 w-full relative z-95 pointer-events-auto pt-20 md:pt-24 lg:pt-28">
          <div className="flex flex-col items-center w-full">
            {/* Month Header and Filter Chips */}
            <div className="flex flex-col md:flex-row w-full items-start md:items-center justify-between mb-6 px-1 pt-4 gap-4 md:gap-0">
              <div className="flex flex-col items-start justify-center text-left">
                {monthDisplay.semName && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs md:text-sm font-black text-(--accent-base) tracking-wide">
                      {monthDisplay.semName}
                    </span>
                    <span className="text-[10px] md:text-xs font-bold text-(--text-muted) opacity-70">
                      {progress}%
                    </span>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate({ title: "Academic Calendar", url: "academics/common/CalendarPreview", category: "Academics" });
                  }}
                  className="text-lg md:text-2xl font-black text-(--text-main) hover:text-(--accent-hover) cursor-pointer transition-colors text-left flex justify-start focus:outline-none"
                >
                  {monthDisplay.text}
                </button>
              </div>

              <div className="flex justify-end items-center">
                <SegmentedControl
                  options={[
                    { label: "All", value: "all" },
                    { label: "Classes", value: "classes" },
                    { label: "Tasks", value: "assignments" },
                    { label: "Events", value: "events" },
                  ]}
                  value={eventFilter}
                  onChange={setEventFilter}
                  className="justify-center md:justify-end"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-3 pb-32 pt-37.5 -mt-30 -mb-12 relative z-0 pointer-events-auto empty-events-container"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent, black 5%, black 15%)",
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
              onNavigate={onNavigate}
            />
          ))}

        </div>
      </div>

      <HomeWidgets settings={settings} stats={stats} onNavigate={onNavigate} />
    </div>
  );
};
