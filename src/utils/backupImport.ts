import {
  getAllStorageData,
  removeStorageKeys,
  setStorageData,
} from './storageAdapter';
import { currentCacheAccount } from './attendanceSemester';

export const BACKUP_SCHEMA_VERSION = 1;

interface RetopBackupV1 {
  version: typeof BACKUP_SCHEMA_VERSION;
  sourceRegNo: string;
  data: Record<string, unknown>;
}

export interface BackupImportResult {
  sourceRegNo: string;
  activeRegNo: string;
  importedKeys: string[];
  removedKeys: string[];
}

export class BackupImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupImportError';
  }
}

const REG_NO_SOURCE = '\\d{2}[A-Za-z]{2,5}\\d{4,5}';
const REG_NO = new RegExp(`^${REG_NO_SOURCE}$`, 'i');
const REG_PREFIX = new RegExp(`^(${REG_NO_SOURCE})_`, 'i');
const CALENDAR_KEY = new RegExp(
  `^(retop-cal-groups|retop-cal-selected-group|retop-cal-selected-sem|retop-tt-selected-sem)-(${REG_NO_SOURCE})(?:-|$)`,
  'i',
);
const CACHE_PREFIX = 'retop_cache_';
const PROFILE_SUFFIX = '_user_basic_profile';

const IDENTITY_KEYS = new Set([
  'retop_active_user',
  'retop_lastAuthId',
  'retop_cached_users',
  'retop_profileImage',
]);

// PIN records, photo keys, encrypted photos and any plaintext photo key are
// never part of a backup, regardless of where they appear.
const SENSITIVE_KEY =
  /^retop_pin_|^retop_photo_key_|^retop_img_|profileimage|(^|_)(photo|image|img|avatar|picture|pin)(_|$)|password|secret|token|cookie/i;
const PHOTO_FIELD = /(photo|image|img|avatar|picture|base64)/i;

const normalizeRegNo = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return REG_NO.test(trimmed) ? trimmed.toUpperCase() : '';
};

/** Scope comes from a real registration number, never from key length. */
const keyRegNo = (key: string): string => {
  const bare = key.toLowerCase().startsWith(CACHE_PREFIX)
    ? key.slice(CACHE_PREFIX.length)
    : key;
  const prefix = bare.match(REG_PREFIX);
  if (prefix) return prefix[1].toUpperCase();
  const calendar = key.match(CALENDAR_KEY);
  return calendar ? calendar[2].toUpperCase() : '';
};

/** Only active-account cache/profile/calendar entries may cross this seam. */
const isBackupKey = (key: string, expectedRegNo?: string): boolean => {
  if (!key || IDENTITY_KEYS.has(key)) return false;
  if (SENSITIVE_KEY.test(key)) return false;
  const lower = key.toLowerCase();
  const scoped =
    lower.startsWith(CACHE_PREFIX) ||
    REG_PREFIX.test(key) ||
    lower.endsWith(PROFILE_SUFFIX) ||
    CALENDAR_KEY.test(key);
  if (!scoped) return false;
  const regNo = keyRegNo(key);
  if (!regNo) return false;
  return !expectedRegNo || regNo.toUpperCase() === expectedRegNo.toUpperCase();
};

const stripPhotos = (value: any): any => {
  if (typeof value === 'string') {
    return /^data:image\//i.test(value) ? '' : value;
  }
  if (Array.isArray(value)) return value.map(stripPhotos);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) {
      if (PHOTO_FIELD.test(key)) continue;
      out[key] = stripPhotos(child);
    }
    return out;
  }
  return value;
};

const remapValue = (value: any, source: string, target: string): any => {
  if (typeof value === 'string') {
    return value.replace(new RegExp(source, 'gi'), target);
  }
  if (Array.isArray(value))
    return value.map((v) => remapValue(v, source, target));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = remapValue(child, source, target);
    }
    return out;
  }
  return value;
};

const getActiveRegNo = (): string => {
  // Same owner source and case as cache readers; no silent tier mismatch.
  const active = currentCacheAccount().trim();
  if (!normalizeRegNo(active)) {
    throw new BackupImportError(
      'No active offline account found. Open the account you want to restore, then try again.',
    );
  }
  return active;
};

