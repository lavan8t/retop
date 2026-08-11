import React, { useEffect, useState } from "react";
import { getAllCachedKeys, removeCacheKey } from "../utils/cache";

const formatTimeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export const SyncManager = () => {
  const [keys, setKeys] = useState<{ key: string; timestamp: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const allKeys = await getAllCachedKeys();
      setKeys(allKeys.sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleDelete = async (key: string) => {
    await removeCacheKey(key);
    await fetchKeys();
  };

  const categorizeKey = (key: string) => {
    const stripped = key.substring(key.indexOf("_") + 1);
    
    if (stripped === "dashboard_stats") return { page: "CGPA & Credits", semester: "Current" };
    if (stripped === "dashboard_attendance") return { page: "Attendance Summary", semester: "Current" };
    if (stripped === "dashboard_da") return { page: "Upcoming Assignments", semester: "Current" };
    if (stripped === "dashboard_events") return { page: "Upcoming Events", semester: "Global" };
    
    if (stripped === "tt_semester_list") return { page: "Timetable Semesters", semester: "Global" };
    if (stripped === "cal_semester_list") return { page: "Calendar Semesters", semester: "Global" };
    if (stripped === "da_semesters") return { page: "DA Semesters", semester: "Global" };
    
    if (stripped.startsWith("tt_sem_")) return { page: "Timetable", semester: stripped.replace("tt_sem_", "") };
    if (stripped.startsWith("marks_data_")) return { page: "Marks", semester: stripped.replace("marks_data_", "") };
    if (stripped.startsWith("grades_data_")) return { page: "Grades", semester: stripped.replace("grades_data_", "") };
    if (stripped === "grade_history_data") return { page: "Grade History", semester: "Global" };
    if (stripped.startsWith("da_courses_")) return { page: "Assignments", semester: stripped.replace("da_courses_", "") };
    if (stripped.startsWith("da_class_")) return { page: "DA Course Detail", semester: "Class " + stripped.replace("da_class_", "") };
    
    if (stripped === "curriculum_dashboard") return { page: "Curriculum Categories", semester: "Global" };
    if (stripped.startsWith("curriculum_cat_")) return { page: "Curriculum Courses", semester: stripped.replace("curriculum_cat_", "") };
    
    if (stripped === "course_page_consolidated") return { page: "Course Page (List)", semester: "Global" };
    if (stripped.startsWith("course_details_")) return { page: "Course Detail", semester: stripped.replace("course_details_", "").split("_")[0] };

    if (stripped.startsWith("timetable") || stripped.startsWith("cal_")) return { page: "Academic Calendar", semester: "Global" };
    
    if (stripped === "vtop_menu" || stripped.startsWith("menu")) return { page: "Navigation Menu", semester: "Global" };
    if (stripped.startsWith("profile")) return { page: "Student Profile", semester: "Global" };
    
    return { page: "Other Cache", semester: stripped };
  };

  const currentKeys = keys.filter((k) => {
    const { semester } = categorizeKey(k.key);
    return semester === "Current" || semester === "Global";
  });

  const olderKeys = keys.filter((k) => {
    const { semester } = categorizeKey(k.key);
    return semester !== "Current" && semester !== "Global";
  });

  const handleClearOlder = async () => {
    for (const k of olderKeys) {
      await removeCacheKey(k.key);
    }
    await fetchKeys();
  };

  return (
    <div className="flex flex-col gap-4 mt-2 w-full">
      {loading ? (
        <div className="text-xs text-(--text-muted) uppercase font-expanded">Loading cache...</div>
      ) : keys.length === 0 ? (
        <div className="text-xs text-(--text-muted) uppercase font-expanded">No cached data found.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Current & Global Data Section */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-black uppercase text-(--text-muted)">
              Current & Active Session Data ({currentKeys.length})
            </span>
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {currentKeys.map((k) => {
                const { page, semester } = categorizeKey(k.key);
                return (
                  <div key={k.key} className="flex justify-between items-center bg-(--bg-main) px-3 py-2.5 rounded-xl border-0">
                    <div className="flex flex-col">
                      <span className="font-expanded text-xs font-bold text-(--text-main)">{page}</span>
                      <span className="text-[10px] text-(--text-muted)">Sem: {semester} • Synced: {formatTimeAgo(k.timestamp)} ago</span>
                    </div>
                    <button
                      onClick={() => handleDelete(k.key)}
                      className="px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border-0 bg-(--accent-base) text-(--text-inverse) hover:opacity-90 cursor-pointer ml-2 shadow-sm"
                    >
                      Clear Data
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Older Semesters Data Section */}
          {olderKeys.length > 0 && (
            <div className="flex flex-col gap-2 border-t-2 border-(--border-dim) pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-(--text-muted)">
                  Older Semesters Cached Data ({olderKeys.length})
                </span>
                <button
                  onClick={handleClearOlder}
                  className="px-4 py-2 rounded-full text-[10px] font-black uppercase border-0 bg-(--accent-base) text-(--text-inverse) hover:opacity-90 cursor-pointer shadow-sm"
                >
                  Clear All Older Semesters
                </button>
              </div>
              <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                {olderKeys.map((k) => {
                  const { page, semester } = categorizeKey(k.key);
                  return (
                    <div key={k.key} className="flex justify-between items-center bg-(--bg-main) px-3 py-2.5 rounded-xl border-0">
                      <div className="flex flex-col">
                        <span className="font-expanded text-xs font-bold text-(--text-main)">{page}</span>
                        <span className="text-[10px] text-(--text-muted)">Sem: {semester} • Synced: {formatTimeAgo(k.timestamp)} ago</span>
                      </div>
                      <button
                        onClick={() => handleDelete(k.key)}
                        className="px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border-0 bg-(--accent-base) text-(--text-inverse) hover:opacity-90 cursor-pointer ml-2 shadow-sm"
                      >
                        Clear Data
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
