import {
  CoursePageOption,
  CourseMaterial,
  CourseOutcome,
  SyllabusModule,
  CoursePageData,
} from '../types/vtop';

import {
  parseHTMLFast,
  validateParsed,
  Versioned,
} from '../utils/parser-utils';

export const COURSE_PAGE_SCHEMA_VERSION = 2;

const cellText = (cell: Element | null | undefined): string => {
  if (!cell) return '';
  const clone = cell.cloneNode(true) as Element;
  clone
    .querySelectorAll('br')
    .forEach((br) => br.replaceWith(clone.ownerDocument.createTextNode('\n')));
  return (clone.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
};

const splitBooks = (text: string): string[] =>
  text
    .split(/\d+\.\s*/)
    .map((b) => b.trim())
    .filter((b) => b.length > 3);

/**
 * The consolidated course page renders modules as a 4-column table
 * (number / title / topics / bloom level); the older detail shell uses
 * 3 columns with "1 - Title" in the first cell. Both must populate the
 * same syllabus model, along with two-column topic continuations.
 */
export const parseSyllabusModules = (
  doc: Document,
): { syllabus: SyllabusModule[]; books: string[] } => {
  const syllabus: SyllabusModule[] = [];
  const books: string[] = [];

  let tables = Array.from(doc.querySelectorAll('#collapseModules table'));
  if (tables.length === 0) {
    tables = Array.from(doc.querySelectorAll('table')).filter((table) => {
      const head = cellText(table.querySelector('thead, tr'));
      return /module/i.test(head) && /topic|title|bloom/i.test(head);
    });
  }

  tables.forEach((table) => {
    let bloomIndex = -1;
    Array.from(table.querySelectorAll('tr')).forEach((tr) => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(cellText);
      if (cells.length === 0) return;

      const joined = cells.join(' ').toLowerCase();
      if (
        /module/.test(joined) &&
        /topic|title|bloom/.test(joined) &&
        cells.every((c) => !/^\d+$/.test(c))
      ) {
        bloomIndex = cells.findIndex((c) => /bloom/i.test(c));
        return;
      }

      const bookCell = cells.find((c) =>
        /text\s*book|reference\s*book|recommended|reading/i.test(c),
      );
      if (bookCell !== undefined && cells.length >= 2) {
        books.push(...splitBooks(cells[cells.length - 1]));
        return;
      }

      if (cells.length >= 3) {
        const parts = cells[0].split(/\s*[-–]\s*/);
        const hasInlineTitle = parts.length > 1;
        syllabus.push({
          number: hasInlineTitle ? parts[0] : cells[0].replace(/[^\d]/g, ''),
          title: hasInlineTitle ? parts.slice(1).join(' - ') : cells[1],
          topics:
            cells[hasInlineTitle ? 1 : 2] ||
            cells.slice(hasInlineTitle ? 1 : 2, -1).join('\n'),
          blooms:
            (bloomIndex >= 0 ? cells[bloomIndex] : '') ||
            (cells.length > (hasInlineTitle ? 2 : 3)
              ? cells[cells.length - 1]
              : ''),
        });
        return;
      }

      const previous = syllabus[syllabus.length - 1];
      if (!previous) return;
      const [topic, level] = cells;
      if (!topic || /^\d+$/.test(topic)) return;
      previous.topics = [previous.topics, topic].filter(Boolean).join('\n');
      if (
        level &&
        !previous.blooms &&
        /^(L\d+|remember|understand|apply|analy[sz]e|evaluate|create)$/i.test(
          level,
        )
      ) {
        previous.blooms = level;
      }
    });
  });

  return { syllabus, books };
};

