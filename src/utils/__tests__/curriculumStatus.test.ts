import { describe, expect, it } from 'bun:test';
import {
  deriveCategoryStatuses,
  type CategoryStatusInput,
} from '../../parsers/curriculum';
import type { CurriculumCategory, CurriculumCourse } from '../../types/vtop';

const categories: CurriculumCategory[] = [
  {
    id: 'PCB',
    title: 'Professional Core',
    credits: '12',
    maxCredits: '16',
    isCompleted: false,
  },
  {
    id: 'PE',
    title: 'Professional Elective',
    credits: '6',
    maxCredits: '6',
    isCompleted: true,
  },
];

function course(
  code: string,
  overrides: Partial<CurriculumCourse> = {},
): CurriculumCourse {
  return {
    sl: '1',
    code,
    title: `Course ${code}`,
    type: 'TH',
    credits: '4',
    l: '3',
    t: '0',
    p: '0',
    j: '0',
    basket: 'Core',
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<CategoryStatusInput> = {},
): CategoryStatusInput {
  return {
    categories,
    coursesByCategory: {},
    failedCategoryIds: new Set(),
    loadingCategoryIds: new Set(),
    hideCompleted: false,
    completedCodes: new Set(),
    searchQuery: '',
    ...overrides,
  };
}

describe('deriveCategoryStatuses', () => {
  it('reports a real zero-course category as empty, never as a bare count', () => {
    const result = deriveCategoryStatuses(baseInput());
    expect(result.PCB).toEqual({ count: 0, status: 'empty' });
    expect(result.PE).toEqual({ count: 0, status: 'empty' });
  });

  it('reports a failed category as failed even when courses happen to exist', () => {
    const result = deriveCategoryStatuses(
      baseInput({
        coursesByCategory: { PCB: [course('CSE1001')] },
        failedCategoryIds: new Set(['PCB']),
      }),
    );
    expect(result.PCB.status).toBe('failed');
  });

  it('prioritises loading over other states', () => {
    const result = deriveCategoryStatuses(
      baseInput({
        loadingCategoryIds: new Set(['PCB']),
        failedCategoryIds: new Set(['PCB']),
      }),
    );
    expect(result.PCB.status).toBe('loading');
  });

  it('counts loaded courses and reports ready', () => {
    const result = deriveCategoryStatuses(
      baseInput({
        coursesByCategory: { PCB: [course('CSE1001'), course('CSE1002')] },
      }),
    );
    expect(result.PCB).toEqual({ count: 2, status: 'ready' });
  });

  it('hides completed courses and reports hidden-completed when nothing remains', () => {
    const result = deriveCategoryStatuses(
      baseInput({
        hideCompleted: true,
        coursesByCategory: {
          PCB: [
            course('CSE1001', { isCompleted: true }),
            course('CSE1002', { isCompleted: true }),
          ],
        },
      }),
    );
    expect(result.PCB.status).toBe('hidden-completed');
    expect(result.PCB.count).toBe(0);
  });

  it('honours the completed-code set from grade history when hiding', () => {
    const result = deriveCategoryStatuses(
      baseInput({
        hideCompleted: true,
        completedCodes: new Set(['CSE1001']),
        coursesByCategory: { PCB: [course('CSE1001')] },
      }),
    );
    expect(result.PCB.status).toBe('hidden-completed');
  });

  it('keeps ready status when some completed courses are hidden but others remain', () => {
    const result = deriveCategoryStatuses(
      baseInput({
        hideCompleted: true,
        completedCodes: new Set(['CSE1001']),
        coursesByCategory: { PCB: [course('CSE1001'), course('CSE1002')] },
      }),
    );
    expect(result.PCB).toEqual({ count: 1, status: 'ready' });
  });

  it('applies the search query before counting and reports empty for no matches', () => {
    const result = deriveCategoryStatuses(
      baseInput({
        searchQuery: 'graphs',
        coursesByCategory: { PCB: [course('CSE1001')] },
      }),
    );
    expect(result.PCB).toEqual({ count: 0, status: 'empty' });
  });
});
