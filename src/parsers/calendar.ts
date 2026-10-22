import { CalendarMonthPreview, CalendarEvent, ClassGroup } from "../types/vtop";
import { normalizeSemesterLabel } from "../utils/formatting";
import { parseHTMLFast, validateParsed, wrapWithSchemaVersion, Versioned, findSemesterOptions } from "../utils/parser-utils";

export const CALENDAR_SCHEMA_VERSION = 1;

export function parseCalendarSemesters(
  html: string,
): { id: string; label: string; selected?: boolean }[] {
  if (!html) return [];
  const doc = parseHTMLFast(html);
  const options = findSemesterOptions(doc);

  return options.map((opt) => {
    const val = opt.getAttribute("value") || (opt as HTMLOptionElement).value || opt.textContent?.trim() || "";
    return {
      id: val,
      label: normalizeSemesterLabel(opt.textContent || val),
      selected: opt.hasAttribute("selected") || (opt as HTMLOptionElement).selected,
    };
  });
}

// Combined parser for Step 2: Extracts both the Class Groups and the Month Buttons
export function parseCalendarGroupsAndMonths(html: string): {
  groups: ClassGroup[];
  months: CalendarMonthPreview[];
} {
  if (!html) return { groups: [], months: [] };
  const doc = parseHTMLFast(html);

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

  return wrapWithSchemaVersion({ groups, months }, "calendar");
}

// Step 3: Extracts the actual calendar grid for the selected month
export function parseCalendarDays(
  html: string,
  monthLabel: string,
): Versioned<CalendarEvent[]> {
  if (!html) return validateParsed([], "calendar");
  // VTOP HTML anomalies check
  const cleanHtml = html.replace(/<</g, "<");
  const doc = parseHTMLFast(cleanHtml);

  const cells = doc.querySelectorAll(
    "table.calendar-table tbody td, table tbody td",
  );
  const days: CalendarEvent[] = [];

  cells.forEach((cell) => {
    const spans = cell.querySelectorAll("span");
    if (spans.length === 0) return;

    const dayNumber = spans[0]?.textContent?.trim() || "";
    if (!dayNumber || isNaN(parseInt(dayNumber))) return;

    // Extract all text content except the day number, ignoring extra whitespaces/newlines
    let rawText = (cell.textContent || "").trim();
    // Replace all whitespaces/newlines with a single space
    rawText = rawText.replace(/\s+/g, " ");
    // Remove the day number if it appears at the start
    let info = rawText;
    if (info.startsWith(dayNumber)) {
      info = info.substring(dayNumber.length).trim();
    }

    const subInfo = "";
    const lowerInfo = info.toLowerCase();

    // Status heuristics based on standard VTOP nomenclature
    const isHoliday =
      lowerInfo.includes("holiday") || lowerInfo.includes("sunday");
    const isInstructional = lowerInfo.includes("instructional");
    const isExam =
      lowerInfo.includes("exam") ||
      lowerInfo.includes("fat") ||
      lowerInfo.includes("cat");

    // Clean month label for strict parsers like Firefox ("July - 2026" -> "July 2026")
    const safeMonthLabel = monthLabel.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const dateObj = new Date(`${dayNumber} ${safeMonthLabel}`);

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

  return validateParsed(days, "calendar");
}