const asEntries = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const parseBackup = (
  json: unknown,
): { sourceRegNo: string; entries: Record<string, unknown> } => {
  const root = asEntries(json);
  if (!root) {
    throw new BackupImportError(
      'Invalid backup file. Expected a retop backup object.',
    );
  }

  if (
    root.version === undefined ||
    root.version === null ||
    root.version === 0
  ) {
    const entries = root.version === 0 ? asEntries(root.data) || root : root;
    const sources = new Set<string>();
    for (const key of Object.keys(entries)) {
      if (isBackupKey(key)) sources.add(keyRegNo(key));
    }
    if (sources.size === 0) {
      throw new BackupImportError(
        'This backup is empty or has no account cache to restore.',
      );
    }
    if (sources.size > 1) {
      throw new BackupImportError(
        'This backup mixes data from multiple accounts and cannot be restored safely.',
      );
    }
    return { sourceRegNo: Array.from(sources)[0], entries };
  }

  if (root.version !== BACKUP_SCHEMA_VERSION) {
    throw new BackupImportError(
      'This backup was made by an unsupported version of retop.',
    );
  }

  const sourceRegNo = normalizeRegNo(root.sourceRegNo);
  const entries = asEntries(root.data);
  if (!sourceRegNo || !entries) {
    throw new BackupImportError(
      'Invalid backup file. Account information is missing.',
    );
  }

  for (const key of Object.keys(entries)) {
    if (isBackupKey(key) && keyRegNo(key) !== sourceRegNo) {
      throw new BackupImportError(
        'This backup contains data for a different account and cannot be restored safely.',
      );
    }
  }
  return { sourceRegNo, entries };
};

/** Includes localStorage-only preferences, not just adapter-backed tiers. */
const storageSnapshot = async (): Promise<Record<string, unknown>> => {
  const all: Record<string, unknown> = await getAllStorageData();
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && all[key] === undefined) {
        all[key] = localStorage.getItem(key);
      }
    }
  }
  return all;
};

/** Everything the active account could read after a restore, including orphans. */
const isActiveRestorableKey = (key: string, activeRegNo: string): boolean => {
  if (!key || IDENTITY_KEYS.has(key) || SENSITIVE_KEY.test(key)) return false;
  if (key.toLowerCase().startsWith(CACHE_PREFIX)) {
    const owner = keyRegNo(key);
    return !owner || owner.toUpperCase() === activeRegNo.toUpperCase();
  }
  return isBackupKey(key, activeRegNo);
};

const currentScopedKeys = async (activeRegNo: string): Promise<string[]> => {
  const all = await storageSnapshot();
  return Object.keys(all).filter((key) =>
    isActiveRestorableKey(key, activeRegNo),
  );
};

/** Creates a versioned backup containing only non-secret, scoped cache data. */
export async function createBackupJson(): Promise<string> {
  const activeRegNo = getActiveRegNo();
  const all = await storageSnapshot();
  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(all)) {
    if (isBackupKey(key, activeRegNo)) {
      data[key] = stripPhotos(value);
    }
  }
  if (Object.keys(data).length === 0) {
    throw new BackupImportError(
      'There is no offline cache for this account to back up yet.',
    );
  }

  const backup: RetopBackupV1 = {
    version: BACKUP_SCHEMA_VERSION,
    sourceRegNo: activeRegNo,
    data,
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Validates a backup and replaces only the active account's scoped cache keys.
 * Identity, PIN, photo-key and other-account records are never touched.
 */
export async function importBackup(json: unknown): Promise<BackupImportResult> {
  const { sourceRegNo, entries } = parseBackup(json);
  const activeRegNo = getActiveRegNo();

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (!isBackupKey(key, sourceRegNo)) continue;
    const targetKey = key.replace(new RegExp(sourceRegNo, 'gi'), activeRegNo);
    filtered[targetKey] = remapValue(
      stripPhotos(value),
      sourceRegNo,
      activeRegNo,
    );
  }

  if (Object.keys(filtered).length === 0) {
    throw new BackupImportError(
      'This backup has no cache data that can be restored for this account.',
    );
  }

  // Remove the active account's old scoped keys from every storage tier before
  // writing, otherwise a stale chrome.storage.local value wins on next load.
  const removedKeys = await currentScopedKeys(activeRegNo);
  await removeStorageKeys(removedKeys);
  await setStorageData(filtered);

  return {
    sourceRegNo,
    activeRegNo,
    importedKeys: Object.keys(filtered),
    removedKeys,
  };
}

/** Single entry point used by both extension and PWA import surfaces. */
export async function importBackupFromText(
  text: string,
): Promise<BackupImportResult> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupImportError(
      'Invalid backup file. The selected file is not valid JSON.',
    );
  }
  return importBackup(json);
}
