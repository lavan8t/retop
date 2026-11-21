import { BiometricPunch } from '../types/vtop';
import { parseHTMLFast } from '../utils/parser-utils';

export const SCHEMA_VERSION = 1;

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/** VTOP renders `dd/mm/yyyy`; pad the day/month so cell text stays comparable. */
const normalizeDate = (raw: string): string => {
  const value = clean(raw);
  const match = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  return match
    ? `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`
    : value;
};

/** Accept both VTOP's 24h `HH:mm` and occasional `h:mm AM/PM` cells. */
const normalizeTime = (raw: string): string => {
  const value = clean(raw);
  const meridiem = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (meridiem) {
    let hours = parseInt(meridiem[1], 10) % 12;
    if (meridiem[3].toUpperCase() === 'PM') hours += 12;
    return `${String(hours).padStart(2, '0')}:${meridiem[2]}`;
  }
  const plain = value.match(/^(\d{1,2}):(\d{2})$/);
  return plain ? `${plain[1].padStart(2, '0')}:${plain[2]}` : value;
};

const HEADER_CELL = /^(sl\.?\s*no\.?|punch\s*date|punch\s*time|venue)$/i;
const isHeaderRow = (cells: string[]): boolean =>
  cells.some((cell) => HEADER_CELL.test(cell));

/**
 * Pure parser for the flat `/vtop/getStudBioHistory` fragment. The first `tr`
 * is the header (no thead); data rows are `Sl.No | Punch Date | Punch Time | Venue`.
 */
export function parseBiometricHistory(html: string): BiometricPunch[] {
  if (!html || typeof html !== 'string') return [];
  const doc = parseHTMLFast(html);
  const punches: BiometricPunch[] = [];

  doc.querySelectorAll('table tr').forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll('td, th')).map((cell) =>
      clean(cell.textContent || ''),
    );
    if (cells.length < 4 || cells.every((cell) => !cell)) return;
    if (isHeaderRow(cells)) return;

    punches.push({
      slNo: cells[0],
      punchDate: normalizeDate(cells[1]),
      punchTime: normalizeTime(cells[2]),
      venue: cells[3],
    });
  });

  return punches;
}

export interface BiometricDayGroup {
  date: string;
  punches: BiometricPunch[];
}

export interface BiometricDaySummary {
  firstIn: string | null;
  lastOut: string | null;
  count: number;
}

/** dd/mm/yyyy -> yyyy-mm-dd so string comparison is chronological. */
const sortableDate = (ddmmyyyy: string): string => {
  const match = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : ddmmyyyy;
};

const toMinutes = (time: string): number => {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  return match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : 0;
};

const sortPunches = (punches: BiometricPunch[]): BiometricPunch[] =>
  [...punches].sort(
    (a, b) =>
      sortableDate(a.punchDate).localeCompare(sortableDate(b.punchDate)) ||
      toMinutes(a.punchTime) - toMinutes(b.punchTime),
  );

/** Days newest-first, punches chronological within a day; input is untouched. */
export const groupPunchesByDate = (
  punches: BiometricPunch[],
): BiometricDayGroup[] => {
  const byDate = new Map<string, BiometricPunch[]>();
  for (const punch of sortPunches(punches)) {
    const rows = byDate.get(punch.punchDate) ?? [];
    rows.push(punch);
    byDate.set(punch.punchDate, rows);
  }
  return Array.from(byDate, ([date, rows]) => ({ date, punches: rows })).sort(
    (a, b) => sortableDate(b.date).localeCompare(sortableDate(a.date)),
  );
};

export const summarizePunches = (
  punches: BiometricPunch[],
): BiometricDaySummary => {
  const sorted = sortPunches(punches);
  return {
    firstIn: sorted.length ? sorted[0].punchTime : null,
    lastOut: sorted.length ? sorted[sorted.length - 1].punchTime : null,
    count: sorted.length,
  };
};
