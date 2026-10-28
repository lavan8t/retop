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

export const COURSE_PAGE_SCHEMA_VERSION = 1;

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

  const syllabus: SyllabusModule[] = [];
  const syllabusRows = doc.querySelectorAll('#collapseModules table tbody tr');
  let currentModNumber = '';
  let currentModTitle = '';
  let currentModTopics: string[] = [];
  let currentModBlooms = '';

  const books: string[] = [];

  syllabusRows.forEach((tr) => {
    const cells = tr.querySelectorAll('td, th');
    if (cells.length === 3) {
      if (currentModTitle) {
        syllabus.push({
          number: currentModNumber,
          title: currentModTitle,
          topics: currentModTopics.join('\n'),
          blooms: currentModBlooms,
        });
      }
      const headerText = cells[0].textContent?.trim() || '';
      const headerParts = headerText.split(' - ');
      currentModNumber = headerParts[0] || '';
      currentModTitle = headerParts[1] || headerText;
      currentModTopics = [cells[1].textContent?.trim() || ''];
      currentModBlooms = cells[2].textContent?.trim() || '';
    } else if (cells.length === 2) {
      const col1 = cells[0].textContent?.trim().toLowerCase() || '';
      const col1Clean = col1.replace(/[^a-z0-9]/g, '');
      if (
        col1Clean.includes('textbook') ||
        col1Clean.includes('referencebook') ||
        col1Clean.includes('recommended') ||
        col1Clean.includes('reading')
      ) {
        const bookData = cells[1].textContent?.trim();
        if (bookData) {
          // split by numbers "1. ", "2. " or just add
          const splitBooks = bookData
            .split(/\d+\.\s*/)
            .map((b) => b.trim())
            .filter((b) => b.length > 3);
          if (splitBooks.length > 0) {
            books.push(...splitBooks);
          } else {
            books.push(bookData);
          }
        }
      } else {
        currentModTopics.push(cells[0].textContent?.trim() || '');
      }
    }
  });

  if (currentModTitle) {
    syllabus.push({
      number: currentModNumber,
      title: currentModTitle,
      topics: currentModTopics.join('\n'),
      blooms: currentModBlooms,
    });
  }

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
