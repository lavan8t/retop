import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { VTOPNetwork } from "../utils/network";

import {
  parseCalendarSemesters,
  parseCalendarGroupsAndMonths,
  parseCalendarDays,
} from "../parsers/calendar";

import { CalendarMonthPreview, CalendarEvent, ClassGroup } from "../types/vtop";

interface CalendarPageProps {
  network: VTOPNetwork;
  semesters: { id: string; label: string }[];
  setSemesters: (sems: { id: string; label: string }[]) => void;
  selectedSem: string;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const spring = { type: "spring", stiffness: 300, damping: 30 } as const;

export const CalendarPage: React.FC<CalendarPageProps> = ({
  network,
  semesters,
  setSemesters,
  selectedSem,
}) => {
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Step 2 States
  const [availableMonths, setAvailableMonths] = useState<
    CalendarMonthPreview[]
  >([]);
  const [activeMonthIdx, setActiveMonthIdx] = useState(0);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  // Step 3 States
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [gridData, setGridData] = useState<{
    days: CalendarEvent[];
    startOffset: number;
  } | null>(null);

  // 1. Fetch Semesters
  useEffect(() => {
    if (semesters.length > 0) {
      setLoadingInitial(false);
      return;
    }
    const fetchSems = async () => {
      try {
        const html = await network.fetchFragment(
          "academics/common/CalendarPreview",
          { verifyMenu: "true" },
        );
        const sems = parseCalendarSemesters(html);
        setSemesters(sems);
      } catch (e) {
        console.error("Failed to fetch calendar semesters:", e);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchSems();
  }, [network, semesters.length, setSemesters]);

  // 2. Fetch Months and Class Groups based on selected Semester
  useEffect(() => {
    if (!selectedSem) return;
    const fetchMonthsAndGroups = async () => {
      setAvailableMonths([]);
      setClassGroups([]);
      setActiveMonthIdx(0);
      try {
        const html = await network.fetchFragment(
          "academics/common/getDateForSemesterPreview",
          {
            paramReturnId: "getDateForSemesterPreview",
            semSubId: selectedSem,
          },
        );
        const { groups, months } = parseCalendarGroupsAndMonths(html);
        setClassGroups(groups);
        setAvailableMonths(months);

        // Default to "COMB" (All) if it exists, otherwise the first group
        const defaultGroup =
          groups.find((g) => g.id === "COMB")?.id || (groups[0]?.id ?? "");
        setSelectedGroup(defaultGroup);
      } catch (e) {
        console.error("Failed to fetch months and groups:", e);
      }
    };
    fetchMonthsAndGroups();
  }, [selectedSem, network]);

  // 3. Fetch Grid Data based on active month and selected group
  useEffect(() => {
    if (availableMonths.length === 0 || !selectedGroup) return;
    const activeMonth = availableMonths[activeMonthIdx];

    const fetchGrid = async () => {
      setLoadingGrid(true);
      setGridData(null);
      try {
        const html = await network.fetchFragment(
          "academics/common/processViewCalendar",
          {
            calDate: activeMonth.dateString,
            semSubId: selectedSem,
            classGroupId: selectedGroup,
          },
        );
        const days = parseCalendarDays(html, activeMonth.label);

        const dateObj = new Date(activeMonth.dateString);
        const startOffset = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          1,
        ).getDay();

        setGridData({ days, startOffset });
      } catch (e) {
        console.error("Failed to fetch grid data:", e);
      } finally {
        setLoadingGrid(false);
      }
    };
    fetchGrid();
  }, [activeMonthIdx, availableMonths, selectedSem, selectedGroup, network]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] font-mono text-[var(--text-main)] overflow-hidden p-4 md:p-8">
      {loadingInitial ? (
        <div className="flex-1 flex flex-col items-center justify-center animate-pulse border-4 border-dashed border-[var(--border-main)] rounded-4xl">
          <Loader2 className="w-16 h-16 mb-6 animate-spin text-[var(--accent-base)]" />
          <span className="text-xl font-black uppercase font-expanded tracking-widest text-[var(--text-muted)]">
            Syncing Calendar...
          </span>
        </div>
      ) : availableMonths.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-[var(--border-main)] rounded-4xl">
          <CalendarIcon className="w-20 h-20 mb-6 text-[var(--text-muted)]" />
          <span className="text-2xl font-black uppercase font-expanded text-[var(--text-main)]">
            Select a Semester
          </span>
          <p className="mt-2 text-[var(--text-muted)] font-bold text-sm">
            Use the top navigation bar to load data.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full">
          {/* Brutalist Controller Header */}
          <div className="flex flex-col md:flex-row items-center justify-between bg-[var(--bg-card)] border-4 border-[var(--border-main)] rounded-t-3xl p-4 gap-4 shrink-0 shadow-none z-20 relative">
            {/* Group Selector */}
            <div className="w-full md:w-auto flex flex-col">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1">
                Class Group
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full md:w-48 appearance-none bg-[var(--bg-main)] border-4 border-[var(--border-main)] text-[var(--text-main)] text-sm font-bold p-2.5 rounded-xl outline-none focus:border-[var(--accent-base)] transition-colors cursor-pointer shadow-none"
              >
                {classGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-center">
              <button
                onClick={() => setActiveMonthIdx((p) => Math.max(0, p - 1))}
                disabled={activeMonthIdx === 0}
                className="group p-3 border-4 border-(--border-main) rounded-xl bg-(--bg-main) hover:bg-(--accent-base) hover:text-[var(--text-inverse)] transition-all disabled:opacity-30 disabled:pointer-events-none active:translate-y-1 shadow-none hover:shadow-none"
              >
                <ChevronLeft className="w-6 h-6 stroke-[3px]" />
              </button>

              <div className="flex flex-col items-center justify-center min-w-40">
                <h2 className="font-expanded font-black text-2xl md:text-3xl uppercase tracking-tight m-0 text-center">
                  {availableMonths[activeMonthIdx].label}
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-red-500 border-2 border-(--border-main) rounded-sm shadow-sm"></div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Holiday
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-yellow-400 border-2 border-(--border-main) rounded-sm shadow-sm"></div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Exam
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  setActiveMonthIdx((p) =>
                    Math.min(availableMonths.length - 1, p + 1),
                  )
                }
                disabled={activeMonthIdx === availableMonths.length - 1}
                className="group p-3 border-4 border-[var(--border-main)] rounded-xl bg-[var(--bg-main)] hover:bg-[var(--accent-base)] hover:text-[var(--text-inverse)] transition-all disabled:opacity-30 disabled:pointer-events-none active:translate-y-1 shadow-none hover:shadow-none"
              >
                <ChevronRight className="w-6 h-6 stroke-[3px]" />
              </button>
            </div>
          </div>

          {/* Grid Container */}
          <div className="flex-1 flex flex-col bg-[var(--bg-card)] border-x-4 border-b-4 border-[var(--border-main)] rounded-b-3xl shadow-none overflow-hidden relative z-10">
            <div className="grid grid-cols-7 border-b-4 border-[var(--border-main)] bg-[var(--bg-main)] shrink-0">
              {WEEKDAYS.map((day, i) => (
                <div
                  key={day}
                  className={`py-3 text-center font-expanded font-black text-xs md:text-sm uppercase tracking-widest ${
                    i === 0 || i === 6
                      ? "text-red-500"
                      : "text-[var(--text-muted)]"
                  } border-r-4 border-[var(--border-main)] last:border-r-0`}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-main)] relative">
              <AnimatePresence mode="wait">
                {loadingGrid ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-[var(--bg-main)]/80 backdrop-blur-sm z-30"
                  >
                    <Loader2 className="w-12 h-12 animate-spin text-[var(--accent-base)]" />
                  </motion.div>
                ) : gridData ? (
                  <motion.div
                    key={`${activeMonthIdx}-${selectedGroup}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={spring}
                    className="grid grid-cols-7 auto-rows-fr h-full"
                  >
                    {Array.from({ length: gridData.startOffset }).map(
                      (_, i) => (
                        <div
                          key={`empty-${i}`}
                          className="border-r-4 border-b-4 border-[var(--border-main)]/50 bg-[var(--bg-main)] opacity-40 pointer-events-none"
                        />
                      ),
                    )}

                    {gridData.days.map((day, idx) => {
                      const isToday =
                        new Date().toDateString() ===
                        day.dateObj.toDateString();

                      let bgClass =
                        "bg-[var(--bg-card)] hover:bg-[var(--bg-main)]";
                      let borderClass = "border-[var(--border-main)]";
                      let textClass = "text-[var(--text-muted)]";
                      let numberClass = "text-[var(--text-main)]";
                      let accentBar = "";

                      if (day.isInstructional) {
                        textClass = "text-[var(--text-main)]";
                      }
                      if (day.isHoliday) {
                        bgClass = "bg-red-500 text-black hover:bg-red-400";
                        borderClass = "border-red-600";
                        textClass = "text-black/80";
                        numberClass = "text-black";
                        accentBar = "bg-red-900/20";
                      } else if (day.isExam) {
                        bgClass =
                          "bg-yellow-400 text-black hover:bg-yellow-300";
                        borderClass = "border-yellow-500";
                        textClass = "text-black/80";
                        numberClass = "text-black";
                        accentBar = "bg-yellow-900/20";
                      } else if (isToday) {
                        bgClass =
                          "bg-[var(--accent-base)] text-[var(--text-inverse)] hover:brightness-110";
                        borderClass = "border-[var(--border-main)]";
                        textClass = "text-[var(--text-inverse)]/90";
                        numberClass = "text-[var(--text-inverse)]";
                        accentBar = "bg-black/20";
                      }

                      return (
                        <div
                          key={idx}
                          className={`min-h-[120px] md:min-h-[160px] p-2 md:p-3 border-r-4 border-b-4 transition-all duration-200 flex flex-col group relative overflow-hidden ${bgClass} ${borderClass}`}
                        >
                          {accentBar && (
                            <div
                              className={`absolute top-0 left-0 right-0 h-2 ${accentBar}`}
                            />
                          )}

                          <div className="flex justify-between items-start w-full relative z-10">
                            <span
                              className={`font-expanded font-black text-2xl md:text-3xl leading-none ${numberClass} group-hover:scale-110 origin-top-left transition-transform`}
                            >
                              {day.dayNumber}
                            </span>

                            {isToday && (
                              <span className="hidden md:block text-[9px] font-black uppercase bg-black text-white px-2 py-1 rounded shadow-sm">
                                TODAY
                              </span>
                            )}
                          </div>

                          {day.info && (
                            <div className="mt-auto relative z-10 flex flex-col gap-1">
                              <p
                                className={`text-[10px] md:text-xs font-bold uppercase leading-tight line-clamp-2 ${textClass}`}
                                title={day.info}
                              >
                                {day.info}
                              </p>

                              {day.subInfo && (
                                <span
                                  className={`inline-flex items-center gap-1 text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase w-fit truncate ${
                                    day.isHoliday || day.isExam || isToday
                                      ? "bg-black/10 text-black"
                                      : "bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-muted)]"
                                  }`}
                                >
                                  <Info className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    {day.subInfo}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {Array.from({
                      length:
                        (7 -
                          ((gridData.startOffset + gridData.days.length) % 7)) %
                        7,
                    }).map((_, i) => (
                      <div
                        key={`fill-${i}`}
                        className="border-r-4 border-b-4 border-[var(--border-main)]/50 bg-[var(--bg-main)] opacity-40 pointer-events-none"
                      />
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
