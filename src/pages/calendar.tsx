import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ProgressActivity,
  CalendarMonth as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
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
          <div className="w-full bg-(--bg-main) pt-18 md:pt-21 relative z-20 pb-1">
            <div className="grid grid-cols-7 w-full">
              {WEEKDAYS.map((day, i) => (
                <div
                  key={day}
                  className={`text-center font-expanded font-black text-xs md:text-sm uppercase tracking-widest ${
                    i === 0 ? "text-red-500" : "text-(--text-muted)"
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
          <div className="flex-1 flex flex-col overflow-hidden relative z-10">
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
                        <div className="flex items-center justify-start pb-4 pointer-events-none sticky top-0 z-[50] pt-2">
                          <h2 className="font-expanded font-black text-2xl md:text-3xl uppercase tracking-tighter m-0 text-(--text-main) drop-shadow-sm px-2">
                            {data.month.label.replace(/\s*-\s*/, " ")}
                          </h2>
                        </div>
                        {/* Month Grid */}
                        <div className="grid grid-cols-7 gap-2 md:gap-3 auto-rows-[minmax(100px,auto)] md:auto-rows-[minmax(140px,auto)] p-2">
                          {Array.from({ length: data.startOffset }).map(
                            (_, i) => (
                              <div
                                key={`empty-${i}`}
                                className="bg-transparent opacity-0 pointer-events-none"
                              />
                            ),
                          )}

                          {data.days.map((day, idx) => {
                            const isToday =
                              new Date().toDateString() ===
                              new Date(day.dateObj).toDateString();

                            let innerBgClass = "";
                            let bgClass =
                              "bg-(--bg-highlight) hover:bg-(--border-dim)";
                            let borderClass = "";
                            let textClass = "text-(--text-muted)";
                            let numberClass = "text-(--text-main)";

                            if (day.isInstructional) {
                              textClass = "text-(--text-main)";
                            }
                            if (day.isHoliday) {
                              bgClass = "bg-red-500/10 hover:bg-red-500/20";
                              textClass =
                                "text-red-600 dark:text-red-400 font-bold";
                              numberClass = "text-red-500";
                            } else if (day.isExam) {
                              bgClass = "bg-amber-500/10 hover:bg-amber-500/20";
                              textClass =
                                "text-amber-600 dark:text-amber-400 font-bold";
                              numberClass = "text-amber-500";
                            }

                            if (isToday) {
                              bgClass += " z-10 shadow-lg";
                              numberClass =
                                "text-(--text-inverse) bg-(--accent-base) w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center -ml-1 -mt-1";
                            }

                            return (
                              <div
                                key={idx}
                                className={`relative p-3 md:p-4 flex flex-col transition-all group rounded-3xl ${bgClass} ${borderClass}`}
                              >
                                {/* Rounded Inner Background Fill */}
                                {innerBgClass && (
                                  <div
                                    className={`absolute inset-[2px] rounded-xl pointer-events-none transition-colors ${innerBgClass}`}
                                  />
                                )}

                                <div className="flex justify-between items-start mb-1 md:mb-2 pt-1 md:pt-0 relative z-10">
                                  <span
                                    className={`font-black text-sm md:text-lg lg:text-xl font-expanded leading-none transition-transform duration-150 ease-in group-hover:scale-[1.15] origin-top-left ${numberClass}`}
                                  >
                                    {day.dayNumber}
                                  </span>
                                </div>

                                {day.info && (
                                  <div className="mt-auto relative z-10 flex flex-col gap-1 pt-2">
                                    {day.subInfo && (
                                      <span
                                        className={`inline-flex items-center text-[9px] md:text-[10px] font-black px-2 py-1 rounded-full uppercase w-max max-w-full bg-(--text-main) text-(--bg-main)`}
                                      >
                                        <span className="whitespace-normal wrap-break-word truncate">
                                          {day.subInfo.replace(/[()]/g, "")}
                                        </span>
                                      </span>
                                    )}
                                    <p
                                      className={`text-[10px] md:text-xs font-bold uppercase leading-tight ${textClass} break-words`}
                                      title={day.info}
                                    >
                                      {day.info}
                                    </p>
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
                              className="bg-transparent opacity-0 pointer-events-none"
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
