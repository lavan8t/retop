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
import { VTOPNetwork } from "../utils/network";
// Extracted Component Imports
import { AttendanceRow, AssignmentRow } from "../components/home/HomeRows";
import { LazyCalendarDay } from "../components/home/LazyCalendarDay";
import { QuickLinksMenu } from "../components/home/QuickLinksMenu";
import { EmptyState } from "../components/EmptyState";
import { HomeWidgets } from "../components/home/HomeWidgets";
import { getClassesForDate } from "../utils/timetable-helpers";
import { PullToRefresh } from "../components/common/PullToRefresh";
import { Add, Event, Apps, School, Close, Campaign } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { Tooltip } from "../components/ui/Tooltip";
import { Card } from "../components/ui/Card";
import { formatTimeStr, parseVtopDate, TimeFormatMode } from "../utils/formatting";

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
  use24HourTime?: TimeFormatMode;

  calSemesters?: { id: string; label: string }[];
  calSelectedSem?: string;
  pinnedLinks?: QuickLink[];
  handleTogglePin?: (link: QuickLink) => void;
  spotlightCategories: SpotlightCategoryGroup[];
  network?: VTOPNetwork;
  onSync?: () => void;
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
  use24HourTime = "12h" as TimeFormatMode,

  calSemesters = [],
  calSelectedSem = "",
  pinnedLinks = [],
  handleTogglePin,
  spotlightCategories,
  network,
  onSync,
}) => {
  const { calGridData, examGroups, fetchExamSemesters, fetchDetailedAttendance, attSelectedSem, isSyncing } = useDataStore();
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const lastScrollTopRef = useRef(0);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);

  const pendingCount = useMemo(() => assignments.filter((a) => a.status !== "submitted").length, [assignments]);
  
  const pendingAssignments = useMemo(() => {
    return assignments
      .filter((a) => a.status !== "submitted")
      .sort((a, b) => {
        const parseDate = (dStr: string) => {
          const d = parseVtopDate(dStr);
          return d ? d.getTime() : NaN;
        };
        const dateA = parseDate(a.dueDate);
        const dateB = parseDate(b.dueDate);
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateA - dateB;
      });
  }, [assignments]);

  const overallAttPct = useMemo(() => {
    const valid = attendance.filter((a) => !isNaN(parseFloat(a.attendance)));
    if (valid.length === 0) return "";
    const sum = valid.reduce((acc, a) => acc + parseFloat(a.attendance), 0);
    return Math.round(sum / valid.length) + "%";
  }, [attendance]);

  useEffect(() => {
    if (!network) return;
    if (examGroups.length === 0) {
      fetchExamSemesters(network);
    }
    if (attendance.length === 0 && attSelectedSem) {
      fetchDetailedAttendance(network, attSelectedSem);
    }
  }, [network, examGroups.length, fetchExamSemesters, attendance.length, attSelectedSem, fetchDetailedAttendance]);

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
      {/* Sticky Mobile Left Spotlight Button */}
      <button
        onClick={() => setIsSpotlightOpen(true)}
        className="fixed left-0 top-[45%] z-40 lg:hidden bg-(--accent-base) text-(--text-inverse) rounded-r-2xl py-3 px-1.5 shadow-lg border border-l-0 border-(--border-dim) cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-transform active:scale-95 group"
        aria-label="Open Spotlight"
        title="Open Spotlight"
      >
        <Campaign className="w-4 h-4 text-(--text-inverse) transition-transform group-hover:scale-110" />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[0.625rem] font-black uppercase tracking-wider">
          Spotlight
        </span>
      </button>

      <QuickLinksMenu
        className="hidden lg:flex"
        menuCategories={menuCategories}
        onNavigate={onNavigate}
        pinnedLinks={pinnedLinks}
        handleTogglePin={handleTogglePin}
        attendance={attendance}
        ttCourses={ttCourses}
        spotlightCategories={spotlightCategories}
      />

      {/* CENTER PANE: Surface Level Unified Event CalendarMonth & Mobile Feed */}
      <div className="flex-none lg:flex-1 w-full flex flex-col gap-6 md:gap-8 overflow-hidden pt-1 pl-1 md:pl-0 min-h-0 relative">
        <div className="flex flex-col items-center mb-2 lg:mb-4 px-2 w-full relative z-95 pointer-events-auto pt-15 md:pt-18 lg:pt-20">
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
                  <div
                    className="flex flex-col items-end justify-start relative group/sem sem-group"
                  >
                    <div
                      className="absolute bottom-full right-0 mb-1 pointer-events-none flex justify-end items-center whitespace-nowrap opacity-0 translate-y-2 group-hover/sem:opacity-100 group-hover/sem:translate-y-0 transition-all duration-200"
                    >
                      <span className="font-black text-(--accent-base) text-right text-[0.625rem] md:text-[0.6875rem] drop-shadow-md uppercase tracking-wide">
                        {progress}% Completed
                      </span>
                    </div>

                    <div className="relative text-right flex flex-col w-full min-w-[120px]">
                      <div className="relative text-sm md:text-base leading-none font-expanded sem-text">
                        <span
                          className="text-(--text-main) whitespace-nowrap inline-block transition-opacity duration-200 group-hover/sem:opacity-50"
                        >
                          {monthDisplay.semName}
                        </span>
                        <span
                          className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-(--text-main) pointer-events-none origin-left opacity-0 scale-x-0 group-hover/sem:opacity-100 group-hover/sem:scale-x-100 transition-all duration-200"
                          style={{ width: `${progress}%` } as any}
                        >
                          {monthDisplay.semName}
                        </span>
                      </div>
                    </div>

                    <div
                      className="absolute top-full right-0 mt-1 pointer-events-none flex justify-end items-center whitespace-nowrap opacity-0 -translate-y-2 group-hover/sem:opacity-100 group-hover/sem:translate-y-0 transition-all duration-200"
                    >
                      <span className="font-black text-(--accent-base) text-right text-[0.625rem] md:text-[0.6875rem] drop-shadow-md uppercase tracking-wide">
                        {progressInfo.lastDay
                          ? `${Math.max(0, Math.ceil((progressInfo.lastDay.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days more`
                          : "N/A"}
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

        <PullToRefresh
          onRefresh={onSync}
          isRefreshing={isSyncing}
          onScroll={handleCalendarScroll}
          className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-3 pb-32 pt-15 -mt-24 -mb-12 relative z-0 pointer-events-auto empty-events-container"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent, black 5%, black 15%)",
          }}
        >
          {/* MOBILE FEED HEADER (< lg screens): 1. Stats Carousel -> 2. Pending Assignments */}
          <div className="flex lg:hidden flex-col gap-4 w-full pt-14 pb-2 px-1">
            {/* 1. Stats Carousel */}
            <HomeWidgets
              className="w-full flex lg:hidden"
              settings={settings}
              stats={stats}
              attendance={attendance}
              assignments={assignments}
              onNavigate={onNavigate}
              isMobileFeed={true}
            />

            {/* 2. Pending Assignments Card (full-width below stats) */}
            {pendingAssignments.length > 0 && (
              <Card
                onClick={() =>
                  onNavigate({
                    title: "Assignments",
                    url: "examinations/StudentDA",
                    category: "Examinations",
                  })
                }
                className="w-full bg-(--bg-highlight) rounded-4xl flex flex-col relative z-30 cursor-pointer overflow-hidden border-2 border-(--border-main) shadow-(--brutal-shadow-sm) hover:shadow-(--brutal-shadow-hover) transition-all h-fit"
              >
                <div className="px-5 pt-4 pb-3 border-b-2 border-(--border-main) flex justify-between items-center shrink-0">
                  <span className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted)">
                    Pending Assignments ({pendingAssignments.length})
                  </span>
                </div>
                <div className="p-3 flex flex-col gap-0.5 rounded-2xl">
                  {pendingAssignments.map((assignment, idx) => (
                    <AssignmentRow
                      key={idx}
                      assignment={assignment}
                      className="rounded-sm first:rounded-t-2xl last:rounded-b-2xl"
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* 3. LazyCalendarDay feed starting immediately below */}
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
        </PullToRefresh>

      </div>

      <HomeWidgets
        settings={settings}
        stats={stats}
        attendance={attendance}
        assignments={assignments}
        onNavigate={onNavigate}
      />

      {/* Mobile Spotlight & Attendance Bottom Sheet */}
      {isSpotlightOpen && (
        <div
          onClick={() => setIsSpotlightOpen(false)}
          className="fixed inset-0 z-100 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 lg:hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-(--bg-surface) rounded-t-3xl border-t-2 border-(--border-main) px-4 pt-0 pb-6 max-h-[85vh] flex flex-col shadow-2xl relative animate-in slide-in-from-bottom duration-300 overflow-hidden"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-(--border-dim) rounded-full mx-auto my-3 shrink-0" />

            {/* Header with Title and Close Button */}
            <div className="flex items-center justify-between px-2 pb-3 border-b border-(--border-dim) mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Campaign className="w-5 h-5 text-(--accent-base)" />
                <span className="font-expanded font-black text-sm text-(--text-main) uppercase tracking-wide">
                  Spotlight & Quick Links
                </span>
              </div>
              <button
                onClick={() => setIsSpotlightOpen(false)}
                className="p-1.5 rounded-full hover:bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) transition-colors cursor-pointer flex items-center justify-center"
                aria-label="Close Spotlight"
              >
                <Close className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Sheet Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <QuickLinksMenu
                className="flex flex-col w-full !pt-0 !pb-2 !px-0 gap-4"
                menuCategories={menuCategories}
                onNavigate={(link) => {
                  setIsSpotlightOpen(false);
                  onNavigate(link);
                }}
                pinnedLinks={pinnedLinks}
                handleTogglePin={handleTogglePin}
                attendance={attendance}
                ttCourses={ttCourses}
                spotlightCategories={spotlightCategories}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

