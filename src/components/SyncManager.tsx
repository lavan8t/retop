import React, { useEffect, useState } from 'react';
import { getAllCachedKeys, removeCacheKey } from '../utils/cache';
import { useDataStore } from '../store/dataStore';
import {
  Delete,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

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

interface CacheItem {
  key: string;
  timestamp: number;
  label: string;
  semester: string;
}

interface PageCacheGroup {
  id: string;
  title: string;
  items: CacheItem[];
  latestTimestamp: number;
}

export const SyncManager = () => {
  const [keys, setKeys] = useState<{ key: string; timestamp: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>(
    {},
  );
  const user = useDataStore((s) => s.user);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const allKeys = await getAllCachedKeys(
        user?.regNo && user.regNo !== '...' ? user.regNo : undefined,
      );
      setKeys(
        allKeys.sort(
          (a: { timestamp: number }, b: { timestamp: number }) =>
            b.timestamp - a.timestamp,
        ),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleDeleteKey = async (key: string) => {
    await removeCacheKey(key);
    await fetchKeys();
  };

  const handleDeleteGroup = async (items: CacheItem[]) => {
    for (const item of items) {
      await removeCacheKey(item.key);
    }
    await fetchKeys();
  };

  const toggleExpand = (pageId: string) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageId]: !prev[pageId],
    }));
  };

  const categorizeKey = (
    key: string,
  ): { pageId: string; pageTitle: string; label: string; semester: string } => {
    const stripped = key.substring(key.indexOf('_') + 1);

    if (stripped === 'dashboard_stats')
      return {
        pageId: 'dashboard',
        pageTitle: 'Home & CGPA Stats',
        label: 'CGPA & Academic Standing',
        semester: 'Current',
      };
    if (stripped === 'dashboard_attendance')
      return {
        pageId: 'dashboard',
        pageTitle: 'Home & CGPA Stats',
        label: 'Attendance Summary',
        semester: 'Current',
      };
    if (stripped === 'dashboard_da')
      return {
        pageId: 'dashboard',
        pageTitle: 'Home & CGPA Stats',
        label: 'Upcoming Assignments',
        semester: 'Current',
      };
    if (stripped === 'dashboard_events')
      return {
        pageId: 'dashboard',
        pageTitle: 'Home & CGPA Stats',
        label: 'Campus Events',
        semester: 'Global',
      };

    if (stripped.startsWith('tt_sem_') || stripped === 'tt_semester_list')
      return {
        pageId: 'timetable',
        pageTitle: 'Timetable',
        label: 'Schedule & Slots',
        semester: stripped.replace('tt_sem_', ''),
      };

    if (stripped.startsWith('marks_data_'))
      return {
        pageId: 'marks',
        pageTitle: 'Marks',
        label: 'Exam & Assessment Marks',
        semester: stripped.replace('marks_data_', ''),
      };

    if (
      stripped.startsWith('grades_data_') ||
      stripped === 'grade_history_data'
    )
      return {
        pageId: 'grades',
        pageTitle: 'Grades & GPA',
        label: 'Grade History & Credits',
        semester: stripped.replace('grades_data_', ''),
      };

    if (
      stripped.startsWith('da_courses_') ||
      stripped.startsWith('da_class_') ||
      stripped === 'da_semesters'
    )
      return {
        pageId: 'assignments',
        pageTitle: 'Digital Assignments',
        label: 'Course DA Submissions',
        semester: stripped
          .replace('da_courses_', '')
          .replace('da_class_', 'Class '),
      };

    if (
      stripped.startsWith('curriculum_cat_') ||
      stripped === 'curriculum_dashboard'
    )
      return {
        pageId: 'curriculum',
        pageTitle: 'Curriculum',
        label: 'Program Basket & Allocation',
        semester: 'Global',
      };

    if (
      stripped.startsWith('course_details_') ||
      stripped === 'course_page_consolidated'
    )
      return {
        pageId: 'course_page',
        pageTitle: 'Course Page',
        label: 'Syllabus & Material Details',
        semester: stripped.replace('course_details_', '').split('_')[0],
      };

    if (stripped.startsWith('cal_') || stripped.startsWith('timetable'))
      return {
        pageId: 'calendar',
        pageTitle: 'Academic Calendar',
        label: 'Monthly Calendar & Holidays',
        semester: 'Global',
      };

    if (
      stripped.startsWith('profile') ||
      stripped.startsWith('student_profile')
    )
      return {
        pageId: 'profile',
        pageTitle: 'Student Profile',
        label: 'Personal & Academic Bio',
        semester: 'Global',
      };

    if (stripped === 'vtop_menu' || stripped.startsWith('menu'))
      return {
        pageId: 'menu',
        pageTitle: 'VTOP Navigation',
        label: 'Sidebar & Quick Links',
        semester: 'Global',
      };

    return {
      pageId: 'other',
      pageTitle: 'Other System Cache',
      label: stripped,
      semester: 'Global',
    };
  };

  // Group keys by Page
  const groupsMap = new Map<string, PageCacheGroup>();
  for (const k of keys) {
    const { pageId, pageTitle, label, semester } = categorizeKey(k.key);
    if (!groupsMap.has(pageId)) {
      groupsMap.set(pageId, {
        id: pageId,
        title: pageTitle,
        items: [],
        latestTimestamp: k.timestamp,
      });
    }
    const group = groupsMap.get(pageId)!;
    group.items.push({
      key: k.key,
      timestamp: k.timestamp,
      label,
      semester,
    });
    if (k.timestamp > group.latestTimestamp) {
      group.latestTimestamp = k.timestamp;
    }
  }

  const groups = Array.from(groupsMap.values());

  return (
    <div className="flex flex-col gap-3 mt-2 w-full">
      {loading ? (
        <div className="text-xs text-(--text-muted) uppercase font-expanded py-2">
          Loading cache items...
        </div>
      ) : groups.length === 0 ? (
        <div className="text-xs text-(--text-muted) uppercase font-expanded py-2">
          No cached data found.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {groups.map((group) => {
            const isExpanded = !!expandedPages[group.id];
            const itemCount = group.items.length;

            return (
              <div
                key={group.id}
                className="flex flex-col rounded-2xl bg-(--bg-main) border-2 border-(--border-dim) overflow-hidden transition-colors"
              >
                {/* Combined Page Row */}
                <div className="flex items-center justify-between p-3 gap-3">
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-expanded text-xs sm:text-sm font-bold text-(--text-main) truncate">
                        {group.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-(--accent-base)/15 text-(--accent-base) shrink-0">
                        {itemCount} {itemCount === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                    <span className="text-[11px] text-(--text-muted) mt-0.5">
                      Last synced: {formatTimeAgo(group.latestTimestamp)} ago
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleExpand(group.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-(--text-muted) hover:text-(--text-main) hover:bg-black/5 dark:hover:bg-white/5 border border-transparent transition-all cursor-pointer"
                      title={isExpanded ? 'Hide details' : 'See details'}
                    >
                      <span>{isExpanded ? 'Less' : 'See More'}</span>
                      {isExpanded ? (
                        <KeyboardArrowUp className="w-4 h-4" />
                      ) : (
                        <KeyboardArrowDown className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteGroup(group.items)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-(--accent-base) text-(--text-inverse) hover:opacity-90 transition-all border-0 cursor-pointer shadow-sm"
                      title={`Clear all cache for ${group.title}`}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Collapsible Details Drawer */}
                {isExpanded && (
                  <div className="flex flex-col gap-1.5 p-3 pt-0 border-t border-(--border-dim)/60 bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="text-[10px] font-bold uppercase text-(--text-muted) py-1.5">
                      Individual Cached Endpoints
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                      {group.items.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-(--bg-surface) border border-(--border-dim) gap-2"
                        >
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-xs font-bold text-(--text-main) truncate">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-(--text-muted) truncate">
                              {item.semester !== 'Global' &&
                              item.semester !== 'Current'
                                ? `Sem: ${item.semester} • `
                                : ''}
                              Synced {formatTimeAgo(item.timestamp)} ago
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteKey(item.key)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-all border-0 cursor-pointer shrink-0"
                            title="Delete this cached endpoint"
                          >
                            <Delete className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
