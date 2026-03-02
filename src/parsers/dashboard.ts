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
    const cells = row.querySelectorAll("td, th");
    if (cells.length < 4) return;

    const codeNameCell = cells[1];
    const code =
      codeNameCell.querySelector("span.fw-bold")?.textContent?.trim() || "";
    let fullText = codeNameCell.textContent?.trim() || "";
    let name = fullText
      .replace(code, "")
      .replace(/^-+\s*/, "")
      .trim();

    const attendanceCell = cells[3];
    const attendance = attendanceCell.textContent?.trim() || "0";

    if (code) {
      courses.push({
        code: code,
        name: name,
        slot: "N/A",
        faculty: "N/A",
        attendance: attendance.includes("%") ? attendance : attendance + "%",
      });
    }
  });

  return courses;
}
