import { Semester, TimetableCourse } from '../types/vtop';
import {
  parseHTMLFast,
  validateParsed,
  Versioned,
  findSemesterOptions,
} from '../utils/parser-utils';

export const TIMETABLE_SCHEMA_VERSION = 1;

export function parseSemesters(html: string): Semester[] {
  const doc = parseHTMLFast(html);
  const options = findSemesterOptions(doc);

  const semesters: Semester[] = [];
  options.forEach((opt) => {
    const val =
      opt.getAttribute('value') ||
      (opt as HTMLOptionElement).value ||
      opt.textContent?.trim() ||
      '';
    const txt = opt.textContent?.trim() || '';
    if (val && val.trim() !== '') {
      const isSelected =
        opt.hasAttribute('selected') || (opt as HTMLOptionElement).selected;
      semesters.push({
        id: val,
        label: txt,
        isLatest: isSelected,
      });
    }
  });

  if (semesters.length > 0 && !semesters.some((s) => s.isLatest)) {
    semesters[0].isLatest = true;
  }
  return semesters;
}

export function parseTimetable(html: string): Versioned<TimetableCourse[]> {
  const doc = parseHTMLFast(html);

  const courses: TimetableCourse[] = [];

  // Safely find the registered courses table by locating its unique column header.
  // This absolutely guarantees we never accidentally parse the visual timetable grid.
  const headers = Array.from(doc.querySelectorAll('th'));
  const classGroupHeader = headers.find((th) =>
    th.textContent?.includes('Class Group'),
  );

  if (!classGroupHeader) return validateParsed(courses, 'timetable');

  const courseTable = classGroupHeader.closest('table');
  if (!courseTable) return validateParsed(courses, 'timetable');

  const rows = courseTable.querySelectorAll('tr');

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'));

    // Standard VTOP registered course rows have at least 12 columns.
    if (cells.length < 12) return;

    // Safely extract and clean text content
    const getText = (index: number) => {
      const raw = cells[index]?.textContent || '';
      return raw
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Col 2: Course Details
    const rawCourse = getText(2);
    let code = '',
      title = '',
      type = 'Theory';

    // Matches structures like "BCSE103E - Computer Programming: Java ( Embedded Theory )"
    const courseMatch = rawCourse.match(
      /^([a-zA-Z0-9]+)\s*-\s*(.+?)\s*\(\s*(.+?)\s*\)$/i,
    );
    if (courseMatch) {
      code = courseMatch[1].trim();
      title = courseMatch[2].trim();
      type = courseMatch[3].trim();
    } else {
      // Fallback for courses without the parenthetical type
      const fallbackMatch = rawCourse.match(/^([a-zA-Z0-9]+)\s*-\s*(.+)$/i);
      if (fallbackMatch) {
        code = fallbackMatch[1].trim();
        title = fallbackMatch[2].trim();
      } else {
        return; // Not a valid course string
      }
    }

    // Col 3: Credits
    const rawCredits = getText(3);
    const credits = rawCredits.split(' ').pop() || '0';

    // Col 4: Category
    const category = getText(4);

    // Col 6: Class ID
    const classId = getText(6);

    // Col 7: Slot / Venue (e.g. "TG1 - PRP332" or "NIL - NIL")
    const rawSlotVenue = getText(7);
    let slot = 'N/A',
      venue = 'N/A';
    const svParts = rawSlotVenue.split('-');

    if (svParts.length >= 2) {
      slot = svParts[0].trim();
      const rawVenue = svParts.slice(1).join('-').trim();
      venue = rawVenue.replace(/NIL/gi, '').trim() || 'N/A'; // Clean out 'NIL' venues
    } else {
      slot = rawSlotVenue;
    }

    // Col 8: Faculty Details
    const rawFaculty = getText(8);
    const faculty = rawFaculty.split('-')[0].trim();

    // Col 11: Status
    const status = getText(11);

    // Filter out dropped/withdrawn courses
    if (
      status.toUpperCase().includes('DROP') ||
      status.toUpperCase().includes('WITHDRAWN')
    ) {
      return;
    }

    courses.push({
      code,
      title,
      type,
      credits,
      category,
      slot,
      venue,
      faculty,
      classId,
      status,
    });
  });

  return validateParsed(courses, 'timetable');
}
