import { StateCreator } from "zustand";
import { DataState } from "../dataStore";
import { VTOPNetwork } from "../../utils/network";
import {
  DACourse,
  DAAssignment,
  parseDASemesters,
  parseDACourses,
  parseDAAssignments,
} from "../../parsers/digital-assignments";

export interface DASlice {
  daSemesters: { id: string; label: string }[];
  daSelectedSem: string;
  daCourses: DACourse[];
  daAssignments: Record<string, DAAssignment[]>; // classId -> assignments
  daLoading: boolean;
  daError: string | null;
  daRawHtml: string;
  fetchDASemesters: (network: VTOPNetwork, force?: boolean) => Promise<void>;
  fetchDACourses: (
    network: VTOPNetwork,
    semesterId: string,
    force?: boolean,
  ) => Promise<void>;
  fetchDAAssignments: (
    network: VTOPNetwork,
    classId: string,
    force?: boolean,
  ) => Promise<void>;
  setDaSelectedSem: (semId: string) => void;
}

export const createDASlice: StateCreator<DataState, [], [], DASlice> = (
  set,
  get,
) => ({
  daSemesters: [],
  daSelectedSem: "",
  daCourses: [],
  daAssignments: {},
  daLoading: false,
  daError: null,
  daRawHtml: "",

  setDaSelectedSem: (semId: string) => set({ daSelectedSem: semId }),

  fetchDASemesters: async (network: VTOPNetwork, force = false) => {
    const { status } = get();
    if (status === "Demo Mode Active") {
      set({
        daSemesters: [{ id: "demo", label: "Fall Semester 2026-27" }],
        daSelectedSem: "demo",
      });
      get().fetchDACourses(network, "demo");
      return;
    }

    set({ daLoading: true, daError: null });
    try {
      const html = await network.getDASemesters(force);
      const sems = parseDASemesters(html);
      set({ daSemesters: sems });
      if (sems.length > 0 && !get().daSelectedSem) {
        set({ daSelectedSem: sems[0].id });
        get().fetchDACourses(network, sems[0].id, force);
      }
    } catch (e: any) {
      if (e.message !== "OFFLINE_CACHE_MISS") {
        set({ daError: e.message || "Failed to fetch DA semesters" });
      } else {
        set({ status: "Offline - Not Synced" });
      }
    } finally {
      set({ daLoading: false });
    }
  },

  fetchDACourses: async (
    network: VTOPNetwork,
    semesterId: string,
    force = false,
  ) => {
    const { status } = get();
    if (status === "Demo Mode Active") {
      set({
        daCourses: [
          {
            classId: "123",
            code: "CS101",
            title: "Problem Solving and Programming",
            type: "TH",
            faculty: "Dr. Demo",
          },
        ],
      });
      return;
    }

    set({ daLoading: true, daError: null, daCourses: [], daRawHtml: "" });
    try {
      const isPastSemester =
        get().daSemesters.length > 0 && semesterId !== get().daSemesters[0].id;
      const html = await network.getDACourses(
        semesterId,
        force,
        isPastSemester,
      );
      const courses = parseDACourses(html);
      set({ daCourses: courses, daRawHtml: html });
    } catch (e: any) {
      if (e.message !== "OFFLINE_CACHE_MISS") {
        set({ daError: e.message || "Failed to fetch DA courses" });
      } else {
        set({ status: "Offline - Not Synced" });
      }
    } finally {
      set({ daLoading: false });
    }
  },

  fetchDAAssignments: async (
    network: VTOPNetwork,
    classId: string,
    force = false,
  ) => {
    const { status } = get();
    if (status === "Demo Mode Active") return;

    set({ daLoading: true, daError: null });
    try {
      // Find which semester this course belongs to
      const course = get().daCourses.find((c) => c.classId === classId);
      const isPastSemester =
        get().daSemesters.length > 0 &&
        get().daSelectedSem !== get().daSemesters[0].id;

      const html = await network.getDAForCourse(classId, force, isPastSemester);
      const assignments = parseDAAssignments(html);
      set((state) => ({
        daAssignments: {
          ...state.daAssignments,
          [classId]: assignments,
        },
      }));
    } catch (e: any) {
      if (e.message !== "OFFLINE_CACHE_MISS") {
        set({ daError: e.message || "Failed to fetch assignments" });
      } else {
        set({ status: "Offline - Not Synced" });
      }
    } finally {
      set({ daLoading: false });
    }
  },
});
