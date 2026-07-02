import { create } from "zustand";
import { VTOPNetwork } from "../utils/network";
import {
  parseAcademicStats,
  parseCourseDetails,
  parseDigitalAssignments,
} from "../parsers/dashboard";
import { parseSemesters, parseTimetable } from "../parsers/timetable";
import { parseStudentProfile } from "../parsers/profile";
import {
  CourseSummary,
  Assignment,
  Semester,
  TimetableCourse,
  Event,
  CalendarMonthPreview,
  CalendarEvent,
  ClassGroup,
} from "../types/vtop";
import { getUpcomingClasses, UpcomingClass } from "../utils/timetable-slots";
import { parseEvents } from "../parsers/events";
import {
  parseCalendarDays,
  parseCalendarGroupsAndMonths,
} from "../parsers/calendar";

export interface DataState {
  // Status
  status: string;
  setStatus: (status: string) => void;

  // Person Profile
  user: { name: string; regNo: string };
  setUser: (user: { name: string; regNo: string }) => void;
  fetchUserProfile: (network: VTOPNetwork) => Promise<void>;

  // Dashboard Stats
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

  // Timetable
  ttSemesters: Semester[];
  ttSelectedSem: string;
  ttCourses: TimetableCourse[];
  ttLoading: boolean;
  setTtSelectedSem: (semId: string) => void;
  loadTimetable: (
    network: VTOPNetwork,
    csrf: string,
    authId: string,
    semId: string,
    forceFetch?: boolean,
  ) => Promise<void>;

  // Cross-cutting states for selectors
  calSemesters: { id: string; label: string }[];
  setCalSemesters: (sems: { id: string; label: string }[]) => void;
  calSelectedSem: string;
  setCalSelectedSem: (semId: string) => void;

  calClassGroups: ClassGroup[];
  calSelectedGroup: string;
  setCalSelectedGroup: (id: string) => void;
  calAvailableMonths: CalendarMonthPreview[];
  calGridData: {
    month: CalendarMonthPreview;
    days: CalendarEvent[];
    startOffset: number;
  }[];
  calLoadingInitial: boolean;
  calLoadingMonths: boolean;
  calLoadingGrid: boolean;

  fetchCalendarMonthsAndGroups: (
    network: VTOPNetwork,
    semId: string,
  ) => Promise<void>;
  fetchCalendarGrid: (
    network: VTOPNetwork,
    semId: string,
    groupId: string,
    months: CalendarMonthPreview[],
  ) => Promise<void>;

  cpSelectedSem: string;
  setCpSelectedSem: (semId: string) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  status: "Initializing...",
  setStatus: (status) => set({ status }),

  user: { name: "Student", regNo: "..." },
  setUser: (user) => set({ user }),

  fetchUserProfile: async (network) => {
    try {
      const html = await network.fetchWithCache(
        "student_profile_data",
        async () => {
          return await network.fetchFragment(
            "studentsRecord/StudentProfileAllView",
          );
        },
      );
      const profile = parseStudentProfile(html);
      if (profile?.basic?.name) {
        set((state) => ({
          user: {
            name: profile.basic.name,
            regNo: profile.basic.regNo || state.user.regNo,
          },
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch user profile", err);
    }
  },

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
        network.fetchFragment("get/dashboard/current/cgpa/credits"),
        network.fetchFragment("get/dashboard/current/semester/course/details"),
        network.fetchFragment("get/upcoming/digital/assignments"),
        network.fetchFragment("get/scheduled/events"),
      ]);

      set({
        stats: parseAcademicStats(eduHTML),
        attendance: parseCourseDetails(attHTML),
        assignments: parseDigitalAssignments(daHTML),
        events: parseEvents(eventsHTML),
      });

      try {
        const semHTML = await network.fetchFragment(
          "academics/common/StudentTimeTable",
        );
        const sems = parseSemesters(semHTML);
        if (sems.length > 0) {
          const semId = sems[0].id;
          set({
            ttSemesters: sems,
            ttSelectedSem: semId,
            cpSelectedSem: semId,
            calSemesters: sems,
            calSelectedSem: semId,
          });
          await get().loadTimetable(network, csrf, authId, semId);
          await get().fetchCalendarMonthsAndGroups(network, semId);
          const state = get();
          if (state.calSelectedGroup && state.calAvailableMonths.length > 0) {
            await get().fetchCalendarGrid(
              network,
              semId,
              state.calSelectedGroup,
              state.calAvailableMonths,
            );
          }
        }
      } catch (e) {
        console.warn(e);
      }

      set({ status: "Online" });
    } catch {
      set({ status: "Sync Failed" });
    }
  },

  ttSemesters: [],
  ttSelectedSem: "",
  ttCourses: [],
  ttLoading: true,
  setTtSelectedSem: (semId) => set({ ttSelectedSem: semId }),

