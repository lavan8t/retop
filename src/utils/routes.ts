import { QuickLink, ViewType } from "../types/vtop";

export const VALID_VIEWS: readonly ViewType[] = [
  "dashboard",
  "content",
  "timetable",
  "curriculum",
  "marks",
  "grades",
  "profile",
  "settings",
  "coursePage",
  "calendar",
  "attendance",
  "digitalAssignments",
  "examSchedule",
  "lateHour",
] as const;

export const getDestinationView = (
  link: QuickLink | { title?: string; url?: string },
): ViewType | "content" => {
  const lowerTitle = (link.title || "").toLowerCase().trim();
  const lowerUrl = (link.url || "").toLowerCase().trim();

  // 1. Dashboard / Home
  if (
    lowerTitle === "home" ||
    lowerTitle === "dashboard" ||
    lowerUrl === "home" ||
    lowerUrl === "/home"
  ) {
    return "dashboard";
  }

  // 2. Timetable
  if (
    lowerTitle === "timetable" ||
    lowerTitle === "time table" ||
    lowerTitle === "class timetable" ||
    lowerUrl.includes("studenttimetable") ||
    lowerUrl.includes("processviewtimetable")
  ) {
    return "timetable";
  }

  // 3. Curriculum
  if (
    lowerTitle === "curriculum" ||
    lowerTitle === "programme curriculum" ||
    lowerTitle === "curriculum & syllabus" ||
    lowerUrl.includes("curriculumsyllabus")
  ) {
    return "curriculum";
  }

  // 4. Marks
  if (
    lowerTitle === "marks view" ||
    lowerTitle === "student marks" ||
    lowerUrl.includes("studentmarkview") ||
    lowerUrl.includes("processviewstudentmark")
  ) {
    return "marks";
  }

  // 5. Grades
  if (
    lowerTitle === "grades view" ||
    lowerTitle === "grades & history" ||
    lowerTitle === "grade history" ||
    lowerUrl.includes("studentgradeview") ||
    lowerUrl.includes("processviewstudentgrade")
  ) {
    return "grades";
  }

  // 6. Profile
  if (
    lowerTitle === "student profile" ||
    lowerTitle === "profile view" ||
    lowerUrl.includes("studentprofileallview")
  ) {
    return "profile";
  }

  // 7. Course Page Consolidated
  if (
    lowerTitle === "course page consolidated" ||
    lowerTitle === "course page (consolidated)" ||
    lowerUrl.includes("studentcoursepage") ||
    lowerUrl.includes("coursepageconsolidated")
  ) {
    return "coursePage";
  }

  // 8. Calendar
  if (
    lowerTitle === "academic calendar" ||
    lowerTitle === "academics calendar" ||
    lowerTitle === "academic calendar preview" ||
    lowerUrl.includes("calendarpreview")
  ) {
    return "calendar";
  }

  // 9. Attendance
  if (
    lowerTitle === "class attendance" ||
    lowerTitle === "student attendance" ||
    lowerUrl.includes("studentattendance") ||
    lowerUrl.includes("processviewstudentattendance")
  ) {
    return "attendance";
  }

  // 10. Digital Assignments
  if (
    lowerTitle === "digital assignments" ||
    lowerTitle === "digital assignment upload" ||
    lowerUrl.includes("studentda") ||
    lowerUrl.includes("processdigitalassignment") ||
    lowerUrl.includes("processviewstudentda")
  ) {
    return "digitalAssignments";
  }

  // 11. Exam Schedule
  if (
    lowerTitle === "exam schedule" ||
    lowerTitle === "examinations schedule" ||
    lowerUrl.includes("studexamschedule") ||
    lowerUrl.includes("processviewexamschedule")
  ) {
    return "examSchedule";
  }

  // 12. Late Hour Reguest
  if (
    lowerTitle === "late hour request" ||
    lowerTitle === "late hour" ||
    lowerUrl.includes("hostels/late/hour")
  ) {
    return "lateHour";
  }

  return "content";
};

export const hasRetopPage = (link: QuickLink | string): boolean => {
  if (typeof link === "string") {
    return getDestinationView({ url: link }) !== "content";
  }
  return getDestinationView(link) !== "content";
};

export const getSavedView = (): ViewType => {
  if (typeof sessionStorage === "undefined") return "dashboard";
  const saved = sessionStorage.getItem("vtop-retop-view");
  return VALID_VIEWS.includes(saved as ViewType)
    ? (saved as ViewType)
    : "dashboard";
};
