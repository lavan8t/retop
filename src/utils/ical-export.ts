import { TimetableCourse, CalendarEvent, CalendarMonthPreview } from "../types/vtop";
import { CAMPUS_SLOTS, CAMPUS_SLOT_TIMINGS, DAYS } from "./timetable-slots";

/**
 * Generates an iCal (.ics) file from timetable courses and academic calendar data.
 *
 * Key logic:
 * - Only instructional days get timetable events.
 * - Holidays, exams, Sundays with no instruction → skipped.
 * - Saturday day orders: if subInfo contains "Day Order - Monday" (or similar),
 *   Saturday uses that day's slot mapping instead of Saturday's own.
 * - Each course slot is resolved to its day+time using CAMPUS_SLOTS + CAMPUS_SLOT_TIMINGS.
 */

// ---- Helpers ----

/** Pad number to 2 digits */
const pad = (n: number) => n.toString().padStart(2, "0");

/** Format a Date to iCal YYYYMMDD'T'HHMMSS format (local time, no Z) */
const toICalDate = (d: Date): string => {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

/** Generate a unique UID for an event */
const generateUID = (courseCode: string, date: string, slot: string): string => {
  return `${courseCode}-${date}-${slot}@retop`;
};

/** Escape special characters for iCal text fields */
const escapeIcal = (text: string): string => {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
};

/** Parse "HH:MM" to { hours, minutes } */
const parseTime = (time: string): { hours: number; minutes: number } | null => {
  if (!time || time === "-") return null;
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return { hours: h, minutes: m };
};

/**
 * Detect the effective day name from a CalendarEvent's info field.
 * VTOP marks days with day orders like:
 *   "Monday Day Order", "Tuesday Day Order", etc. in the `info` field.
 * Also checks subInfo for patterns like "Day Order - Monday", "Day Order 1".
 *
 * Returns the effective day name (e.g., "Monday") or null if no override.
 */
const getDayOrderOverride = (event: CalendarEvent): string | null => {
  const info = (event.info || "").toLowerCase();
  const sub = (event.subInfo || "").toLowerCase();

  const combined = `${sub} ${info}`;

  // Primary check: VTOP uses "{DayName} Day Order" in the info field
  // This is the pattern used in home.tsx's getClassesForDate
  if (combined.includes("monday day order")) return "Monday";
  if (combined.includes("tuesday day order")) return "Tuesday";
  if (combined.includes("wednesday day order")) return "Wednesday";
  if (combined.includes("thursday day order")) return "Thursday";
  if (combined.includes("friday day order")) return "Friday";

  // Secondary: check subInfo for "Day Order - Monday" patterns
  for (const dayName of DAYS) {
    if (combined.includes(`day order - ${dayName.toLowerCase()}`)) {
      return dayName;
    }
    if (combined.includes(`day order -${dayName.toLowerCase()}`)) {
      return dayName;
    }
  }

  // Numeric day order: "Day Order - 1" or "Day Order 1"
  const numMatch = combined.match(/day\s*order\s*[-–:]?\s*(\d)/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num >= 1 && num <= 7) {
      return DAYS[num - 1]; // 1=Monday, 2=Tuesday, ...
    }
  }

  return null;
};

/**
 * Determines which day-of-week schedule a calendar date should follow.
 * - Only instructional days get classes.
 * - Day orders in info field can remap the schedule (e.g., Saturday follows Monday).
 * - Returns null if the day should be skipped (holiday, exam, non-instructional).
 */
const getEffectiveDayName = (
  calendarDate: Date,
  calEvent: CalendarEvent | undefined,
): string | null => {
  // If we have calendar data for this day
  if (calEvent) {
    // Check for day order override (common for Saturdays with weekday schedules)
    const override = getDayOrderOverride(calEvent);
    if (override) return override;

    // Skip non-instructional days (holidays, exams, etc.) if they have no override
    if (!calEvent.isInstructional) return null;
  } else {
    // No calendar data for this date — skip it (we only generate events
    // for days that appear in the academic calendar)
    return null;
  }

  // Use natural day name
  const jsDay = calendarDate.getDay();
  if (jsDay === 0) return "Sunday";
  return DAYS[jsDay - 1];
};

interface SlotOccurrence {
  dayName: string; // "Monday", "Tuesday", etc.
  colIdx: number;  // Column index in the CAMPUS_SLOT_TIMINGS
  isLab: boolean;  // Whether this is a lab slot
}

/**
 * For a course, find all slot occurrences (which day + column + lab/theory).
 * A course with slot "A1+TA1" means it appears in multiple day/column combos.
 */
