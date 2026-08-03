import React, { useState, useEffect, useMemo, useRef } from "react";
import { AppSettings } from "../utils/settings-store";
import {
  CourseSummary,
  Assignment,
  QuickLink,
  MenuCategory,
  TimetableCourse,
  Event as VTOPEvent,
  SpotlightCategoryGroup,
} from "../types/vtop";
import { UpcomingClass } from "../utils/timetable-slots";
import { useDataStore } from "../store/dataStore";
import { motion, AnimatePresence } from "framer-motion";

// Extracted Component Imports
import { AttendanceRow } from "../components/home/HomeRows";
import { LazyCalendarDay } from "../components/home/LazyCalendarDay";
import { QuickLinksMenu } from "../components/home/QuickLinksMenu";
import { EmptyState } from "../components/EmptyState";
import { SPRING_SNAPPY } from "../utils/motion";
import { HomeWidgets } from "../components/home/HomeWidgets";
import { getClassesForDate } from "../utils/timetable-helpers";
import { AddCustomEventModal } from "../components/home/AddCustomEventModal";
import { Add } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { Tooltip } from "../components/ui/Tooltip";

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
  events: VTOPEvent[];
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
  spotlightCategories: SpotlightCategoryGroup[];
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
  spotlightCategories,
}) => {
  const { calGridData, examGroups, customEvents, fetchExamSemesters } = useDataStore();
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const lastScrollTopRef = useRef(0);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (examGroups.length === 0 && (window as any).__RETOP_NETWORK__) {
      fetchExamSemesters((window as any).__RETOP_NETWORK__);
    }
  }, [examGroups.length, fetchExamSemesters]);

  const handleCalendarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);

    const currentScrollTop = e.currentTarget.scrollTop;
    if (currentScrollTop > lastScrollTopRef.current && currentScrollTop > 10) {
      setIsFabVisible(false);
    } else if (currentScrollTop < lastScrollTopRef.current) {
      setIsFabVisible(true);
    }
    lastScrollTopRef.current = currentScrollTop;
  };

  const handleCalendarNavigate = (link: any) => {
    if (isScrollingRef.current) return;
    onNavigate(link);
  };

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
          todayRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
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
        spotlightCategories={spotlightCategories}
      />

      {/* CENTER PANE: Surface Level Unified Event CalendarMonth */}
      <div className="flex-none lg:flex-1 w-full flex flex-col gap-6 md:gap-8 overflow-hidden pt-1 pl-1 md:pl-0 min-h-0 relative">
        <div className="flex flex-col items-center mb-2 lg:mb-4 px-2 w-full relative z-95 pointer-events-auto pt-20 md:pt-24 lg:pt-28">
          <div className="flex flex-col items-center w-full">
            <div className="flex justify-between w-full items-center mb-6 px-1 pt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate({
                    title: "Academic Calendar",
                    url: "academics/common/CalendarPreview",
                    category: "Academics",
                  });
                }}
                className="text-base md:text-lg font-bold text-(--text-main) hover:text-(--accent-hover) cursor-pointer transition-colors text-left flex justify-start focus:outline-none"
              >
                {monthDisplay.text}
              </button>

              {monthDisplay.semName ? (
                <div className="flex justify-end items-start h-8 relative z-20 pt-1">
                  <style>{`
                    .sem-text { font-variation-settings: "wdth" 151, "wght" 800; transition: font-variation-settings var(--duration-slow) ease-out; }
                    .sem-group:hover .sem-text { font-variation-settings: "wdth" 75, "wght" 1; }
                  `}</style>
                  <motion.div
                    initial="rest"
                    whileHover="hover"
                    animate="rest"
                    className="flex flex-col items-end justify-start relative group sem-group"
                  >
                    <motion.div
                      variants={{
                        rest: { opacity: 0, y: 8 },
                        hover: { opacity: 1, y: 0 },
                      }}
                      transition={SPRING_SNAPPY}
                      className="absolute bottom-full right-0 mb-1 pointer-events-none flex justify-end items-center whitespace-nowrap"
                    >
                      <span className="font-black text-(--accent-base) text-right text-[10px] md:text-[11px] drop-shadow-md uppercase tracking-wide">
                        {progress}% Completed
                      </span>
                    </motion.div>

                    <div className="relative text-right flex flex-col w-full min-w-[120px]">
                      <div className="relative text-sm md:text-base leading-none font-expanded sem-text">
                        <motion.span
                          variants={{
                            rest: { opacity: 1 },
                            hover: { opacity: 0.5 },
                          }}
                          transition={SPRING_SNAPPY}
                          className="text-(--text-main) whitespace-nowrap inline-block"
                        >
                          {monthDisplay.semName}
                        </motion.span>
                        <motion.span
                          variants={{
                            rest: { opacity: 0, scaleX: 0 },
                            hover: { opacity: 1, scaleX: 1 },
                          }}
                          transition={SPRING_SNAPPY}
                          className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-(--text-main) pointer-events-none origin-left"
                          style={{ width: `${progress}%` } as any}
                        >
                          {monthDisplay.semName}
                        </motion.span>
                      </div>
                    </div>

                    <motion.div
                      variants={{
                        rest: { opacity: 0, y: -8 },
                        hover: { opacity: 1, y: 0 },
                      }}
                      transition={SPRING_SNAPPY}
                      className="absolute top-full right-0 mt-1 pointer-events-none flex justify-end items-center whitespace-nowrap"
                    >
                      <span className="font-black text-(--accent-base) text-right text-[10px] md:text-[11px] drop-shadow-md uppercase tracking-wide">
                        {progressInfo.lastDay
                          ? `${Math.max(0, Math.ceil((progressInfo.lastDay.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days more`
                          : "N/A"}
                      </span>
                    </motion.div>
                  </motion.div>
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>

        <div
          onScroll={handleCalendarScroll}
          className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-3 pb-32 pt-20.5 -mt-30 -mb-12 relative z-0 pointer-events-auto empty-events-container"
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
              eventFilter="all"
              assignments={[]}
              events={events}
              examGroups={examGroups}
              getClassesForDate={(date: Date, evt: any) =>
                getClassesForDate(date, ttCourses, evt)
              }
              use24HourTime={use24HourTime}
              todayRef={todayRef}
              nowRef={nowRef}
              onNavigate={handleCalendarNavigate}
            />
          ))}
        </div>

        {/* Floating Calendar Actions Bar - Bottom Right */}
        <AnimatePresence>
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: isFabVisible ? 0 : 90, opacity: isFabVisible ? 1 : 0 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-100 flex items-center bg-(--bg-surface)/95 backdrop-blur-md p-1.5 rounded-2xl border-2 border-(--border-main) shadow-(--brutal-shadow-sm) hover:shadow-(--brutal-shadow-hover) transition-all pointer-events-auto"
          >
            <Tooltip text="Add Event">
              <button
                onClick={() => setIsAddEventOpen(true)}
                className="w-11 h-11 rounded-xl bg-(--accent-base) text-(--text-inverse) flex items-center justify-center shadow-xs hover:opacity-90 transition-all cursor-pointer p-2.5"
                aria-label="Add Event"
              >
                <Add className="w-6 h-6 stroke-[3] font-black" />
              </button>
            </Tooltip>
          </motion.div>
        </AnimatePresence>
      </div>

      <HomeWidgets settings={settings} stats={stats} assignments={assignments} onNavigate={onNavigate} />

      <AddCustomEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
      />
    </div>
  );
};
