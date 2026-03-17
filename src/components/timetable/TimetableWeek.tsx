import React, { useMemo, useState, useEffect } from "react";
import { TimetableCourse, CourseSummary } from "../../types/vtop";
import { getGridPositions, DAYS } from "../../utils/timetable-slots";
import { MapPin, CalendarOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCourseAcronym } from "../../utils/formatting";
import { CoursePopup } from "./CoursePopup";

const getAttendanceEmoji = (attendanceStr?: string) => {
  if (!attendanceStr) return "";
  const val = parseFloat(attendanceStr);
  if (isNaN(val)) return "";
  if (val > 90) return "😎";
  if (val > 80) return "😄";
  if (val > 75) return "😐";
  return "😭";
};

export const TimetableWeek = ({
  courses,
  attendance,
}: {
  courses: TimetableCourse[];
  attendance: CourseSummary[];
}) => {
  const weekDays = DAYS.slice(0, 6); // Monday to Saturday
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
    weekDays.forEach((_, i) => (map[i] = {}));

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
  }, [courses, weekDays]);

  const mobileActiveEvents = useMemo(() => {
    return Object.entries(schedule[selectedDay] || {})
      .map(([hourStr, course]) => ({
        hour: parseInt(hourStr),
        course,
      }))
      .sort((a, b) => a.hour - b.hour);
  }, [schedule, selectedDay]);

  return (
    <div className="flex flex-col h-full w-full bg-(--bg-main) overflow-hidden relative">
      {/* --- MOBILE VIEW (Tabbed) --- */}
      <div className="md:hidden flex flex-col h-full w-full">
        <div className="flex items-center justify-between p-2 bg-(--bg-surface) border-b-2 border-black shrink-0 gap-1 overflow-x-auto custom-scrollbar">
          {weekDays.map((day, i) => {
            const isActive = selectedDay === i;
            return (
              <button
                key={`tab-${i}`}
                onClick={() => setSelectedDay(i)}
                className={`flex-1 min-w-9.5 py-2 rounded-lg text-xs font-black font-expanded uppercase transition-all duration-200 border-2 ${
                  isActive
                    ? "bg-purple-400 text-black border-black shadow-[2px_2px_0px_0px_#000] -translate-y-px"
                    : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300"
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
                className="flex flex-col items-center justify-center h-full text-zinc-600 py-20"
              >
                <CalendarOff className="w-12 h-12 opacity-50 mb-4" />
                <span className="font-expanded font-bold text-xs uppercase tracking-widest">
                  No Classes Today
                </span>
              </motion.div>
            ) : (
              <motion.div key="timeline" className="space-y-4">
                {mobileActiveEvents.map(({ hour, course }, idx) => {
                  const isLab = course.type.includes("Lab");
                  const attStr = attendance?.find(
                    (a) => a.code === course.code,
                  )?.attendance;
                  const emoji = getAttendanceEmoji(attStr);

                  return (
                    <motion.button
                      data-tile="true"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={`${selectedDay}-${hour}`}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setSelectedCourse({
                          data: course,
                          position: { x: rect.left, y: rect.bottom + 10 },
                        });
                      }}
                      className="bg-zinc-900 border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_#000] flex gap-4 w-full text-left active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <div className="w-16 shrink-0 border-r-2 border-zinc-800 flex flex-col items-center justify-center">
                        <span className="font-black font-expanded text-lg text-zinc-200">
                          {hour}:00
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_#000] ${isLab ? "bg-purple-400 text-black" : "bg-cyan-400 text-black"}`}
                          >
                            {course.slot}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                            {course.code}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-zinc-200 leading-tight truncate flex items-center justify-between">
                          <span className="truncate">{course.title}</span>
                          <span className="shrink-0 ml-2">{emoji}</span>
                        </h4>
                        <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-zinc-300 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800 w-fit">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="truncate max-w-30">
                            {course.venue}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* --- DESKTOP VIEW (All days columns) --- */}
      <div className="hidden md:flex h-full w-full bg-zinc-900 divide-x-2 lg:divide-x-4 divide-black overflow-hidden border-t-2 border-black">
        {weekDays.map((day, i) => {
          const dayEvents = Object.entries(schedule[i] || {})
            .map(([hourStr, course]) => ({
              hour: parseInt(hourStr),
              course,
            }))
            .sort((a, b) => a.hour - b.hour);

          return (
            <div
              key={day}
              className="flex-1 flex flex-col h-full min-w-0 bg-(--bg-surface)"
            >
              <div className="bg-zinc-950 p-3 text-center border-b-4 border-black shrink-0 shadow-sm z-10">
                <span className="font-expanded font-black text-sm lg:text-base uppercase text-zinc-200 tracking-widest">
                  {day.substring(0, 3)}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 lg:p-3 space-y-2 lg:space-y-3 pb-32">
                {dayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-50">
                    <CalendarOff className="w-8 h-8 mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Free
                    </span>
                  </div>
                ) : (
                  dayEvents.map(({ hour, course }) => {
                    const isLab = course.type.includes("Lab");
                    const colorClasses = isLab
                      ? "bg-purple-400 text-black border-black"
                      : "bg-cyan-400 text-black border-black";
                    const attStr = attendance?.find(
                      (a) => a.code === course.code,
                    )?.attendance;
                    const emoji = getAttendanceEmoji(attStr);

                    return (
                      <button
                        key={`${day}-${hour}`}
                        data-tile="true"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setSelectedCourse({
                            data: course,
                            position: { x: rect.left, y: rect.bottom + 10 },
                          });
                        }}
                        className={`w-full text-left p-2.5 lg:p-3 rounded-xl border-2 hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] flex flex-col gap-1.5 cursor-pointer ${colorClasses}`}
                      >
                        <div className="flex justify-between items-start w-full gap-1">
                          <span className="font-black text-xs lg:text-sm tracking-tight truncate pr-1 leading-none">
                            {getCourseAcronym(course.title)} {emoji}
                          </span>
                          <span className="text-[9px] lg:text-[10px] font-bold opacity-80 leading-none shrink-0 mt-0.5">
                            {hour}:00
                          </span>
                        </div>
                        <div className="flex justify-between items-end w-full mt-1">
                          <span className="text-[8px] lg:text-[9px] font-bold uppercase bg-white/30 px-1.5 py-0.5 rounded border border-black/20 leading-none">
                            {course.slot}
                          </span>
                          <span className="text-[8px] lg:text-[9px] font-bold truncate max-w-[60%] leading-none">
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
