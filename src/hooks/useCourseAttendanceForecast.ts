import { useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import {
  calculateAttendanceForecast,
  resolveForecastBaseline,
} from '../utils/attendanceForecaster';

export const useCourseAttendanceForecast = (courseCode: string) => {
  const timetable = useDataStore((state) => state.ttCourses || []);
  const calGridData = useDataStore((state) => state.calGridData || []);
  const attendanceCourses = useDataStore((state) => state.attendance || []);
  const detailedAttendance = useDataStore(
    (state) => state.detailedAttendance || [],
  );
  const examGroups = useDataStore((state) => state.examGroups || []);

  return useMemo(() => {
    const baseline = resolveForecastBaseline(
      courseCode,
      detailedAttendance,
      attendanceCourses,
    );
    const attended = baseline.attended;
    const total = baseline.total;

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
      examGroups,
    );
  }, [
    courseCode,
    attendanceCourses,
    detailedAttendance,
    timetable,
    calGridData,
    examGroups,
  ]);
};
