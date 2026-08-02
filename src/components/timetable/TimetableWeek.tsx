import React, { useMemo, useState, useEffect } from "react";
import { TimetableCourse, CourseSummary } from "../../types/vtop";
import { getGridPositions, DAYS } from "../../utils/timetable-slots";
import {
  LocationOn,
  EventBusy,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { motion, AnimatePresence } from "framer-motion";
import { getCourseAcronym, formatTimeStr } from "../../utils/formatting";
import { CoursePopup } from "./CoursePopup";

export const TimetableWeek = ({
  courses,
  attendance,
  use24HourTime = true,
}: {
  courses: TimetableCourse[];
  attendance: CourseSummary[];
  use24HourTime?: boolean;
}) => {
  const activeDays = useMemo(() => {
    const hasSaturday = courses.some((c) =>
      getGridPositions(c.slot).some((p) => p.day === 5),
    );
    return hasSaturday ? DAYS.slice(0, 6) : DAYS.slice(0, 5);
  }, [courses]);

  const [now, setNow] = useState(new Date());
  const currentDayIndex = Math.max(0, Math.min(5, now.getDay() - 1));
  const [selectedDay, setSelectedDay] = useState(currentDayIndex);

  const [selectedCourse, setSelectedCourse] = useState<{
    data: TimetableCourse;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isTileButton = target.closest('button[data-tile="true"]');
      if (isTileButton) return;
      setSelectedCourse(null);
    };
    window.addEventListener("click", handleDocumentClick);
    return () => window.removeEventListener("click", handleDocumentClick);
  }, []);

  const schedule = useMemo(() => {
    const map: Record<number, Record<number, TimetableCourse>> = {};
    activeDays.forEach((_, i) => (map[i] = {}));

    courses.forEach((course) => {
      const positions = getGridPositions(course.slot);
      positions.forEach((pos) => {
        let startHour = -1;
        if (pos.col <= 4) startHour = 8 + pos.col;
        else if (pos.col === 5) startHour = 12;
        else if (pos.col === 6) startHour = 13;
        else if (pos.col >= 7) startHour = 14 + (pos.col - 7);

        if (startHour !== -1 && map[pos.day]) {
          map[pos.day][startHour] = course;
        }
      });
    });
    return map;
  }, [courses, activeDays]);

  const mergeEvents = (events: { hour: number; course: TimetableCourse }[]) => {
    const merged: {
      startHour: number;
      endHour: number;
      course: TimetableCourse;
    }[] = [];
    events.forEach((evt) => {
      if (merged.length === 0) {
        merged.push({
          startHour: evt.hour,
          endHour: evt.hour + 1,
          course: evt.course,
        });
      } else {
        const last = merged[merged.length - 1];
        if (
          last.course.code === evt.course.code &&
          last.course.type === evt.course.type
        ) {
          last.endHour = evt.hour + 1;
        } else {
          merged.push({
            startHour: evt.hour,
            endHour: evt.hour + 1,
            course: evt.course,
          });
        }
      }
    });
    return merged;
  };

  const mobileActiveEvents = useMemo(() => {
    const rawEvents = Object.entries(schedule[selectedDay] || {})
      .map(([hourStr, course]) => ({
        hour: parseInt(hourStr),
        course,
      }))
      .sort((a, b) => a.hour - b.hour);
    return mergeEvents(rawEvents);
  }, [schedule, selectedDay]);

  return (
    <div className="flex flex-col h-full w-full bg-(--bg-main) overflow-hidden relative">
      {/* --- MOBILE VIEW (Fully Rounded Pills) --- */}
      <div className="md:hidden flex flex-col h-full w-full">
        {/* Day Tabs */}
        <div className="flex items-center justify-between p-3 bg-(--bg-surface) shrink-0 gap-2 overflow-x-auto custom-scrollbar">
          {activeDays.map((day, i) => {
            const isActive = selectedDay === i;
            return (
              <button
                key={`tab-${i}`}
                onClick={() => setSelectedDay(i)}
                className={`flex-1 py-2.5 rounded-full text-xs font-black font-expanded uppercase transition-all border-0 cursor-pointer ${
                  isActive
                    ? "bg-(--accent-base) text-(--text-inverse) shadow-xs"
                    : "bg-(--bg-main) text-(--text-muted) hover:text-(--text-main)"
                }`}
              >
                <span>{day.substring(0, 3)}</span>
              </button>
            );
          })}
        </div>

        {/* Classes List */}
        <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-3 custom-scrollbar relative">
          <AnimatePresence mode="wait">
            {mobileActiveEvents.length === 0 ? (
              <motion.div
                key="empty"
                className="flex flex-col items-center justify-center h-full text-(--text-muted) py-20"
              >
                <EventBusy className="w-12 h-12 opacity-50 mb-3" />
                <span className="font-expanded font-bold text-xs uppercase">
                  No Classes Scheduled
                </span>
              </motion.div>
            ) : (
              <motion.div key="timeline" className="space-y-3">
                {mobileActiveEvents.map(
                  ({ startHour, endHour, course }, idx) => {
                    const isLab = course.type.includes("Lab");
                    const lastCharMatch = course.code.match(/[a-zA-Z]+$/);
                    const courseBadge = lastCharMatch
                      ? lastCharMatch[0].slice(-1).toUpperCase()
                      : isLab
                        ? "P"
                        : "L";

                    return (
                      <motion.button
                        data-tile="true"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        key={`${selectedDay}-${startHour}`}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setSelectedCourse({
                            data: course,
                            position: { x: rect.left, y: rect.bottom + 10 },
                          });
                        }}
                        className="bg-(--bg-surface) hover:bg-(--bg-highlight) rounded-3xl p-4 flex gap-4 w-full text-left cursor-pointer border-0 shadow-xs transition-colors"
                      >
                        {/* Timing Column */}
                        <div className="w-22 shrink-0 flex flex-col items-center justify-center bg-(--bg-main) px-2 py-3 rounded-2xl">
                          <span className="font-black font-mono text-xs text-(--text-main) text-center whitespace-nowrap">
                            {formatTimeStr(
                              `${startHour < 10 ? "0" + startHour : startHour}:00`,
                              use24HourTime,
                            )}
                          </span>
                          {endHour - startHour > 1 && (
                            <>
                              <span className="text-[10px] text-(--text-muted) font-bold my-0.5">
                                to
                              </span>
                              <span className="font-black font-mono text-xs text-(--text-muted) text-center whitespace-nowrap">
                                {formatTimeStr(
                                  `${endHour < 10 ? "0" + endHour : endHour}:00`,
                                  use24HourTime,
                                )}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Details Column */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full font-mono ${
                                isLab
                                  ? "bg-purple-500/15 text-purple-500"
                                  : "bg-(--accent-base)/15 text-(--accent-base)"
                              }`}
                            >
                              {courseBadge} · {course.type}
                            </span>
                            <span className="text-xs font-mono font-bold text-(--text-muted) bg-(--bg-main) px-2.5 py-0.5 rounded-full">
                              {course.code}
                            </span>
                          </div>

                          <h4 className="text-sm font-black font-expanded text-(--text-main) leading-snug truncate">
                            {course.title}
                          </h4>

                          <div className="flex items-center gap-1.5 text-xs font-bold text-(--text-muted) bg-(--bg-main) px-2.5 py-1 rounded-full w-fit">
                            <LocationOn className="w-3.5 h-3.5 text-(--accent-base) shrink-0" />
                            <span className="truncate max-w-36">
                              {course.venue}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  },
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* --- DESKTOP VIEW (Borderless M3 Day Columns) --- */}
      <div className="hidden md:flex h-full w-full bg-(--bg-main) gap-3 p-4 overflow-hidden">
        {activeDays.map((day, i) => {
          const dayEvents = mergeEvents(
            Object.entries(schedule[i] || {})
              .map(([hourStr, course]) => ({
                hour: parseInt(hourStr),
                course,
              }))
              .sort((a, b) => a.hour - b.hour),
          );

          return (
            <div
              key={day}
              className="flex-1 flex flex-col h-full min-w-0 bg-(--bg-surface) rounded-3xl overflow-hidden shadow-xs border-0"
            >
              {/* Day Header */}
              <div className="bg-(--bg-highlight)/60 p-3.5 text-center border-b border-(--border-dim) shrink-0">
                <span className="font-expanded font-black text-xs lg:text-sm uppercase text-(--text-main) tracking-wider">
                  {day.substring(0, 3)}
                </span>
              </div>

              {/* Day Classes */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 pb-32">
                {dayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-(--text-muted) opacity-40">
                    <EventBusy className="w-8 h-8 mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Free
                    </span>
                  </div>
                ) : (
                  dayEvents.map(({ startHour, endHour, course }) => {
                    const isLab = course.type.includes("Lab");
                    return (
                      <button
                        key={`${day}-${startHour}`}
                        data-tile="true"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setSelectedCourse({
                            data: course,
                            position: { x: rect.left, y: rect.bottom + 10 },
                          });
                        }}
                        className="w-full text-left p-3.5 rounded-2xl bg-(--bg-main) hover:bg-(--bg-highlight) flex flex-col gap-2 cursor-pointer border-0 transition-colors shadow-none"
                      >
                        <div className="flex justify-between items-start w-full gap-2">
                          <span className="font-black font-expanded text-xs lg:text-sm text-(--text-main) truncate flex-1">
                            {getCourseAcronym(course.title)}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-(--text-muted) shrink-0">
                            {formatTimeStr(
                              `${startHour < 10 ? "0" + startHour : startHour}:00`,
                              use24HourTime,
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between items-center w-full pt-1">
                          <span
                            className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full ${
                              isLab
                                ? "bg-purple-500/15 text-purple-500"
                                : "bg-(--accent-base)/15 text-(--accent-base)"
                            }`}
                          >
                            {isLab ? "P" : "L"}
                          </span>
                          <span className="text-xs font-bold text-(--text-muted) flex items-center gap-1 truncate max-w-[65%]">
                            <LocationOn className="w-3.5 h-3.5 text-(--accent-base) shrink-0" />
                            <span className="truncate">{course.venue}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CoursePopup
        course={selectedCourse?.data || null}
        position={selectedCourse?.position || null}
        attendance={
          attendance?.find((a) => a.code === selectedCourse?.data?.code)
            ?.attendance
        }
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
};