const getCourseSlotOccurrences = (course: TimetableCourse): SlotOccurrence[] => {
  const occurrences: SlotOccurrence[] = [];
  const individualSlots = course.slot.split("+").map((s) => s.trim());

  for (const dayName of DAYS) {
    const dayConfig = CAMPUS_SLOTS[dayName];
    if (!dayConfig) continue;

    // Check theory slots
    dayConfig.Theory.forEach((slot, colIdx) => {
      if (individualSlots.includes(slot) && slot !== "-") {
        occurrences.push({ dayName, colIdx, isLab: false });
      }
    });

    // Check lab slots
    dayConfig.Lab.forEach((slot, colIdx) => {
      if (individualSlots.includes(slot) && slot !== "-") {
        // Avoid duplicates if theory and lab are at the same position
        if (!occurrences.some((o) => o.dayName === dayName && o.colIdx === colIdx)) {
          occurrences.push({ dayName, colIdx, isLab: true });
        }
      }
    });
  }

  return occurrences;
};

/**
 * Build a lookup map from the calendar grid data:
 *   "YYYY-MM-DD" -> CalendarEvent
 */
const buildCalendarLookup = (
  calGridData: { month: CalendarMonthPreview; days: CalendarEvent[]; startOffset: number }[],
): Map<string, CalendarEvent> => {
  const lookup = new Map<string, CalendarEvent>();

  for (const monthData of calGridData) {
    for (const day of monthData.days) {
      if (day.dateObj) {
        const d = new Date(day.dateObj);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          lookup.set(key, day);
        }
      }
    }
  }

  return lookup;
};

/**
 * Get the start and end date range from calendar grid data.
 */
const getDateRange = (
  calGridData: { month: CalendarMonthPreview; days: CalendarEvent[]; startOffset: number }[],
): { start: Date; end: Date } | null => {
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const monthData of calGridData) {
    for (const day of monthData.days) {
      const d = new Date(day.dateObj);
      if (isNaN(d.getTime())) continue;
      if (!minDate || d < minDate) minDate = new Date(d);
      if (!maxDate || d > maxDate) maxDate = new Date(d);
    }
  }

  if (!minDate || !maxDate) return null;
  return { start: minDate, end: maxDate };
};

// ---- Main Export Function ----

export interface ICalExportOptions {
  courses: TimetableCourse[];
  calGridData: { month: CalendarMonthPreview; days: CalendarEvent[]; startOffset: number }[];
  semesterLabel?: string;
}

interface MergedOccurrence {
  dayName: string;
  start: { hours: number; minutes: number };
  end: { hours: number; minutes: number };
}

const getMergedOccurrences = (course: TimetableCourse): MergedOccurrence[] => {
  const occurrences = getCourseSlotOccurrences(course);
  const merged: MergedOccurrence[] = [];

  for (const dayName of DAYS) {
    const todayOccurrences = occurrences.filter((o) => o.dayName === dayName);
    if (todayOccurrences.length === 0) continue;

    const times = todayOccurrences
      .map((occ) => {
        const timings = occ.isLab
          ? CAMPUS_SLOT_TIMINGS.Lab[occ.colIdx]
          : CAMPUS_SLOT_TIMINGS.Theory[occ.colIdx];
        if (!timings) return null;
        const start = parseTime(timings.start);
        const end = parseTime(timings.end);
        if (!start || !end) return null;
        return { start, end };
      })
      .filter((t) => t !== null) as { start: { hours: number; minutes: number }; end: { hours: number; minutes: number } }[];

    times.sort(
      (a, b) =>
        a.start.hours * 60 + a.start.minutes - (b.start.hours * 60 + b.start.minutes),
    );

    if (times.length > 0) {
      let current = times[0];
      for (let i = 1; i < times.length; i++) {
        const next = times[i];
        const currentEndMins = current.end.hours * 60 + current.end.minutes;
        const nextStartMins = next.start.hours * 60 + next.start.minutes;
        if (nextStartMins - currentEndMins <= 15) {
          current.end = next.end; // Merge overlapping or adjacent by up to 15 mins
        } else {
          merged.push({ dayName, start: current.start, end: current.end });
          current = next;
        }
      }
      merged.push({ dayName, start: current.start, end: current.end });
    }
  }
  return merged;
};

const toICalDateUTC = (d: Date): string => {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};

const setTime = (d: Date, time: { hours: number; minutes: number }): Date => {
  const newDate = new Date(d);
  newDate.setHours(time.hours, time.minutes, 0, 0);
  return newDate;
};

