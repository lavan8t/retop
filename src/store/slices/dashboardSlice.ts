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
  fetchDashboardData: (
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

  fetchDashboardData: async (network, csrf, authId) => {
    try {
      set({ status: "Syncing..." });
      const [eduHTML, attHTML, daHTML, eventsHTML] = await Promise.all([
        network.fetchWithCache("dashboard_stats", () => network.fetchFragment("get/dashboard/current/cgpa/credits")),
        network.fetchWithCache("dashboard_attendance", () => network.fetchFragment("get/dashboard/current/semester/course/details")),
        network.fetchWithCache("dashboard_da", () => network.fetchFragment("get/upcoming/digital/assignments")),
        network.fetchWithCache("dashboard_events", () => network.fetchFragment("get/scheduled/events")),
      ]);

      const parsedStats = parseAcademicStats(eduHTML);
      const parsedAttendance = parseCourseDetails(attHTML);
      const parsedAssignments = parseDigitalAssignments(daHTML);
      const parsedEvents = parseEvents(eventsHTML);

      console.log("[DATA_CAPTURE] Dashboard Stats:", parsedStats);
      console.log("[DATA_CAPTURE] Dashboard Attendance:", parsedAttendance);
      console.log("[DATA_CAPTURE] Dashboard Assignments:", parsedAssignments);
      console.log("[DATA_CAPTURE] Dashboard Events:", parsedEvents);

      set({
        stats: parsedStats,
        attendance: parsedAttendance,
        assignments: parsedAssignments,
        events: parsedEvents,
      });

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

          if (ttDefault) {
            await get().loadTimetable(network, csrf, authId, ttDefault);
          }
          if (calDefault) {
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
          }
        }
      } catch (e) {
        console.warn(e);
      }

      set({ status: "Online" });

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
        });
        
        const freshSems = parseSemesters(newSem);
        const freshCalSems = parseCalendarSemesters(newCal);
        if (freshSems.length > 0) set({ ttSemesters: freshSems });
        if (freshCalSems.length > 0) set({ calSemesters: freshCalSems });

        const currentTtSem = get().ttSelectedSem;
        if (currentTtSem) {
          get().loadTimetable(network, csrf, authId, currentTtSem, true).catch(console.warn);
        }
      }).catch(console.warn);

    } catch {
      set({ status: "Sync Failed" });
    }
  },

  enableDemoMode: () => {
    set({
      status: "Demo Mode Active",
      user: { name: "Demo User", regNo: "21ABC1234" },
      stats: {
        cgpa: "9.85",
        credits: "160",
        totalCredits: "160",
        nonGraded: "10",
        placement: "Eligible",
      },
      attendance: [
        { code: "CSE1001", title: "Problem Solving and Programming", type: "TH", slot: "A1", attended: 35, total: 40, percentage: "87.5", classCode: "CLASS1", classId: "123" },
        { code: "MAT1011", title: "Calculus for Engineers", type: "TH", slot: "B1", attended: 40, total: 42, percentage: "95.2", classCode: "CLASS2", classId: "124" },
      ],
      assignments: [
        { title: "Digital Assignment 1", courseName: "CSE1001", due: "20-Jul-2026", max: "10", weightage: "10", status: "Pending" },
      ],
      events: [
        { title: "Tech Fest 2026", type: "FEST", venue: "Main Auditorium", startDate: "2026-08-15" },
      ],
      upcoming: [
        { code: "CSE1001", title: "Problem Solving", type: "TH", slot: "A1", venue: "SJT-101", faculty: "Dr. Smith", time: "10:00 AM - 10:50 AM" },
      ],
      ttCourses: [
        { classId: "1234", code: "CSE1001", title: "Problem Solving", type: "TH", ltpj: "3 0 0 0", credit: "3", slot: "A1", venue: "SJT-101", faculty: "Dr. Smith", registeredFor: "Regular", option: "NIL" },
      ],
      ttSelectedSem: "sem1",
      ttSemesters: [{ id: "sem1", label: "Fall Semester 2026-27" }],
      calSemesters: [{ id: "sem1", label: "Fall Semester 2026-27" }],
      calSelectedSem: "sem1",
    });
  },
});
