import { TimetableCourse, CalendarEvent } from "../types/vtop";
import { CAMPUS_SLOTS, DAYS } from "./timetable-slots";

export interface AttendanceForecast {
  futureScheduledClasses: number;
  safeSkips: number;
  requiredToPass: number;
  status: "SAFE" | "WARNING" | "CRITICAL";
  examStartDate: Date | null;
}

/**
 * Calculates the number of classes a student can safely skip before falling below the 75% threshold.
 *
 * Mathematical Buffer Calculation:
 * Let A = currently attended classes
 * Let T = currently total conducted classes
 * Let F = future scheduled classes until the first exam
 * Let S = safe skips allowed
 *
 * To remain at or above 75%, the condition is:
 * (A + F - S) / (T + F) >= 0.75
 * 
 * Solving for S:
 * A + F - S >= 0.75 * (T + F)
 * S <= A + F - 0.75 * (T + F)
 * 
 * If S < 0, the student is in a deficit. The required classes to attend (R) to reach 75%:
 * (A + R) / (T + R) >= 0.75
 * R >= 3T - 4A
 */
export const calculateAttendanceForecast = (
  courseCode: string,
  attended: number,
  total: number,
  timetable: TimetableCourse[],
  calendarEvents: CalendarEvent[]
): AttendanceForecast => {
  const course = timetable.find((c) => c.code === courseCode);
  
  if (!course || calendarEvents.length === 0) {
    return _calculateBasicForecast(attended, total);
  }

  const individualSlots = course.slot.split("+").map(s => s.trim());
  
  const courseDays = new Set<string>();
  DAYS.forEach(dayName => {
    const dayConfig = CAMPUS_SLOTS[dayName];
    if (!dayConfig) return;
    
    const hasTheory = dayConfig.Theory.some(slot => individualSlots.includes(slot));
    const hasLab = dayConfig.Lab.some(slot => individualSlots.includes(slot));
    
    if (hasTheory || hasLab) {
      courseDays.add(dayName);
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedEvents = [...calendarEvents].sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  
  let examStartDate: Date | null = null;
  for (const event of sortedEvents) {
    if (event.dateObj >= today && event.isExam) {
      examStartDate = event.dateObj;
      break;
    }
  }

  if (!examStartDate && sortedEvents.length > 0) {
    examStartDate = sortedEvents[sortedEvents.length - 1].dateObj;
  }

  let futureScheduledClasses = 0;
  
  if (examStartDate) {
    for (const event of sortedEvents) {
      if (event.dateObj >= today && event.dateObj < examStartDate) {
        if (!event.isHoliday) {
          const jsDay = event.dateObj.getDay();
          const dayName = jsDay === 0 ? "Sunday" : DAYS[jsDay - 1]; 
          
          if (courseDays.has(dayName)) {
            const dayConfig = CAMPUS_SLOTS[dayName];
            if (dayConfig) {
              const matchingTheory = dayConfig.Theory.filter(slot => individualSlots.includes(slot)).length;
              const matchingLab = dayConfig.Lab.filter(slot => individualSlots.includes(slot)).length;
              futureScheduledClasses += (matchingTheory + matchingLab);
            }
          }
        }
      }
    }
  }

  const futureTotal = total + futureScheduledClasses;
  const safeSkipsFloat = attended + futureScheduledClasses - 0.75 * futureTotal;
  const safeSkips = Math.floor(safeSkipsFloat);

  let status: "SAFE" | "WARNING" | "CRITICAL" = "SAFE";
  if (safeSkips > 2) status = "SAFE";
  else if (safeSkips > 0) status = "WARNING";
  else status = "CRITICAL";

  let requiredToPass = 0;
  if (status === "CRITICAL") {
    // Current absolute deficit normalized
    requiredToPass = Math.ceil(3 * total - 4 * attended);
  }

  return {
    futureScheduledClasses,
    safeSkips: Math.max(0, safeSkips),
    requiredToPass: Math.max(0, requiredToPass),
    status,
    examStartDate
  };
};

function _calculateBasicForecast(attended: number, total: number): AttendanceForecast {
  const safeSkips = Math.floor(attended - 0.75 * total);
  
  let status: "SAFE" | "WARNING" | "CRITICAL" = "SAFE";
  if (safeSkips > 2) status = "SAFE";
  else if (safeSkips > 0) status = "WARNING";
  else status = "CRITICAL";
  
  let requiredToPass = 0;
  if (status === "CRITICAL") {
    requiredToPass = Math.ceil(3 * total - 4 * attended);
  }

  return {
    futureScheduledClasses: 0,
    safeSkips: Math.max(0, safeSkips),
    requiredToPass: Math.max(0, requiredToPass),
    status,
    examStartDate: null
  };
}
