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
  if (!html || html.includes("No Data") || html.includes("No Records"))
    return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = doc.querySelectorAll("table tr");
  const assignments: Assignment[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as Element;
    const cols = row.querySelectorAll("td");
    if (cols.length < 5) continue;

    const code = cols[1]?.textContent?.trim();
    const courseName = cols[2]?.textContent?.trim();
    const title = cols[3]?.textContent?.trim();
    const dueDate = cols[4]?.textContent?.trim();

    if (title && dueDate) {
      assignments.push({
        course: `${code} - ${courseName}`,
        title,
        dueDate,
      });
    }
  }
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
