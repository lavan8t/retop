import { create } from "zustand";
import { ProfileSlice, createProfileSlice } from "./slices/profileSlice";
import { DashboardSlice, createDashboardSlice } from "./slices/dashboardSlice";
import { TimetableSlice, createTimetableSlice } from "./slices/timetableSlice";
import { CalendarSlice, createCalendarSlice } from "./slices/calendarSlice";
import { AttendanceSlice, createAttendanceSlice } from "./slices/attendanceSlice";

export type DataState = ProfileSlice & DashboardSlice & TimetableSlice & CalendarSlice & AttendanceSlice;

export const useDataStore = create<DataState>()((set, get, api) => ({
  ...createProfileSlice(set, get, api),
  ...createDashboardSlice(set, get, api),
  ...createTimetableSlice(set, get, api),
  ...createCalendarSlice(set, get, api),
  ...createAttendanceSlice(set, get, api),
}));
