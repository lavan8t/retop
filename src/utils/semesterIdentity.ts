/**
 * One owner of semester identity: the canonical key used to compare semester
 * IDs (e.g. VL20262701) and the display-label cleanup VTOP labels need.
 * Display helpers that format for humans stay in formatting.ts and delegate
 * here; comparison never reaches into presentation code.
 */

/** Canonical identity key, shared by every caller that compares semesters. */
export function canonicalSemesterId(raw: string): string {
  return (raw || '').replace(/0+([1-9])$/, '$1').toLowerCase();
}

export function isSameSemester(a: string, b: string): boolean {
  if (!a || !b) return false;
  return canonicalSemesterId(a) === canonicalSemesterId(b);
}

/** Strip VTOP display noise from a label without changing its case. */
export function formatSemesterLabel(rawLabel: string): string {
  return (rawLabel || '')
    .replace(/&amp;/g, '&')
    .replace(/\s*(?:-\s*|\(\s*)?(?:VLR|CHN)\s*\)?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}
