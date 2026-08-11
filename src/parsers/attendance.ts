import { DetailedAttendanceCourse, AttendanceRecord } from "../types/vtop";
import { parseHTMLFast } from "../utils/parser-utils";

export function parseStudentAttendance(
  html: string,
): DetailedAttendanceCourse[] {
  const doc = parseHTMLFast(html);

  const courses: DetailedAttendanceCourse[] = [];
  const rows = doc.querySelectorAll("#AttendanceDetailDataTable tbody tr");

  rows.forEach((row) => {
    const cols = row.querySelectorAll("td");
    if (cols.length < 10) return;

    const slNo = cols[0]?.textContent?.trim() || "";
    // col[1] is Class Group e.g. "General (Semester)"

    // col[2] is Course Detail e.g. "BCSE203E - Web Programming - Embedded Theory"
    const courseDetail = cols[2]?.textContent?.trim() || "";
    const splitCourse = courseDetail.split(" - ");
    const courseCode = splitCourse[0]?.trim() || "";
    const courseTitle = splitCourse[1]?.trim() || "";
    const courseType = splitCourse.slice(2).join(" - ").trim() || "";

    // col[3] is Class Detail e.g. "VL2026270102310 - TAA1 - PRP124"
    const classDetail = cols[3]?.textContent?.trim() || "";

    // col[4] is Faculty Detail
    const faculty = cols[4]?.textContent?.trim() || "";

    // col[5] is Attended Classes
    const attended = parseInt(cols[5]?.textContent?.trim() || "0", 10);

    // col[6] is Total Classes
    const total = parseInt(cols[6]?.textContent?.trim() || "0", 10);

    // col[7] is Attendance Percentage
    const percStr = cols[7]?.textContent?.trim().replace("%", "") || "0";
    const percentage = parseInt(percStr, 10);

    // col[8] is Debar Status (usually "-")
    const debarStatus = cols[8]?.textContent?.trim() || "-";

    // col[9] is Attendance Detail link which contains the javascript function call
    // e.g. javascript: callStudentAttendanceDetailDisplay('VL202627XX','2XBXX0000','VL_BCSE203E_00XXX','ETH');
    const aTag = cols[9]?.querySelector("a");
    const onclickStr = aTag?.getAttribute("onclick") || "";
    let semesterSubId = "";
    let courseId = "";
    let classType = ""; // This is the 4th parameter like 'ETH', 'ELA', 'TH', 'LO'

    const match = onclickStr.match(/'([^']+)'/g);
    if (match && match.length >= 4) {
      semesterSubId = match[0].replace(/'/g, "");
      // match[1] is registerNumber
      courseId = match[2].replace(/'/g, "");
      classType = match[3].replace(/'/g, "");
    }

    courses.push({
      slNo,
      courseCode,
      courseTitle,
      courseType,
      classDetail,
      faculty,
      attended,
      total,
      percentage,
      debarStatus,
      semesterSubId,
      courseId,
      classType,
    });
  });

  return courses;
}

export function parseAttendanceDetail(html: string): AttendanceRecord[] {
  const doc = parseHTMLFast(html);

  const records: AttendanceRecord[] = [];
  const rows = doc.querySelectorAll(
    "#StudentAttendanceDetailDataTable tbody tr",
  );

  rows.forEach((row) => {
    const cols = row.querySelectorAll("td");
    if (cols.length < 5) return;

    const slNo = cols[0]?.textContent?.trim() || "";
    const date = cols[1]?.textContent?.trim() || "";
    const slot = cols[2]?.textContent?.trim() || "";
    const dayTime = cols[3]?.textContent?.trim() || "";
    const status = cols[4]?.textContent?.trim() || "";

    records.push({
      slNo,
      date,
      slot,
      dayTime,
      status,
    });
  });

  return records;
}
