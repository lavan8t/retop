import { parseHTMLFast, validateParsed, Versioned, findSemesterOptions } from "../utils/parser-utils";
import { parseVtopDate } from "../utils/formatting";
import { DACourseListSchema, DAAssignmentListSchema } from "../schemas";

export const DA_SCHEMA_VERSION = 1;

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
  dueDateMs?: number;
  lastUpdated: string;
  code: string; // The assignment code (e.g., 'CS1', 'AST02')
  hasQP?: boolean;
  canUpload?: boolean;
  canDownloadSubmission?: boolean;
}

export const parseDASemesters = (html: string): { id: string; label: string }[] => {
  return findSemesterOptions(parseHTMLFast(html)).map((opt) => {
    const id = opt.getAttribute("value") || (opt as HTMLOptionElement).value || opt.textContent?.trim() || "";
    return { id, label: opt.textContent?.trim() || id };
  });
};

function findTableBy(tables: Element[], test: (txt: string) => boolean, fallback = tables[0]): Element {
  return tables.find((t) => test(t.textContent?.toLowerCase() || "")) ?? fallback;
}

export const parseDACourses = (html: string): Versioned<DACourse[]> => {
  const doc = parseHTMLFast(html);
  const tables = Array.from(doc.querySelectorAll("table"));
  if (tables.length === 0) return validateParsed(DACourseListSchema, [], "digitalAssignments");

  const table = findTableBy(tables, (txt) =>
    (txt.includes("course") && txt.includes("title")) ||
    txt.includes("class nbr") ||
    txt.includes("course code") ||
    txt.includes("faculty"),
  );

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

  return validateParsed(DACourseListSchema, courses, "digitalAssignments");
};

export const parseDAAssignments = (html: string): Versioned<DAAssignment[]> => {
  const doc = parseHTMLFast(html);
  const tables = Array.from(doc.querySelectorAll("table"));
  if (tables.length === 0) return validateParsed(DAAssignmentListSchema, [], "digitalAssignments");

  const table = findTableBy(
    tables,
    (txt) =>
      (txt.includes("title") && (txt.includes("due date") || txt.includes("mark") || txt.includes("weightage"))) ||
      txt.includes("document details") ||
      txt.includes("upload/edit"),
    tables[tables.length - 1],
  );

  const assignments: DAAssignment[] = [];
  const rows = Array.from(table.querySelectorAll("tr"));

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td"));
    if (cells.length >= 6) {
      const col0 = cells[0]?.textContent?.trim() || "";
      // Skip header rows
      if (
        col0.toLowerCase().includes("sl") ||
        col0.toLowerCase().includes("s.no") ||
        col0.toLowerCase().includes("title")
      ) {
        return;
      }

      const slNo = col0;
      const title = cells[1]?.textContent?.trim() || "";
      const maxMark = cells[2]?.textContent?.trim() || "";
      const weightage = cells[3]?.textContent?.trim() || "";
      const dueDate = cells[4]?.textContent?.trim() || "";

      // Document details columns:
      // If 9 columns: cell 5 = QP, cell 6 = Last Updated, cell 7 = Upload/Edit, cell 8 = Download
      // If 8 columns: cell 5 = Last Updated, cell 6 = Upload/Edit, cell 7 = Download
      const hasQpColumn = cells.length >= 9;
      const qpCell = hasQpColumn ? cells[5] : null;
      const lastUpdatedCell = hasQpColumn ? cells[6] : cells[5];

      const lastUpdated = lastUpdatedCell?.textContent?.trim() || "";

      // Check for QP button
      const qpBtn =
        row.querySelector(
          "button[name='downloadQuestion'], button[id='downloadQuestion'], [onclick*='downloadQuestion'], [onclick*='doDownloadQuestion']",
        ) || (qpCell ? qpCell.querySelector("button, a") : null);

      const hasQP = Boolean(
        qpBtn &&
          !qpBtn.textContent?.includes("-") &&
          (qpBtn.getAttribute("data-code") ||
            qpBtn.getAttribute("onclick") ||
            qpCell?.innerHTML.includes("download") ||
            qpCell?.querySelector("button")),
      );

      // Extract assignment code: hidden input → data attribute → onclick regex → title → slNo
      const rowHtml = row.innerHTML;
      const code = (
        (row.querySelector("input[name='code'], input[name='code1'], input[name='mCode'], input[name='assignmentCode']") as HTMLInputElement | null)
          ?.value ||
        row.querySelector("[data-editcode]")?.getAttribute("data-editcode") ||
        row.querySelector("[data-code]")?.getAttribute("data-code") ||
        row.querySelector("[data-subcode]")?.getAttribute("data-subcode") ||
        rowHtml.match(/(?:doDownloadQuestion|downloadSTudentDA|doDAssignmentProcess|myFunction|doEdit)\s*\(\s*['"]([A-Za-z0-9_]+)['"]/i)?.[1] ||
        title.match(/\b([A-Z]{2,4}\d{1,2}|CS\d|AST\d|DA\d|EXP\d)\b/i)?.[1]?.toUpperCase() ||
        (slNo && !isNaN(parseInt(slNo, 10)) ? `AST0${slNo}` : "AST01")
      );

      // Download submission check
      const downloadBtn = row.querySelector(
        "button[name='downloadStudentDA'], button[id='downloadStudentDA'], [onclick*='downloadStudentDA'], [onclick*='downloadSTudentDA']",
      );
      const canDownloadSubmission = Boolean(
        downloadBtn ||
          (lastUpdated &&
            (lastUpdated.includes("/") ||
              lastUpdated.includes("-") ||
              lastUpdated.includes("AM") ||
              lastUpdated.includes("PM"))),
      );

      // Upload/edit check — uploadCell is always defined so was always true; check for editBtn only
      const editBtn = row.querySelector(
        "button[name='editAssignment'], button[id='editAssignment'], [onclick*='doDAssignmentProcess'], button[name='digitalAssignmentSubmit']",
      );
      const canUpload = Boolean(editBtn);

      if (title && (maxMark || dueDate || weightage)) {
        const parsedDate = dueDate ? parseVtopDate(dueDate) : null;
        assignments.push({
          slNo,
          title,
          maxMark,
          weightage,
          dueDate,
          dueDateMs: parsedDate ? parsedDate.getTime() : undefined,
          lastUpdated:
            lastUpdated &&
            (lastUpdated.includes("/") ||
              lastUpdated.includes("-") ||
              lastUpdated.includes("AM") ||
              lastUpdated.includes("PM"))
              ? lastUpdated
              : "",
          code,
          hasQP,
          canUpload,
          canDownloadSubmission,
        });
      }
    }
  });

  return validateParsed(DAAssignmentListSchema, assignments, "digitalAssignments");
};
