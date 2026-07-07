import React, { useEffect } from "react";
import { TimetableCourse, CourseSummary } from "../types/vtop";
import {
  Layers,
  ProgressActivity,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { EmptyState } from "../components/EmptyState";
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
              className="h-full p-4"
            >
              <EmptyState 
                msg="No Timetable Found" 
                subMsg="If you have registered courses, please ensure VTOP is responding and try selecting a different semester." 
                icon={Layers}
              />
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
            <div className="absolute inset-0 bg-(--bg-main) z-50 p-4">
              <div className="w-full h-full border-4 border-(--border-dim) rounded-4xl bg-(--bg-surface) p-4 flex flex-col gap-4 animate-pulse">
                <div className="h-12 w-full bg-(--bg-highlight) rounded-2xl" />
                <div className="flex-1 grid grid-cols-7 gap-2">
                   {[...Array(35)].map((_, i) => <div key={i} className="bg-(--bg-highlight) rounded-2xl" />)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
