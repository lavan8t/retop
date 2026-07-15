import { StateCreator } from "zustand";
import { VTOPNetwork } from "../../utils/network";
import {
  parseStudentAttendance,
  parseAttendanceDetail,
} from "../../parsers/attendance";
import { DetailedAttendanceCourse, AttendanceRecord } from "../../types/vtop";
import { DataState } from "../dataStore";

export interface AttendanceSlice {
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

export const createAttendanceSlice: StateCreator<DataState, [], [], AttendanceSlice> = (set, get) => ({
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
});
