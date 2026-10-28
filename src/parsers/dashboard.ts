import { Assignment, CourseSummary } from '../types/vtop';
import {
  parseHTMLFast,
  validateParsed,
  Versioned,
} from '../utils/parser-utils';
import { parseVtopDate } from '../utils/formatting';

export const DASHBOARD_SCHEMA_VERSION = 1;

function stripTags(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export function parseAcademicStats(html: any): Versioned<{
  cgpa: string;
  credits: string;
  totalCredits: string;
  nonGraded: string;
  placement: string;
}> {
  if (html && typeof html === 'object' && !html.nodeType) {
    return validateParsed(html, 'dashboard');
  }
  if (!html || typeof html !== 'string') {
    return validateParsed(
      {
        cgpa: '...',
        credits: '...',
        totalCredits: '...',
        nonGraded: '...',
        placement: '...',
      },
      'dashboard',
    );
  }
  const doc = parseHTMLFast(html);

  const stats = {
    cgpa: '...',
    credits: '...',
    totalCredits: '...',
    nonGraded: '...',
    placement: '...',
  };

  const listItems = doc.querySelectorAll('li');
  listItems.forEach((li) => {
    const text = li.textContent || '';
    const spanVal = li.querySelector('.fontcolor3')?.textContent?.trim() || '';
    if (text.includes('Total Credits Required'))
      stats.totalCredits = spanVal.replace(/\.0$/, '');
    if (text.includes('Earned Credits'))
      stats.credits = spanVal.replace(/\.0$/, '');
    if (text.includes('Current CGPA')) stats.cgpa = spanVal.replace(/\.0$/, '');
    if (text.includes('Non-graded'))
      stats.nonGraded = spanVal.replace(/\.0$/, '');
  });

  const placementTd = doc.querySelector('table td');
  if (placementTd) {
    stats.placement = placementTd.textContent?.trim() || '...';
  }

  return validateParsed(stats, 'dashboard');
}

export function parseProctorMessage(html: string) {
  if (!html || html.includes('No Data')) return 'No new messages.';
  return stripTags(html).replace(/\s+/g, ' ').trim();
}

export function parseDigitalAssignments(html: any): Versioned<Assignment[]> {
  if (Array.isArray(html)) return validateParsed(html, 'dashboard');
  if (
    !html ||
    typeof html !== 'string' ||
    html.includes('No Data') ||
    html.includes('No Records') ||
    html.trim() === ''
  )
    return validateParsed([], 'dashboard');

  // VTOP's HTML sometimes has malformed tags like <<td, so we sanitize it slightly
  const cleanHtml = html.replace(/<</g, '<');
  const doc = parseHTMLFast(cleanHtml);

  // Target rows specifically inside the tbody to avoid the header <tr>
  const rows = doc.querySelectorAll('table tbody tr');
  const assignments: Assignment[] = [];

  rows.forEach((row) => {
    const cols = row.querySelectorAll('td');

    if (cols.length < 3) return;

    const courseName = cols[0]?.textContent?.trim() || '';
    const title = cols[1]?.textContent?.trim() || '';
    const dueDate = cols[2]?.textContent?.trim() || '';

    if (title && dueDate) {
      const parsedDate = parseVtopDate(dueDate);
      assignments.push({
        course: courseName,
        title,
        dueDate,
        dueDateMs: parsedDate ? parsedDate.getTime() : undefined,
      });
    }
  });

  return validateParsed(assignments, 'dashboard');
}

export function parseCourseDetails(html: any): Versioned<CourseSummary[]> {
  if (Array.isArray(html)) return validateParsed(html, 'dashboard');
  if (!html || typeof html !== 'string') return validateParsed([], 'dashboard');

  const doc = parseHTMLFast(html);
  const rows = doc.querySelectorAll('table tbody tr');
  const courses: CourseSummary[] = [];

  rows.forEach((rowNode) => {
    const row = rowNode as Element;
    // Fetch all cells (both th and td)
    const cells = row.querySelectorAll('td, th');
    if (cells.length < 4) return;

    // cells[0] is the "#" index
    // cells[1] is the "Code - Course Name"
    const codeNameCell = cells[1];
    const code =
      codeNameCell.querySelector('span.fw-bold')?.textContent?.trim() || '';
    let fullText = codeNameCell.textContent?.trim() || '';
    let name = fullText
      .replace(code, '')
      .replace(/^-+\s*/, '')
      .trim();

    // cells[2] is the "Type" column (e.g., ELA, ETH, TH, LO, SS)
    const typeCell = cells[2];
    const type = typeCell?.textContent?.trim() || '';

    // cells[3] is the "Attendance" column
    const attendanceCell = cells[3];
    const rawAttendance = attendanceCell.textContent?.trim() || '0';

    // Parse the float and round it to remove the ".0" (e.g., "84.0" -> "84")
    const parsedAttendance = parseFloat(rawAttendance);
    const formattedAttendance = isNaN(parsedAttendance)
      ? '0'
      : Math.round(parsedAttendance).toString();

    if (code) {
      courses.push({
        code: code,
        name: name,
        type: type,
        slot: 'N/A',
        faculty: 'N/A',
        attendance: formattedAttendance,
      });
    }
  });

  return validateParsed(courses, 'dashboard');
}
