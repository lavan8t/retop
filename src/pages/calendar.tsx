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

import { useDataStore } from "../store/dataStore";

interface CalendarPageProps {
  network: VTOPNetwork;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const spring = { type: "spring", stiffness: 300, damping: 30 } as const;

export const CalendarPage: React.FC<CalendarPageProps> = ({ network }) => {
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

  // Fetch Semesters
  useEffect(() => {
    if (calSemesters.length > 0) return;

    const fetchSems = async () => {
      try {
        const html = await network.fetchFragment(
          "academics/common/CalendarPreview",
          { verifyMenu: "true" },
        );
        const sems = parseCalendarSemesters(html);
        setCalSemesters(sems);
        if (sems.length > 0 && !calSelectedSem) {
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
    if (calAvailableMonths.length > 0 && calClassGroups.length > 0) return;

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
    // Prevent fetching if we already have grid data for this combo
    if (calGridData.length > 0) return; // Simple check, relies on store to wipe data when sem/group changes

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

  // Clear grid data when semester or group changes so it fetches again
  useEffect(() => {
    useDataStore.setState({ calGridData: [] });
  }, [calSelectedSem, calSelectedGroup]);

  // Clear months when semester changes
  useEffect(() => {
    useDataStore.setState({ calAvailableMonths: [], calClassGroups: [] });
  }, [calSelectedSem]);

  return (
    <div className="h-full w-full flex flex-col bg-(--bg-main) font-mono text-(--text-main) overflow-hidden pb-8 px-4 md:px-8 max-w-425 mx-auto">
      {calLoadingMonths ? (
        <div className="flex-1 flex flex-col items-center justify-center animate-pulse border-4 border-(--border-main) rounded-3xl bg-(--bg-card) shadow-none mt-[120px]">
          <Loader2 className="w-16 h-16 mb-6 animate-spin text-(--accent-base)" />
          <span className="text-xl font-black uppercase font-expanded tracking-widest text-(--text-muted)">
            Syncing Calendar...
          </span>
        </div>
      ) : calAvailableMonths.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-4 border-(--border-main) rounded-3xl bg-(--bg-card) shadow-none mt-[120px]">
          <CalendarIcon className="w-20 h-20 mb-6 text-(--text-muted) opacity-50" />
          <span className="text-2xl font-black uppercase font-expanded text-(--text-main)">
            No Calendar Data
          </span>
          <p className="mt-2 text-(--text-muted) font-bold text-sm max-w-md text-center">
            The calendar grid for this semester could not be fetched or does not
            exist yet.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 w-full mt-[100px] mb-8 relative z-0">
          {/* Grid Container */}
          <div
            className="flex-1 flex flex-col bg-(--bg-card) border-4 border-(--border-main) rounded-3xl shadow-none overflow-hidden relative z-10"
            style={{
              maskImage:
                "linear-gradient(to bottom, black 85%, transparent 100%)",
            }}
          >
            {/* Global Days Header */}
            <div className="grid grid-cols-7 border-b-4 border-(--border-main) bg-(--bg-main) shrink-0 shadow-sm z-20">
              {WEEKDAYS.map((day, i) => (
                <div
                  key={day}
                  className={`py-3 text-center font-expanded font-black text-xs md:text-sm uppercase tracking-widest ${
                    i === 0 || i === 6 ? "text-red-500" : "text-(--text-muted)"
                  } border-r-4 border-(--border-main) last:border-r-0`}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-(--bg-main) relative pb-16">
              <AnimatePresence mode="wait">
                {calLoadingGrid ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-(--bg-main)/80 backdrop-blur-sm z-30"
                  >
                    <Loader2 className="w-12 h-12 animate-spin text-(--accent-base)" />
                  </motion.div>
                ) : calGridData.length > 0 ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={spring}
                    className="flex flex-col"
                  >
                    {calGridData.map((data, mIdx) => (
                      <div
                        key={mIdx}
                        className="flex flex-col border-b-4 border-(--border-main) last:border-b-0"
                      >
                        {/* Sticky Month Divider */}
                        <div className="bg-(--bg-card) border-b-4 border-(--border-main) py-4 sticky top-0 z-10 flex flex-col items-center justify-center shadow-sm">
                          <h2 className="font-expanded font-black text-xl md:text-2xl uppercase tracking-tight m-0 text-(--text-main)">
                            {data.month.label}
                          </h2>
                          {mIdx === 0 && (
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-red-500 border-2 border-(--border-main) rounded-sm shadow-sm"></div>
                                <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">
                                  Holiday
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-yellow-400 border-2 border-(--border-main) rounded-sm shadow-sm"></div>
                                <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">
                                  Exam
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Month Grid */}
                        <div className="grid grid-cols-7 auto-rows-[minmax(100px,auto)] md:auto-rows-[minmax(140px,auto)]">
                          {Array.from({ length: data.startOffset }).map(
                            (_, i) => (
                              <div
                                key={`empty-${i}`}
                                className="border-r-4 border-b-4 border-(--border-main)/50 bg-(--bg-main) opacity-40 pointer-events-none"
                              />
                            ),
                          )}

                          {data.days.map((day, idx) => {
                            const isToday =
                              new Date().toDateString() ===
                              day.dateObj.toDateString();

                            let bgClass = "bg-(--bg-card) hover:bg-(--bg-main)";
                            let borderClass = "border-(--border-main)";
                            let textClass = "text-(--text-muted)";
                            let numberClass = "text-(--text-main)";
                            let accentBar = "";

                            if (day.isInstructional) {
                              textClass = "text-(--text-main)";
                            }
                            if (day.isHoliday) {
                              bgClass =
                                "bg-red-500 text-black hover:bg-red-400";
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
                                "bg-(--accent-base) text-(--text-inverse) hover:brightness-110";
                              borderClass = "border-(--border-main)";
                              textClass = "text-(--text-inverse)/90";
                              numberClass = "text-(--text-inverse)";
                              accentBar = "bg-black/20";
                            }

                            return (
                              <div
                                key={idx}
                                className={`p-2 md:p-3 border-r-4 border-b-4 transition-all duration-200 flex flex-col group relative overflow-hidden ${bgClass} ${borderClass}`}
                              >
                                {accentBar && (
                                  <div
                                    className={`absolute top-0 left-0 right-0 h-2 ${accentBar}`}
                                  />
                                )}

                                <div className="flex justify-between items-start w-full relative z-10">
                                  <span
                                    className={`font-expanded font-black text-xl md:text-3xl leading-none ${numberClass} group-hover:scale-110 origin-top-left transition-transform`}
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
                                  <div className="mt-auto relative z-10 flex flex-col gap-1 pt-2">
                                    <p
                                      className={`text-[10px] md:text-xs font-bold uppercase leading-tight line-clamp-2 md:line-clamp-3 ${textClass}`}
                                      title={day.info}
                                    >
                                      {day.info}
                                    </p>

                                    {day.subInfo && (
                                      <span
                                        className={`inline-flex items-center gap-1 text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase w-fit truncate ${
                                          day.isHoliday || day.isExam || isToday
                                            ? "bg-black/10 text-black"
                                            : "bg-(--bg-main) border border-(--border-main) text-(--text-muted)"
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
                                ((data.startOffset + data.days.length) % 7)) %
                              7,
                          }).map((_, i) => (
                            <div
                              key={`fill-${i}`}
                              className="border-r-4 border-b-4 border-(--border-main)/50 bg-(--bg-main) opacity-40 pointer-events-none"
                            />
                          ))}
                        </div>
                      </div>
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
