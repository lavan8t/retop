import { CurriculumCategory, CurriculumCourse } from '../types/vtop';
import {
  parseHTMLFast,
  validateParsed,
  wrapWithSchemaVersion,
  Versioned,
} from '../utils/parser-utils';

export const CURRICULUM_SCHEMA_VERSION = 1;

const CATEGORY_ID_RE = /^[A-Z0-9_]{2,12}$/;

/**
 * Pull a category id out of a VTOP onclick attribute. Ids are normally short
 * uppercase tokens (PCB, PE) but VTOP also emits longer ids with digits and
 * underscores (21BCE, CSE_1).
 */
export function extractCurriculumCategoryId(onclick: string): string | null {
  if (!onclick) return null;
  const matches = onclick.matchAll(/['"]([A-Z0-9_]{2,12})['"]/gi);
  for (const match of matches) {
    const candidate = match[1].toUpperCase();
    if (CATEGORY_ID_RE.test(candidate) && /[A-Z]/.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Course codes vary by programme: CSE1001, CS101, 21BCE1234, BIO1001P. */
export function isLikelyCourseCode(value: string): boolean {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,12}$/.test(code)) return false;
  const letters = (code.match(/[A-Z]/g) || []).length;
  const digits = (code.match(/\d/g) || []).length;
  return letters >= 2 && digits >= 2;
}

/** Lifecycle of a category's course list, used for honest count labels. */
export type CategoryLoadStatus =
  'loading' | 'failed' | 'hidden-completed' | 'empty' | 'ready';

export interface CategoryStatusInput {
  categories: CurriculumCategory[];
  coursesByCategory: Record<string, CurriculumCourse[]>;
  failedCategoryIds: ReadonlySet<string>;
  loadingCategoryIds: ReadonlySet<string>;
  hideCompleted: boolean;
  completedCodes: ReadonlySet<string>;
  searchQuery: string;
}

export interface CategoryStatus {
  count: number;
  status: CategoryLoadStatus;
}

/**
 * Derive the count and status for each category from its own course source.
 * Credits always come from the dashboard and are deliberately not reconciled
 * with these course counts.
 */
export function deriveCategoryStatuses(
  input: CategoryStatusInput,
): Record<string, CategoryStatus> {
  const query = input.searchQuery.trim().toLowerCase();
  const result: Record<string, CategoryStatus> = {};

  input.categories.forEach((cat) => {
    const courses = input.coursesByCategory[cat.id] || [];
    const matchesQuery = (c: CurriculumCourse) =>
      !query ||
      c.title.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query);
    const searched = courses.filter(matchesQuery);
    const visible = input.hideCompleted
      ? searched.filter(
          (c) => !c.isCompleted && !input.completedCodes.has(c.code),
        )
      : searched;

    let status: CategoryLoadStatus;
    if (input.loadingCategoryIds.has(cat.id)) {
      status = 'loading';
    } else if (input.failedCategoryIds.has(cat.id)) {
      status = 'failed';
    } else if (
      input.hideCompleted &&
      searched.length > 0 &&
      visible.length === 0
    ) {
      status = 'hidden-completed';
    } else if (visible.length === 0) {
      status = 'empty';
    } else {
      status = 'ready';
    }

    result[cat.id] = { count: visible.length, status };
  });

  return result;
}

export function parseCurriculumDashboard(html: string): Versioned<{
  totalCredits: string;
  categories: CurriculumCategory[];
}> {
  const doc = parseHTMLFast(html);

  let totalCredits = '0';
  const allElements = doc.body.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const text = allElements[i].textContent || '';
    if (text.includes('Total Credits')) {
      const match = text.match(/Total Credits\s*[:=-]?\s*([\d.]+)/i);
      if (match) {
        totalCredits = match[1];
        break;
      }
    }
  }

  const categories: CurriculumCategory[] = [];
  const clickables = doc.querySelectorAll('[onclick]');

  clickables.forEach((el) => {
    const onclick = el.getAttribute('onclick') || '';
    const id = extractCurriculumCategoryId(onclick);

    if (id) {
      if (categories.find((c) => c.id === id)) return;

      let title = id;
      const titleEl =
        el.querySelector('.col-6 span') || el.querySelector('.text-left');
      if (titleEl && titleEl.textContent) {
        title = titleEl.textContent.trim();
      } else {
        const raw = el.textContent || '';
        const lines = raw
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length > 0) {
          title = lines[0];
        }
      }

      let credits = '0';
      let maxCredits = '0';
      const creditsContainer = el.querySelectorAll('.col-6, .text-right, span');

      creditsContainer.forEach((c) => {
        const text = c.textContent || '';
        const m = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
        if (m) {
          credits = m[1];
          maxCredits = m[2];
        }
      });

      const isCompleted =
        parseFloat(credits) >= parseFloat(maxCredits) &&
        parseFloat(maxCredits) > 0;

      categories.push({
        id,
        title,
        credits,
        maxCredits,
        isCompleted,
      });
    }
  });

  return validateParsed(
    {
      totalCredits,
      categories,
    },
    'curriculum',
  );
}

