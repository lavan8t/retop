import { create } from "zustand";
import { VTOPNetwork } from "../utils/network";
import { getCachedData, setCachedData } from "../utils/cache";
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
  DetailedAttendanceCourse,
  AttendanceRecord,
} from "../types/vtop";
import {
  parseStudentAttendance,
  parseAttendanceDetail,
} from "../parsers/attendance";
import { getUpcomingClasses, UpcomingClass } from "../utils/timetable-slots";
import { parseEvents } from "../parsers/events";
import {
  parseCalendarDays,
  parseCalendarGroupsAndMonths,
  parseCalendarSemesters,
} from "../parsers/calendar";

export interface DataState {
  // Status
  status: string;
  setStatus: (status: string) => void;

  // Person Profile
  user: { name: string; regNo: string; profileImgBase64?: string };
  setUser: (user: { name: string; regNo: string; profileImgBase64?: string }) => void;
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
  calSemesters: { id: string; label: string; selected?: boolean }[];
  setCalSemesters: (
    sems: { id: string; label: string; selected?: boolean }[],
  ) => void;
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

  // Attendance Page State
  attSelectedSem: string;
  setAttSelectedSem: (semId: string) => void;
  detailedAttendance: DetailedAttendanceCourse[];
  attLoading: boolean;
  fetchDetailedAttendance: (
    network: VTOPNetwork,
    semId: string,
  ) => Promise<void>;

  attendanceRecords: Record<string, AttendanceRecord[]>;
  attRecordsLoading: boolean;
  fetchAttendanceRecords: (
    network: VTOPNetwork,
    semId: string,
    courseId: string,
    classType: string,
  ) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  status: "Initializing...",
  setStatus: (status) => set({ status }),

  user: { name: "Student", regNo: "..." },
  setUser: (user) => set({ user }),

  fetchUserProfile: async (network) => {
    try {
      // 1. Try to load cached basic user profile immediately
      getCachedData<{ name: string; regNo: string; profileImgBase64?: string }>("user_basic_profile").then((cached) => {
        if (cached) set({ user: cached });
      });

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
        const regNo = profile.basic.regNo || get().user.regNo;
        let profileImgBase64 = get().user.profileImgBase64;
        
        // Try fetching image to cache it as base64 if not already present or if we want to refresh
        if (regNo !== "...") {
          try {
            const imgRes = await fetch(`/vtop/users/image/?id=${regNo}`);
            const blob = await imgRes.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            profileImgBase64 = await new Promise((res) => {
              reader.onloadend = () => res(reader.result as string);
            });
          } catch (e) {
            console.warn("Failed to fetch profile image for cache", e);
          }
        }

        const newUser = {
          name: profile.basic.name,
          regNo: regNo,
          profileImgBase64,
        };

        set({ user: newUser });
        
        // Save to cache
        setCachedData("user_basic_profile", newUser);
        
        // Save to chrome storage for offline mode
        if (typeof chrome !== "undefined" && chrome.storage) {
          chrome.storage.local.set({
            "retop_lastAuthId": regNo,
            "retop_lastName": profile.basic.name,
            "retop_profileImage": profileImgBase64 || "",
          });
        }
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
        network.fetchWithCache("dashboard_stats", () => network.fetchFragment("get/dashboard/current/cgpa/credits")),
        network.fetchWithCache("dashboard_attendance", () => network.fetchFragment("get/dashboard/current/semester/course/details")),
        network.fetchWithCache("dashboard_da", () => network.fetchFragment("get/upcoming/digital/assignments")),
        network.fetchWithCache("dashboard_events", () => network.fetchFragment("get/scheduled/events")),
      ]);

      set({
        stats: parseAcademicStats(eduHTML),
        attendance: parseCourseDetails(attHTML),
        assignments: parseDigitalAssignments(daHTML),
        events: parseEvents(eventsHTML),
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

          const ttDefault =
            sems.find((s) => s.isLatest)?.id || sems[0]?.id || "";

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
      const cacheKey = `tt_${semId}`;
      const html = await network.fetchWithCache(
        cacheKey,
        async () => {
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
          return await res.text();
        },
        forceFetch
      );

      if (html.includes("data not available")) {
        set({ ttCourses: [], upcoming: [], ttLoading: false });
        return;
      }

      const courses = parseTimetable(html).filter(
        (c) =>
          !c.status.toLowerCase().includes("drop") &&
          !c.status.toLowerCase().includes("withdrawn"),
      );

      if (courses.length > 0) {
        set({
          ttCourses: courses,
          upcoming: getUpcomingClasses(courses),
          ttLoading: false,
        });
      } else {
        set({ ttCourses: [], upcoming: [], ttLoading: false });
      }
    } catch (e) {
      console.warn("Timetable load failed:", e);
      set({ ttCourses: [], upcoming: [], ttLoading: false });
    }
  },

