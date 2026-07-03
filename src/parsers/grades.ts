import { GradesSemester, GradeCourse, GradeAssessment, GradesData } from "../types/vtop";

export function parseGradesSemesters(html: string): GradesSemester[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const select = doc.getElementById("semesterSubId") as HTMLSelectElement;
  if (!select) return [];

  const semesters: GradesSemester[] = [];
  const options = select.querySelectorAll("option");
  options.forEach((opt) => {
    const val = opt.value;
    if (val) {
      semesters.push({ id: val, name: opt.textContent?.trim() || "" });
    }
  });

  return semesters;
}

export function parseGrades(html: string): GradesData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const courses: GradeCourse[] = [];
  let gpa = "";

  // GPA is at the bottom, look for "GPA : "
  const gpaSpan = doc.evaluate(
    "//span[contains(text(), 'GPA :')]",
    doc,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
  if (gpaSpan && gpaSpan.textContent) {
    gpa = gpaSpan.textContent.replace("GPA :", "").trim();
  }

  // The main table has header row with background-color: #3c8dbc
  // and data rows that either have no background or #C0D8C0.
  const rows = doc.querySelectorAll("table.table-hover tr");

  rows.forEach((row) => {
    // skip header rows
    if (row.getAttribute("style")?.includes("background-color: #3c8dbc")) return;
    if (row.querySelector("th")) return;

    // A course row has 12 columns
    const cells = row.querySelectorAll("td");
    if (cells.length < 12) return;
    
    // Sometimes there are nested tables for details, their cells are inside other trs.
    // Ensure this is a main course row.
    if (cells[0].textContent?.trim().match(/^\d+$/)) {
      const code = cells[1].textContent?.trim() || "";
      const title = cells[2].textContent?.trim() || "";
      const type = cells[3].textContent?.trim() || "";
      const l = cells[4].textContent?.trim() || "";
      const p = cells[5].textContent?.trim() || "";
      const j = cells[6].textContent?.trim() || "";
      const c = cells[7].textContent?.trim() || "";
      const gradingType = cells[8].textContent?.trim() || "";
      const grandTotal = cells[9].textContent?.trim() || "";
      const grade = cells[10].textContent?.trim() || "";

      // Button onclick looks like: javascript:getGradeViewDetails('VL_BCSE203E_00001');
      let courseId = "";
      const btn = cells[11].querySelector("button");
      if (btn) {
        const onclick = btn.getAttribute("onclick") || "";
        const match = onclick.match(/'(.*?)'/);
        if (match) {
          courseId = match[1];
        }
      }

      const notIncludedInGpa = row.getAttribute("style")?.includes("#C0D8C0") || false;

      courses.push({
        code,
        title,
        type,
        credits: "", // unused directly now, or could compute
        l, p, j, c,
        gradingType,
        grandTotal,
        grade,
        courseId,
        notIncludedInGpa
      });
    }
  });

  return { gpa, courses };
}

export function parseGradeDetails(html: string): Partial<GradeCourse> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  const result: Partial<GradeCourse> = {};

  // Find the two inner tables
  const innerTables = doc.querySelectorAll("table.table-striped");
  if (innerTables.length >= 2) {
    // 1. Stats Table
    const statsTable = innerTables[0];
    const statsRows = statsTable.querySelectorAll("tr");
    if (statsRows.length >= 3) {
      const dataCells = statsRows[2].querySelectorAll("td");
      if (dataCells.length >= 11) {
        result.classStrength = dataCells[0].textContent?.trim() || "";
        result.gradingStrength = dataCells[1].textContent?.trim() || "";
        result.mean = dataCells[2].textContent?.trim() || "";
        result.sd = dataCells[3].textContent?.trim() || "";
        
        result.gradesRange = {
          S: dataCells[4].textContent?.trim() || "",
          A: dataCells[5].textContent?.trim() || "",
          B: dataCells[6].textContent?.trim() || "",
          C: dataCells[7].textContent?.trim() || "",
          D: dataCells[8].textContent?.trim() || "",
          E: dataCells[9].textContent?.trim() || "",
          F: dataCells[10].textContent?.trim() || "",
        };
      }
    }

    // 2. Assessments Table
    const assTable = innerTables[1];
    const assRows = assTable.querySelectorAll("tr");
    const assessments: GradeAssessment[] = [];

    assRows.forEach(row => {
      // skip headers (which have th)
      if (row.querySelector("th")) return;
      const cells = row.querySelectorAll("td");
      if (cells.length >= 7) {
        assessments.push({
          title: cells[1].textContent?.trim() || "",
          maxMark: cells[2].textContent?.trim() || "",
          weightage: cells[3].textContent?.trim() || "",
          status: cells[4].textContent?.trim() || "",
          scoredMark: cells[5].textContent?.trim() || "",
          weightageMark: cells[6].textContent?.trim() || ""
        });
      }
    });
    result.assessments = assessments;
  }

  return result;
}

