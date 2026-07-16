import { StateCreator } from "zustand";
import { VTOPNetwork } from "../../utils/network";
import { parseTimetable } from "../../parsers/timetable";
import { Semester, TimetableCourse } from "../../types/vtop";
import { getUpcomingClasses } from "../../utils/timetable-slots";
import { DataState } from "../dataStore";

export interface TimetableSlice {
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

  cpSelectedSem: string;
  setCpSelectedSem: (semId: string) => void;
}

export const createTimetableSlice: StateCreator<DataState, [], [], TimetableSlice> = (set, get) => ({
  ttSemesters: [],
  ttSelectedSem: localStorage.getItem("retop-tt-selected-sem") || "",
  ttCourses: [],
  ttLoading: true,
  setTtSelectedSem: (semId) => {
    localStorage.setItem("retop-tt-selected-sem", semId);
    set({ ttSelectedSem: semId });
  },

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
        forceFetch,
        (get().ttSemesters.length > 0 && semId !== get().ttSemesters[0].id) ? Infinity : undefined
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
        console.log(`[DATA_CAPTURE] Timetable (${semId}):`, courses);
        set({
          ttCourses: courses,
          upcoming: getUpcomingClasses(courses),
          ttLoading: false,
        });
      } else {
        set({ ttCourses: [], upcoming: [], ttLoading: false });
      }
    } catch (e) {
      if (e instanceof Error && e.message === "OFFLINE_CACHE_MISS") {
         set({ status: "Offline - Not Synced" });
      }
      console.warn("Timetable load failed:", e);
      set({ ttCourses: [], upcoming: [], ttLoading: false });
    }
  },

  cpSelectedSem: "",
  setCpSelectedSem: (semId) => set({ cpSelectedSem: semId }),
});
