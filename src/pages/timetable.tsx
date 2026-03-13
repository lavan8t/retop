import React from "react";
import { TimetableCourse } from "../types/vtop";
import { Layers, Loader2 } from "lucide-react";
import { TimetableGrid } from "../components/timetable/TimetableGrid";
import { TimetableList } from "../components/timetable/TimetableList";
import { TimetableWeek } from "../components/timetable/TimetableWeek";
import { motion } from "framer-motion";

interface TimetableContentViewProps {
  courses: TimetableCourse[];
  loading: boolean;
  viewMode: "grid" | "list" | "week";
}

export const TimetableContentView: React.FC<TimetableContentViewProps> = ({
  courses,
  loading,
  viewMode,
}) => {
  return (
    <div className="flex-1 overflow-hidden p-6 relative h-full bg-zinc-950">
      {courses.length === 0 && !loading ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center h-full border-4 border-dashed border-zinc-900 rounded-4xl bg-zinc-900/30"
        >
          <Layers className="w-16 h-16 text-zinc-800 mb-6 animate-pulse" />
          <p className="text-zinc-500 font-bold text-xl uppercase tracking-widest">
            No Courses Found
          </p>
        </motion.div>
      ) : loading && courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 font-mono animate-pulse gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <span className="text-sm font-bold tracking-widest uppercase">
            Fetching Timetable...
          </span>
        </div>
      ) : (
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {viewMode === "grid" ? (
            <TimetableGrid courses={courses} />
          ) : viewMode === "list" ? (
            <TimetableList courses={courses} />
          ) : (
            <TimetableWeek courses={courses} />
          )}
        </motion.div>
      )}
    </div>
  );
};
