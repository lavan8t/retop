import React, { useState, useEffect } from "react";

import { EmptyState } from "../components/EmptyState";
import { OfflineNotSynced } from "../components/ui/OfflineNotSynced";
import {
  ProgressActivity,
  CalendarMonth as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  GridView,
  List,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { VTOPNetwork } from "../utils/network";

import {
  parseCalendarSemesters,
  parseCalendarGroupsAndMonths,
  parseCalendarDays,
} from "../parsers/calendar";

import { CalendarMonthPreview, CalendarEvent, ClassGroup } from "../types/vtop";

import { useDataStore } from "../store/dataStore";
import { useAppStore } from "../store/appStore";
import {
  useSettingsStore,
  getMaterialThemeColor,
  getMaterialOnThemeColor,
} from "../utils/settings-store";

interface CalendarPageProps {
  network: VTOPNetwork;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const spring = { type: "spring", stiffness: 300, damping: 30 } as const;

interface MergedCalendarGroup {
  id: string;
  startDay: CalendarEvent;
  endDay: CalendarEvent;
  count: number;
  info: string;
  subInfo: string;
  isHoliday: boolean;
  isInstructional: boolean;
  isExam: boolean;
  isToday: boolean;
}

function getMergedCalendarGroups(days: CalendarEvent[]): MergedCalendarGroup[] {
  // 1. Filter out empty days without events/instructional/holiday/exam
  const eventDays = days.filter((day) =>
    Boolean(day.info || day.subInfo || day.isHoliday || day.isExam || day.isInstructional)
  );

  if (eventDays.length === 0) return [];

  const groups: MergedCalendarGroup[] = [];
  const todayStr = new Date().toDateString();

  let currentGroup: {
    startDay: CalendarEvent;
    endDay: CalendarEvent;
    count: number;
    info: string;
    subInfo: string;
    isHoliday: boolean;
    isInstructional: boolean;
    isExam: boolean;
    hasToday: boolean;
  } | null = null;

  for (const day of eventDays) {
    const isDayToday = new Date(day.dateObj).toDateString() === todayStr;
    const title =
      day.info ||
      (day.isHoliday
        ? "Holiday"
        : day.isExam
        ? "Exam Day"
        : day.isInstructional
        ? "Instructional Day"
        : "");

    const sub = day.subInfo || "";

    if (!currentGroup) {
      currentGroup = {
        startDay: day,
        endDay: day,
        count: 1,
        info: title,
        subInfo: sub,
        isHoliday: Boolean(day.isHoliday),
        isInstructional: Boolean(day.isInstructional),
        isExam: Boolean(day.isExam),
        hasToday: isDayToday,
      };
      continue;
    }

    const prevDate = new Date(currentGroup.endDay.dateObj);
    const currDate = new Date(day.dateObj);
    const diffDays = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Merge if consecutive day (+1 day) and matching event info/category
    const canMerge =
      diffDays === 1 &&
      currentGroup.info.toLowerCase() === title.toLowerCase() &&
      currentGroup.subInfo.toLowerCase() === sub.toLowerCase() &&
      currentGroup.isHoliday === Boolean(day.isHoliday) &&
      currentGroup.isExam === Boolean(day.isExam) &&
      currentGroup.isInstructional === Boolean(day.isInstructional);

    if (canMerge) {
      currentGroup.endDay = day;
      currentGroup.count += 1;
      if (isDayToday) currentGroup.hasToday = true;
    } else {
      groups.push({
        id: `${currentGroup.startDay.dayNumber}-${currentGroup.endDay.dayNumber}-${currentGroup.info}`,
        startDay: currentGroup.startDay,
        endDay: currentGroup.endDay,
        count: currentGroup.count,
        info: currentGroup.info,
        subInfo: currentGroup.subInfo,
        isHoliday: currentGroup.isHoliday,
        isInstructional: currentGroup.isInstructional,
        isExam: currentGroup.isExam,
        isToday: currentGroup.hasToday,
      });

      currentGroup = {
        startDay: day,
        endDay: day,
        count: 1,
        info: title,
        subInfo: sub,
        isHoliday: Boolean(day.isHoliday),
        isInstructional: Boolean(day.isInstructional),
        isExam: Boolean(day.isExam),
        hasToday: isDayToday,
      };
    }
  }

  if (currentGroup) {
    groups.push({
      id: `${currentGroup.startDay.dayNumber}-${currentGroup.endDay.dayNumber}-${currentGroup.info}`,
      startDay: currentGroup.startDay,
      endDay: currentGroup.endDay,
      count: currentGroup.count,
      info: currentGroup.info,
      subInfo: currentGroup.subInfo,
      isHoliday: currentGroup.isHoliday,
      isInstructional: currentGroup.isInstructional,
      isExam: currentGroup.isExam,
      isToday: currentGroup.hasToday,
    });
  }

  return groups;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ network }) => {
  const { settings } = useSettingsStore();

  const sysDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark =
    settings.themeMode === "dark" ||
    settings.themeMode === "amoled" ||
    (settings.themeMode === "auto" && sysDark);

  const classBg = getMaterialThemeColor(settings.calendarClassColor, isDark);
  const classFg = getMaterialOnThemeColor(settings.calendarClassColor, isDark);

  const eventBg = getMaterialThemeColor(settings.calendarEventColor, isDark);
  const eventFg = getMaterialOnThemeColor(settings.calendarEventColor, isDark);

  const holidayBg = getMaterialThemeColor("red", isDark);
  const holidayFg = getMaterialOnThemeColor("red", isDark);

  const examBg = getMaterialThemeColor("orange", isDark);
  const examFg = getMaterialOnThemeColor("orange", isDark);

  const { calViewMode, setCalViewMode } = useAppStore();
  const {
    calSemesters,
    setCalSemesters,
    calSelectedSem,
    setCalSelectedSem,
    calClassGroups,
    calSelectedGroup,
    setCalSelectedGroup,
    calAvailableMonths,
    calGridData,
    calLoadingInitial,
    calLoadingMonths,
    calLoadingGrid,
    fetchCalendarMonthsAndGroups,
    fetchCalendarGrid,
  } = useDataStore();

  const todayRef = React.useRef<HTMLDivElement>(null);
  const initialScrollDone = React.useRef(false);

  // Fetch Semesters
  useEffect(() => {
    if (calSemesters.length> 0) return;

    const fetchSems = async () => {
      try {
        const html = await network.fetchWithCache(
          "cal_semester_list",
          () => network.fetchFragment("academics/common/CalendarPreview", { verifyMenu: "true" })
        );
        const sems = typeof html === "string" ? parseCalendarSemesters(html) : html;
        setCalSemesters(Array.isArray(sems) ? sems : []);
        if (Array.isArray(sems) && sems.length > 0 && !calSelectedSem) {
          const defaultSem =
            sems.find((s: any) => s.selected)?.id || sems[0].id;
          setCalSelectedSem(defaultSem);
        }
      } catch (e) {
        console.error("Failed to fetch calendar semesters:", e);
      }
    };
    fetchSems();
  }, [
    network,
    calSemesters.length,
    setCalSemesters,
    calSelectedSem,
    setCalSelectedSem,
  ]);

  // Fetch Months and Class Groups based on selected Semester
  useEffect(() => {
    if (!calSelectedSem) return;
    // Prevent fetching if we already have it cached
    if (calAvailableMonths.length> 0 && calClassGroups.length> 0) return;

    fetchCalendarMonthsAndGroups(network, calSelectedSem);
  }, [
    calSelectedSem,
    network,
    fetchCalendarMonthsAndGroups,
    calAvailableMonths.length,
    calClassGroups.length,
  ]);

  // Fetch Grid Data based on active month and selected group
  useEffect(() => {
    if (calAvailableMonths.length === 0 || !calSelectedGroup || !calSelectedSem)
      return;
    if (calGridData.length > 0) return;

    fetchCalendarGrid(
      network,
      calSelectedSem,
      calSelectedGroup,
      calAvailableMonths,
    );
  }, [
    calAvailableMonths,
    calSelectedSem,
    calSelectedGroup,
    network,
    fetchCalendarGrid,
    calGridData.length,
  ]);

  useEffect(() => {
    const handleRefresh = () => {
      const state = useDataStore.getState();
      if (state.calSelectedSem && state.calSelectedGroup && state.calAvailableMonths.length > 0) {
        state.fetchCalendarGrid(network, state.calSelectedSem, state.calSelectedGroup, state.calAvailableMonths, true);
      } else if (state.calSelectedSem) {
        state.fetchCalendarMonthsAndGroups(network, state.calSelectedSem);
      }
    };
    window.addEventListener("retop-refresh-calendar", handleRefresh);
    return () => window.removeEventListener("retop-refresh-calendar", handleRefresh);
  }, [network]);

  useEffect(() => {
    if (calGridData.length === 0 || initialScrollDone.current) return;
    const t = setTimeout(() => {
      if (todayRef.current) {
        todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        initialScrollDone.current = true;
      }
    }, 300);
    return () => clearTimeout(t);
  }, [calGridData]);

  return (
    <div className="h-full w-full flex flex-col bg-(--bg-main) font-mono text-(--text-main) overflow-hidden px-1 sm:px-3 md:px-6 max-w-425 mx-auto">
      {calLoadingMonths ? (
        <div className="flex-1 flex flex-col pt-32 pb-8 px-2 animate-pulse min-h-0 h-full overflow-hidden">
          <div className="flex-1 grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 auto-rows-[minmax(38px,auto)] sm:auto-rows-[minmax(50px,auto)] md:auto-rows-[minmax(64px,auto)]">
            {[...Array(28)].map((_, i) => (
              <div key={i} className="bg-(--bg-surface) rounded-xl sm:rounded-2xl" />
            ))}
          </div>
        </div>
      ) : calAvailableMonths.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center pt-15">
          {typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__ ? (
            <OfflineNotSynced pageName="Academic Calendar" />
          ) : (
            <EmptyState 
              msg="No Calendar Data" 
              subMsg="The calendar grid for this semester could not be fetched or does not exist yet." 
              icon={CalendarIcon} />
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 w-full relative z-0">
          {/* Fixed Top Weekdays (Only in Grid View) */}
          {calViewMode === "grid" && (
            <div className="w-full bg-(--bg-main) pt-16 md:pt-20 relative z-20 pb-1">
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 px-0.5 w-full">
                {WEEKDAYS.map((day, i) => (
                  <div
                    key={day}
                    className={`text-center font-expanded font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-normal sm:tracking-widest ${
                      i === 0 ? "text-att-danger" : "text-(--text-muted)"
                    }`}>
                    {day}
                  </div>
                ))}
              </div>
              {/* Fade below */}
              <div className="absolute top-full left-0 right-0 h-4 bg-linear-to-b from-(--bg-main) to-transparent pointer-events-none" />
            </div>
          )}

          {/* Grid or List Container */}
          <div className="flex-1 flex flex-col overflow-hidden relative z-10">
            <div className={`flex-1 overflow-y-auto custom-scrollbar bg-transparent relative pb-24 ${calViewMode === "list" ? "pt-16 md:pt-20 px-1 sm:px-2" : "pt-2 md:pt-4"}`}>
              
                {calLoadingGrid ? (
                  <div
                    key="loading"
                    className="absolute inset-0 z-30 pt-4">
                    {calViewMode === "list" ? (
                      <div className="flex flex-col gap-3 p-1 sm:p-2">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="h-18 bg-(--bg-surface) rounded-2xl animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 auto-rows-[minmax(38px,auto)] sm:auto-rows-[minmax(50px,auto)] md:auto-rows-[minmax(64px,auto)] p-0.5 sm:p-1">
                        {[...Array(35)].map((_, i) => <div key={i} className="bg-(--bg-surface) rounded-xl sm:rounded-2xl animate-pulse" />)}
                      </div>
                    )}
                  </div>
                ) : calGridData.length > 0 ? (
                  <div
                    key="content"
                    className="flex flex-col relative">
                    {calGridData.map((data, mIdx) => {
                      const mergedGroups = calViewMode === "list" ? getMergedCalendarGroups(data.days) : [];

                      return (
                        <div key={mIdx} className="flex flex-col pb-6 md:pb-8 pt-2 md:pt-4">
                          <div className="flex items-center justify-start pb-2 md:pb-4 pointer-events-none sticky top-0 z-50 pt-1 md:pt-2 bg-transparent">
                            <h2 className="font-expanded font-black text-lg sm:text-2xl md:text-3xl uppercase tracking-tighter m-0 text-(--text-main) px-1 sm:px-2">
                              {data.month.label.replace(/\s*-\s*/, " ")}
                            </h2>
                          </div>

                          {calViewMode === "list" ? (
                            /* List View for Month: Merged schedule-based timeline */
                            <div className="flex flex-col gap-1 p-0.5 sm:p-1">
                              {mergedGroups.length === 0 ? (
                                <div className="py-4 px-3 text-xs font-bold text-(--text-muted) italic">
                                  No scheduled events or instructional days for this month.
                                </div>
                              ) : (
                                mergedGroups.map((group) => {
                                  const startDateObj = new Date(group.startDay.dateObj);
                                  const endDateObj = new Date(group.endDay.dateObj);
                                  const startWeekday = !isNaN(startDateObj.getTime())
                                    ? WEEKDAYS[startDateObj.getDay()]
                                    : "";
                                  const endWeekday = !isNaN(endDateObj.getTime())
                                    ? WEEKDAYS[endDateObj.getDay()]
                                    : "";

                                  let cardStyle: React.CSSProperties = {};
                                  let bgClass = "bg-(--bg-surface) hover:bg-(--bg-highlight)";
                                  let titleClass = "text-(--text-main)";

                                  if (group.isHoliday) {
                                    cardStyle = {
                                      backgroundColor: holidayBg,
                                      color: holidayFg,
                                    };
                                    bgClass = "border-0 hover:opacity-90";
                                    titleClass = "font-black";
                                  } else if (group.isExam) {
                                    cardStyle = {
                                      backgroundColor: examBg,
                                      color: examFg,
                                    };
                                    bgClass = "border-0 hover:opacity-90";
                                    titleClass = "font-black";
                                  } else if (group.isInstructional) {
                                    cardStyle = {
                                      backgroundColor: classBg,
                                      color: classFg,
                                    };
                                    bgClass = "border-0 hover:opacity-90";
                                    titleClass = "font-black";
                                  } else if (group.info) {
                                    cardStyle = {
                                      backgroundColor: eventBg,
                                      color: eventFg,
                                    };
                                    bgClass = "border-0 hover:opacity-90";
                                    titleClass = "font-black";
                                  }

                                  const dateLabel =
                                    group.count > 1
                                      ? `${group.startDay.dayNumber} - ${group.endDay.dayNumber}`
                                      : group.startDay.dayNumber;

                                  const weekdayLabel =
                                    group.count > 1
                                      ? `${startWeekday} - ${endWeekday}`
                                      : startWeekday;

                                  return (
                                    <div
                                      key={group.id}
                                      ref={group.isToday ? todayRef : null}
                                      className="flex gap-2 sm:gap-3 relative select-none items-stretch my-0.5"
                                    >
                                      {/* Left Date Column */}
                                      <div className="flex flex-col items-center shrink-0 w-12 sm:w-16 pt-1 sticky top-4 h-fit">
                                        <div
                                          className={`flex items-center justify-center font-black transition-all px-2 h-7 sm:h-8 rounded-full text-xs sm:text-sm text-center ${
                                            group.isToday
                                              ? "bg-(--accent-base) text-(--text-inverse)"
                                              : "bg-transparent text-(--text-main)"
                                          }`}
                                        >
                                          {dateLabel}
                                        </div>
                                        <div
                                          className={`text-[8px] sm:text-[9px] font-expanded font-bold uppercase mt-0.5 text-center ${
                                            group.isToday ? "text-(--accent-base)" : "text-(--text-muted)"
                                          }`}
                                        >
                                          {weekdayLabel}
                                        </div>
                                      </div>

                                      {/* Right Content Area: Card */}
                                      <div className="flex flex-col flex-1 min-w-0 border-l-2 border-(--border-dim) pl-2 sm:pl-3 pb-1">
                                        <div
                                          style={cardStyle}
                                          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 transition-all shadow-xs ${bgClass}`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className={`text-xs sm:text-sm font-bold leading-snug wrap-break-word ${titleClass}`}>
                                              {group.info}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {group.count > 1 && (
                                              <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase bg-current/15 text-current">
                                                {group.count} Days
                                              </span>
                                            )}
                                            {group.subInfo && (
                                              <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase bg-current/15 text-current">
                                                {group.subInfo.replace(/[()]/g, "")}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          ) : (
                          /* Grid View for Month: Colored day numbers on mobile, full event info on desktop */
                          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 auto-rows-[minmax(38px,auto)] sm:auto-rows-[minmax(70px,auto)] md:auto-rows-[minmax(90px,auto)] lg:auto-rows-[minmax(105px,auto)] p-0.5 sm:p-1">
                            {Array.from({ length: data.startOffset }).map(
                              (_, i) => (
                                <div
                                  key={`empty-${i}`}
                                  className="bg-transparent opacity-0 pointer-events-none" />
                              ),
                            )}

                            {data.days.map((day, idx) => {
                              const isToday =
                                new Date().toDateString() ===
                                new Date(day.dateObj).toDateString();

                              let cardStyle: React.CSSProperties = {};
                              let bgClass =
                                "bg-(--bg-surface) hover:bg-(--bg-highlight)";
                              let textClass = "opacity-95 font-bold";
                              let numberClass = "text-(--text-main)";

                              if (day.isHoliday) {
                                cardStyle = {
                                  backgroundColor: holidayBg,
                                  color: holidayFg,
                                };
                                bgClass = "border-0 hover:opacity-90";
                                textClass = "opacity-95 font-extrabold";
                                numberClass = "font-black";
                              } else if (day.isExam) {
                                cardStyle = {
                                  backgroundColor: examBg,
                                  color: examFg,
                                };
                                bgClass = "border-0 hover:opacity-90";
                                textClass = "opacity-95 font-extrabold";
                                numberClass = "font-black";
                              } else if (day.isInstructional) {
                                cardStyle = {
                                  backgroundColor: classBg,
                                  color: classFg,
                                };
                                bgClass = "border-0 hover:opacity-90";
                                textClass = "opacity-95 font-bold";
                                numberClass = "font-black";
                              } else if (day.info) {
                                cardStyle = {
                                  backgroundColor: eventBg,
                                  color: eventFg,
                                };
                                bgClass = "border-0 hover:opacity-90";
                                textClass = "opacity-95 font-bold";
                                numberClass = "font-black";
                              }

                              if (isToday) {
                                bgClass += " z-10 shadow-md ring-2 ring-(--accent-base)";
                                numberClass =
                                  "text-(--text-inverse) bg-(--accent-base) w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-black text-xs sm:text-sm sm:-ml-1 sm:-mt-1";
                              }

                              return (
                                <div
                                  key={idx}
                                  ref={isToday ? todayRef : null}
                                  style={cardStyle}
                                  title={day.info ? `${day.info}${day.subInfo ? ` (${day.subInfo})` : ""}` : undefined}
                                  className={`relative p-1 sm:p-2.5 md:p-3.5 flex flex-col transition-all group rounded-xl sm:rounded-2xl md:rounded-3xl ${bgClass}`}>
                                  {/* Mobile: Centered day number */}
                                  <div className="flex sm:hidden items-center justify-center my-auto">
                                    <span
                                      className={`font-black text-xs font-expanded leading-none transition-transform duration-fast ease-out group-hover:scale-110 ${numberClass}`}>
                                      {day.dayNumber}
                                    </span>
                                  </div>

                                  {/* Desktop: Number at top, item name & subInfo below */}
                                  <div className="hidden sm:flex flex-col h-full w-full">
                                    <div className="flex justify-between items-start mb-1 relative z-10">
                                      <span
                                        className={`font-black text-sm md:text-base lg:text-lg font-expanded leading-none transition-transform duration-fast ease-out group-hover:scale-[1.12] origin-top-left ${numberClass}`}>
                                        {day.dayNumber}
                                      </span>
                                    </div>

                                    {day.info && (
                                      <span
                                        className={`text-xs md:text-sm leading-tight wrap-break-word line-clamp-2 md:line-clamp-3 relative z-10 ${textClass}`}>
                                        {day.info}
                                      </span>
                                    )}

                                    {day.subInfo && (
                                      <div className="mt-auto pt-1 relative z-10">
                                        <span className="inline-flex items-center text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full uppercase w-max max-w-full bg-current/15 text-current">
                                          <span className="whitespace-normal wrap-break-word truncate">
                                            {day.subInfo.replace(/[()]/g, "")}
                                          </span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {Array.from({
                              length:
                                (7 -
                                  ((data.startOffset + data.days.length) % 7)) %
                                7,
                            }).map((_, i) => (
                              <div
                                key={`fill-${i}`}
                                className="bg-transparent opacity-0 pointer-events-none" />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                ) : null}
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
