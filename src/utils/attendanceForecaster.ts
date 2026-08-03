import { TimetableCourse, CalendarEvent } from "../types/vtop";
import { CAMPUS_SLOTS, DAYS } from "./timetable-slots";

export interface AttendanceForecast {
  futureScheduledClasses: number;
  safeSkips: number;
  requiredToPass: number;
  classesNeededBeforeExam: number;
  status: "SAFE" | "WARNING" | "CRITICAL";
  examStartDate: Date | null;
  examName: string | null;
}

export const calculateAttendanceForecast = (
  courseCode: string,
  attended: number,
  total: number,
  timetable: TimetableCourse[],
  calendarEvents: CalendarEvent[],
  examGroups: any[] = []
): AttendanceForecast => {
  const course = timetable.find(
    (c) => c.code === courseCode || c.title?.includes(courseCode)
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let examStartDate: Date | null = null;
  let examName: string | null = null;

  // 1. Check examGroups array first for course-specific exam
  if (Array.isArray(examGroups) && examGroups.length > 0) {
    examGroups.forEach((group: any) => {
      if (group.entries && Array.isArray(group.entries)) {
        group.entries.forEach((entry: any) => {
          if (entry.courseCode === courseCode || entry.code === courseCode) {
            const rawDate = entry.examDate || entry.date || entry.dateStr;
            const d = rawDate ? new Date(rawDate) : new Date(NaN);
            if (!isNaN(d.getTime()) && d >= today) {
              if (!examStartDate || d < examStartDate) {
                examStartDate = d;
                examName = group.title || entry.examTitle || "Upcoming Exam";
              }
            }
          }
        });
      }
    });
  }

  // 2. Fallback to calendarEvents for generic exam date
  if (!examStartDate && calendarEvents && calendarEvents.length > 0) {
    const sortedEvents = [...calendarEvents]
      .filter((e) => e.dateObj && e.dateObj >= today)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    for (const event of sortedEvents) {
      if (event.isExam) {
        examStartDate = event.dateObj;
        examName = event.info || event.subInfo || "Upcoming Exam";
        break;
      }
    }
    if (!examStartDate && sortedEvents.length > 0) {
      examStartDate = sortedEvents[sortedEvents.length - 1].dateObj;
      examName = "End of Semester";
    }
  }

  // 3. Calculate weekly slots for this course
  let weeklyClassesCount = 0;
  const courseDays = new Set<string>();

  if (course && course.slot) {
    const individualSlots = course.slot.split("+").map((s) => s.trim());
    DAYS.forEach((dayName) => {
      const dayConfig = CAMPUS_SLOTS[dayName];
      if (!dayConfig) return;
      const matchingTheory = dayConfig.Theory.filter((s) =>
        individualSlots.includes(s)
      ).length;
      const matchingLab = dayConfig.Lab.filter((s) =>
        individualSlots.includes(s)
      ).length;
      const count = matchingTheory + matchingLab;
      if (count > 0) {
        courseDays.add(dayName);
        weeklyClassesCount += count;
      }
    });
  }

  // 4. Calculate future scheduled classes
  let futureScheduledClasses = 0;

  if (courseDays.size > 0 && course?.slot) {
    const individualSlots = course.slot.split("+").map((s) => s.trim());
    if (examStartDate && calendarEvents.length > 0) {
      calendarEvents.forEach((event) => {
        if (
          event.dateObj >= today &&
          event.dateObj < examStartDate! &&
          !event.isHoliday
        ) {
          const jsDay = event.dateObj.getDay();
          const dayName = jsDay === 0 ? "Sunday" : DAYS[jsDay - 1];
          if (courseDays.has(dayName)) {
            const dayConfig = CAMPUS_SLOTS[dayName];
            if (dayConfig) {
              const matchingTheory = dayConfig.Theory.filter((s) =>
                individualSlots.includes(s)
              ).length;
              const matchingLab = dayConfig.Lab.filter((s) =>
                individualSlots.includes(s)
              ).length;
              futureScheduledClasses += matchingTheory + matchingLab;
            }
          }
        }
      });
    } else {
      // Default: estimate ~6 remaining weeks of classes if calendar not full
      futureScheduledClasses = weeklyClassesCount * 6;
    }
  } else {
    // Basic estimate if timetable slot missing
    futureScheduledClasses = 10;
  }

  const futureTotal = total + futureScheduledClasses;
  const targetRequired = 0.75 * futureTotal;

  // Safe skips: how many classes can be skipped while staying >= 75%
  const safeSkipsFloat = attended + futureScheduledClasses - targetRequired;
  const safeSkips = Math.max(0, Math.floor(safeSkipsFloat));

  // Classes needed before exam to reach/maintain 75%
  const neededFloat = targetRequired - attended;
  const classesNeededBeforeExam = Math.max(0, Math.ceil(neededFloat));

  let status: "SAFE" | "WARNING" | "CRITICAL" = "SAFE";
  if (safeSkips > 2) status = "SAFE";
  else if (safeSkips > 0) status = "WARNING";
  else status = "CRITICAL";

  let requiredToPass = 0;
  if (status === "CRITICAL" || (total > 0 && attended / total < 0.75)) {
    // Current absolute deficit to reach 75% on past conducted classes
    requiredToPass = Math.max(0, Math.ceil(3 * total - 4 * attended));
  }

  return {
    futureScheduledClasses,
    safeSkips,
    requiredToPass,
    classesNeededBeforeExam,
    status,
    examStartDate,
    examName: examName || "Exams",
  };
};

function _calculateBasicForecast(
  attended: number,
  total: number
): AttendanceForecast {
  const safeSkips = Math.floor(attended - 0.75 * total);

  let status: "SAFE" | "WARNING" | "CRITICAL" = "SAFE";
  if (safeSkips > 2) status = "SAFE";
  else if (safeSkips > 0) status = "WARNING";
  else status = "CRITICAL";

  let requiredToPass = 0;
  if (status === "CRITICAL" || (total > 0 && attended / total < 0.75)) {
    requiredToPass = Math.ceil(3 * total - 4 * attended);
  }

  return {
    futureScheduledClasses: 0,
    safeSkips: Math.max(0, safeSkips),
    requiredToPass: Math.max(0, requiredToPass),
    classesNeededBeforeExam: 0,
    status,
    examStartDate: null,
    examName: null,
  };
}
