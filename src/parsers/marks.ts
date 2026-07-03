import { MarksSemester, CourseMarks } from "../types/vtop";

export function parseMarksSemesters(html: string): MarksSemester[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const options = doc.querySelectorAll("#semesterSubId option");
  const semesters: MarksSemester[] = [];

  options.forEach((opt) => {
    const val = opt.getAttribute("value") || (opt as HTMLOptionElement).value || opt.textContent?.trim() || "";
    const txt = opt.textContent?.trim() || "";
    const isSelectPlaceholder = txt.toLowerCase().includes("select") || txt.toLowerCase().includes("choose") || val.toLowerCase().includes("select") || val.toLowerCase().includes("choose") || txt === "-";
    if (val && val.trim() !== "" && !isSelectPlaceholder) {
      semesters.push({
        id: val,
        name: txt || val,
      });
    }
  });
  return semesters;
}

export function parseStudentMarks(html: string): CourseMarks[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const courses: CourseMarks[] = [];

  const mainTable = doc.querySelector("table.customTable");
  if (!mainTable) return [];

  const allRows = Array.from(mainTable.querySelectorAll("tr"));

  let currentCourse: CourseMarks | null = null;

  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];

    if (row.closest("table") !== mainTable) {
      continue;
    }

    const cells = Array.from(row.children) as HTMLTableCellElement[];

    if (cells.length > 5) {
      const codeText = cells[2]?.textContent?.trim() || "";

      const isCourseCode = /^[A-Z]{3,4}\d{3}[A-Z0-9]*$/.test(codeText);

      if (isCourseCode) {
        currentCourse = {
          classNumber: cells[1]?.textContent?.trim() || "",
          code: codeText,
          title: cells[3]?.textContent?.trim() || "Unknown Course",
          type: cells[4]?.textContent?.trim() || "Theory",
          credits: "0",
          faculty: cells[6]?.textContent?.trim() || "",
          slot: cells[7]?.textContent?.trim() || "",
          assessments: [],
        };
        courses.push(currentCourse);
      }
    } else if (currentCourse && cells.length === 1) {
      const nestedTable = cells[0].querySelector("table.customTable-level1");

      if (nestedTable) {
        const markRows = Array.from(nestedTable.querySelectorAll("tr"));

        markRows.forEach((mRow) => {
          const mCells = Array.from(mRow.querySelectorAll("td"));

          const getText = (idx: number) => {
            if (!mCells[idx]) return "";
            const output = mCells[idx].querySelector("output");
            return output
              ? output.textContent?.trim() || ""
              : mCells[idx].textContent?.trim() || "";
          };

          const slNo = getText(0);
          const title = getText(1);

          if (
            title === "Mark Title" ||
            title.startsWith("Total") ||
            slNo === "" ||
            slNo === "Sl.No."
          ) {
            return;
          }

          currentCourse!.assessments.push({
            title: title,
            maxMark: getText(2),
            weightage: getText(3),
            status: getText(4),
            scoredMark: getText(5),
            scoredPercentage: getText(6), // Actual Weighted Score
          });
        });
      }
    }
  }

  return courses;
}
