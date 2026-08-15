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
import { setCachedData } from "../../utils/cache";
import { waitForIntercepted } from "../../utils/dashboardInterceptor";
import { CourseSummary, Assignment, Event } from "../../types/vtop";
import { UpcomingClass } from "../../utils/timetable-slots";
import { DataState } from "../dataStore";
import dummyData from "../../dummy_data.json";

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
      set({ status: "Syncing..." });

      // ── Home-root strategy ──────────────────────────────────────────────────
      // VTOP fires XHRs for stats/attendance/DA/events the moment the home
      // page loads. We intercept those in content.ts and signal here via
      // waitForIntercepted(). If the signal arrives within 2.5 s we parse
      // and store directly — zero duplicate requests. If the user opened
      // retop on a non-home page the timeout fires and we fall back to
      // fetchWithCache (cache-first, then live fetch) as before.

      const resolveOrFetch = async (
        signalKey: string,
        cacheKey: string,
        fetcher: () => Promise<string>,
        parser: (html: string) => any,
        storeKey: string,
      ) => {
        // 1. Wait for VTOP's own home-page XHR (via interceptDashboardResponse)
        const intercepted = await waitForIntercepted(signalKey, 2500);
        if (intercepted) {
          try { set({ [storeKey]: parser(intercepted) } as any); } catch (e) { console.warn(e); }
          return;
        }
        // 2. Fallback: cache-first, then live fetch
        try {
          const html = await network.fetchWithCache(cacheKey, fetcher);
          set({ [storeKey]: parser(html) } as any);
        } catch (e) { console.warn(e); }
      };

      const statsP    = resolveOrFetch("dashboard_stats",      "dashboard_stats",      () => network.fetchFragment("get/dashboard/current/cgpa/credits"),                parseAcademicStats,       "stats");
      const attP      = resolveOrFetch("dashboard_attendance", "dashboard_attendance", () => network.fetchFragment("get/dashboard/current/semester/course/details"),    parseCourseDetails,       "attendance");
      const daP       = resolveOrFetch("dashboard_da",         "dashboard_da",         () => network.fetchFragment("get/upcoming/digital/assignments"),                  parseDigitalAssignments,  "assignments");
      const eventsP   = resolveOrFetch("dashboard_events",     "dashboard_events",     () => network.fetchFragment("get/scheduled/events"),                             parseEvents,              "events");

      const isChennai = typeof window !== "undefined" && window.location.hostname.includes("vtopcc");
      const ttEndpoint = isChennai ? "academics/common/StudentTimeTableChn" : "academics/common/StudentTimeTable";

      const timetableAndCalP = (async () => {
        try {
          const [semHTML, calHTML] = await Promise.all([
            network.fetchWithCache("tt_semester_list", () => network.fetchFragment(ttEndpoint)),
            network.fetchWithCache("cal_semester_list", () => network.fetchFragment("academics/common/CalendarPreview")),
          ]);

          const sems = parseSemesters(semHTML);
          const calSems = parseCalendarSemesters(calHTML);

          if (sems.length > 0 || calSems.length > 0) {
            const filterNonIndustry = <T extends { id: string; label: string; selected?: boolean; isLatest?: boolean }>(list: T[]): T[] => {
              const nonInd = list.filter((s) => !/industry|\(ind\)|_ind/i.test(s.label) && !/industry|\(ind\)|_ind/i.test(s.id));
              return nonInd.length > 0 ? nonInd : list;
            };

            const savedCalSem = localStorage.getItem("retop-cal-selected-sem");
            const calPool = filterNonIndustry(calSems);
            const calDefault =
              savedCalSem && calSems.some((s) => s.id === savedCalSem)
                ? savedCalSem
                : calPool.find((s) => s.selected)?.id || calPool[0]?.id || "";

            const savedTtSem = localStorage.getItem("retop-tt-selected-sem");
            const ttPool = filterNonIndustry(sems);
            const ttDefault =
              savedTtSem && sems.some((s) => s.id === savedTtSem)
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
        set({ status: "Offline - Not Synced" });
      } else {
        set({ status: "Sync Failed" });
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

  enableDemoMode: () => {
    set({
      status: "Demo Mode Active",
      user: { name: "Demo User", regNo: "22ABC1234" },
      stats: dummyData.stats as any,
      attendance: dummyData.attendance as any,
      assignments: dummyData.assignments as any,
      events: dummyData.events as any,
      upcoming: [], 
      ttCourses: dummyData.ttCourses as any,
      ttSelectedSem: dummyData.ttSemesters[0]?.id || "sem1",
      ttSemesters: dummyData.ttSemesters as any,
      calSemesters: dummyData.calSemesters as any,
      calSelectedSem: dummyData.calSemesters[0]?.id || "sem1",
    });
  },
});
