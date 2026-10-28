export interface ExamEntry {
  slNo: string;
  courseCode: string;
  courseTitle: string;
  courseType: string;
  classId: string;
  slot: string;
  examDate: string;
  examSession: string;
  reportingTime: string;
  examTime: string;
  venue: string;
  seatLocation: string;
  seatNo: string;
}

export interface ExamGroup {
  examType: string; // FAT, CAT1, CAT2, etc.
  entries: ExamEntry[];
}

export function isSameDayExam(examDateStr: string, targetDate: Date): boolean {
  if (!examDateStr) return false;

  const cleanStr = examDateStr.replace(/[-/.]/g, ' ').trim();
  const directDate = new Date(cleanStr);
  if (!isNaN(directDate.getTime())) {
    return (
      directDate.getFullYear() === targetDate.getFullYear() &&
      directDate.getMonth() === targetDate.getMonth() &&
      directDate.getDate() === targetDate.getDate()
    );
  }

  const parts = cleanStr.split(/\s+/);
  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10);
    let year = parseInt(parts[2], 10);
    let monthStr = parts[1].toLowerCase();

    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      day = parseInt(parts[2], 10);
      monthStr = parts[1].toLowerCase();
    }

    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ];
    let monthIndex = months.indexOf(monthStr.slice(0, 3));
    if (monthIndex === -1 && !isNaN(parseInt(monthStr, 10))) {
      monthIndex = parseInt(monthStr, 10) - 1;
    }

    if (!isNaN(day) && monthIndex !== -1 && !isNaN(year)) {
      return (
        year === targetDate.getFullYear() &&
        monthIndex === targetDate.getMonth() &&
        day === targetDate.getDate()
      );
    }
  }

  return false;
}

import {
  parseHTMLFast,
  validateParsed,
  wrapWithSchemaVersion,
  Versioned,
  findSemesterOptions,
} from '../utils/parser-utils';

export const EXAM_SCHEDULE_SCHEMA_VERSION = 1;

export function parseExamSemesters(
  html: string,
): { id: string; label: string }[] {
  const doc = parseHTMLFast(html);
  const options = findSemesterOptions(doc);

  const semesters: { id: string; label: string }[] = [];

  options.forEach((opt) => {
    const value =
      opt.getAttribute('value') ||
      (opt as HTMLOptionElement).value ||
      opt.textContent?.trim() ||
      '';
    if (value && value.trim() !== '') {
      semesters.push({
        id: value,
        label: opt.textContent?.trim() || value,
      });
    }
  });

  return semesters;
}

export function parseExamSchedule(html: string): Versioned<ExamGroup[]> {
  const { groups } = parseExamScheduleData(html);
  return groups;
}

export function parseExamScheduleData(html: string): {
  groups: Versioned<ExamGroup[]>;
  reportingNote: string;
} {
  const doc = parseHTMLFast(html);

  // Extract reporting note
  let reportingNote = '';
  const spans = doc.querySelectorAll('span');
  spans.forEach((span) => {
    const text = span.textContent?.trim() || '';
    if (text.includes('Exam') && text.includes('Reporting Time')) {
      reportingNote = text;
    }
  });

  const table = doc.querySelector('.customTable, table');
  if (!table) {
    return wrapWithSchemaVersion(
      { groups: validateParsed([], 'examSchedule'), reportingNote },
      'examSchedule',
    );
  }

  const rows = table.querySelectorAll('tr');
  const groups: ExamGroup[] = [];
  let currentGroup: ExamGroup | null = null;

  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return;

    // Skip header rows (class="tableHeader")
    if (row.classList.contains('tableHeader')) return;

    // Check if this is a group header (single cell with colspan spanning all columns)
    const firstCell = cells[0];
    const colspan = parseInt(firstCell.getAttribute('colspan') || '1');

    if (colspan >= 10 && cells.length === 1) {
      // This is a group header like "FAT", "CAT1", "CAT2"
      const examType = firstCell.textContent?.trim() || '';
      if (examType) {
        currentGroup = { examType, entries: [] };
        groups.push(currentGroup);
      }
      return;
    }

    // Check for panelHead-secondary class (group separator)
    if (firstCell.classList.contains('panelHead-secondary')) {
      const examType = firstCell.textContent?.trim() || '';
      if (examType) {
        currentGroup = { examType, entries: [] };
        groups.push(currentGroup);
      }
      return;
    }

    // Regular data row - needs 13 cells (or at least 10+)
    if (cells.length >= 10 && currentGroup) {
      const getText = (cell: Element) => cell.textContent?.trim() || '';

      const entry: ExamEntry = {
        slNo: getText(cells[0]),
        courseCode: getText(cells[1]),
        courseTitle: getText(cells[2]),
        courseType: getText(cells[3]),
        classId: getText(cells[4]),
        slot: getText(cells[5]),
        examDate: getText(cells[6]),
        examSession: getText(cells[7]),
        reportingTime: getText(cells[8]),
        examTime: getText(cells[9]),
        venue: cells[10] ? getText(cells[10]) : '',
        seatLocation: cells[11] ? getText(cells[11]) : '',
        seatNo: cells[12] ? getText(cells[12]) : '',
      };

      // Filter out rows that look like sub-headers or empty
      if (entry.courseCode && entry.examDate) {
        currentGroup.entries.push(entry);
      }
    }
  });

  const validatedGroups = validateParsed(groups, 'examSchedule');
  return wrapWithSchemaVersion(
    { groups: validatedGroups, reportingNote },
    'examSchedule',
  );
}
