import { CurriculumCategory, CurriculumCourse } from "../types/vtop";

export function parseCurriculumDashboard(html: string): {
  totalCredits: string;
  categories: CurriculumCategory[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

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
        const clean = raw
          .replace(/Credit:\s*[\d.]+/gi, "")
          .replace(/Max\.\s*Credit:\s*[\d.]+/gi, "")
          .replace(id, "");
        title = clean.replace(/\s+/g, " ").trim();
      }

      title = title.replace(/^[-:]+/, "").trim();

      const textContent = el.textContent || "";
      const creditMatch = textContent.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      let credits = "0";
      let maxCredits = "0";

      if (creditMatch) {
        credits = creditMatch[1];
        maxCredits = creditMatch[2];
      } else {
        const numbers = textContent.match(/[\d.]+/g);
        if (numbers && numbers.length >= 2) {
          credits = numbers[0];
          maxCredits = numbers[1];
        }
      }

      categories.push({
        id,
        title: title || id,
        credits,
        maxCredits,
        isCompleted: parseFloat(credits) >= parseFloat(maxCredits),
      });
    }
  });

  return { totalCredits, categories };
}

export function parseCurriculumCategoryTable(html: string): { courses: CurriculumCourse[], basketMaxCredits: Record<string, string> } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  const basketMap: Record<string, string> = {};
  const basketMaxCredits: Record<string, string> = {};
  
  const navButtons = doc.querySelectorAll(".nav-tabs button");
  navButtons.forEach(btn => {
    const target = btn.getAttribute("data-bs-target") || "";
    const name = btn.textContent?.trim() || "";
    if (target && name) {
      basketMap[target.replace("#", "")] = name;
    }
  });

  const tabPanes = doc.querySelectorAll(".tab-pane");
  tabPanes.forEach(pane => {
    if (pane.id && basketMap[pane.id]) {
      const basket = basketMap[pane.id];
      const text = pane.textContent || "";
      const match = text.match(/Maximum Basket Credits Allowed\s*:\s*([\d.]+)/i);
      if (match) {
        basketMaxCredits[basket] = match[1];
      }
    }
  });

  const rows = doc.querySelectorAll("table tbody tr");
  const courses: CurriculumCourse[] = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 5) return;

    let codeIndex = -1;
    for (let i = 0; i < cells.length; i++) {
      if (/^[A-Z]{3,4}\d{3}[A-Z0-9]*$/.test(cells[i].innerText.trim())) {
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
        // If we couldn't find the pane but there are multiple tabs, default to the first one as a fallback
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

  return { courses, basketMaxCredits };
}
