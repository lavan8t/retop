import { parseHTMLFast } from "../utils/parser-utils";

export interface DACourse {
  classId: string;
  code: string;
  title: string;
  type: string;
  faculty: string;
}

export interface DAAssignment {
  slNo: string;
  title: string;
  maxMark: string;
  weightage: string;
  dueDate: string;
  lastUpdated: string;
  code: string; // The assignment code (e.g., 'CS1', 'AST02')
  hasQP?: boolean;
}

export const parseDASemesters = (html: string): { id: string; label: string }[] => {
  const doc = parseHTMLFast(html);
  const options = doc.querySelectorAll("#semesterSubId option");

  const semesters: { id: string; label: string }[] = [];
  options.forEach((opt) => {
    const val = opt.getAttribute("value") || (opt as HTMLOptionElement).value || opt.textContent?.trim() || "";
    const txt = opt.textContent?.trim() || "";
    const isSelectPlaceholder = txt.toLowerCase().includes("select") || txt.toLowerCase().includes("choose") || val.toLowerCase().includes("select") || val.toLowerCase().includes("choose") || txt === "-";
    if (val && val.trim() !== "" && !isSelectPlaceholder) {
      semesters.push({ id: val, label: txt });
    }
  });
  return semesters;
};

export const parseDACourses = (html: string): DACourse[] => {
  const doc = parseHTMLFast(html);
  const table = doc.querySelector(".customTable");
  if (!table) return [];

  const courses: DACourse[] = [];
  const rows = table.querySelectorAll("tr.tableContent");
  
  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 7) {
      const classIdText = cells[1].textContent?.trim() || "";
      const code = cells[2].textContent?.trim() || "";
      const title = cells[3].textContent?.trim() || "";
      const type = cells[4].textContent?.trim() || "";
      const faculty = cells[5].textContent?.trim() || "";
      
      const btn = cells[6].querySelector("button");
      let classId = classIdText;
      if (btn) {
        const onClick = btn.getAttribute("onclick") || "";
        const match = onClick.match(/myFunction\('([^']+)'\)/);
        if (match) {
          classId = match[1];
        }
      }

      courses.push({
        classId,
        code,
        title,
        type,
        faculty,
      });
    }
  });

  return courses;
};

export const parseDAAssignments = (html: string): DAAssignment[] => {
  const doc = parseHTMLFast(html);
  const tables = doc.querySelectorAll(".customTable");
  // Assignments are usually in the second table.
  let table = tables[1];
  if (!table) {
    table = tables[0];
    if (!table || !table.textContent?.includes("Weightage %")) {
      return [];
    }
  }

  const assignments: DAAssignment[] = [];
  const rows = table.querySelectorAll("tr.tableContent");

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 8) {
      const slNo = cells[0].textContent?.trim() || "";
      const title = cells[1].textContent?.trim() || "";
      const maxMark = cells[2].textContent?.trim() || "";
      const weightage = cells[3].textContent?.trim() || "";
      const dueDate = cells[4].textContent?.trim() || "";
      const lastUpdated = cells[6]?.textContent?.trim() || "";
      
      // Question Paper (QP) check in cells[5]
      const qpCell = cells[5];
      const hasQP = Boolean(
        qpCell && (
          qpCell.querySelector("button, a, [data-code]") ||
          qpCell.innerHTML.includes("downloadQuestion") ||
          (qpCell.textContent?.trim() && !["-", "N/A", ""].includes(qpCell.textContent.trim()))
        )
      );

      // Extract code from any possible element across cells 7, 8, 5
      let code = "";
      const editBtn = cells[7]?.querySelector("[data-editcode]");
      const subBtn = cells[7]?.querySelector("[data-subcode]");
      const hiddenCode = cells[7]?.querySelector("input[name='code'], input[name='mCode']");
      const dlStudentBtn = cells[8]?.querySelector("[data-code]");
      const dlQpBtn = cells[5]?.querySelector("[data-code]");

      if (editBtn) {
        code = editBtn.getAttribute("data-editcode") || "";
      } else if (subBtn) {
        code = subBtn.getAttribute("data-subcode") || "";
      } else if (hiddenCode) {
        code = (hiddenCode as HTMLInputElement).value || hiddenCode.getAttribute("value") || "";
      } else if (dlStudentBtn) {
        code = dlStudentBtn.getAttribute("data-code") || "";
      } else if (dlQpBtn) {
        code = dlQpBtn.getAttribute("data-code") || "";
      }

      // Fallback code from title if not found (e.g., AST01, CS1)
      if (!code && title) {
        const match = title.match(/\b([A-Z]{2,4}\d{1,2}|CS\d|AST\d|DA\d|EXP\d)\b/i);
        if (match) code = match[1].toUpperCase();
      }

      assignments.push({
        slNo,
        title,
        maxMark,
        weightage,
        dueDate,
        lastUpdated,
        code,
        hasQP,
      });
    }
  });

  return assignments;
};
