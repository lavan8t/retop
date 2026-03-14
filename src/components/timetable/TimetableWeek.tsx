import React, { useMemo, useState, useEffect } from "react";
import { TimetableCourse } from "../../types/vtop";
import { getGridPositions, DAYS } from "../../utils/timetable-slots";
import { MapPin, CalendarOff, Clock, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const TimetableWeek = ({ courses }: { courses: TimetableCourse[] }) => {
  const weekDays = DAYS.slice(0, 6); // Monday to Saturday
  const [now, setNow] = useState(new Date());

  // Cap the day index to Monday-Saturday (0 to 5)
  const currentDayIndex = Math.max(0, Math.min(5, now.getDay() - 1));
  const [selectedDay, setSelectedDay] = useState(currentDayIndex);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
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

  const activeEvents = useMemo(() => {
    return Object.entries(schedule[selectedDay] || {})
      .map(([hourStr, course]) => ({
        hour: parseInt(hourStr),
        course,
      }))
      .sort((a, b) => a.hour - b.hour);
  }, [schedule, selectedDay]);

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-zinc-950 border-2 md:border-4 border-black rounded-2xl md:rounded-4xl shadow-[4px_4px_0px_0px_#000] md:shadow-[8px_8px_0px_0px_#000] overflow-hidden">
      {/* Ultra-compact Tabs */}
      <div className="flex items-center justify-between p-2 md:p-4 bg-zinc-900 border-b-2 md:border-b-4 border-black shrink-0 gap-1 md:gap-3 overflow-x-auto custom-scrollbar">
        {weekDays.map((day, i) => {
          const isActive = selectedDay === i;
          return (
            <button
              key={`tab-${i}`}
              onClick={() => setSelectedDay(i)}
              className={`flex-1 min-w-9.5 md:min-w-25 py-2 md:py-3.5 rounded-lg md:rounded-2xl text-xs md:text-sm font-black font-expanded uppercase transition-all duration-200 border-2 md:border-4 ${
                isActive
                  ? "bg-purple-400 text-black border-black shadow-[2px_2px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] -translate-y-px"
                  : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              <span className="md:hidden">{day.charAt(0)}</span>
              <span className="hidden md:inline">{day}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-6 pb-32 md:pb-6 space-y-4 md:space-y-6 custom-scrollbar relative">
        <AnimatePresence mode="wait">
          {activeEvents.length === 0 ? (
            <motion.div
              key="empty"
              className="flex flex-col items-center justify-center h-full text-zinc-600 py-20"
            >
              <CalendarOff className="w-12 h-12 md:w-16 md:h-16 opacity-50 mb-4" />
              <span className="font-expanded font-bold text-xs md:text-sm uppercase tracking-widest">
                No Classes Today
              </span>
            </motion.div>
          ) : (
            <motion.div key="timeline" className="space-y-4 md:space-y-6">
              {activeEvents.map(({ hour, course }, idx) => {
                const isLab = course.type.includes("Lab");
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={`${selectedDay}-${hour}`}
                    className="bg-zinc-900 border-2 md:border-4 border-black rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-[4px_4px_0px_0px_#000] md:shadow-[6px_6px_0px_0px_#000] flex gap-4 md:gap-6"
                  >
                    <div className="w-16 md:w-24 shrink-0 border-r-2 md:border-r-4 border-zinc-800 flex flex-col items-center justify-center">
                      <span className="font-black font-expanded text-lg md:text-3xl text-zinc-200">
                        {hour}:00
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2 py-0.5 rounded md:rounded-lg text-[9px] md:text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_#000] ${isLab ? "bg-purple-400 text-black" : "bg-cyan-400 text-black"}`}
                        >
                          {course.slot}
                        </span>
                        <span className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                          {course.code}
                        </span>
                      </div>
                      <h4 className="text-sm md:text-2xl font-black text-white leading-tight truncate">
                        {course.title}
                      </h4>
                      <div className="flex items-center justify-between mt-3 md:mt-5">
                        <span className="flex items-center gap-2 text-[10px] md:text-sm font-bold text-zinc-300 bg-zinc-950 px-2 py-1 md:py-1.5 rounded-xl border border-zinc-800">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          {course.venue}
                        </span>
                        <span className="hidden sm:block text-[10px] md:text-xs font-black text-emerald-400 uppercase">
                          {course.type.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
