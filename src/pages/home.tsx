import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppSettings } from '../utils/settings-store';
import {
  CourseSummary,
  Assignment,
  QuickLink,
  MenuCategory,
  TimetableCourse,
  Event as VTOPEvent,
  SpotlightCategoryGroup,
} from '../types/vtop';
import { UpcomingClass } from '../utils/timetable-slots';
import { useDataStore } from '../store/dataStore';
import { VTOPNetwork } from '../utils/network';
// Extracted Component Imports
import { AttendanceRow, AssignmentRow } from '../components/home/HomeRows';
import { LazyCalendarDay } from '../components/home/LazyCalendarDay';
import { QuickLinksMenu } from '../components/home/QuickLinksMenu';
import { EmptyState } from '../components/EmptyState';
import { HomeWidgets } from '../components/home/HomeWidgets';
import { SpotlightSection } from '../components/home/SpotlightSection';
import { getClassesForDate } from '../utils/timetable-slots';
import {
  Add,
  Event,
  Apps,
  School,
  Close,
  Campaign,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { Card } from '../components/ui/Card';
import {
  formatTimeStr,
  parseVtopDate,
  TimeFormatMode,
} from '../utils/formatting';

export type EventFilterType = 'all' | 'classes' | 'assignments' | 'events';

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
  use24HourTime = '12h' as TimeFormatMode,

  calSemesters = [],
  calSelectedSem = '',
  pinnedLinks = [],
  handleTogglePin,
  spotlightCategories,
  network,
  onSync,
}) => {
  const {
    calGridData,
    examGroups,
    fetchExamSemesters,
    fetchDetailedAttendance,
    attSelectedSem,
    isSyncing,
  } = useDataStore();
  const [isFabVisible, setIsFabVisible] = useState(true);
  const [isMobileSpotlightOpen, setIsMobileSpotlightOpen] = useState(false);
  const [isSpotlightClosing, setIsSpotlightClosing] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const touchStartYRef = useRef(0);
  const currentDragYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const sheetContentRef = useRef<HTMLDivElement>(null);

  const closeSpotlight = () => {
    setIsSpotlightClosing(true);
    setTimeout(() => {
      setIsMobileSpotlightOpen(false);
      setIsSpotlightClosing(false);
      setSheetDragY(0);
    }, 150);
  };

  const handleHandleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchStartYRef.current = e.touches[0].clientY;
    currentDragYRef.current = 0;
    isDraggingRef.current = true;
  };

  const handleHandleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartYRef.current;
    if (deltaY > 0) {
      currentDragYRef.current = deltaY;
      setSheetDragY(deltaY);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    currentDragYRef.current = 0;
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartYRef.current;
    const isAtTop =
      !sheetContentRef.current || sheetContentRef.current.scrollTop <= 0;

    if (deltaY > 0 && isAtTop) {
      isDraggingRef.current = true;
      currentDragYRef.current = deltaY;
      setSheetDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (isDraggingRef.current) {
      if (currentDragYRef.current > 75) {
        closeSpotlight();
      } else {
        setSheetDragY(0);
      }
    }
    isDraggingRef.current = false;
  };

  const lastScrollTopRef = useRef(0);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);

  const pendingCount = useMemo(
    () => assignments.filter((a) => a.status !== 'submitted').length,
    [assignments],
  );

  const pendingAssignments = useMemo(() => {
    return assignments
      .filter((a) => a.status !== 'submitted')
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

  const sortedAttendance = useMemo(() => {
    if (!attendance) return [];
    return [...attendance].sort((a, b) => {
      const valA = parseFloat(a.attendance);
      const valB = parseFloat(b.attendance);
      if (isNaN(valA) && isNaN(valB)) return 0;
      if (isNaN(valA)) return 1;
      if (isNaN(valB)) return -1;
      return valA - valB;
    });
  }, [attendance]);

  const overallAttPct = useMemo(() => {
    const valid = attendance.filter((a) => !isNaN(parseFloat(a.attendance)));
    if (valid.length === 0) return '';
    const sum = valid.reduce((acc, a) => acc + parseFloat(a.attendance), 0);
    return Math.round(sum / valid.length) + '%';
  }, [attendance]);

  useEffect(() => {
    if (!network) return;
    if (examGroups.length === 0) {
      fetchExamSemesters(network);
    }
    if (attendance.length === 0 && attSelectedSem) {
      fetchDetailedAttendance(network, attSelectedSem);
    }
  }, [
    network,
    examGroups.length,
    fetchExamSemesters,
    attendance.length,
    attSelectedSem,
    fetchDetailedAttendance,
  ]);

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
    if (calendarDays.length === 0) return { text: '', semName: '' };
    const startM = calendarDays[0].toLocaleDateString('en-US', {
      month: 'long',
    });
    const endM = calendarDays[calendarDays.length - 1].toLocaleDateString(
      'en-US',
      { month: 'long', year: 'numeric' },
    );

    let base = '';
    if (startM === endM.split(' ')[0]) {
      base = endM;
    } else {
      base = `${startM} - ${endM}`;
    }

    const semName =
      calSemesters.find((s) => s.id === calSelectedSem)?.label || '';
    return { text: base, semName };
  }, [calendarDays, calSemesters, calSelectedSem]);

  const todayRef = useRef<HTMLDivElement | null>(null);
  const nowRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-0 py-0 px-2 md:px-6 lg:px-8 overflow-y-auto lg:overflow-hidden bg-(--bg-main) max-w-425 mx-auto relative custom-scrollbar">
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
      <div className="flex-none lg:flex-1 w-full max-w-full flex flex-col gap-6 md:gap-8 overflow-visible lg:overflow-hidden lg:h-full pt-1 pl-1 md:pl-0 min-h-0 relative">
        <div className="hidden lg:flex flex-col items-center mb-2 lg:mb-4 px-2 w-full relative z-95 pointer-events-auto pt-20 md:pt-23 lg:pt-25">
          <div className="flex flex-col items-center w-full">
            {/* Desktop Header: Unchanged */}
            <div className="flex justify-between w-full items-center mb-6 px-1 pt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate({
                    title: 'Academic Calendar',
                    url: 'academics/common/CalendarPreview',
                    category: 'Academics',
                  });
                }}
                className="text-base md:text-lg font-bold text-(--text-main) hover:text-(--accent-hover) cursor-pointer transition-colors text-left flex justify-start focus:outline-none"
              >
                {monthDisplay.text}
              </button>

              {!calSelectedSem && calSemesters.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60%]">
                  {calSemesters
                    .filter((s) => !/industry|\(ind\)/i.test(s.label))
                    .slice(0, 3)
                    .map((sem) => (
                      <button
                        key={sem.id}
                        onClick={() => {
                          useDataStore.getState().setCalSelectedSem(sem.id);
                          useDataStore.getState().setTtSelectedSem(sem.id);
                        }}
                        className="text-[11px] font-bold px-3 py-1 rounded-full bg-(--bg-highlight) text-(--text-main) hover:bg-(--accent-base) hover:text-(--bg-main) transition-all cursor-pointer whitespace-nowrap shadow-xs border border-(--border-main)"
                      >
                        {sem.label}
                      </button>
                    ))}
                </div>
              )}

              {monthDisplay.semName ? (
                <div className="flex justify-end items-start h-8 relative z-20 pt-1">
                  <style>{`
                    .sem-text { font-variation-settings: "wdth" 151, "wght" 800; transition: font-variation-settings var(--duration-slow) ease-out; }
                    .sem-group:hover .sem-text { font-variation-settings: "wdth" 75, "wght" 1; }
                  `}</style>
                  <div className="flex flex-col items-end justify-start relative group/sem sem-group">
                    <div className="absolute bottom-full right-0 mb-1 pointer-events-none flex justify-end items-center whitespace-nowrap opacity-0 translate-y-2 group-hover/sem:opacity-100 group-hover/sem:translate-y-0 transition-all duration-200">
                      <span className="font-black text-(--accent-base) text-right text-[0.625rem] md:text-[0.6875rem] drop-shadow-md uppercase tracking-wide">
                        {progress}% Completed
                      </span>
                    </div>

                    <div className="relative text-right flex flex-col w-full min-w-30">
                      <div className="relative text-sm md:text-base leading-none font-expanded sem-text select-none">
                        <span className="text-(--text-main) whitespace-nowrap inline-block transition-opacity duration-200 group-hover/sem:opacity-30">
                          {monthDisplay.semName}
                        </span>
                        <span
                          className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-(--text-main) pointer-events-none origin-left"
                          style={{ width: `${progress}%` } as any}
                        >
                          {monthDisplay.semName}
                        </span>
                      </div>
                    </div>

                    <div className="absolute top-full right-0 mt-1 pointer-events-none flex justify-end items-center whitespace-nowrap opacity-0 -translate-y-2 group-hover/sem:opacity-100 group-hover/sem:translate-y-0 transition-all duration-200">
                      <span className="font-black text-(--accent-base) text-right text-[0.625rem] md:text-[0.6875rem] drop-shadow-md uppercase tracking-wide">
                        {progressInfo.lastDay
                          ? `${Math.max(0, Math.ceil((progressInfo.lastDay.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days more`
                          : 'N/A'}
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

        <div
          onScroll={handleCalendarScroll}
          className="h-auto lg:h-full lg:flex-1 lg:min-h-0 overflow-visible lg:overflow-y-auto lg:overflow-x-hidden custom-scrollbar flex flex-col gap-4 pr-3 pb-32 pt-16 lg:pt-15 mt-0 lg:-mt-24 -mb-12 relative z-0 pointer-events-auto empty-events-container w-full max-w-full lg:[mask-image:linear-gradient(to_bottom,transparent,black_5%,black_15%)]"
        >
          {/* MOBILE FEED HEADER (< lg screens): 1. Carousel Row (Attendance & Pending Assignments) -> 2. Merged CGPA/Credits Card -> 3. Month & Sem Title */}
          <div className="flex lg:hidden flex-col gap-3 w-full max-w-full pt-1 pb-2 px-0 overflow-x-hidden">
            {/* 1. Carousel Row: Attendance Card & Pending Assignments Card */}
            {(attendance.length > 0 || pendingAssignments.length > 0) && (
              <div className="w-full max-w-full flex overflow-x-auto snap-x snap-mandatory gap-2.5 hide-scrollbar pb-1 px-1 shrink-0">
                {/* Card 1: Attendance Card */}
                {attendance && attendance.length > 0 && (
                  <Card
                    onClick={() =>
                      onNavigate({
                        title: 'Class Attendance',
                        url: 'studentattendance',
                        category: 'Academics',
                      })
                    }
                    className="shrink-0 snap-start min-w-[270px] sm:min-w-[300px] w-[80vw] max-w-[360px] bg-(--bg-highlight) rounded-3xl flex flex-col relative z-30 cursor-pointer overflow-hidden border-2 border-(--border-main) shadow-(--brutal-shadow-sm) hover:shadow-(--brutal-shadow-hover) transition-all h-fit"
                  >
                    <div className="px-4 pt-3 pb-2 border-b-2 border-(--border-main) flex justify-between items-center shrink-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[0.5625rem] font-expanded font-bold uppercase text-(--text-muted) leading-none">
                          Attendance
                        </span>
                        <span className="text-xl font-black font-expanded leading-none text-(--text-main)">
                          {overallAttPct}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5 flex flex-col gap-0.5 rounded-2xl max-h-56 overflow-y-auto custom-scrollbar">
                      {sortedAttendance.map((c, i) => (
                        <AttendanceRow key={i} course={c} />
                      ))}
                    </div>
                  </Card>
                )}

                {/* Card 2: Pending Assignments Card */}
                {pendingAssignments.length > 0 && (
                  <Card
                    onClick={() =>
                      onNavigate({
                        title: 'Assignments',
                        url: 'examinations/StudentDA',
                        category: 'Examinations',
                      })
                    }
                    className="shrink-0 snap-start min-w-[270px] sm:min-w-[300px] w-[80vw] max-w-[360px] bg-(--bg-highlight) rounded-3xl flex flex-col relative z-30 cursor-pointer overflow-hidden border-2 border-(--border-main) shadow-(--brutal-shadow-sm) hover:shadow-(--brutal-shadow-hover) transition-all h-fit"
                  >
                    <div className="px-4 pt-3 pb-2 border-b-2 border-(--border-main) flex justify-between items-center shrink-0">
                      <span className="text-[0.5625rem] font-expanded font-bold uppercase text-(--text-muted)">
                        Pending Assignments ({pendingAssignments.length})
                      </span>
                    </div>
                    <div className="p-2.5 flex flex-col gap-0.5 rounded-2xl max-h-56 overflow-y-auto custom-scrollbar">
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
            )}

            {/* 2. Merged CGPA & Credits Card */}
            <HomeWidgets
              className="w-full flex lg:hidden"
              settings={settings}
              stats={stats}
              attendance={attendance}
              assignments={assignments}
              onNavigate={onNavigate}
              isMobileFeed={true}
            />

            {/* 3. Month and Current Sem Title (Brought down right before Lazy Calendar, no tracking, regular sem case) */}
            <div className="flex flex-col items-start w-full pt-2 pb-1 px-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate({
                    title: 'Academic Calendar',
                    url: 'academics/common/CalendarPreview',
                    category: 'Academics',
                  });
                }}
                className="text-left flex flex-col gap-0.5 cursor-pointer focus:outline-none"
              >
                <span className="text-xl sm:text-2xl font-black font-expanded text-(--text-main) leading-tight">
                  {monthDisplay.text}
                </span>
                {monthDisplay.semName && (
                  <span className="text-xs font-bold text-(--text-muted) leading-normal">
                    {monthDisplay.semName}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 4. LazyCalendarDay feed */}
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
      </div>

      <HomeWidgets
        settings={settings}
        stats={stats}
        attendance={attendance}
        assignments={assignments}
        onNavigate={onNavigate}
      />

      {/* Mobile Sticky Left Edge Spotlight Pill Button & Bottom Sheet */}
      {spotlightCategories && spotlightCategories.length > 0 && (
        <>
          <button
            onClick={() => setIsMobileSpotlightOpen(true)}
            className="fixed left-1.5 top-1/2 -translate-y-1/2 z-90 lg:hidden px-2 py-3.5 rounded-full bg-(--accent-base) text-(--text-inverse) shadow-lg border-2 border-(--border-main) active:scale-95 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer select-none"
            aria-label="Spotlight"
            title="Spotlight"
          >
            <Campaign className="w-4 h-4 shrink-0" />
            <span
              className="font-expanded font-bold text-[9px] uppercase text-center"
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              Spotlight
            </span>
          </button>

          {isMobileSpotlightOpen && (
            <>
              {/* Backdrop: No blur, 150ms fade */}
              <div
                className={`fixed inset-0 z-99998 bg-black/40 lg:hidden ${
                  isSpotlightClosing
                    ? 'animate-fade-out-150'
                    : 'animate-fade-in-150'
                }`}
                onClick={closeSpotlight}
              />

              {/* Bottom Sheet: 150ms slide up / slide down, touch drag dismiss */}
              <div className="fixed inset-x-0 bottom-0 z-99999 p-3 pb-6 sm:p-4 max-h-[85vh] flex flex-col justify-end pointer-events-none lg:hidden">
                <div
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    transform:
                      sheetDragY > 0
                        ? `translateY(${sheetDragY}px)`
                        : undefined,
                    transition: isDraggingRef.current
                      ? 'none'
                      : sheetDragY === 0 && !isSpotlightClosing
                        ? 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)'
                        : undefined,
                    animation: sheetDragY > 0 ? 'none' : undefined,
                  }}
                  className={`w-full max-w-lg mx-auto bg-(--bg-surface) border-2 border-(--border-main) rounded-[32px] p-4 sm:p-5 shadow-2xl flex flex-col gap-2 max-h-[80vh] overflow-hidden pointer-events-auto ${
                    isSpotlightClosing
                      ? 'animate-sheet-down'
                      : sheetDragY > 0
                        ? ''
                        : 'animate-sheet-up'
                  }`}
                >
                  {/* Top Center Pill Handle */}
                  <div
                    onTouchStart={handleHandleTouchStart}
                    onTouchMove={handleHandleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="w-full py-2 -mt-2 flex items-center justify-center cursor-grab active:cursor-grabbing select-none shrink-0 touch-none"
                  >
                    <div className="w-12 h-1.5 bg-(--border-main) rounded-full opacity-60 pointer-events-none" />
                  </div>

                  {/* Scrollable Spotlight Content (No duplicate title, no cross button) */}
                  <div
                    ref={sheetContentRef}
                    className="overflow-y-auto flex-1 custom-scrollbar pt-1"
                  >
                    <SpotlightSection
                      spotlightCategories={spotlightCategories}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
