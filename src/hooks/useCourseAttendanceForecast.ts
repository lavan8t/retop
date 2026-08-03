import { useMemo } from "react";
import { useDataStore } from "../store/dataStore";
import { calculateAttendanceForecast } from "../utils/attendanceForecaster";

export const useCourseAttendanceForecast = (courseCode: string) => {
  const timetable = useDataStore((state) => state.ttCourses || []);
  const calGridData = useDataStore((state) => state.calGridData || []);
  const attendanceCourses = useDataStore((state) => state.attendance || []);
  const examGroups = useDataStore((state) => state.examGroups || []);

  return useMemo(() => {
    const courseAttendance = attendanceCourses.find(
      (c) => c.code === courseCode || c.name?.includes(courseCode)
    );
    const attended = courseAttendance ? courseAttendance.attended || 0 : 0;
    const total = courseAttendance ? courseAttendance.total || 0 : 0;

    const flatCalendarEvents: any[] = [];
    if (Array.isArray(calGridData)) {
      calGridData.forEach((month: any) => {
        if (month.days && Array.isArray(month.days)) {
          month.days.forEach((day: any) => {
            if (day.dateObj) {
              flatCalendarEvents.push(day);
            }
          });
        }
      });
    }

    return calculateAttendanceForecast(
      courseCode,
      attended,
      total,
      timetable,
      flatCalendarEvents,
      examGroups
    );
  }, [courseCode, attendanceCourses, timetable, calGridData, examGroups]);
};
