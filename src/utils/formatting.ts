const ACRONYM_MAP: Record<string, string> = {
  'MICROPROCESSORS AND MICROCONTROLLERS': 'MPMC',
  'COMPUTER ARCHITECTURE AND ORGANIZATION': 'CAO',
  'DATA STRUCTURES AND ALGORITHMS': 'DSA',
  'OBJECT ORIENTED PROGRAMMING': 'OOP',
  'PROBABILITY AND STATISTICS': 'P&S',
  'DESIGN AND ANALYSIS OF ALGORITHMS': 'DAA',
};

const IGNORE_WORDS = new Set([
  'AND',
  'OF',
  'THE',
  'IN',
  'FOR',
  'TO',
  'A',
  'AN',
  'WITH',
  'BY',
]);

export const getCourseAcronym = (title: string): string => {
  if (!title) return '';
  const upper = title.trim().toUpperCase().replace(/\s+/g, ' ');
  for (const [k, v] of Object.entries(ACRONYM_MAP)) {
    if (upper.includes(k)) return v;
  }
  const words = upper.split(/[\s\-\(\)\.,]+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 4);
  const acronym = words
    .filter((w) => !IGNORE_WORDS.has(w))
    .map((w) => w[0])
    .join('');
  return acronym.length >= 2 ? acronym : upper.slice(0, 3);
};

export function normalizeSemesterLabel(rawLabel: string): string {
  return (rawLabel || '')
    .replace(/&amp;/g, '&')
    .replace(/\s*(?:-\s*|\(\s*)?(?:VLR|CHN)\s*\)?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatSemesterShorthand(label: string): string {
  if (!label) return '';
  const clean = normalizeSemesterLabel(label);

  const yearMatch = clean.match(/(?:20)?(\d{2})[-/](?:20)?(\d{2})/);
  const yearStr = yearMatch ? `${yearMatch[1]}-${yearMatch[2]}` : '';

  let termStr = '';
  if (/winter|win|ws/i.test(clean)) termStr = 'WIN';
  else if (/fall|fs/i.test(clean)) termStr = 'FALL';
  else if (/summer|sum|ss/i.test(clean)) termStr = 'SUM';
  else if (/tri\s*semester|tri\s*sem/i.test(clean)) termStr = 'TRI';
  else {
    termStr = clean.split(/\s+/)[0]?.substring(0, 4).toUpperCase() || '';
  }

  let tag = '';
  if (/industry|ind/i.test(clean)) tag = ' (Ind)';
  else if (/llm/i.test(clean)) tag = ' (LLM)';
  else if (/law/i.test(clean)) tag = ' (Law)';
  else if (/i\s*year|1st\s*year/i.test(clean)) tag = ' (1st Yr)';

  return yearStr ? `${termStr} ${yearStr}${tag}` : clean;
}

export type TimeFormatMode = '24h' | '12h' | '12h-ampm';

export function formatTimeStr(
  timeStr: string,
  mode: TimeFormatMode | boolean = '12h',
  showAmPmParam?: boolean,
): string {
  if (!timeStr) return '';

  let formatMode: TimeFormatMode = '12h';
  if (typeof mode === 'string') {
    formatMode = mode as TimeFormatMode;
  } else if (mode === true) {
    formatMode = '24h';
  } else if (mode === false) {
    formatMode = showAmPmParam ? '12h-ampm' : '12h';
  }

  if (formatMode === '24h') return timeStr;

  const convert = (t: string) => {
    const parts = t.trim().split(':');
    if (parts.length < 2) return t;
    const hour = parseInt(parts[0], 10);
    const min = parts[1];
    if (isNaN(hour)) return t;

    const h12 = hour % 12 || 12;
    if (formatMode === '12h-ampm') {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return `${h12}:${min} ${ampm}`;
    }
    return `${h12}:${min}`;
  };

  if (timeStr.includes('-')) {
    const [start, end] = timeStr.split('-').map((s) => s.trim());
    return `${convert(start)} - ${convert(end)}`;
  }

  return convert(timeStr);
}

export const toTitleCase = (str: string): string => {
  if (!str) return '';
  if (str === 'retop') return 'retop';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export function parseVtopDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.replace(/[-/.]/g, ' ').trim().split(/\s+/);
  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10);
    let year = parseInt(parts[2], 10);
    let monthStr = parts[1].toLowerCase();

    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      day = parseInt(parts[2], 10);
      monthStr = parts[1].toLowerCase();
    }

    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ];
    let monthIndex = months.indexOf(monthStr.slice(0, 3));
    if (monthIndex === -1 && !isNaN(parseInt(monthStr, 10))) {
      monthIndex = parseInt(monthStr, 10) - 1;
    }

    if (!isNaN(day) && monthIndex !== -1 && !isNaN(year)) {
      return new Date(year, monthIndex, day);
    }
  }

  return null;
}

export function formatDateStr(
  dateStr: string,
  pattern: string = 'DD Mon YYYY',
): string {
  if (!dateStr) return '';

  const dateObj = parseVtopDate(dateStr);
  if (!dateObj || isNaN(dateObj.getTime())) return dateStr;

  const DD = String(dateObj.getDate()).padStart(2, '0');
  const MM = String(dateObj.getMonth() + 1).padStart(2, '0');
  const YYYY = String(dateObj.getFullYear());
  const YY = YYYY.slice(2);
  const Mon = dateObj.toLocaleDateString('en-US', { month: 'short' });

  switch (pattern) {
    case 'DD Mon YYYY':
      return `${DD} ${Mon} ${YYYY}`;
    case 'DD Mon YY':
      return `${DD} ${Mon} ${YY}`;
    case 'DD/MM/YYYY':
      return `${DD}/${MM}/${YYYY}`;
    case 'MM/DD/YYYY':
      return `${MM}/${DD}/${YYYY}`;
    case 'YYYY-MM-DD':
      return `${YYYY}-${MM}-${DD}`;
    case 'DD.MM.YYYY':
      return `${DD}.${MM}.${YYYY}`;
    case 'DD-MM-YYYY':
      return `${DD}-${MM}-${YYYY}`;
    default:
      return `${DD} ${Mon} ${YYYY}`;
  }
}
