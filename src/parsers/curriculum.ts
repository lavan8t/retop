import { CurriculumCategory, CurriculumCourse } from "../types/vtop";
import { parseHTMLFast, validateParsed, wrapWithSchemaVersion, Versioned } from "../utils/parser-utils";
import { CurriculumDashboardSchema } from "../schemas";

export const CURRICULUM_SCHEMA_VERSION = 1;

export function parseCurriculumDashboard(html: string): Versioned<{
  totalCredits: string;
  categories: CurriculumCategory[];
}> {
  const doc = parseHTMLFast(html);

  let totalCredits = "0";
  const allElements = doc.body.getElementsByTagName("*");
  for (let i = 0; i < allElements.length; i++) {
    const text = allElements[i].textContent || "";
    if (text.includes("Total Credits")) {
      const match = text.match(/Total Credits\s*[:=-]?\s*([\d.]+)/i);
      if (match) {
        totalCredits = match[1];
        break;
      }
    }
  }

  const categories: CurriculumCategory[] = [];
  const clickables = doc.querySelectorAll("[onclick]");

  clickables.forEach((el) => {
    const onclick = el.getAttribute("onclick") || "";
    const idMatch = onclick.match(/['"]([A-Z]{2,4})['"]/);

    if (idMatch) {
      const id = idMatch[1];
      if (categories.find((c) => c.id === id)) return;

      let title = id;
      const titleEl =
        el.querySelector(".col-6 span") || el.querySelector(".text-left");
      if (titleEl && titleEl.textContent) {
        title = titleEl.textContent.trim();
      } else {
        const raw = el.textContent || "";
        const lines = raw
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length > 0) {
          title = lines[0];
        }
      }

      let credits = "0";
      let maxCredits = "0";
      const creditsContainer = el.querySelectorAll(".col-6, .text-right, span");

      creditsContainer.forEach((c) => {
        const text = c.textContent || "";
        const m = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
        if (m) {
          credits = m[1];
          maxCredits = m[2];
        }
      });

      const isCompleted =
        parseFloat(credits) >= parseFloat(maxCredits) &&
        parseFloat(maxCredits) > 0;

      categories.push({
        id,
        title,
        credits,
        maxCredits,
        isCompleted,
      });
    }
  });

  return validateParsed(CurriculumDashboardSchema, {
    totalCredits,
    categories,
  }, "curriculum");
}

export function parseCurriculumCourses(html: string): Versioned<{
  courses: CurriculumCourse[];
  basketMaxCredits: Record<string, string>;
}> {
  const doc = parseHTMLFast(html);
  const courses: CurriculumCourse[] = [];
  const basketMaxCredits: Record<string, string> = {};

  const navButtons = doc.querySelectorAll('.nav-pills button, .nav-tabs button, .nav-pills a, .nav-tabs a');
  const basketMap: Record<string, string> = {};

  navButtons.forEach(btn => {
    const target = btn.getAttribute('data-bs-target') || btn.getAttribute('href') || '';
    const cleanTarget = target.replace('#', '').trim();
    const btnText = btn.textContent?.trim() || '';
    if (cleanTarget && btnText) {
      basketMap[cleanTarget] = btnText;
    }
  });

  const headers = doc.querySelectorAll('h4, h5, h6, .card-header, strong, b');
  headers.forEach(h => {
    const text = h.textContent || '';
    const match = text.match(/([A-Za-z\s]+)\s*-\s*(\d+)\s*Credits/i);
    if (match) {
      const basketName = match[1].trim();
      const credits = match[2].trim();
      basketMaxCredits[basketName] = credits;
    }
  });

  const rows = doc.querySelectorAll('table tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 5) return;

    let codeIndex = -1;
    for (let i = 0; i < cells.length; i++) {
      const txt = cells[i].textContent?.trim() || "";
      if (/^[A-Z]{3,4}\d{3,4}[A-Z]?$/.test(txt) || /^[A-Z]{2,4}\d{2,4}$/.test(txt)) {
        codeIndex = i;
        break;
      }
    }

    let basket = "Core";
    let currentPane = row.closest('.tab-pane');
    while (currentPane) {
      if (currentPane.id && basketMap[currentPane.id]) {
        basket = basketMap[currentPane.id];
        break;
      }
      currentPane = currentPane.parentElement?.closest('.tab-pane') || null;
    }

    if (basket === "Core") {
      if (navButtons.length === 1) {
        basket = navButtons[0].textContent?.trim() || "Core";
      } else if (navButtons.length > 1) {
        basket = navButtons[0].textContent?.trim() || "Core";
      }
    }

    if (codeIndex !== -1) {
      courses.push({
        sl: cells[0]?.textContent?.trim() || "",
        code: cells[codeIndex]?.textContent?.trim() || "",
        title: cells[codeIndex + 1]?.textContent?.trim() || "",
        type: cells[codeIndex + 2]?.textContent?.trim() || "TH",
        credits: cells[codeIndex + 3]?.textContent?.trim() || "0",
        l: cells[codeIndex + 4]?.textContent?.trim() || "0",
        t: cells[codeIndex + 5]?.textContent?.trim() || "0",
        p: cells[codeIndex + 6]?.textContent?.trim() || "0",
        j: cells[codeIndex + 7]?.textContent?.trim() || "0",
        basket: basket,
        isCompleted: row.getAttribute("style")?.toLowerCase().includes("background") || 
                     row.className.toLowerCase().includes("success") || 
                     Array.from(cells).some(c => c.textContent?.toLowerCase().includes("completed"))
      });
    }
  });

  return wrapWithSchemaVersion({ courses, basketMaxCredits }, "curriculum");
}

export const parseCurriculumCategoryTable = parseCurriculumCourses;
