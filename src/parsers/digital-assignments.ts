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

export const parseDASemesters = (
  html: string,
): { id: string; label: string }[] => {
  const doc = parseHTMLFast(html);
  const options = doc.querySelectorAll("#semesterSubId option");

  const semesters: { id: string; label: string }[] = [];
  options.forEach((opt) => {
    const val =
      opt.getAttribute("value") ||
      (opt as HTMLOptionElement).value ||
      opt.textContent?.trim() ||
      "";
    const txt = opt.textContent?.trim() || "";
    const isSelectPlaceholder =
      txt.toLowerCase().includes("select") ||
      txt.toLowerCase().includes("choose") ||
      val.toLowerCase().includes("select") ||
      val.toLowerCase().includes("choose") ||
      txt === "-";
    if (val && val.trim() !== "" && !isSelectPlaceholder) {
      semesters.push({ id: val, label: txt });
    }
  });
  return semesters;
};

export const parseDACourses = (html: string): DACourse[] => {
  const doc = parseHTMLFast(html);
  const tables = Array.from(doc.querySelectorAll("table"));
  if (tables.length === 0) return [];

  // Find table that contains courses (has Class Nbr / Course Code / Title)
  let table =
    tables.find((t) => {
      const txt = t.textContent?.toLowerCase() || "";
      return (
        (txt.includes("course") && txt.includes("title")) ||
        txt.includes("class nbr") ||
        txt.includes("course code") ||
        txt.includes("faculty")
      );
    }) || tables[0];

  const courses: DACourse[] = [];
  const rows = Array.from(table.querySelectorAll("tr"));

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td"));
    if (cells.length >= 6) {
      const col0 = cells[0].textContent?.trim() || "";
      // Skip table header if th was wrapped in td
      if (
        col0.toLowerCase().includes("sl") ||
        col0.toLowerCase().includes("s.no")
      ) {
        return;
      }

      const rawClassNbr = cells[1]?.textContent?.trim() || "";
      const code = cells[2]?.textContent?.trim() || "";
      const title = cells[3]?.textContent?.trim() || "";
      const type = cells[4]?.textContent?.trim() || "TH";
      const faculty = cells[5]?.textContent?.trim() || "";

      // Try multiple ways to extract the actual classId (e.g. VL2026270103972)
      let classId = rawClassNbr;

      // 1. From button / link onclick in the row
      const btn = row.querySelector(
        "button, a, input[type='button'], input[type='submit']",
      );
      if (btn) {
        const onClick = btn.getAttribute("onclick") || "";
        const match = onClick.match(
          /(?:myFunction|processDigitalAssignment)\s*\(\s*['"]([^'"]+)['"]/i,
        );
        if (match && match[1]) {
          classId = match[1];
        } else {
          // Check for any quoted string with classId format
          const quoteMatch = onClick.match(/['"](VL\d+|[0-9]{4,})['"]/i);
          if (quoteMatch && quoteMatch[1]) {
            classId = quoteMatch[1];
          }
        }

        const dataClassId =
          btn.getAttribute("data-classid") ||
          btn.getAttribute("data-editclassid") ||
          btn.getAttribute("data-markclassid");
        if (dataClassId) classId = dataClassId;
      }

      // 2. If classId is just a short number (like serial 1) but code exists, check if row contains a hidden VL string
      if (classId.length < 5) {
        const fullRowHtml = row.innerHTML;
        const vlMatch = fullRowHtml.match(/\b(VL[0-9]{8,})\b/i);
        if (vlMatch) {
          classId = vlMatch[1];
        }
      }

      if (code && title) {
        courses.push({
          classId: classId || `${code}_${col0}`,
          code,
          title,
          type,
          faculty,
        });
      }
    }
  });

  return courses;
};

export const parseDAAssignments = (html: string): DAAssignment[] => {
  const doc = parseHTMLFast(html);
  const tables = Array.from(doc.querySelectorAll("table"));
  if (tables.length === 0) return [];

  // Find table containing assignments (has Title, Due Date, Weightage, Max Mark, etc.)
  let table =
    tables.find((t) => {
      const txt = t.textContent?.toLowerCase() || "";
      return (
        txt.includes("title") ||
        txt.includes("due date") ||
        txt.includes("weightage") ||
        txt.includes("assignment") ||
        txt.includes("max mark")
      );
    }) || tables[tables.length - 1]; // Fallback to last table

  const assignments: DAAssignment[] = [];
  const rows = Array.from(table.querySelectorAll("tr"));

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td"));
    if (cells.length >= 5) {
      const col0 = cells[0]?.textContent?.trim() || "";
      // Skip header rows
      if (
        col0.toLowerCase().includes("sl") ||
        col0.toLowerCase().includes("s.no")
      ) {
        return;
      }

      const slNo = col0;
      const title = cells[1]?.textContent?.trim() || "";
      const maxMark = cells[2]?.textContent?.trim() || "";
      const weightage = cells[3]?.textContent?.trim() || "";
      const dueDate = cells[4]?.textContent?.trim() || "";
      const lastUpdated =
        cells[6]?.textContent?.trim() || cells[5]?.textContent?.trim() || "";

      // Check Question Paper (QP) button or link in cell 5 or anywhere in the row
      const qpElem = row.querySelector(
        "[onclick*='downloadQuestion'], [onclick*='doDownloadQuestion'], [data-code]",
      );
      const qpCell = cells[5];
      const hasQP = Boolean(
        qpElem ||
          (qpCell &&
            qpCell.querySelector("button, a") &&
            !qpCell.textContent?.includes("-")),
      );

      // Extract assignment code (e.g. AST01, AST02, DA01, CS1, EXP01)
      let code = "";

      // 1. From dataset attributes
      const editBtn = row.querySelector(
        "[data-editcode], [data-subcode], [data-code]",
      );
      if (editBtn) {
        code =
          editBtn.getAttribute("data-editcode") ||
          editBtn.getAttribute("data-subcode") ||
          editBtn.getAttribute("data-code") ||
          "";
      }

      // 2. From hidden inputs
      if (!code) {
        const hiddenInputs = Array.from(
          row.querySelectorAll("input[type='hidden']"),
        );
        for (const input of hiddenInputs) {
          const name = input.getAttribute("name") || "";
          const val = input.getAttribute("value") || "";
          if (
            ["code", "mCode", "code1", "assignmentCode"].includes(name) &&
            val
          ) {
            code = val;
            break;
          }
        }
      }

      // 3. From onclick strings (e.g., doDownloadQuestion('AST01', ...) or downloadSTudentDA('AST01', ...))
      if (!code) {
        const rowHtml = row.innerHTML;
        const fnMatch = rowHtml.match(
          /(?:doDownloadQuestion|downloadSTudentDA|doDAssignmentProcess|myFunction|doEdit)\s*\(\s*['"]([A-Za-z0-9_]+)['"]/i,
        );
        if (fnMatch && fnMatch[1]) {
          code = fnMatch[1];
        }
      }

      // 4. Fallback code from title pattern or slNo
      if (!code && title) {
        const match = title.match(
          /\b([A-Z]{2,4}\d{1,2}|CS\d|AST\d|DA\d|EXP\d)\b/i,
        );
        if (match) code = match[1].toUpperCase();
      }
      if (!code && slNo && !isNaN(parseInt(slNo, 10))) {
        code = `AST0${slNo}`;
      }

      if (title && (maxMark || dueDate || weightage)) {
        assignments.push({
          slNo,
          title,
          maxMark,
          weightage,
          dueDate,
          lastUpdated:
            lastUpdated.includes("/") || lastUpdated.includes("-")
              ? lastUpdated
              : "",
          code: code || `AST01`,
          hasQP,
        });
      }
    }
  });

  return assignments;
};
