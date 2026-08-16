import { create } from "zustand";
import { ProfileSlice, createProfileSlice } from "./slices/profileSlice";
import { DashboardSlice, createDashboardSlice } from "./slices/dashboardSlice";
import { TimetableSlice, createTimetableSlice } from "./slices/timetableSlice";
import { CalendarSlice, createCalendarSlice } from "./slices/calendarSlice";
import { AttendanceSlice, createAttendanceSlice } from "./slices/attendanceSlice";
import { DASlice, createDASlice } from "./slices/daSlice";
import { ExamScheduleSlice, createExamScheduleSlice } from "./slices/examScheduleSlice";

export type DataState = ProfileSlice & DashboardSlice & TimetableSlice & CalendarSlice & AttendanceSlice & DASlice & ExamScheduleSlice;

export const useDataStore = create<DataState>()((set, get, api) => ({
  ...createProfileSlice(set, get, api),
  ...createDashboardSlice(set, get, api),
  ...createTimetableSlice(set, get, api),
  ...createCalendarSlice(set, get, api),
  ...createAttendanceSlice(set, get, api),
  ...createDASlice(set, get, api),
  ...createExamScheduleSlice(set, get, api),
}));

