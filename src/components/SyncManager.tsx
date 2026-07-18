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
      // Show all cache keys, regardless of the user prefix
      setKeys(allKeys.sort((a, b) => b.timestamp - a.timestamp));
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
    // Strip user prefix
    const stripped = key.substring(key.indexOf("_") + 1);
    
    // Dashboard Caches
    if (stripped === "dashboard_stats") return { page: "CGPA & Credits", semester: "Current" };
    if (stripped === "dashboard_attendance") return { page: "Attendance Summary", semester: "Current" };
    if (stripped === "dashboard_da") return { page: "Upcoming Assignments", semester: "Current" };
    if (stripped === "dashboard_events") return { page: "Upcoming Events", semester: "Global" };
    
    // Semesters Lists
    if (stripped === "tt_semester_list") return { page: "Timetable Semesters", semester: "Global" };
    if (stripped === "cal_semester_list") return { page: "Calendar Semesters", semester: "Global" };
    if (stripped === "da_semesters") return { page: "DA Semesters", semester: "Global" };
    
    // Specific Semester Caches
    if (stripped.startsWith("tt_sem_")) return { page: "Timetable", semester: stripped.replace("tt_sem_", "") };
    if (stripped.startsWith("marks_data_")) return { page: "Marks", semester: stripped.replace("marks_data_", "") };
    if (stripped.startsWith("grades_data_")) return { page: "Grades", semester: stripped.replace("grades_data_", "") };
    if (stripped === "grade_history_data") return { page: "Grade History", semester: "Global" };
    if (stripped.startsWith("da_courses_")) return { page: "Digital Assignments", semester: stripped.replace("da_courses_", "") };
    if (stripped.startsWith("da_class_")) return { page: "DA Course Detail", semester: "Class " + stripped.replace("da_class_", "") };
    
    // Curriculum
    if (stripped === "curriculum_dashboard") return { page: "Curriculum Categories", semester: "Global" };
    if (stripped.startsWith("curriculum_cat_")) return { page: "Curriculum Courses", semester: stripped.replace("curriculum_cat_", "") };
    
    // Course Page
    if (stripped === "course_page_consolidated") return { page: "Course Page (List)", semester: "Global" };
    if (stripped.startsWith("course_details_")) return { page: "Course Detail", semester: stripped.replace("course_details_", "").split("_")[0] };

    // Calendar
    if (stripped.startsWith("timetable") || stripped.startsWith("cal_")) return { page: "Academic Calendar", semester: "Global" };
    
    // Navigation & Profile
    if (stripped.startsWith("menu")) return { page: "Navigation Menu", semester: "Global" };
    if (stripped.startsWith("profile")) return { page: "Student Profile", semester: "Global" };
    
    return { page: "Other Cache", semester: stripped };
  };

  return (
    <div className="flex flex-col gap-3 mt-2 w-full">
      {loading ? (
        <div className="text-xs text-(--text-muted) uppercase font-expanded">Loading cache...</div>
      ) : keys.length === 0 ? (
        <div className="text-xs text-(--text-muted) uppercase font-expanded">No cached data found.</div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {keys.map((k) => {
            const { page, semester } = categorizeKey(k.key);
            return (
              <div key={k.key} className="flex justify-between items-center bg-(--bg-card) p-3 rounded-lg border-2 border-(--border-main)">
                <div className="flex flex-col">
                  <span className="font-expanded uppercase text-[13px] font-black">{page}</span>
                  <span className="text-[11px] text-(--text-muted)">Sem: {semester} • Synced: {formatTimeAgo(k.timestamp)} ago</span>
                </div>
                <button
                  onClick={() => handleDelete(k.key)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black font-expanded uppercase transition-all border-2 border-(--border-main) shadow-none hover:shadow-(--brutal-shadow-hover) cursor-pointer bg-(--accent-error) text-black whitespace-nowrap ml-2"
                >
                  Clear
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
