import React, { useEffect } from "react";
import { TimetableCourse, CourseSummary } from "../types/vtop";
import { Layers, Loader2 } from "lucide-react";
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
}

export const TimetableContentView: React.FC<TimetableContentViewProps> = ({
  courses,
  loading,
  viewMode,
  setViewMode,
  attendance,
}) => {
  useEffect(() => {
    if (window.innerWidth < 768 && viewMode === "grid") {
      setViewMode("week");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex-1 overflow-hidden relative h-full bg-(--bg-main) flex flex-col">
        {/* --- MAIN CONTENT AREA --- */}
        {/* Added pb-32 lg:pb-0 to ensure the timetable has a safe scrolling area above the mobile dock & floating pill */}
        <div className="flex-1 min-h-0 relative lg:pb-0">
          {courses.length === 0 && !loading ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full border-4 border-dashed border-zinc-900 rounded-4xl bg-zinc-900/30 m-6"
            >
              <Layers className="w-16 h-16 text-zinc-800 mb-6 animate-pulse" />
              <p className="text-zinc-500 font-bold text-xl uppercase tracking-widest text-center px-4">
                No Courses Found
              </p>
            </motion.div>
          ) : loading && courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 font-mono animate-pulse gap-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <span className="text-sm font-bold tracking-widest uppercase text-center px-4">
                Fetching Timetable...
              </span>
            </div>
          ) : (
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              {viewMode === "grid" ? (
                <TimetableGrid courses={courses} attendance={attendance} />
              ) : viewMode === "list" ? (
                <TimetableList courses={courses} attendance={attendance} />
              ) : (
                <TimetableWeek courses={courses} attendance={attendance} />
              )}
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
};
