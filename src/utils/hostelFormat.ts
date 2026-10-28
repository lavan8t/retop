/**
 * Hostel/Residence display formatting, mirroring the Android app.
 *
 * VTOP hands these fields over as free-form strings, e.g. `Q Block (Q)`,
 * `ANX (ANX)`, `2 Bed AC`, `Special Mess - Sodexo [K Block]`. The bracketed
 * token is the block tag/badge and can be anything VTOP puts there.
 */

const TITLE_WORDS = new Set(['bed', 'block', 'room', 'mess', 'non']);

const isBlank = (value: string): boolean =>
  value === '' ||
  value === '-' ||
  value.toUpperCase() === 'N/A' ||
  value.toUpperCase() === 'NA';

function titleCaseWord(word: string): string {
  if (!word) return '';
  if (word.includes('-')) {
    return word.split('-').map(titleCaseWord).join('-');
  }
  const upper = word.toUpperCase();
  const lower = word.toLowerCase();
  if (TITLE_WORDS.has(lower)) return upper.charAt(0) + lower.slice(1);
  // Keep short all-caps tokens such as Q, MH and ANX.
  if (word === upper && upper.length <= 3) return upper;
  return upper.charAt(0) + lower.slice(1);
}

export function formatHostelTitle(text: string): string {
  return text.split(/\s+/).filter(Boolean).map(titleCaseWord).join(' ');
}

/** Strip VTOP's field label, stray dashes and whitespace from a hostel value. */
export function cleanHostelField(raw: string | null | undefined): string {
  if (!raw) return '';
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(
      /^(?:hostel\s+)?(?:block\s*(?:name)?|room\s*(?:no\.?|number)?|bed\s*(?:type)?|mess\s*(?:type|information|facility|name)?|caterer\s*(?:name)?)\s*[:\-]?\s+/i,
      '',
    )
    .replace(/^[\s\-/|]+|[\s\-/|]+$/g, '')
    .trim();
  return isBlank(cleaned) ? '' : cleaned;
}

export interface HostelBlockDetails {
  displayName: string;
  badge?: string;
}

export function formatHostelBlock(
  raw: string | null | undefined,
): HostelBlockDetails {
  const value = cleanHostelField(raw);
  if (!value) return { displayName: '' };

  // Anything inside brackets is the block tag: `(A)`, `(ANX)`, `(Q Block)`.
  const bracket = value.match(/\(([^)]+)\)/);
  const tag = bracket?.[1]?.trim() ?? '';
  let name = bracket
    ? `${value.slice(0, bracket.index)} ${value.slice((bracket.index ?? 0) + bracket[0].length)}`
    : value;
  name = name
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-/|]+|[\s\-/|]+$/g, '')
    .trim();
  if (!name) name = tag;
  if (name && !/\bblock\b/i.test(name)) name = `${name} Block`;

  let badgeBase = tag
    .replace(/\bblock\b/gi, '')
    .replace(/[\s\-]+/g, ' ')
    .trim();
  if (!badgeBase) {
    const letter =
      value.match(/\b(?:MH|LH)\s*-\s*([A-Za-z0-9]+)\s*Block\b/i) ??
      value.match(/^([A-Za-z0-9])\s+Block\b/i) ??
      value.match(/^([A-Za-z0-9]+)\s*-\s*Block\b/i);
    badgeBase = letter?.[1] ?? '';
  }

  return {
    displayName: formatHostelTitle(name),
    badge: badgeBase ? `${badgeBase.toUpperCase()} Block` : undefined,
  };
}

export function formatHostelRoom(raw: string | null | undefined): string {
  const value = cleanHostelField(raw)
    .replace(/^(?:room\s*(?:no\.?|number)?|room)\s*[-:]*\s*/i, '')
    .trim();
  return value ? `Room ${value}` : '';
}

export function formatBedType(raw: string | null | undefined): string {
  const value = cleanHostelField(raw);
  if (!value) return '';

  const match = value.match(/^(\d+)\s*-?\s*BED\s*-?\s*(NON[\s-]?AC|AC)$/i);
  if (match) {
    return `${match[1]}-Bed ${/non/i.test(match[2]) ? 'Non-AC' : 'AC'}`;
  }
  if (/\bbed\b/i.test(value)) return formatHostelTitle(value);
  if (/\bac\b/i.test(value)) {
    const base = value.replace(/\s*\bac\b/i, '').trim();
    return `${formatHostelTitle(base || value)} Bed${base ? ' AC' : ''}`;
  }
  return `${formatHostelTitle(value)} Bed`;
}

export interface MessDetails {
  messType: string;
  caterer?: string;
}

export function formatMessDetails(raw: string | null | undefined): MessDetails {
  const value = cleanHostelField(raw);
  if (!value) return { messType: '' };

  // `[K Block]` is a location tag, not part of the mess name.
  const withoutTags = value
    .replace(/\s*\[[^\]]*\]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!withoutTags) return { messType: '' };

  let typeRaw = withoutTags;
  let catererRaw = '';
  const labelled = withoutTags.match(/^(.*?)\bcaterer\b\s*[:\-]?\s*(.*)$/i);
  if (labelled) {
    typeRaw = labelled[1].trim();
    catererRaw = labelled[2].trim();
  } else {
    const dash = withoutTags.indexOf(' - ');
    if (dash !== -1) {
      typeRaw = withoutTags.slice(0, dash).trim();
      catererRaw = withoutTags.slice(dash + 3).trim();
    }
  }

  const type = /mess/i.test(typeRaw) ? typeRaw : `${typeRaw} Mess`;
  return {
    messType: formatHostelTitle(type),
    caterer: catererRaw ? formatHostelTitle(catererRaw) : undefined,
  };
}

export interface HostelDetailsFields {
  block: string;
  room: string;
  bedType: string;
  mess: string;
  caterer: string;
}

const FIELD_LABELS: Array<[keyof HostelDetailsFields, string]> = [
  ['block', 'block(?:\\s+name)?'],
  ['room', 'room(?:\\s*(?:no\\.?|number))?'],
  ['bedType', 'bed(?:\\s*type)?'],
  ['mess', 'mess(?:\\s*(?:type|information|facility|name))?'],
  ['caterer', 'caterer(?:\\s*name)?'],
];

/**
 * Parse a single-cell `Hostel Details` value when VTOP packs every field into
 * one string. Values are split on the separators VTOP uses; unlabelled text is
 * ignored so callers can still fall back to the raw block field.
 */
export function parseHostelDetailsString(
  raw: string | null | undefined,
): Partial<HostelDetailsFields> {
  const out: Partial<HostelDetailsFields> = {};
  if (!raw) return out;

  for (const part of raw.split(/[,;|\n]+/)) {
    for (const [field, label] of FIELD_LABELS) {
      if (out[field]) continue;
      const match = part.match(
        new RegExp(`^\\s*(?:${label})\\s*[:\\-]?\\s*(.+)$`, 'i'),
      );
      if (!match) continue;
      const value = cleanHostelField(match[1]);
      if (value) out[field] = value;
      break;
    }
  }
  return out;
}
