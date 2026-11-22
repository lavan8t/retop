import { CoursePageData, CoursePageOption } from '../types/vtop';
import { parseHTMLFast } from '../utils/parser-utils';
import { COURSE_PAGE_SCHEMA_VERSION, parseCoursePage } from './course-page';

/** AP reuses the Vellore/Chennai detail DOM, so it shares the coursePage schema version. */
export const SCHEMA_VERSION = COURSE_PAGE_SCHEMA_VERSION;

type SelectOption = { id: string; label: string };

const isPlaceholder = (value: string, text: string): boolean => {
  const v = value.toLowerCase();
  const t = text.toLowerCase();
  return (
    !value ||
    t.includes('choose') ||
    t.includes('select') ||
    v.includes('choose') ||
    v.includes('select')
  );
};

/** AP uses `select#courseCode` with text "CODE - Title - TYPE" and a numeric AP code as value. */
export const parseApCourseOptions = (
  html: string,
  semSubId: string,
): CoursePageOption[] => {
  const doc = parseHTMLFast(html);
  const select = doc.querySelector('select#courseCode');
  if (!select) return [];

  const options: CoursePageOption[] = [];
  select.querySelectorAll('option').forEach((opt) => {
    const classId = opt.getAttribute('value') || '';
    const text = opt.textContent?.trim() || '';
    if (isPlaceholder(classId, text)) return;

    const parts = text.split(' - ').map((p) => p.trim());
    const code = parts[0] || '';
    const hasType = parts.length >= 3;
    const type = hasType ? parts[parts.length - 1] : '';
    const title = hasType ? parts.slice(1, -1).join(' - ') : parts[1] || '';

    options.push({
      code,
      title,
      classId,
      semester: semSubId,
      type,
      credits: '0',
      rawText: text,
    });
  });
  return options;
};

export const parseApSlotOptions = (html: string): SelectOption[] => {
  const doc = parseHTMLFast(html);
  const select = doc.querySelector('select#slotId');
  if (!select) return [];

  const slots: SelectOption[] = [];
  select.querySelectorAll('option').forEach((opt) => {
    const id = opt.getAttribute('value') || '';
    const label = opt.textContent?.trim() || '';
    if (isPlaceholder(id, label)) return;
    slots.push({ id, label });
  });
  return slots;
};

export const parseApFacultyOptions = (html: string): SelectOption[] => {
  const doc = parseHTMLFast(html);
  const select = doc.querySelector('select#faculty');
  if (!select) return [];

  const faculty: SelectOption[] = [];
  select.querySelectorAll('option').forEach((opt) => {
    const id = opt.getAttribute('value') || '';
    const label = opt.textContent?.trim() || '';
    if (isPlaceholder(id, label)) return;
    faculty.push({ id, label });
  });
  return faculty;
};

/** Detail markup is unverified against a live AP response; fall back to empty arrays. */
export const parseApCourseDetail = (
  html: string,
): Omit<CoursePageData, 'options' | 'selectedCourseId'> => {
  try {
    const parsed = parseCoursePage(html);
    return {
      outcomes: parsed.outcomes,
      syllabus: parsed.syllabus,
      materials: parsed.materials,
      books: parsed.books,
    };
  } catch {
    return { outcomes: [], syllabus: [], materials: [], books: [] };
  }
};