export function parseGradeHistory(html: string): import("../types/vtop").GradeHistoryData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const data: import("../types/vtop").GradeHistoryData = {
    courses: [],
    cgpa: null,
    curriculum: [],
    baskets: [],
  };

  // 1. Effective Grades table
  // Look for the table that has "Effective Grades" in its header
  const tables = doc.querySelectorAll("table");
  
  const effectiveGradesTable = Array.from(tables).find((t) => (t.textContent || "").includes("Effective Grades"));
  const curriculumTable = Array.from(tables).find((t) => (t.textContent || "").includes("Curriculum Details"));
  const basketTable = Array.from(tables).find((t) => (t.textContent || "").includes("Basket Details"));

  if (effectiveGradesTable) {
    const rows = effectiveGradesTable.querySelectorAll("tr.tableContent");
    rows.forEach((row: Element) => {
      // Check if it's a main course row or a detail row
      if (row.id && row.id.startsWith("detailsView_")) {
        // It's a details row, we parse it and attach to the previous course
        const detailRows = row.querySelectorAll("tr.tableContent-level1");
        const details: import("../types/vtop").GradeHistoryCourseDetail[] = [];
        detailRows.forEach((dr: Element) => {
          const cells = dr.querySelectorAll("td");
          if (cells.length >= 7) {
            details.push({
              code: cells[0].textContent?.trim() || "",
              title: cells[1].textContent?.trim() || "",
              type: cells[2].textContent?.trim() || "",
              credits: cells[3].textContent?.trim() || "",
              grade: cells[4].textContent?.trim() || "",
              examMonth: cells[5].textContent?.trim() || "",
              resultDeclared: cells[6].textContent?.trim() || "",
            });
          }
        });
        if (data.courses.length > 0) {
          data.courses[data.courses.length - 1].details = details;
        }
      } else {
        // Main row
        const cells = row.querySelectorAll("td");
        if (cells.length >= 10) {
          data.courses.push({
            slNo: cells[0].textContent?.trim() || "",
            code: cells[1].textContent?.trim() || "",
            title: cells[2].textContent?.trim() || "",
            type: cells[3].textContent?.trim() || "",
            credits: cells[4].textContent?.trim() || "",
            grade: cells[5].textContent?.trim() || "",
            examMonth: cells[6].textContent?.trim() || "",
            resultDeclared: cells[7].textContent?.trim() || "",
            courseDistribution: cells[8].textContent?.trim() || "",
          });
        }
      }
    });
  }

  // 2. Curriculum Details
  if (curriculumTable) {
    const rows = curriculumTable.querySelectorAll("tr.tableContent, tr.fixedContent");
    rows.forEach((row: Element) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 3) {
        data.curriculum.push({
          title: cells[0].textContent?.replace(/\(.*\)/g, "").trim() || "", // remove "( Not mandatory...)" text
          required: cells[1].textContent?.trim() || "",
          earned: cells[2].textContent?.trim() || "",
        });
      }
    });
  }

  // 3. Basket Details
  if (basketTable) {
    const rows = basketTable.querySelectorAll("tr.tableContent");
    rows.forEach((row: Element) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 4) {
        data.baskets.push({
          title: cells[0].textContent?.trim() || "",
          distributionType: cells[1].textContent?.trim() || "",
          required: cells[2].textContent?.trim() || "",
          earned: cells[3].textContent?.trim() || "",
        });
      }
    });
  }

  // 4. CGPA Details
  // table inside <div class="box-header"> -> CGPA Details
  const cgpaHeader = doc.evaluate(
    "//h3[contains(text(), 'CGPA Details')]",
    doc,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
  if (cgpaHeader) {
    const table = cgpaHeader.parentElement?.nextElementSibling?.querySelector("table");
    if (table) {
      const row = table.querySelector("tbody tr");
      if (row) {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 11) {
          data.cgpa = {
            creditsRegistered: cells[0].textContent?.trim() || "",
            creditsEarned: cells[1].textContent?.trim() || "",
            cgpa: cells[2].textContent?.trim() || "",
            s: cells[3].textContent?.trim() || "",
            a: cells[4].textContent?.trim() || "",
            b: cells[5].textContent?.trim() || "",
            c: cells[6].textContent?.trim() || "",
            d: cells[7].textContent?.trim() || "",
            e: cells[8].textContent?.trim() || "",
            f: cells[9].textContent?.trim() || "",
            n: cells[10].textContent?.trim() || "",
          };
        }
      }
    }
  }

  return data;
}
