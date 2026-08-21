import { StateCreator } from "zustand";
import { VTOPNetwork } from "../../utils/network";
import {
  parseAcademicStats,
  parseCourseDetails,
  parseDigitalAssignments,
} from "../../parsers/dashboard";
import { parseEvents } from "../../parsers/events";
import { parseSemesters } from "../../parsers/timetable";
import { parseCalendarSemesters } from "../../parsers/calendar";
import { parseMarksSemesters } from "../../parsers/marks";
import { parseGradesSemesters } from "../../parsers/grades";
import { parseDASemesters } from "../../parsers/digital-assignments";
import { parseStudentProfile } from "../../parsers/profile";
import { getCachedData, setCachedData } from "../../utils/cache";
import { waitForIntercepted } from "../../utils/dashboardInterceptor";
import { CourseSummary, Assignment, Event } from "../../types/vtop";
import { UpcomingClass } from "../../utils/timetable-slots";
import { DataState } from "../dataStore";

export interface DashboardSlice {
  status: string;
  setStatus: (status: string) => void;

  stats: {
    cgpa: string;
    credits: string;
    totalCredits: string;
    nonGraded: string;
    placement: string;
  };
  attendance: CourseSummary[];
  assignments: Assignment[];
  events: Event[];
  upcoming: UpcomingClass[];
  lastSyncTime: number;
  isSyncing: boolean;
  fetchDashboardData: (
    network: VTOPNetwork,
    csrf: string,
    authId: string,
  ) => Promise<void>;
  syncDashboard: (
    network: VTOPNetwork,
    csrf: string,
    authId: string,
  ) => Promise<void>;
  enableDemoMode: () => void;
}

