import { describe, expect, it } from 'bun:test';
import type { CourseMaterial } from '../../types/vtop';
import {
  buildCourseMaterialGroups,
  formatFacultyName,
  isAssignedFaculty,
} from '../courseMaterials';

const material = (
  overrides: Partial<CourseMaterial> & Pick<CourseMaterial, 'id'>,
): CourseMaterial => ({
  index: overrides.id,
  title: overrides.id,
  category: 'PDF',
  faculty: 'Faculty A',
  uploadDate: '2026-01-01',
  downloadId: overrides.id,
  ...overrides,
});

describe('course material view model', () => {
  it('splits faculty keys into a display name and detail chips', () => {
    expect(formatFacultyName('10234 - Dr Smith - CSE')).toEqual({
      name: 'Dr Smith',
      subs: ['10234', 'CSE'],
    });
    expect(formatFacultyName('Dr Smith - CSE')).toEqual({
      name: 'Dr Smith',
      subs: ['CSE'],
    });
    expect(formatFacultyName('')).toEqual({ name: '', subs: [] });
  });

  it('matches assigned faculty by employee ID or cleaned name tokens', () => {
    expect(isAssignedFaculty('10234 - dr smith', '10234 - Dr Smith')).toBe(
      true,
    );
    expect(isAssignedFaculty('Dr Smith', '10234 - Prof Smith')).toBe(true);
    expect(isAssignedFaculty('Dr Smith', 'Dr Jones')).toBe(false);
    expect(isAssignedFaculty('', 'Dr Smith')).toBe(false);
  });

  it('groups, sorts and annotates materials behind one interface', () => {
    const mats: CourseMaterial[] = [
      material({
        id: 'a1',
        faculty: 'Other Faculty',
        uploadDate: '2026-01-01',
      }),
      material({
        id: 'a2',
        faculty: '10234 - Dr Smith',
        module: '2',
        uploadDate: '2026-01-01',
      }),
      material({
        id: 'a3',
        faculty: '10234 - Dr Smith',
        module: '1',
        uploadDate: '2026-01-01',
      }),
      material({
        id: 'a4',
        faculty: '10234 - Dr Smith',
        category: 'Web Link',
        uploadDate: '2026-02-01',
      }),
    ];

    const byModule = buildCourseMaterialGroups(
      mats,
      '10234 - dr smith',
      'module',
    );
    // Assigned faculty is pulled to the front.
    expect(byModule[0].key).toBe('10234 - Dr Smith');
    expect(byModule[0].isAssigned).toBe(true);
    expect(byModule[0].faculty).toEqual({ name: 'Dr Smith', subs: ['10234'] });
    // Module order wins; web-link annotation comes from the category.
    expect(byModule[0].materials.map((m) => m.material.id)).toEqual([
      'a3',
      'a2',
      'a4',
    ]);
    expect(
      byModule[0].materials.find((m) => m.material.id === 'a4')?.isWebLink,
    ).toBe(true);
    expect(
      byModule[0].materials.find((m) => m.material.id === 'a3')?.isWebLink,
    ).toBe(false);

    const byDate = buildCourseMaterialGroups(mats, '', 'date');
    const smithGroup = byDate.find((g) => g.key === '10234 - Dr Smith')!;
    expect(smithGroup.isAssigned).toBe(false);
    expect(smithGroup.materials.map((m) => m.material.id)).toEqual([
      'a4',
      'a2',
      'a3',
    ]);
  });
});