export function generateICalFile(options: ICalExportOptions): string {
  const { courses, calGridData, semesterLabel } = options;

  const calLookup = buildCalendarLookup(calGridData);
  const dateRange = getDateRange(calGridData);

  if (!dateRange) {
    throw new Error("No valid dates found in the academic calendar data.");
  }

  const nowUTC = toICalDateUTC(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//retop//VTOP Timetable Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcal(semesterLabel ? `Timetable — ${semesterLabel}` : "VIT Timetable")}`,
    "X-WR-TIMEZONE:Asia/Kolkata",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Kolkata",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0530",
    "TZOFFSETTO:+0530",
    "TZNAME:IST",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  const endDate = new Date(dateRange.end);
  endDate.setHours(23, 59, 59, 999);
  const untilStr = toICalDateUTC(endDate);

  for (const course of courses) {
    const mergedOccurrences = getMergedOccurrences(course);

    for (const occ of mergedOccurrences) {
      // Find the first date in the range that matches the natural day name
      let firstDayDate = new Date(dateRange.start);
      firstDayDate.setHours(0, 0, 0, 0);
      let found = false;
      while (firstDayDate <= endDate) {
        const jsDay = firstDayDate.getDay();
        const naturalDayName = jsDay === 0 ? "Sunday" : DAYS[jsDay - 1];
        if (naturalDayName === occ.dayName) {
          found = true;
          break;
        }
        firstDayDate.setDate(firstDayDate.getDate() + 1);
      }

      if (!found) continue; // Should practically never happen if range > 7 days

      const eventStart = setTime(firstDayDate, occ.start);
      const eventEnd = setTime(firstDayDate, occ.end);

      const exdates: string[] = [];
      const rdates: string[] = [];

      let current = new Date(dateRange.start);
      current.setHours(0, 0, 0, 0);

      while (current <= endDate) {
        const dateKey = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
        const calEvent = calLookup.get(dateKey);
        const effectiveDay = getEffectiveDayName(current, calEvent);
        const jsDay = current.getDay();
        const naturalDayName = jsDay === 0 ? "Sunday" : DAYS[jsDay - 1];

        const isNaturalDay = naturalDayName === occ.dayName;
        const isEffectiveDay = effectiveDay === occ.dayName;

        if (isNaturalDay && !isEffectiveDay) {
          // It's normally this day, but it's overridden or skipped
          exdates.push(toICalDate(setTime(current, occ.start)));
        } else if (!isNaturalDay && isEffectiveDay) {
          // It's a different day, but follows this day's schedule
          rdates.push(toICalDate(setTime(current, occ.start)));
        }

        current.setDate(current.getDate() + 1);
      }

      const descParts = [
        `Code: ${course.code}`,
        `Type: ${course.type}`,
        `Credits: ${course.credits}`,
        `Faculty: ${course.faculty}`,
        `Slot: ${course.slot}`,
        `Category: ${course.category}`,
        `Class ID: ${course.classId}`,
      ];

      const uid = generateUID(course.code, toICalDate(eventStart), `${occ.dayName}`);

      lines.push("BEGIN:VEVENT");
      lines.push(`DTSTAMP:${nowUTC}`);
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART;TZID=Asia/Kolkata:${toICalDate(eventStart)}`);
      lines.push(`DTEND;TZID=Asia/Kolkata:${toICalDate(eventEnd)}`);
      lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${untilStr}`);
      
      for (const ex of exdates) {
        lines.push(`EXDATE;TZID=Asia/Kolkata:${ex}`);
      }
      for (const r of rdates) {
        lines.push(`RDATE;TZID=Asia/Kolkata:${r}`);
      }
      
      lines.push(`SUMMARY:${escapeIcal(course.title)}`);
      lines.push(`DESCRIPTION:${escapeIcal(descParts.join("\n"))}`);
      if (course.venue && course.venue !== "N/A") {
        lines.push(`LOCATION:${escapeIcal(course.venue)}`);
      }
      lines.push(`CATEGORIES:${escapeIcal(course.type)}`);
      lines.push(`STATUS:CONFIRMED`);
      lines.push(`TRANSP:OPAQUE`);
      lines.push("END:VEVENT");
    }
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Triggers a browser download of the generated iCal file.
 */
export function downloadICalFile(options: ICalExportOptions): void {
  const icalContent = generateICalFile(options);
  const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `timetable${options.semesterLabel ? `-${options.semesterLabel.replace(/\s+/g, "-").toLowerCase()}` : ""}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
