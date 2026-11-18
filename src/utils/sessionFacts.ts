/**
 * Current session facts: the single owner of csrf, registration number, session
 * mode and their refresh. Every scraper is an adapter over this seam; the
 * extraction rules and fallback chains live here so they cannot drift.
 *
 * agents.md 9/10: the registration number is the value VTOP renders as
 * authorizedID / authorizedIDX, never the sign-in username. Ambient same-origin
 * VTOP pages and cookie-jar contexts are reported as distinct modes.
 */

import { isAmbientSessionContext } from './vtopBridge';

export type SessionMode = 'ambient' | 'jar';

export interface SessionFacts {
  csrf: string;
  /** Registration number (authorizedID), never the sign-in username. */
  regNo: string;
  mode: SessionMode;
}

export type SessionCredentials = Pick<SessionFacts, 'csrf' | 'regNo'>;

const CSRF_MIN = 6; // historical "length > 5" rule
const REGNO_MIN = 4; // historical "length > 3" rule

interface WindowGlobals {
  csrfValue?: string;
  authorizedID?: string;
}

const isCsrf = (value?: string | null): value is string =>
  !!value && value.length >= CSRF_MIN;
const isRegNo = (value?: string | null): value is string =>
  !!value && value.length >= REGNO_MIN;

/** Ambient (browser-owned, same-origin) versus cookie-jar session. */
export function detectSessionMode(): SessionMode {
  return isAmbientSessionContext() ? 'ambient' : 'jar';
}

/** Extract a csrf token from an HTML string, across every VTOP rendering. */
export function extractCsrfFromHtml(html: string): string | null {
  if (!html || typeof html !== 'string') return null;
  const patterns = [
    /<input[^>]*name=["']_csrf["'][^>]*value=["']([^"']+)["']/i,
    /<input[^>]*value=["']([^"']+)["'][^>]*name=["']_csrf["']/i,
    /<meta[^>]*name=["']_csrf["'][^>]*content=["']([^"']+)["']/i,
    /(?:var\s+)?(?:csrfValue|_csrf)\s*[:=]\s*["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && isCsrf(match[1])) return match[1];
  }
  return null;
}

/** Extract the registration number from an HTML string. Never a username. */
export function extractRegNoFromHtml(html: string): string | null {
  if (!html || typeof html !== 'string') return null;
  const patterns = [
    /<input[^>]*id=["']authorizedIDX["'][^>]*value=["']([^"']+)["']/i,
    /<input[^>]*name=["']authorizedID["'][^>]*value=["']([^"']+)["']/i,
    /<input[^>]*value=["']([^"']+)["'][^>]*id=["']authorizedIDX["']/i,
    /id=["']authorizedID["'][^>]*value=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && isRegNo(match[1])) return match[1];
  }
  return null;
}

export function extractSessionFactsFromHtml(
  html: string,
): Partial<SessionCredentials> {
  return {
    csrf: extractCsrfFromHtml(html) || undefined,
    regNo: extractRegNoFromHtml(html) || undefined,
  };
}

const readScripts = (doc: Document): string => {
  let text = '';
  doc.querySelectorAll('script').forEach((script) => {
    text += `${script.textContent || ''}\n`;
  });
  return text;
};

/**
 * Read current credentials from a document and its window globals. DOM inputs
 * win over globals; the last _csrf input wins because VTOP renders several and
 * the active form's token is the freshest.
 */
export function readSessionFactsFromDocument(
  doc?: Document,
  win?: WindowGlobals,
): SessionCredentials {
  const activeDoc =
    doc ?? (typeof document !== 'undefined' ? document : undefined);
  const globals =
    win ??
    (typeof window !== 'undefined' ? (window as WindowGlobals) : undefined);

  let csrf = '';
  let regNo = '';

  if (activeDoc) {
    const csrfInputs = Array.from(
      activeDoc.querySelectorAll('input[name="_csrf"]'),
    ) as HTMLInputElement[];
    for (let i = csrfInputs.length - 1; i >= 0; i--) {
      if (isCsrf(csrfInputs[i].value)) {
        csrf = csrfInputs[i].value;
        break;
      }
    }

    const authX = activeDoc.getElementById(
      'authorizedIDX',
    ) as HTMLInputElement | null;
    const authNamed = activeDoc.getElementById(
      'authorizedID',
    ) as HTMLInputElement | null;
    const authInputs = Array.from(
      activeDoc.querySelectorAll('input[name="authorizedID"]'),
    ) as HTMLInputElement[];
    if (isRegNo(authX?.value)) regNo = authX!.value;
    else if (isRegNo(authNamed?.value)) regNo = authNamed!.value;
    else {
      for (let i = authInputs.length - 1; i >= 0; i--) {
        if (isRegNo(authInputs[i].value)) {
          regNo = authInputs[i].value;
          break;
        }
      }
    }

    if (!csrf || !regNo) {
      const scripts = readScripts(activeDoc);
      if (!csrf) csrf = extractCsrfFromHtml(scripts) || '';
      if (!regNo) {
        const fromScript =
          extractRegNoFromHtml(scripts) ||
          scripts.match(
            /authorizedID["']?\s*,\s*value:\s*["']([^"']+)["']/i,
          )?.[1] ||
          scripts.match(/(?:var\s+)?id\s*=\s*["']([^"']+)["']/i)?.[1] ||
          '';
        if (isRegNo(fromScript)) regNo = fromScript;
      }
    }
  }

  if (!csrf && isCsrf(globals?.csrfValue)) csrf = globals!.csrfValue!;
  if (!regNo && isRegNo(globals?.authorizedID)) regNo = globals!.authorizedID!;

  return { csrf, regNo };
}

export interface SessionFactsSource {
  readonly csrf: string;
  readonly regNo: string;
  readonly mode: SessionMode;
  /** Re-read the live DOM/globals and merge any fresher facts. */
  refresh(): SessionFacts;
  /** Merge facts discovered in responses or injected by a host shell. */
  update(patch: Partial<SessionCredentials>): SessionFacts;
  snapshot(): SessionFacts;
}

/**
 * Mutable session seam. Mirrors accepted values to the legacy window globals
 * and localStorage keys that VTOP's own scripts and the storage layer read.
 */
export function createSessionFacts(
  initial: Partial<SessionFacts> = {},
): SessionFactsSource {
  let csrf = initial.csrf || '';
  let regNo = initial.regNo || '';
  const mode = initial.mode ?? detectSessionMode();

  const mirror = () => {
    if (typeof window !== 'undefined') {
      if (csrf) (window as any).csrfValue = csrf;
      if (regNo) (window as any).authorizedID = regNo;
    }
    if (typeof localStorage !== 'undefined' && regNo) {
      try {
        localStorage.setItem('retop_lastAuthId', regNo);
      } catch {}
    }
  };

  const snapshot = (): SessionFacts => ({ csrf, regNo, mode });

  return {
    get csrf() {
      return csrf;
    },
    get regNo() {
      return regNo;
    },
    get mode() {
      return mode;
    },
    snapshot,
    refresh() {
      const live = readSessionFactsFromDocument();
      if (isCsrf(live.csrf) && live.csrf !== csrf) csrf = live.csrf;
      if (isRegNo(live.regNo) && live.regNo !== regNo) regNo = live.regNo;
      mirror();
      return snapshot();
    },
    update(patch) {
      if (isCsrf(patch.csrf) && patch.csrf !== csrf) csrf = patch.csrf;
      if (isRegNo(patch.regNo) && patch.regNo !== regNo) regNo = patch.regNo;
      mirror();
      return snapshot();
    },
  };
}
