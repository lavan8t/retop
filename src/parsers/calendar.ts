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

  // 1. Extract Class Groups
  const groupSelect = doc.getElementById("classGroupId") as HTMLSelectElement;
  const groups: ClassGroup[] = groupSelect
    ? Array.from(groupSelect.options)
        .filter((opt) => opt.value)
        .map((opt) => ({
          id: opt.value,
          label: opt.textContent?.trim() || opt.value,
        }))
    : [];

  // 2. Extract Month Buttons
  const buttons = doc.querySelectorAll(
    "button.btn-primary, button.btn-success, button.btn-info, button.btn-warning",
  );
  const months: CalendarMonthPreview[] = [];

  buttons.forEach((btn) => {
    const label = btn.textContent?.trim() || "";
    // Extract '01-May-2026' from onclick="javascript:processViewCalendar('01-May-2026')"
    const onclickAttr = btn.getAttribute("onclick") || "";
    const match = onclickAttr.match(/'([^']+)'/);

    if (label && match && match[1]) {
      months.push({ label, dateString: match[1] });
    }
  });

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

  const cells = doc.querySelectorAll("table tbody td");
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