  loadTimetable: async (network, csrf, authId, semId, forceFetch = false) => {
    set({ ttLoading: true, ttSelectedSem: semId });
    try {
      const today = new Date().toDateString();
      const cacheKey = `vtop-tt-cache-${semId}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached && !forceFetch) {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.date === today && parsedCache.data) {
          set({
            ttCourses: parsedCache.data,
            upcoming: getUpcomingClasses(parsedCache.data),
            ttLoading: false,
          });
          return;
        }
      }

      const url = "/vtop/processViewTimeTable";
      const body = new URLSearchParams();
      body.append("_csrf", csrf);
      body.append("authorizedID", authId);
      body.append("semesterSubId", semId);
      body.append("x", new Date().toUTCString());

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Close-Requested-With": "XMLHttpRequest",
        },
        body: body,
      });
      const html = await res.text();

      if (html.includes("data not available")) {
        set({ ttCourses: [], upcoming: [], ttLoading: false });
        return;
      }

      const courses = parseTimetable(html).filter(
        (c) =>
          !c.status.toLowerCase().includes("drop") &&
          !c.status.toLowerCase().includes("withdrawn"),
      );
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ date: today, data: courses }),
      );

      set({
        ttCourses: courses,
        upcoming: getUpcomingClasses(courses),
        ttLoading: false,
      });
    } catch (err) {
      console.warn("Failed to load timetable", err);
      set({ ttLoading: false });
    }
  },

  calSemesters: [],
  setCalSemesters: (calSemesters) => set({ calSemesters }),
  calSelectedSem: "",
  setCalSelectedSem: (calSelectedSem) => set({ calSelectedSem }),

  calClassGroups: [],
  calSelectedGroup: "",
  setCalSelectedGroup: (id) => set({ calSelectedGroup: id }),
  calAvailableMonths: [],
  calGridData: [],
  calLoadingInitial: true,
  calLoadingMonths: false,
  calLoadingGrid: false,

  fetchCalendarMonthsAndGroups: async (network, semId) => {
    set({ calLoadingMonths: true, calAvailableMonths: [], calClassGroups: [] });
    try {
      const cacheKey = `vtop-cal-groups-${semId}`;
      const today = new Date().toDateString();
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === today && parsed.data) {
          set({
            calClassGroups: parsed.data.groups,
            calAvailableMonths: parsed.data.months,
            calSelectedGroup:
              parsed.data.groups.some((g: any) => g.id === get().calSelectedGroup)
                ? get().calSelectedGroup
                : "",
            calLoadingMonths: false,
          });
          return;
        }
      }

      const body = new URLSearchParams();
      body.append("_csrf", network.csrf);
      body.append("paramReturnId", "getDateForSemesterPreview");
      body.append("semSubId", semId);
      body.append("authorizedID", network.authorizedID);
      body.append("x", new Date().toUTCString());

      const res = await fetch("/vtop/getDateForSemesterPreview", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Close-Requested-With": "XMLHttpRequest",
        },
        body: body,
      });

      const html = await res.text();
      const { groups, months } = parseCalendarGroupsAndMonths(html);

      localStorage.setItem(
        cacheKey,
        JSON.stringify({ date: today, data: { groups, months } }),
      );

      const defaultGroup =
        groups.some((g) => g.id === get().calSelectedGroup)
          ? get().calSelectedGroup
          : "";
      set({
        calClassGroups: groups,
        calAvailableMonths: months,
        calSelectedGroup: defaultGroup,
        calLoadingMonths: false,
      });
    } catch (e) {
      console.error("Failed to fetch months and groups:", e);
      set({ calLoadingMonths: false });
    }
  },

  fetchCalendarGrid: async (network, semId, groupId, months) => {
    set({ calLoadingGrid: true, calGridData: [] });
    try {
      const cacheKey = `vtop-cal-grid-${semId}-${groupId}`;
      const today = new Date().toDateString();
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === today && parsed.data) {
          set({ calGridData: parsed.data, calLoadingGrid: false });
          return;
        }
      }

      const results = [];
      for (const month of months) {
        const html = await network.fetchFragment("processViewCalendar", {
          calDate: month.dateString,
          semSubId: semId,
          classGroupId: groupId,
        });
        const days = parseCalendarDays(html, month.label);

        const dateObj = new Date(month.dateString);
        const startOffset = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          1,
        ).getDay();

        results.push({ month, days, startOffset });
      }

      localStorage.setItem(
        cacheKey,
        JSON.stringify({ date: today, data: results }),
      );
      set({ calGridData: results, calLoadingGrid: false });
    } catch (e) {
      console.error("Failed to fetch grid data:", e);
      set({ calLoadingGrid: false });
    }
  },

  cpSelectedSem: "",
  setCpSelectedSem: (semId) => set({ cpSelectedSem: semId }),
}));