export function parseCurriculumCourses(html: string): Versioned<{
  courses: CurriculumCourse[];
  basketMaxCredits: Record<string, string>;
}> {
  const doc = parseHTMLFast(html);
  const courses: CurriculumCourse[] = [];
  const basketMaxCredits: Record<string, string> = {};

  const navButtons = doc.querySelectorAll(
    '.nav-pills button, .nav-tabs button, .nav-pills a, .nav-tabs a',
  );
  const basketMap: Record<string, string> = {};

  navButtons.forEach((btn) => {
    const target =
      btn.getAttribute('data-bs-target') || btn.getAttribute('href') || '';
    const cleanTarget = target.replace('#', '').trim();
    const btnText = btn.textContent?.trim() || '';
    if (cleanTarget && btnText) {
      basketMap[cleanTarget] = btnText;
    }
  });

  const headers = doc.querySelectorAll('h4, h5, h6, .card-header, strong, b');
  headers.forEach((h) => {
    const text = h.textContent || '';
    const match = text.match(/([A-Za-z\s]+)\s*-\s*(\d+)\s*Credits/i);
    if (match) {
      const basketName = match[1].trim();
      const credits = match[2].trim();
      basketMaxCredits[basketName] = credits;
    }
  });

  const rows = doc.querySelectorAll('table tr');
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 3) return;

    let codeIndex = -1;
    for (let i = 0; i < cells.length; i++) {
      const txt = cells[i].textContent?.trim() || '';
      if (isLikelyCourseCode(txt)) {
        codeIndex = i;
        break;
      }
    }

    let basket = 'Core';
    let currentPane = row.closest('.tab-pane');
    while (currentPane) {
      if (currentPane.id && basketMap[currentPane.id]) {
        basket = basketMap[currentPane.id];
        break;
      }
      currentPane = currentPane.parentElement?.closest('.tab-pane') || null;
    }

    if (basket === 'Core') {
      if (navButtons.length === 1) {
        basket = navButtons[0].textContent?.trim() || 'Core';
      } else if (navButtons.length > 1) {
        basket = navButtons[0].textContent?.trim() || 'Core';
      }
    }

    if (codeIndex !== -1) {
      courses.push({
        sl: cells[0]?.textContent?.trim() || '',
        code: cells[codeIndex]?.textContent?.trim() || '',
        title: cells[codeIndex + 1]?.textContent?.trim() || '',
        type: cells[codeIndex + 2]?.textContent?.trim() || 'TH',
        credits: cells[codeIndex + 3]?.textContent?.trim() || '0',
        l: cells[codeIndex + 4]?.textContent?.trim() || '0',
        t: cells[codeIndex + 5]?.textContent?.trim() || '0',
        p: cells[codeIndex + 6]?.textContent?.trim() || '0',
        j: cells[codeIndex + 7]?.textContent?.trim() || '0',
        basket: basket,
        isCompleted:
          row.getAttribute('style')?.toLowerCase().includes('background') ||
          row.className.toLowerCase().includes('success') ||
          Array.from(cells).some((c) =>
            c.textContent?.toLowerCase().includes('completed'),
          ),
      });
    }
  });

  return wrapWithSchemaVersion({ courses, basketMaxCredits }, 'curriculum');
}

export const parseCurriculumCategoryTable = parseCurriculumCourses;
