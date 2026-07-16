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

      const statsP = network.fetchWithCache("dashboard_stats", () => network.fetchFragment("get/dashboard/current/cgpa/credits"))
        .then(html => set({ stats: parseAcademicStats(html) }))
        .catch(e => console.warn(e));

      const attP = network.fetchWithCache("dashboard_attendance", () => network.fetchFragment("get/dashboard/current/semester/course/details"))
        .then(html => set({ attendance: parseCourseDetails(html) }))
        .catch(e => console.warn(e));

      const daP = network.fetchWithCache("dashboard_da", () => network.fetchFragment("get/upcoming/digital/assignments"))
        .then(html => set({ assignments: parseDigitalAssignments(html) }))
        .catch(e => console.warn(e));

      const eventsP = network.fetchWithCache("dashboard_events", () => network.fetchFragment("get/scheduled/events"))
        .then(html => set({ events: parseEvents(html) }))
        .catch(e => console.warn(e));

      const timetableAndCalP = (async () => {
        try {
          const [semHTML, calHTML] = await Promise.all([
            network.fetchWithCache("tt_semester_list", () => network.fetchFragment("academics/common/StudentTimeTable")),
            network.fetchWithCache("cal_semester_list", () => network.fetchFragment("academics/common/CalendarPreview")),
          ]);

          const sems = parseSemesters(semHTML);
          const calSems = parseCalendarSemesters(calHTML);

          if (sems.length > 0 || calSems.length > 0) {
            const savedCalSem = localStorage.getItem("retop-cal-selected-sem");
            const calDefault =
              savedCalSem && calSems.some((s) => s.id === savedCalSem)
                ? savedCalSem
                : calSems.find((s) => s.selected)?.id || calSems[0]?.id || "";

            const savedTtSem = localStorage.getItem("retop-tt-selected-sem");
            const ttDefault =
              savedTtSem && sems.some((s) => s.id === savedTtSem)
                ? savedTtSem
                : sems.find((s) => s.isLatest)?.id || sems[0]?.id || "";

            set({
              ttSemesters: sems,
              ttSelectedSem: ttDefault,
              cpSelectedSem: ttDefault,
              calSemesters: calSems,
              calSelectedSem: calDefault,
              attSelectedSem: ttDefault,
            });

            const subPromises = [];
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

      // Background refresh: silently update with fresh data
      set({ isSyncing: true });
      Promise.all([
        network.fetchWithCache("dashboard_stats", () => network.fetchFragment("get/dashboard/current/cgpa/credits"), true),
        network.fetchWithCache("dashboard_attendance", () => network.fetchFragment("get/dashboard/current/semester/course/details"), true),
        network.fetchWithCache("dashboard_da", () => network.fetchFragment("get/upcoming/digital/assignments"), true),
        network.fetchWithCache("dashboard_events", () => network.fetchFragment("get/scheduled/events"), true),
        network.fetchWithCache("tt_semester_list", () => network.fetchFragment("academics/common/StudentTimeTable"), true),
        network.fetchWithCache("cal_semester_list", () => network.fetchFragment("academics/common/CalendarPreview"), true),
      ]).then(([newEdu, newAtt, newDa, newEvents, newSem, newCal]) => {
        set({
          stats: parseAcademicStats(newEdu),
          attendance: parseCourseDetails(newAtt),
          assignments: parseDigitalAssignments(newDa),
          events: parseEvents(newEvents),
          lastSyncTime: Date.now(),
        });
        
        const freshSems = parseSemesters(newSem);
        const freshCalSems = parseCalendarSemesters(newCal);
        if (freshSems.length > 0) set({ ttSemesters: freshSems });
        if (freshCalSems.length > 0) set({ calSemesters: freshCalSems });

        const currentTtSem = get().ttSelectedSem;
        if (currentTtSem) {
          get().loadTimetable(network, csrf, authId, currentTtSem, true).catch(console.warn);
        }
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
    if (isSyncing) return; // Don't double-sync

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

      // Also refresh timetable
      const currentTtSem = get().ttSelectedSem;
      if (currentTtSem) {
        await get().loadTimetable(network, csrf, authId, currentTtSem, true).catch(console.warn);
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
