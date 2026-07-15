import { UpcomingClass, CAMPUS_SLOTS, CAMPUS_SLOT_TIMINGS } from "./timetable-slots";
import { TimetableCourse } from "../types/vtop";

export const getClassesForDate = (
  date: Date,
  ttCourses: TimetableCourse[],
  calEvent: any = null
): UpcomingClass[] => {
  const jsDay = date.getDay();
  let dName =
    jsDay === 0
      ? "Sunday"
      : [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ][jsDay - 1];

  let hasOverride = false;
  if (calEvent) {
    const lowerInfo = (calEvent.info || "").toLowerCase();
    const subInfo = (calEvent.subInfo || "").toLowerCase();
    const combined = lowerInfo + " " + subInfo;
    
    if (combined.includes("monday day order")) { dName = "Monday"; hasOverride = true; }
    else if (combined.includes("tuesday day order")) { dName = "Tuesday"; hasOverride = true; }
    else if (combined.includes("wednesday day order")) { dName = "Wednesday"; hasOverride = true; }
    else if (combined.includes("thursday day order")) { dName = "Thursday"; hasOverride = true; }
    else if (combined.includes("friday day order")) { dName = "Friday"; hasOverride = true; }
  }

  if (calEvent && !calEvent.isInstructional && !hasOverride) {
    return [];
  }

  if (!CAMPUS_SLOTS[dName as keyof typeof CAMPUS_SLOTS]) return [];
  const dayConfig = CAMPUS_SLOTS[dName as keyof typeof CAMPUS_SLOTS];

  const tempClasses: {
    course: any;
    startCol: number;
    endCol: number;
    type: "Theory" | "Lab";
  }[] = [];
  ttCourses.forEach((course) => {
    const slots = course.slot.split("+").map((s: string) => s.trim());
    slots.forEach((slot: string) => {
      let col = dayConfig.Theory.indexOf(slot);
      let type: "Theory" | "Lab" = "Theory";

      if (col === -1) {
        col = dayConfig.Lab.indexOf(slot);
        type = "Lab";
      }

      if (col !== -1 && CAMPUS_SLOT_TIMINGS[type][col]) {
        tempClasses.push({ course, startCol: col, endCol: col, type });
      }
    });
  });

  tempClasses.sort((a, b) => a.startCol - b.startCol);

  const mergedClasses: typeof tempClasses = [];
  tempClasses.forEach((curr) => {
    if (mergedClasses.length === 0) {
      mergedClasses.push(curr);
    } else {
      const last = mergedClasses[mergedClasses.length - 1];
      if (
        curr.course.title === last.course.title &&
        curr.type === last.type &&
        curr.startCol === last.endCol + 1
      ) {
        last.endCol = curr.endCol;
      } else {
        mergedClasses.push(curr);
      }
    }
  });

  const dayClasses: UpcomingClass[] = mergedClasses.map((m) => {
    return {
      course: m.course,
      time: `${CAMPUS_SLOT_TIMINGS[m.type][m.startCol].start} - ${CAMPUS_SLOT_TIMINGS[m.type][m.endCol].end}`,
      status: "Next",
    };
  });

  return dayClasses;
};