export const parseCoursePage = (html: string): Versioned<CoursePageData> => {
  const doc = parseHTMLFast(html);

  const options: CoursePageOption[] = [];
  const select = doc.querySelector('select#courseId');

  if (select) {
    const optElements = select.querySelectorAll('option');
    optElements.forEach((opt) => {
      const val = opt.getAttribute('value');
      const text = opt.textContent?.trim() || '';
      if (val && val !== '' && !text.toLowerCase().includes('select')) {
        // CRITICAL FIX: Extract exact API-required hidden data parameters
        const courseId = opt.getAttribute('data-courseid') || val;
        const type = opt.getAttribute('data-crstype') || 'TH';
        const semester = opt.getAttribute('data-semestr') || ''; // Grabs VL20252601, NOT "Fall Semester..."

        const parts = text.split(' - ');
        let code = parts[1] || '';
        let title = parts[2] || '';
        let credits = parts[parts.length - 1] || '0';

        if (parts.length >= 6) {
          credits = parts[parts.length - 1];
        } else if (parts.length >= 4) {
          credits = parts[parts.length - 1];
        }

        options.push({
          code: code.trim(),
          title: title.trim(),
          classId: courseId,
          semester,
          type,
          credits: credits.trim(),
          rawText: text,
        });
      }
    });
  }

  const outcomes: CourseOutcome[] = [];
  const outcomeRows = doc.querySelectorAll('#collapseOutcome table tbody tr');
  outcomeRows.forEach((tr) => {
    const tds = tr.querySelectorAll('td');
    if (tds.length >= 2) {
      outcomes.push({
        number: tds[0].textContent?.trim() || '',
        description: tds[1].textContent?.trim() || '',
      });
    }
  });

  const { syllabus, books } = parseSyllabusModules(doc);

  const materials: CourseMaterial[] = [];
  const matTable = doc.querySelector('#materialTable');

  if (matTable) {
    const rows = matTable.querySelectorAll('tbody tr');
    rows.forEach((tr) => {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 5) {
        const btn = tds[4].querySelector(
          'button[data-fileid], a[data-fileid], a[href]',
        );
        const downloadId = btn?.getAttribute('data-fileid') || '';

        if (downloadId) {
          const materialSpans = tds[2].querySelectorAll('span');
          const title =
            materialSpans.length > 0
              ? materialSpans[0].textContent?.trim() || ''
              : tds[2].textContent?.trim() || '';
          let category = 'Document';
          let moduleNum = '';
          if (materialSpans.length >= 3) {
            const rawCat = materialSpans[2].textContent?.trim() || '';
            const match = rawCat.match(/^(\d+)\s*\(([^)]+)\)$/);
            if (match) {
              moduleNum = match[1];
              category = match[2].trim();
            } else {
              category = rawCat.replace(/[()]/g, '').trim();
            }
          }

          const facSpans = tds[3].querySelectorAll('span');
          const faculty =
            facSpans.length > 0 ? facSpans[0].textContent?.trim() || '' : '';
          const uploadDate =
            facSpans.length > 1 ? facSpans[1].textContent?.trim() || '' : '';

          materials.push({
            id: downloadId,
            index: tds[0].textContent?.trim() || '',
            title,
            category,
            faculty,
            uploadDate,
            downloadId,
            module: moduleNum,
          });
        }
      }
    });
  }

  const fallbackBookTables = doc.querySelectorAll(
    '#collapseTextBook table, #collapseReferenceBooks table, #collapseReference table',
  );
  if (books.length === 0) {
    fallbackBookTables.forEach((table) => {
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((tr) => {
        const cells = tr.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const bookText = cells[1].textContent?.trim();
          if (bookText) {
            const splitBooks = bookText
              .split(/\d+\.\s*/)
              .map((b) => b.trim())
              .filter((b) => b.length > 3);
            if (splitBooks.length > 0) books.push(...splitBooks);
            else books.push(bookText);
          }
        } else if (cells.length === 1) {
          const bookText = cells[0].textContent?.trim();
          if (bookText) books.push(bookText);
        }
      });
    });
  }

  return validateParsed(
    {
      options,
      selectedCourseId: select?.getAttribute('value') || null,
      outcomes,
      syllabus,
      materials,
      books,
    },
    'coursePage',
  );
};
