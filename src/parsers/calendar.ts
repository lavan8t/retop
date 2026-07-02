import { CalendarMonthPreview, CalendarEvent, ClassGroup } from "../types/vtop";
import { normalizeSemesterLabel } from "../utils/formatting";

export function parseCalendarSemesters(
  html: string,
): { id: string; label: string }[] {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const select = doc.getElementById("semesterSubId") as HTMLSelectElement;
  if (!select) return [];

  return Array.from(select.options)
    .filter((opt) => opt.value)
    .map((opt) => ({
      id: opt.value,
      label: normalizeSemesterLabel(opt.textContent || opt.value),
      selected: opt.selected,
    }));
}

// Combined parser for Step 2: Extracts both the Class Groups and the Month Buttons
export function parseCalendarGroupsAndMonths(html: string): {
  groups: ClassGroup[];
  months: CalendarMonthPreview[];
} {
  if (!html) return { groups: [], months: [] };
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Extract Class Groups
  const groupSelect = doc.getElementById("classGroupId") as HTMLSelectElement;
  let groups: ClassGroup[] = groupSelect
    ? Array.from(groupSelect.options)
        .filter((opt) => opt.value)
        .map((opt) => ({
          id: opt.value,
          label: opt.textContent?.trim() || opt.value,
        }))
    : [];

  // Extract Month Buttons via DOM for automatic HTML entity decoding (e.g. &#39;)
  const buttons = doc.querySelectorAll("[onclick*='processViewCalendar']");
  const months: CalendarMonthPreview[] = [];
  const seen = new Set<string>();

  buttons.forEach((btn) => {
    const onclickAttr = btn.getAttribute("onclick") || "";
    const match = onclickAttr.match(/'([^']+)'/);

    if (match && match[1]) {
      const dateString = match[1];
      if (!seen.has(dateString)) {
        seen.add(dateString);
        // Extract label from date string (e.g., "01-JUL-2026" -> "JUL 2026" or use textContent)
        const textLabel = btn.textContent?.trim();
        let label = textLabel;
        if (!label || label.includes("javascript")) {
          const parts = dateString.split("-");
          label = parts.length === 3 ? `${parts[1]} ${parts[2]}` : dateString;
        }
        months.push({ label, dateString });
      }
    }
  });

  // Fallback if classGroupId is missing: find any select with COMB
  if (!groups.length) {
    const selects = Array.from(doc.querySelectorAll("select"));
    const fallbackSelect = selects.find((s) =>
      Array.from(s.options).some((o) => o.value === "COMB" || o.value === "E1"),
    );
    if (fallbackSelect) {
      groups = Array.from(fallbackSelect.options)
        .filter((opt) => opt.value)
        .map((opt) => ({
          id: opt.value,
          label: opt.textContent?.trim() || opt.value,
        }));
    }
  }

  return { groups, months };
}

// Step 3: Extracts the actual calendar grid for the selected month
export function parseCalendarDays(
  html: string,
  monthLabel: string,
): CalendarEvent[] {
  if (!html) return [];
  const parser = new DOMParser();
  // VTOP HTML anomalies check
  const cleanHtml = html.replace(/<</g, "<");
  const doc = parser.parseFromString(cleanHtml, "text/html");

  const cells = doc.querySelectorAll(
    "table.calendar-table tbody td, table tbody td",
  );
  const days: CalendarEvent[] = [];

  cells.forEach((cell) => {
    const spans = cell.querySelectorAll("span");
    if (spans.length === 0) return;

    const dayNumber = spans[0]?.textContent?.trim() || "";
    if (!dayNumber || isNaN(parseInt(dayNumber))) return;

    const info = spans[1]?.textContent?.trim() || "";
    const subInfo = spans[2]?.textContent?.trim() || "";

    const lowerInfo = info.toLowerCase();

    // Status heuristics based on standard VTOP nomenclature
    const isHoliday =
      lowerInfo.includes("holiday") || lowerInfo.includes("sunday");
    const isInstructional = lowerInfo.includes("instructional");
    const isExam =
      lowerInfo.includes("exam") ||
      lowerInfo.includes("fat") ||
      lowerInfo.includes("cat");

    // Build an accurate date object for "TODAY" highlighting in the UI
    const dateObj = new Date(`${dayNumber} ${monthLabel}`);

    days.push({
      dayNumber,
      info,
      subInfo,
      isHoliday,
      isInstructional,
      isExam,
      dateObj,
    });
  });

  return days;
}