  calSemesters: [],
  setCalSemesters: (calSemesters) => set({ calSemesters }),
  calSelectedSem: "",
  setCalSelectedSem: (calSelectedSem) => {
    localStorage.setItem("retop-cal-selected-sem", calSelectedSem);
    set({
      calSelectedSem,
      calGridData: [],
      calAvailableMonths: [],
      calClassGroups: [],
      calSelectedGroup: "",
    });
  },

  calClassGroups: [],
  calSelectedGroup: localStorage.getItem("retop-cal-selected-group") || "",
  setCalSelectedGroup: (id) => {
    localStorage.setItem("retop-cal-selected-group", id);
    set({ calSelectedGroup: id, calGridData: [] });
  },
  calAvailableMonths: [],
  calGridData: [],
  calLoadingInitial: true,
  calLoadingMonths: false,
  calLoadingGrid: false,

  fetchCalendarMonthsAndGroups: async (network, semId) => {
    set({ calLoadingMonths: true, calAvailableMonths: [], calClassGroups: [] });
    try {
      const cacheKey = `retop-cal-groups-${semId}`;
      const today = new Date().toDateString();
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === today && parsed.data) {
          const savedGroup = localStorage.getItem("retop-cal-selected-group");
          const defaultGroup = (savedGroup && parsed.data.groups.some(
            (g: any) => g.id === savedGroup,
          ))
            ? savedGroup
            : parsed.data.groups.length > 0
              ? parsed.data.groups[0].id
              : "";

          if (defaultGroup) {
            localStorage.setItem("retop-cal-selected-group", defaultGroup);
          }

          set({
            calClassGroups: parsed.data.groups,
            calAvailableMonths: parsed.data.months,
            calSelectedGroup: defaultGroup,
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

      const savedGroup = localStorage.getItem("retop-cal-selected-group");
      const defaultGroup = (savedGroup && groups.some((g) => g.id === savedGroup))
        ? savedGroup
        : groups.length > 0
          ? groups[0].id
          : "";

      if (defaultGroup) {
        localStorage.setItem("retop-cal-selected-group", defaultGroup);
      }

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

  fetchCalendarGrid: async (network, semId, groupId, months, forceFetch = false) => {
    set({ calLoadingGrid: true, calGridData: [] });
    try {
      const results = [];
      for (const month of months) {
        const cacheKey = `cal_${semId}_${groupId}_${month.dateString}`;
        const html = await network.fetchWithCache(
          cacheKey,
          async () => {
            return await network.fetchFragment("processViewCalendar", {
              calDate: month.dateString,
              semSubId: semId,
              classGroupId: groupId,
            });
          },
          forceFetch
        );

        const days = parseCalendarDays(html, month.label);
        const dateObj = new Date(month.dateString);
        const startOffset = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          1,
        ).getDay();

        results.push({ month, days, startOffset });
      }
      set({ calGridData: results, calLoadingGrid: false });
    } catch (e) {
      console.error("Failed to fetch grid data:", e);
      set({ calLoadingGrid: false });
    }
  },

  cpSelectedSem: "",
  setCpSelectedSem: (semId) => set({ cpSelectedSem: semId }),

  attSelectedSem: "",
  setAttSelectedSem: (semId) =>
    set({ attSelectedSem: semId, detailedAttendance: [] }),
  detailedAttendance: [],
  attLoading: false,
  fetchDetailedAttendance: async (network, semId) => {
    set({ attLoading: true });
    try {
      const html = await network.fetchFragment("processViewStudentAttendance", {
        semesterSubId: semId,
      });
      const data = parseStudentAttendance(html);
      set({ detailedAttendance: data, attLoading: false });
    } catch (e) {
      console.error("Failed to fetch detailed attendance:", e);
      set({ attLoading: false });
    }
  },

  attendanceRecords: {},
  attRecordsLoading: false,
  fetchAttendanceRecords: async (network, semId, courseId, classType) => {
    const key = `${courseId}-${classType}`;
    const cached = get().attendanceRecords[key];
    if (cached) return;

    set({ attRecordsLoading: true });
    try {
      const html = await network.fetchFragment("processViewAttendanceDetail", {
        semesterSubId: semId,
        courseId,
        courseType: classType,
      });
      const data = parseAttendanceDetail(html);
      set((state) => ({
        attendanceRecords: { ...state.attendanceRecords, [key]: data },
        attRecordsLoading: false,
      }));
    } catch (e) {
      console.error("Failed to fetch attendance records:", e);
      set({ attRecordsLoading: false });
    }
  },
}));
