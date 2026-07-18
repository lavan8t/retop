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

const getAttendanceEmoji = (attendanceStr?: string) => {
  return "";
};

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
      {/* --- MOBILE VIEW (Tabbed) --- */}
      <div className="md:hidden flex flex-col h-full w-full">
        <div className="flex items-center justify-between p-2 bg-(--bg-surface) border-b-2 border-(--border-main) shrink-0 gap-1 overflow-x-auto custom-scrollbar">
          {activeDays.map((day, i) => {
            const isActive = selectedDay === i;
            return (
              <button
                key={`tab-${i}`}
                onClick={() => setSelectedDay(i)}
                className={`flex-1 min-w-9.5 py-2 rounded-lg text-xs font-black font-expanded uppercase transition-all duration-fast border-2 ${
                  isActive
                    ? "bg-purple-400 text-black border-(--border-main) shadow-none -translate-y-px"
                    : "bg-transparent text-content-dim border-transparent hover:text-content-muted"
                }`}
              >
                <span>{day.charAt(0)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-3 pb-32 space-y-4 custom-scrollbar relative">
          <AnimatePresence mode="wait">
            {mobileActiveEvents.length === 0 ? (
              <motion.div
                key="empty"
                className="flex flex-col items-center justify-center h-full text-content-dim py-20"
              >
                <EventBusy className="w-12 h-12 opacity-50 mb-4" />
                <span className="font-expanded font-bold text-xs uppercase ">
                  No Classes Today
                </span>
              </motion.div>
            ) : (
              <motion.div key="timeline" className="space-y-4">
                {mobileActiveEvents.map(
                  ({ startHour, endHour, course }, idx) => {
                    const isLab = course.type.includes("Lab");
                    const attStr = attendance?.find(
                      (a) => a.code === course.code,
                    )?.attendance;
                    const emoji = getAttendanceEmoji(attStr);

                    const lastCharMatch = course.code.match(/[a-zA-Z]+$/);
                    const courseBadge = lastCharMatch
                      ? lastCharMatch[0].slice(-1).toUpperCase()
                      : isLab
                        ? "P"
                        : "L";

                    const colorClasses =
                      "bg-(--bg-highlight) hover:bg-(--border-dim)";

                    return (
                      <motion.button
                        data-tile="true"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={`${selectedDay}-${startHour}`}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setSelectedCourse({
                            data: course,
                            position: { x: rect.left, y: rect.bottom + 10 },
                          });
                        }}
                        className={`rounded-2xl p-4 shadow-none flex gap-4 w-full text-left active:scale-[0.98] cursor-pointer ${colorClasses}`}
                        style={{ transition: 'background-color 0.3s 0.075s, transform 0.3s, box-shadow 0.3s' }}
                      >
                        <div className="w-20 shrink-0 border-r-2 border-(--border-main) flex flex-col items-center justify-center p-1">
                          <span className="font-black font-expanded text-sm md:text-lg text-(--text-main) text-center whitespace-nowrap">
                            {formatTimeStr(
                              `${startHour < 10 ? "0" + startHour : startHour}:00`,
                              use24HourTime,
                            )}
                          </span>
                          {endHour - startHour > 1 && (
                            <>
                              <span className="text-[10px] text-(--text-muted) font-bold mt-1">
                                to
                              </span>
                              <span className="font-black font-expanded text-xs md:text-sm text-(--text-muted) text-center whitespace-nowrap mt-1">
                                {formatTimeStr(
                                  `${endHour < 10 ? "0" + endHour : endHour}:00`,
                                  use24HourTime,
                                )}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center justify-center ${isLab ? "bg-purple-500/20 text-purple-400" : "bg-(--bg-surface) text-(--text-main)"}`}
                            >
                              {courseBadge}
                            </span>
                            <span className="text-[10px] font-bold text-(--text-muted) uppercase bg-(--bg-surface) px-2 py-1 rounded-lg border border-(--border-dim)">
                              {course.code}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-(--text-main) leading-tight truncate flex items-center justify-between">
                            <span className="truncate">{course.title}</span>
                            <span className="shrink-0 ml-2">{emoji}</span>
                          </h4>
                          <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-(--text-muted) bg-(--bg-surface) px-2 py-1 rounded-xl border border-(--border-dim) w-fit">
                            <LocationOn className="w-3.5 h-3.5 text-(--text-muted) shrink-0" />
                            <span className="truncate max-w-30">
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

      {/* --- DESKTOP VIEW (All days columns) --- */}
      <div className="hidden md:flex h-full w-full bg-(--bg-main) divide-x-2 lg:divide-x-4 divide-(--border-dim) overflow-hidden border-t-2 border-(--border-main)">
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
              className="flex-1 flex flex-col h-full min-w-0 bg-(--bg-surface)"
            >
              <div className="bg-(--bg-main) p-3 text-center border-b-4 border-(--border-main) shrink-0 shadow-sm z-10">
                <span className="font-expanded font-black text-sm lg:text-base uppercase text-(--text-main)">
                  {day.substring(0, 3)}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 lg:p-3 space-y-2 lg:space-y-3 pb-32">
                {dayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-(--text-muted) opacity-50">
                    <EventBusy className="w-8 h-8 mb-2" />
                    <span className="text-[10px] font-bold uppercase ">
                      Free
                    </span>
                  </div>
                ) : (
                  dayEvents.map(({ startHour, endHour, course }) => {
                    const isLab = course.type.includes("Lab");
                      const colorClasses =
                        "bg-(--bg-highlight) hover:bg-(--border-dim)";
                    const attStr = attendance?.find(
                      (a) => a.code === course.code,
                    )?.attendance;
                    const emoji = getAttendanceEmoji(attStr);

                    const lastCharMatch = course.code.match(/[a-zA-Z]+$/);
                    const courseBadge = lastCharMatch
                      ? lastCharMatch[0].slice(-1).toUpperCase()
                      : isLab
                        ? "P"
                        : "L";

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
                        className={`w-full text-left p-2.5 lg:p-3 rounded-xl hover:-translate-y-0.5 shadow-none hover:shadow-(--brutal-shadow-hover) flex flex-col gap-1.5 cursor-pointer ${colorClasses}`}
                        style={{ transition: 'background-color 0.3s 0.075s, transform 0.3s, box-shadow 0.3s' }}
                      >
                        <div className="flex justify-between items-start w-full gap-1">
                          <span className="font-black text-xs lg:text-sm truncate pr-1 leading-none text-(--text-main)">
                            {getCourseAcronym(course.title)} {emoji}
                          </span>
                          <span className="text-[9px] lg:text-[10px] font-bold opacity-80 leading-none shrink-0 mt-0.5 text-(--text-muted)">
                            {formatTimeStr(
                              `${startHour < 10 ? "0" + startHour : startHour}:00`,
                              use24HourTime,
                            )}
                            {endHour - startHour > 1 &&
                              ` - ${formatTimeStr(`${endHour < 10 ? "0" + endHour : endHour}:00`, use24HourTime)}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-end w-full mt-1">
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center justify-center ${isLab ? "bg-purple-500/20 text-purple-400" : "bg-(--bg-surface) text-(--text-main)"}`}
                          >
                            {courseBadge}
                          </span>
                          <span className="text-[8px] lg:text-[9px] font-bold truncate max-w-[60%] leading-none text-(--text-muted) flex items-center gap-1">
                            <LocationOn className="w-2.5 h-2.5" />
                            {course.venue}
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
