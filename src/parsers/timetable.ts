import { Semester, TimetableCourse } from "../types/vtop";

export function parseSemesters(html: string): Semester[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const options = doc.querySelectorAll("#semesterSubId option");

  const semesters: Semester[] = [];
  options.forEach((opt) => {
    const val = (opt as HTMLOptionElement).value;
    const txt = opt.textContent?.trim() || "";
    if (val && val !== "") {
      semesters.push({
        id: val,
        label: txt,
        isLatest: false,
      });
    }
  });

  if (semesters.length > 0) semesters[0].isLatest = true;
  return semesters;
}

export function parseTimetable(html: string): TimetableCourse[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = doc.querySelectorAll("table tr");
  const courses: TimetableCourse[] = [];

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td"));
    if (cells.length < 5) return;

    let mainCellIdx = -1;
    let mainText = "";

    for (let i = 0; i < cells.length; i++) {
      const txt = cells[i].innerText.trim();
      if (/^[A-Z]{3,4}\d{3}[A-Z0-9]*\s*-\s*.+/.test(txt)) {
        mainCellIdx = i;
        mainText = txt;
        break;
      }
    }

    if (mainCellIdx === -1) return;

    let code = "",
      title = "",
      type = "Theory";
    const typeMatch = mainText.match(
      /^([A-Z0-9]+)\s*-\s*(.+?)\s*\(\s*(.+?)\s*\)$/,
    );
    if (typeMatch) {
      code = typeMatch[1];
      title = typeMatch[2];
      type = typeMatch[3];
    } else {
      const simpleMatch = mainText.match(/^([A-Z0-9]+)\s*-\s*(.+)$/);
      if (simpleMatch) {
        code = simpleMatch[1];
        title = simpleMatch[2];
      } else {
        return;
      }
    }

    const credits = cells[mainCellIdx + 1]?.innerText.trim() || "0";
    const category = cells[mainCellIdx + 2]?.innerText.trim() || "N/A";

    let slot = "N/A";
    let venue = "N/A";
    let faculty = "N/A";
    let status = "Registered";

    for (let i = mainCellIdx + 3; i < cells.length; i++) {
      const txt = cells[i].innerText.trim();
      if (txt.includes("-") && !txt.includes(code)) {
        const parts = txt.split("-");
        const firstPart = parts[0].trim();

        if (/^[A-Z]+\d+(\+[A-Z]+\d+)*$/.test(firstPart)) {
          slot = firstPart;
          venue = parts[1]?.trim() || "N/A";
          if (cells[i + 1]) {
            faculty = cells[i + 1].innerText.split("-")[0].trim();
          }
          break;
        }
      }
    }

    const lastTxt = cells[cells.length - 1]?.innerText.trim();
    if (lastTxt) status = lastTxt;

    if (
      status.toUpperCase().includes("DROP") ||
      status.toUpperCase().includes("WITHDRAWN")
    )
      return;

    courses.push({
      code,
      title,
      type,
      credits: credits.split(" ").pop() || "0",
      category,
      slot,
      venue,
      faculty,
      classId: "N/A",
      status,
    });
  });

  return courses;
}
