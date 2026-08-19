import React, { useState, useEffect, useMemo } from "react";
import { useDataStore } from "../../store/dataStore";
import { useAppStore } from "../../store/appStore";
import { ViewType } from "../../types/vtop";
import { CAMPUS_SLOTS } from "../../utils/timetable-slots";
import { getStorageData, setStorageData } from "../../utils/storageAdapter";
import {
  School,
  Description,
  Close,
  CheckCircle,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

export interface SystemUpdate {
  id: string;
  type: "class" | "marks" | "grades" | "assessment";
  title: string;
  subtitle: string;
  detail?: string;
  actionView: ViewType;
}

export const UpdatesWidget: React.FC = () => {
  const { ttCourses, assignments, stats } = useDataStore();
  const { setCurrentView } = useAppStore();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const local = localStorage.getItem("retop_dismissed_updates");
      if (local) return new Set(JSON.parse(local));
      const session = sessionStorage.getItem("retop_dismissed_updates");
      return session ? new Set(JSON.parse(session)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [now, setNow] = useState(() => new Date());

  // Load permanent dismissed IDs from extension storage
  useEffect(() => {
    getStorageData(["retop_dismissed_updates"])
      .then((res) => {
        if (Array.isArray(res.retop_dismissed_updates)) {
          setDismissedIds((prev) => new Set([...prev, ...res.retop_dismissed_updates]));
        }
      })
      .catch(() => {});
  }, []);

  // Refresh clock every minute for class 15-minute alerts
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const dismiss = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDismissedIds((prev) => {
      const next = new Set(prev).add(id);
      const arr = [...next];
      try {
        localStorage.setItem("retop_dismissed_updates", JSON.stringify(arr));
        sessionStorage.setItem("retop_dismissed_updates", JSON.stringify(arr));
      } catch {}
      setStorageData({ retop_dismissed_updates: arr }).catch(() => {});
      return next;
    });
  };

  const updates = useMemo(() => {
    const list: SystemUpdate[] = [];

    // 1. Upcoming Classes within 15 minutes
    if (ttCourses && ttCourses.length > 0) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
      const dayName = days[now.getDay()];
      if (dayName !== "Sunday") {
        const dayConfig = CAMPUS_SLOTS[dayName as keyof typeof CAMPUS_SLOTS];
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const getSlotStartMinutes = (col: number) => {
          if (col < 5) return (8 + col) * 60; // 08:00 to 12:00
          if (col === 5) return 12 * 60 + 30; // 12:30
          if (col === 6) return 13 * 60; // Lunch
          if (col > 6 && col <= 11) return (14 + (col - 7)) * 60; // 14:00 to 18:00
          if (col === 12) return 18 * 60 + 30; // 18:30
          return 19 * 60; // 19:00
        };

        ttCourses.forEach((course) => {
          const slots = course.slot.split("+").map((s) => s.trim());
          slots.forEach((slot) => {
            let col = dayConfig.Theory.indexOf(slot);
            if (col === -1) col = dayConfig.Lab.indexOf(slot);

            if (col !== -1) {
              const startMinutes = getSlotStartMinutes(col);
              const diff = startMinutes - currentMinutes;

              // Trigger if starting within 15 minutes or in the first 10 minutes of class
              if (diff >= -5 && diff <= 15) {
                const timeLabel = diff > 0 ? `in ${diff} min${diff === 1 ? "" : "s"}` : "starting now";
                list.push({
                  id: `class-${course.code}-${slot}-${now.toDateString()}`,
                  type: "class",
                  title: `Class ${timeLabel}: ${course.code}`,
                  subtitle: `${course.title}`,
                  detail: `${course.venue || "Venue TBD"} • Slot ${slot}`,
                  actionView: "timetable",
                });
              }
            }
          });
        });
      }
    }

    // 2. Upcoming Assessments / Digital Assignments
    if (assignments && assignments.length > 0) {
      assignments.forEach((da) => {
        const isCompleted = da.status?.toLowerCase().includes("upload") || da.status?.toLowerCase().includes("submit");
        if (!isCompleted) {
          list.push({
            id: `da-${da.course}-${da.title}`,
            type: "assessment",
            title: `Assessment: ${da.course}`,
            subtitle: da.title,
            detail: da.dueDate ? `Due: ${da.dueDate}` : "Pending submission",
            actionView: "digitalAssignments",
          });
        }
      });
    }

    return list.filter((item) => !dismissedIds.has(item.id)).slice(0, 3);
  }, [ttCourses, assignments, stats, dismissedIds, now]);

  if (updates.length === 0) return null;

  const typeStyles = {
    class: {
      badge: "bg-(--md-sys-color-info-container) text-(--color-info) border border-(--color-info)/20",
      icon: School,
      iconColor: "text-(--color-info)",
    },
    assessment: {
      badge: "bg-(--att-warn-container) text-(--att-warn) border border-(--att-warn)/20",
      icon: Description,
      iconColor: "text-(--att-warn)",
    },
    marks: {
      badge: "bg-(--accent-base)/10 text-(--accent-base) border border-(--accent-base)/20",
      icon: CheckCircle,
      iconColor: "text-(--accent-base)",
    },
    grades: {
      badge: "bg-(--att-safe-container) text-(--att-safe) border border-(--att-safe)/20",
      icon: CheckCircle,
      iconColor: "text-(--att-safe)",
    },
  };

  return (
    <div className="fixed bottom-6 right-6 z-9999 flex flex-col gap-2 max-w-xs md:max-w-sm pointer-events-none items-end">
      {updates.map((item) => {
        const config = typeStyles[item.type] || typeStyles.class;
        const Icon = config.icon;

        return (
          <div
            key={item.id}
            onClick={() => {
              setCurrentView(item.actionView);
              dismiss(item.id);
            }}
            className="group pointer-events-auto w-full bg-(--bg-surface) border border-(--border-dim) hover:border-(--border-main) rounded-2xl p-3 shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer flex items-start gap-3 relative animate-in fade-in slide-in-from-bottom-3"
          >
            <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${config.badge}`}>
              <Icon className={`w-4 h-4 ${config.iconColor}`} />
            </div>

            <div className="flex-1 min-w-0 pr-5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${config.badge}`}>
                  {item.type}
                </span>
              </div>
              <h4 className="text-xs font-bold text-(--text-main) truncate leading-tight">
                {item.title}
              </h4>
              <p className="text-[11px] text-(--text-muted) truncate mt-0.5">
                {item.subtitle}
              </p>
              {item.detail && (
                <p className="text-[10px] text-(--accent-base) font-semibold mt-0.5 truncate">
                  {item.detail}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => dismiss(item.id, e)}
              className="absolute top-2.5 right-2.5 p-1 rounded-full text-(--text-muted) hover:text-(--text-main) hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <Close className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