export const createDashboardSlice: StateCreator<DataState, [], [], DashboardSlice> = (set, get) => ({
  status: "Initializing...",
  setStatus: (status) => set({ status }),

  stats: {
    cgpa: "...",
    credits: "...",
    totalCredits: "...",
    nonGraded: "...",
    placement: "...",
  },
  attendance: [],
  assignments: [],
  events: [],
  upcoming: [],
  lastSyncTime: 0,
  isSyncing: false,

  fetchDashboardData: async (network, csrf, authId) => {
    try {
      const isOffline =
        (typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) ||
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        (typeof location !== "undefined" &&
          !location.hostname.includes("vit.ac.in") &&
          !location.protocol.includes("chrome-extension") &&
          !location.protocol.includes("moz-extension"));

      set({ status: isOffline ? "Offline" : "Syncing..." });

      // ── Instant Cache Hydration ─────────────────────────────────────────────
      // Immediately hydrate store from local cache with zero latency so UI renders instantly
      try {
        const [cachedStats, cachedAtt, cachedDA, cachedEvents] = await Promise.all([
          getCachedData<any>(authId ? `${authId}_dashboard_stats` : "dashboard_stats"),
          getCachedData<any>(authId ? `${authId}_dashboard_attendance` : "dashboard_attendance"),
          getCachedData<any>(authId ? `${authId}_dashboard_da` : "dashboard_da"),
          getCachedData<any>(authId ? `${authId}_dashboard_events` : "dashboard_events"),
        ]);

        const instantUpdates: any = {};
        if (cachedStats) {
          try { instantUpdates.stats = typeof cachedStats === "string" ? parseAcademicStats(cachedStats) : cachedStats; } catch {}
        }
        if (cachedAtt) {
          try { instantUpdates.attendance = typeof cachedAtt === "string" ? parseCourseDetails(cachedAtt) : cachedAtt; } catch {}
        }
        if (cachedDA) {
          try { instantUpdates.assignments = typeof cachedDA === "string" ? parseDigitalAssignments(cachedDA) : cachedDA; } catch {}
        }
        if (cachedEvents) {
          try { instantUpdates.events = typeof cachedEvents === "string" ? parseEvents(cachedEvents) : cachedEvents; } catch {}
        }

        if (Object.keys(instantUpdates).length > 0) {
          set(instantUpdates);
        }
      } catch (e) {
        console.warn("[retop] Instant cache load failed:", e);
      }

      const isChennai = typeof window !== "undefined" && window.location.hostname.includes("vtopcc");
      const ttEndpoint = isChennai ? "academics/common/StudentTimeTableChn" : "academics/common/StudentTimeTable";

      if (isOffline) {
        // In offline mode, read timetable & calendar from cache immediately without waiting for XHR interception
        try {
          const [semHTML, calHTML] = await Promise.all([
            getCachedData<any>(authId ? `${authId}_tt_semester_list` : "tt_semester_list"),
            getCachedData<any>(authId ? `${authId}_cal_semester_list` : "cal_semester_list"),
          ]);

          if (semHTML || calHTML) {
            const sems: any[] = typeof semHTML === "string" ? parseSemesters(semHTML || "") : (semHTML || []);
            const calSems: any[] = typeof calHTML === "string" ? parseCalendarSemesters(calHTML || "") : (calHTML || []);

            const filterNonIndustry = <T extends { id: string; label: string; selected?: boolean; isLatest?: boolean }>(list: T[]): T[] => {
              const nonInd = list.filter((s) => !/industry|\(ind\)|_ind/i.test(s.label) && !/industry|\(ind\)|_ind/i.test(s.id));
              return nonInd.length > 0 ? nonInd : list;
            };

            const savedCalSem = localStorage.getItem("retop-cal-selected-sem");
            const calPool = filterNonIndustry(calSems);
            const calDefault =
              savedCalSem && calSems.some((s: any) => s.id === savedCalSem)
                ? savedCalSem
                : calPool.find((s) => s.selected)?.id || calPool[0]?.id || "";

            const savedTtSem = localStorage.getItem("retop-tt-selected-sem");
            const ttPool = filterNonIndustry(sems);
            const ttDefault =
              savedTtSem && sems.some((s: any) => s.id === savedTtSem)
                ? savedTtSem
                : ttPool.find((s) => s.isLatest)?.id || ttPool[0]?.id || "";

            set({
              ttSemesters: sems,
              ttSelectedSem: ttDefault,
              cpSelectedSem: ttDefault,
              calSemesters: calSems,
              calSelectedSem: calDefault,
              attSelectedSem: ttDefault,
            });

            if (ttDefault) {
              await get().loadTimetable(network, csrf, authId, ttDefault).catch(() => {});
            }
          }
        } catch {}

        set({ status: "Offline", isSyncing: false, lastSyncTime: Date.now() });
        return;
      }

      // ── Background Fresh Sync Strategy ──────────────────────────────────────
      const resolveOrFetch = async (
        signalKey: string,
        cacheKey: string,
        fetcher: () => Promise<string>,
        parser: (html: string) => any,
        storeKey: string,
      ) => {
        // 1. Wait for VTOP's own home-page XHR (via interceptDashboardResponse)
        const intercepted = await waitForIntercepted(signalKey, 1500);
        if (intercepted) {
          try {
            const parsed = parser(intercepted);
            set({ [storeKey]: parsed } as any);
            await setCachedData(cacheKey, parsed);
          } catch (e) {
            console.warn(`[retop] Parse failed for ${signalKey}:`, e);
          }
          return;
        }
        // 2. Fallback: live fetch with cache update
        try {
          const html = await network.fetchWithCache(cacheKey, fetcher, true);
          if (html && (typeof html !== "string" || (!html.includes("HTTP Status 404") && !html.includes("<title>404")))) {
            set({ [storeKey]: typeof html === "string" ? parser(html) : html } as any);
          }
        } catch (e) {
          // Gracefully suppress 404 / optional dashboard widget errors
          console.warn(`[retop] Sub-endpoint ${cacheKey} unavailable (404/network):`, e);
        }
      };

      const statsP    = resolveOrFetch("dashboard_stats",      "dashboard_stats",      () => network.fetchFragment("get/dashboard/current/cgpa/credits"),                parseAcademicStats,       "stats");
      const attP      = resolveOrFetch("dashboard_attendance", "dashboard_attendance", () => network.fetchFragment("get/dashboard/current/semester/course/details"),    parseCourseDetails,       "attendance");
      const daP       = resolveOrFetch("dashboard_da",         "dashboard_da",         () => network.fetchFragment("get/upcoming/digital/assignments"),                  parseDigitalAssignments,  "assignments");
      const eventsP   = resolveOrFetch("dashboard_events",     "dashboard_events",     () => network.fetchFragment("get/scheduled/events"),                             parseEvents,              "events");

      const timetableAndCalP = (async () => {
        try {
          const [semHTML, calHTML] = await Promise.all([
            network.fetchWithCache("tt_semester_list", () => network.fetchFragment(ttEndpoint)),
            network.fetchWithCache("cal_semester_list", () => network.fetchFragment("academics/common/CalendarPreview")),
          ]);

          const sems: any[] = typeof semHTML === "string" ? parseSemesters(semHTML) : (semHTML || []);
          const calSems: any[] = typeof calHTML === "string" ? parseCalendarSemesters(calHTML) : (calHTML || []);

          if (sems.length > 0 || calSems.length > 0) {
            const filterNonIndustry = <T extends { id: string; label: string; selected?: boolean; isLatest?: boolean }>(list: T[]): T[] => {
              const nonInd = list.filter((s) => !/industry|\(ind\)|_ind/i.test(s.label) && !/industry|\(ind\)|_ind/i.test(s.id));
              return nonInd.length > 0 ? nonInd : list;
            };

            const savedCalSem = localStorage.getItem("retop-cal-selected-sem");
            const calPool = filterNonIndustry(calSems);
            const calDefault =
              savedCalSem && calSems.some((s: any) => s.id === savedCalSem)
                ? savedCalSem
                : calPool.find((s) => s.selected)?.id || calPool[0]?.id || "";

            const savedTtSem = localStorage.getItem("retop-tt-selected-sem");
            const ttPool = filterNonIndustry(sems);
            const ttDefault =
              savedTtSem && sems.some((s: any) => s.id === savedTtSem)
                ? savedTtSem
                : ttPool.find((s) => s.isLatest)?.id || ttPool[0]?.id || "";

            set({
              ttSemesters: sems,
              ttSelectedSem: ttDefault,
              cpSelectedSem: ttDefault,
              calSemesters: calSems,
              calSelectedSem: calDefault,
              attSelectedSem: ttDefault,
            });

            const subPromises = [];
            subPromises.push(get().fetchUserProfile(network));
            subPromises.push(get().fetchExamSemesters(network));
            if (ttDefault) {
              subPromises.push(get().loadTimetable(network, csrf, authId, ttDefault));
            }
            if (calDefault) {
              subPromises.push((async () => {
                await get().fetchCalendarMonthsAndGroups(network, calDefault);
                const state = get();
                if (state.calSelectedGroup && state.calAvailableMonths.length > 0) {
                  await get().fetchCalendarGrid(
                    network,
                    calDefault,
                    state.calSelectedGroup,
                    state.calAvailableMonths,
                  );
                }
              })());
            }
            await Promise.allSettled(subPromises);
          }
        } catch (e) {
          console.warn(e);
        }
      })();

      await Promise.allSettled([statsP, attP, daP, eventsP, timetableAndCalP]);

      set({ status: "Online", lastSyncTime: Date.now() });

      // Background refresh: silently update with fresh data (timetable/calendar/exam
      // only — stats/attendance/DA/events are already fresh from the intercepted XHRs)
      set({ isSyncing: true });
      Promise.all([
        network.fetchWithCache("tt_semester_list", () => network.fetchFragment(ttEndpoint), true),
        network.fetchWithCache("cal_semester_list", () => network.fetchFragment("academics/common/CalendarPreview"), true),
        network.fetchWithCache("exam_schedule_view", () => network.getExamScheduleView(), true),
      ]).then(([newSem, newCal]) => {
        const freshSems = parseSemesters(newSem);
        const freshCalSems = parseCalendarSemesters(newCal);
        if (freshSems.length > 0) set({ ttSemesters: freshSems });
        if (freshCalSems.length > 0) set({ calSemesters: freshCalSems });

        const currentTtSem = get().ttSelectedSem;
        if (currentTtSem) {
          get().loadTimetable(network, csrf, authId, currentTtSem, true).catch(console.warn);
        }
        set({ lastSyncTime: Date.now() });
      }).catch(console.warn).finally(() => set({ isSyncing: false }));

    } catch (e) {
      if (e instanceof Error && e.message === "OFFLINE_CACHE_MISS") {
        set({ status: "Offline - Not Synced", isSyncing: false });
      } else {
        set({ status: "Sync Failed", isSyncing: false });
      }
    }
  },

  syncDashboard: async (network, csrf, authId) => {
    const { isSyncing } = get();
    if (isSyncing) return;

    set({ isSyncing: true, status: "Syncing..." });
    try {
      const [newEdu, newAtt, newDa, newEvents] = await Promise.all([
        network.fetchWithCache("dashboard_stats", () => network.fetchFragment("get/dashboard/current/cgpa/credits"), true),
        network.fetchWithCache("dashboard_attendance", () => network.fetchFragment("get/dashboard/current/semester/course/details"), true),
        network.fetchWithCache("dashboard_da", () => network.fetchFragment("get/upcoming/digital/assignments"), true),
        network.fetchWithCache("dashboard_events", () => network.fetchFragment("get/scheduled/events"), true),
      ]);

      set({
        stats: parseAcademicStats(newEdu),
        attendance: parseCourseDetails(newAtt),
        assignments: parseDigitalAssignments(newDa),
        events: parseEvents(newEvents),
        lastSyncTime: Date.now(),
        status: "Online",
      });

      // Refresh timetable for current active semester
      const currentTtSem = get().ttSelectedSem;
      if (currentTtSem) {
        await get().loadTimetable(network, csrf, authId, currentTtSem, true).catch(() => {});
      }
    } catch (e) {
      set({ status: "Sync Failed" });
    } finally {
      set({ isSyncing: false });
    }
  },

  enableDemoMode: async () => {
    try {
      set({
        status: "Demo Mode Active",
        user: { name: "Demo User", regNo: "22ABC1234" },
        stats: { cgpa: "9.42", creditsEarned: "78", rank: "12/850" } as any,
        attendance: [
          {
            code: "CSE3001",
            title: "Software Engineering",
            type: "ETH",
            attended: 28,
            total: 30,
            percentage: "93.33",
            faculty: "Dr. Faculty",
            slot: "A1+TA1",
          },
          {
            code: "CSE3002",
            title: "Database Management Systems",
            type: "ETH",
            attended: 26,
            total: 30,
            percentage: "86.67",
            faculty: "Dr. Faculty",
            slot: "B1+TB1",
          },
        ] as any,
        assignments: [],
        events: [],
        upcoming: [],
        ttCourses: [] as any,
        ttSelectedSem: "demo",
        ttSemesters: [{ id: "demo", label: "Winter Semester 2026-27" }] as any,
        calSemesters: [{ id: "demo", label: "Winter Semester 2026-27" }] as any,
        calSelectedSem: "demo",
      });
    } catch (e) {
      console.warn("Failed loading demo data", e);
    }
  },
});
