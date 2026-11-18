/**
 * Course-materials view model. One module turns a flat material list into
 * faculty-grouped, sorted, faculty-annotated entries so the page only renders.
 * Faculty attribution (employee-ID / name-token matching), assigned-faculty
 * ordering and module/date grouping all live behind this interface.
 */
import type { CourseMaterial } from '../types/vtop';

export interface FacultyDisplay {
  name: string;
  subs: string[];
}

export interface AnnotatedMaterial {
  material: CourseMaterial;
  isWebLink: boolean;
}

export interface FacultyMaterialGroup {
  /** Raw faculty key, used for download folder names and selection identity. */
  key: string;
  faculty: FacultyDisplay;
  isAssigned: boolean;
  materials: AnnotatedMaterial[];
}

export type MaterialSort = 'date' | 'module';

/** Split "10234 - Dr Name - Dept" into a display name and detail chips. */
export function formatFacultyName(raw: string): FacultyDisplay {
  const parts = (raw || '')
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { name: raw, subs: [] };
  if (/^\d+$/.test(parts[0]) && parts.length > 1) {
    return { name: parts[1], subs: [parts[0], ...parts.slice(2)] };
  }
  return { name: parts[0], subs: parts.slice(1) };
}

const employeeId = (value: string): string | undefined =>
  (value.match(/\b\d{4,7}\b/) || [])[0];

const cleanTokens = (value: string): string[] =>
  value
    .replace(/\b\d{4,7}\b/g, '')
    .replace(/\b(dr|prof|mr|mrs|ms|assoc|assistant|professor|ela|eth)\b/gi, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2);

/** Match an assigned faculty against a material group by employee ID or name. */
export function isAssignedFaculty(
  assignedFacultyRaw: string,
  facultyKey: string,
): boolean {
  const target = (assignedFacultyRaw || '').toLowerCase().trim();
  if (!target) return false;
  const key = facultyKey || '';

  const targetEmpId = employeeId(target);
  const groupEmpId = employeeId(key);
  if (targetEmpId && groupEmpId && targetEmpId === groupEmpId) return true;
  if (targetEmpId && key.includes(targetEmpId)) return true;

  const targetTokens = cleanTokens(target);
  const groupTokens = cleanTokens(key);
  if (targetTokens.length === 0 || groupTokens.length === 0) return false;
  return targetTokens.some((token) => groupTokens.includes(token));
}

export function buildCourseMaterialGroups(
  materials: CourseMaterial[],
  assignedFacultyRaw: string,
  sort: MaterialSort,
): FacultyMaterialGroup[] {
  const grouped = new Map<string, CourseMaterial[]>();
  for (const material of materials || []) {
    const key = material.faculty || 'Unknown Faculty';
    const existing = grouped.get(key);
    if (existing) existing.push(material);
    else grouped.set(key, [material]);
  }

  return Array.from(grouped.entries())
    .map(([key, mats]) => {
      const sorted = [...mats].sort((a, b) => {
        if (sort === 'module') {
          const modA = a.module ? parseInt(a.module) : 999;
          const modB = b.module ? parseInt(b.module) : 999;
          if (modA !== modB) return modA - modB;
        }
        const dateA = new Date(a.uploadDate).getTime() || 0;
        const dateB = new Date(b.uploadDate).getTime() || 0;
        return dateB - dateA;
      });
      return {
        key,
        faculty: formatFacultyName(key),
        isAssigned: isAssignedFaculty(assignedFacultyRaw, key),
        materials: sorted.map((material) => ({
          material,
          isWebLink: (material.category || '')
            .toLowerCase()
            .includes('web link'),
        })),
      };
    })
    .sort((a, b) => {
      if (!assignedFacultyRaw) return 0;
      if (a.isAssigned && !b.isAssigned) return -1;
      if (!a.isAssigned && b.isAssigned) return 1;
      return 0;
    });
}
