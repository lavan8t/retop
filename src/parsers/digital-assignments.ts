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
  code: string; // The editCode (e.g., 'CS1')
}

export const parseDASemesters = (html: string): { id: string; label: string }[] => {
  const doc = new DOMParser().parseFromString(html, "text/html");
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
  const doc = new DOMParser().parseFromString(html, "text/html");
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
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = doc.querySelectorAll(".customTable");
  // Assignments are usually in the second table.
  let table = tables[1];
  if (!table) {
    // If only one table, it might be the assignments table if first table was missing for some reason.
    // Check if it has Sl.No. and Title
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
      const lastUpdated = cells[6].textContent?.trim() || "";
      
      // Look for the editCode from the button dataset
      const btn = cells[7].querySelector("button[name='editAssignment']");
      const code = btn ? (btn.getAttribute("data-editcode") || "") : "";

      assignments.push({
        slNo,
        title,
        maxMark,
        weightage,
        dueDate,
        lastUpdated,
        code
      });
    }
  });

  return assignments;
};
