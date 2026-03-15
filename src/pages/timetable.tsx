import React, { useEffect } from "react";
import { TimetableCourse, CourseSummary } from "../types/vtop";
import { Layers, Loader2, LayoutGrid, List, Calendar } from "lucide-react";
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

const TABS = [
  { id: "grid", label: "Grid", icon: LayoutGrid, color: "bg-blue-400" },
  { id: "list", label: "List", icon: List, color: "bg-cyan-400" },
  { id: "week", label: "Week", icon: Calendar, color: "bg-purple-400" },
] as const;

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
        {/* --- NEO-BRUTALIST TAB BAR --- */}
        <div className="flex md:hidden justify-center shrink-0 z-10 p-3 pb-0">
          <div className="flex bg-zinc-900 border-2 md:border-4 border-black rounded-3xl p-1.5 shadow-[4px_4px_0px_0px_#000] gap-1 md:gap-2">
            {TABS.map((tab) => {
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id)}
                  className={`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl transition-colors select-none ${
                    isActive
                      ? "text-black"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="timetable-tab-active"
                      className={`absolute inset-0 ${tab.color} border-2 border-black rounded-2xl shadow-inner`}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                    />
                  )}
                  <tab.icon
                    className={`w-4 h-4 md:w-5 md:h-5 relative z-10 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`}
                  />
                  <span className="relative z-10 font-bold font-expanded uppercase text-[10px] md:text-xs tracking-widest hidden sm:block">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 min-h-0 relative">
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
