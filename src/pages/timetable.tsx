import React, { useEffect } from "react";
import { TimetableCourse, CourseSummary } from "../types/vtop";
import {
  Layers,
  ProgressActivity,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { TimetableGrid } from "../components/timetable/TimetableGrid";
import { TimetableList } from "../components/timetable/TimetableList";
import { TimetableWeek } from "../components/timetable/TimetableWeek";
import { motion } from "framer-motion";

interface TimetableContentViewProps {
  courses: TimetableCourse[];
  loading: boolean;
  viewMode: "grid" | "list" | "week";
  setViewMode: (mode: "grid" | "list" | "week") => void;
  attendance: CourseSummary[];
  use24HourTime: boolean;
}

export const TimetableContentView: React.FC<TimetableContentViewProps> = ({
  courses,
  loading,
  viewMode,
  setViewMode,
  attendance,
  use24HourTime,
}) => {
  useEffect(() => {
    if (window.innerWidth < 768 && viewMode === "grid") {
      setViewMode("week");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex-1 overflow-hidden relative h-full bg-(--bg-main) flex flex-col pt-16 md:pt-20 lg:pt-20">
        {/* --- MAIN CONTENT AREA --- */}
        {/* Added pb-32 lg:pb-0 to ensure the timetable has a safe scrolling area above the mobile dock & floating pill */}
        <div className="flex-1 min-h-0 relative lg:pb-0">
          {courses.length === 0 && !loading ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full p-8 text-center"
            >
              <Layers className="w-16 h-16 text-zinc-500 mb-4" />
              <h2 className="text-xl font-black font-expanded text-zinc-400 uppercase">
                No Timetable Found
              </h2>
              <p className="text-xs font-mono text-zinc-600 mt-2 max-w-sm">
                If you have registered courses, please ensure VTOP is responding
                and try selecting a different semester.
              </p>
            </motion.div>
          ) : (
            <div className="absolute inset-0 pb-[80px] lg:pb-0">
              {viewMode === "grid" && (
                <TimetableGrid
                  courses={courses}
                  attendance={attendance}
                  use24HourTime={use24HourTime}
                />
              )}
              {viewMode === "list" && (
                <TimetableList
                  courses={courses}
                  attendance={attendance}
                  use24HourTime={use24HourTime}
                />
              )}
              {viewMode === "week" && (
                <TimetableWeek
                  courses={courses}
                  attendance={attendance}
                  use24HourTime={use24HourTime}
                />
              )}
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
              <ProgressActivity className="w-12 h-12 text-(--accent-base) animate-spin mb-4" />
              <span className="text-sm font-bold font-expanded text-white uppercase tracking-wider animate-pulse">
                Parsing Grid...
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
