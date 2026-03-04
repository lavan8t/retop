import { Assignment, CourseSummary } from "../types/vtop";

function stripTags(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

export function parseCGPA(html: string) {
  const text = stripTags(html);
  const match = text.match(/CGPA\s*[:|-]?\s*([0-9.]+)/i);
  return match ? match[1] : "N/A";
}

export function parseCredits(html: string) {
  const text = stripTags(html);
  const match = text.match(/Credits\s*[:|-]?\s*([\d.]+)/i);
  return match ? match[1] : "N/A";
}

export function parseProctorMessage(html: string) {
  if (!html || html.includes("No Data")) return "No new messages.";
  return stripTags(html).replace(/\s+/g, " ").trim();
}

export function parseDigitalAssignments(html: string): Assignment[] {
  if (
    !html ||
    html.includes("No Data") ||
    html.includes("No Records") ||
    html.trim() === ""
  )
    return [];

  const parser = new DOMParser();
  // VTOP's HTML sometimes has malformed tags like <<td, so we sanitize it slightly
  const cleanHtml = html.replace(/<</g, "<");
  const doc = parser.parseFromString(cleanHtml, "text/html");

  // Target rows specifically inside the tbody to avoid the header <tr>
  const rows = doc.querySelectorAll("table tbody tr");
  const assignments: Assignment[] = [];

  rows.forEach((row) => {
    const cols = row.querySelectorAll("td");

    // According to the new HTML structure:
    // th[0] = Index (#) -> Ignored by querySelectorAll("td")
    // td[0] = Course Name
    // td[1] = Title
    // td[2] = Last Date

    if (cols.length < 3) return;

    const courseName = cols[0]?.textContent?.trim() || "";
    const title = cols[1]?.textContent?.trim() || "";
    const dueDate = cols[2]?.textContent?.trim() || "";

    if (title && dueDate) {
      assignments.push({
        course: courseName,
        title,
        dueDate,
      });
    }
  });

  return assignments;
}

export function parseCourseDetails(html: string): CourseSummary[] {
  if (!html) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = doc.querySelectorAll("table tbody tr");
  const courses: CourseSummary[] = [];

  rows.forEach((rowNode) => {
    const row = rowNode as Element;
    // Fetch all cells (both th and td)
    const cells = row.querySelectorAll("td, th");
    if (cells.length < 4) return;

    // cells[0] is the "#" index
    // cells[1] is the "Code - Course Name"
    const codeNameCell = cells[1];
    const code =
      codeNameCell.querySelector("span.fw-bold")?.textContent?.trim() || "";
    let fullText = codeNameCell.textContent?.trim() || "";
    let name = fullText
      .replace(code, "")
      .replace(/^-+\s*/, "")
      .trim();

    // cells[2] is the "Type" column (e.g., ELA, ETH, TH, LO, SS)
    const typeCell = cells[2];
    const type = typeCell?.textContent?.trim() || "";

    // cells[3] is the "Attendance" column
    const attendanceCell = cells[3];
    const rawAttendance = attendanceCell.textContent?.trim() || "0";

    // Parse the float and round it to remove the ".0" (e.g., "84.0" -> "84")
    const parsedAttendance = parseFloat(rawAttendance);
    const formattedAttendance = isNaN(parsedAttendance)
      ? "0"
      : Math.round(parsedAttendance).toString();

    if (code) {
      courses.push({
        code: code,
        name: name,
        type: type,
        slot: "N/A",
        faculty: "N/A",
        attendance: formattedAttendance,
      });
    }
  });

  return courses;
}
