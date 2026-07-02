import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ProgressActivity,
  CalendarMonth as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
} from '@nine-thirty-five/material-symbols-react/outlined';
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
          <ProgressActivity className="w-16 h-16 mb-6 animate-spin text-(--accent-base)" />
          <span className="text-xl font-black uppercase font-expanded tracking-widest text-(--text-muted)">
            Syncing CalendarMonth...
          </span>
        </div>
      ) : calAvailableMonths.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-4 border-(--border-main) rounded-3xl bg-(--bg-card) shadow-none mt-[120px]">
          <CalendarIcon className="w-20 h-20 mb-6 text-(--text-muted) opacity-50" />
          <span className="text-2xl font-black uppercase font-expanded text-(--text-main)">
            No CalendarMonth Data
          </span>
          <p className="mt-2 text-(--text-muted) font-bold text-sm max-w-md text-center">
            The calendar grid for this semester could not be fetched or does not
            exist yet.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 w-full relative z-0">
          {/* Fixed Top Weekdays (Opaque background + fade below) */}
          <div className="w-full bg-(--bg-main) pt-[72px] md:pt-[84px] relative z-20 pb-1">
            <div className="grid grid-cols-7 w-full">
              {WEEKDAYS.map((day, i) => (
                <div
                  key={day}
                  className={`text-center font-expanded font-black text-xs md:text-sm uppercase tracking-widest ${
                    i === 0 || i === 6 ? "text-red-500" : "text-(--text-muted)"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
            {/* Fade below the weekdays to mask the grid as it scrolls up */}
            <div className="absolute top-full left-0 right-0 h-6 bg-gradient-to-b from-(--bg-main) to-transparent pointer-events-none" />
          </div>

          {/* Grid Container */}
          <div
            className="flex-1 flex flex-col overflow-hidden relative z-10"
            style={{
              maskImage:
                "linear-gradient(to bottom, black 85%, transparent 100%)",
            }}
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent relative pb-24 pt-4">
              <AnimatePresence mode="wait">
                {calLoadingGrid ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-(--bg-main)/80 backdrop-blur-sm z-30"
                  >
                    <ProgressActivity className="w-12 h-12 animate-spin text-(--accent-base)" />
                  </motion.div>
                ) : calGridData.length > 0 ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={spring}
                    className="flex flex-col relative"
                  >
                    {calGridData.map((data, mIdx) => (
                      <div key={mIdx} className="flex flex-col pb-8 pt-4">
                        <div className="flex items-center justify-start pb-4 pointer-events-none sticky top-0 z-10 pt-2 bg-gradient-to-b from-(--bg-main) via-(--bg-main)/90 to-transparent">
                          <h2 className="font-expanded font-black text-2xl md:text-3xl uppercase tracking-tighter m-0 text-(--text-main) drop-shadow-sm px-2">
                            {data.month.label.replace(/\s*-\s*/, " ")}
                          </h2>
                        </div>
                        {/* Month Grid */}
                        <div className="grid grid-cols-7 auto-rows-[minmax(100px,auto)] md:auto-rows-[minmax(140px,auto)]">
                          {Array.from({ length: data.startOffset }).map(
                            (_, i) => (
                              <div
                                key={`empty-${i}`}
                                className="border-r border-b border-(--border-main)/10 bg-transparent opacity-0 pointer-events-none"
                              />
                            ),
                          )}

                          {data.days.map((day, idx) => {
                            const isToday =
                              new Date().toDateString() ===
                              new Date(day.dateObj).toDateString();

                            let innerBgClass = "";
                            let bgClass = "bg-(--bg-card) hover:bg-(--bg-highlight)";
                            let borderClass = "border-(--border-main)/20 border-r border-b";
                            let textClass = "text-(--text-muted)";
                            let numberClass = "text-(--text-main)";

                            if (day.isInstructional) {
                              textClass = "text-(--text-main)";
                            }
                            if (day.isHoliday) {
                              bgClass = "hover:bg-(--bg-highlight)";
                              innerBgClass = "bg-red-500/15 group-hover:bg-red-500/25";
                              borderClass = "border-red-500/10 border-r border-b";
                              textClass = "text-red-600 dark:text-red-400 font-bold";
                              numberClass = "text-red-500";
                            } else if (day.isExam) {
                              bgClass = "hover:bg-(--bg-highlight)";
                              innerBgClass = "bg-amber-500/15 group-hover:bg-amber-500/25";
                              borderClass = "border-amber-500/10 border-r border-b";
                              textClass = "text-amber-600 dark:text-amber-400 font-bold";
                              numberClass = "text-amber-500";
                            }

                            if (isToday) {
                              bgClass +=
                                " ring-2 ring-(--accent-base) ring-inset bg-(--accent-base)/10 z-10";
                              numberClass = "text-(--accent-base)";
                            }

                            return (
                              <div
                                key={idx}
                                className={`relative p-2 md:p-3 flex flex-col transition-all group ${bgClass} ${borderClass}`}
                              >
                                {/* Rounded Inner Background Fill */}
                                {innerBgClass && (
                                  <div className={`absolute inset-[2px] rounded-xl pointer-events-none transition-colors ${innerBgClass}`} />
                                )}

                                <div className="flex justify-between items-start mb-1 md:mb-2 pt-1 md:pt-0 relative z-10">
                                  <span
                                    className={`font-black text-sm md:text-lg lg:text-xl font-expanded leading-none ${numberClass}`}
                                  >
                                    {day.dayNumber}
                                  </span>
                                </div>

                                {day.info && (
                                  <div className="mt-auto relative z-10 flex flex-col gap-1 pt-2">
                                    <p
                                      className={`text-[10px] md:text-xs font-bold uppercase leading-tight ${textClass} break-words`}
                                      title={day.info}
                                    >
                                      {day.info}
                                    </p>

                                    {day.subInfo && (
                                      <span
                                        className={`inline-flex items-start gap-1 text-[9px] md:text-[10px] font-black px-1.5 py-1 rounded-md uppercase w-full ${
                                          day.isHoliday || day.isExam || isToday
                                            ? "bg-black/10 text-black"
                                            : "bg-(--bg-main) border border-(--border-main) text-(--text-muted)"
                                        }`}
                                      >
                                        <Info className="w-3 h-3 shrink-0 mt-0.5" />
                                        <span className="whitespace-normal break-words">
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
                              className="border-r border-b border-(--border-main)/10 bg-transparent opacity-0 pointer-events-none"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : !calSelectedGroup ? (
                  <motion.div
                    key="no-group"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10"
                  >
                    <Info className="w-16 h-16 mb-6 text-(--accent-base) opacity-80" />
                    <h3 className="text-2xl font-black font-expanded uppercase text-(--text-main) mb-2">
                      Select a Class Group
                    </h3>
                    <p className="text-(--text-muted) max-w-sm">
                      Please select your class group from the dropdown in the top bar to view the calendar schedule.
                    </p>
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
