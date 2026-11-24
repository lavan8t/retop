import {
  getStorageData,
  setStorageData,
  getAllStorageData,
  removeStorageKeys,
} from './storageAdapter';
import {
  isSchemaStale,
  ParserModuleId,
  PARSER_SCHEMA_VERSIONS,
} from '../parsers/version';
import { readSessionFactsFromDocument } from './sessionFacts';
import { REG_NO_PATTERN } from './loginValidation';
import {
  ANONYMOUS_ACCOUNT,
  currentAuthId,
  currentCacheAccount,
} from './attendanceSemester';

/** Registration number for key scoping; explicit account wins over DOM. */
const scopedRegNo = (accountRegNo?: string): string =>
  (
    accountRegNo ||
    (typeof document !== 'undefined'
      ? readSessionFactsFromDocument().regNo
      : '') ||
    ''
  ).toLowerCase();

const CACHE_PREFIX = 'retop_cache_';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days default TTL

export { isSchemaStale, PARSER_SCHEMA_VERSIONS };
export type { ParserModuleId };

/** The owner segment can itself contain an underscore (offline fallback). */
const ownerOf = (key: string): string => {
  if (key.startsWith(`${ANONYMOUS_ACCOUNT}_`)) return ANONYMOUS_ACCOUNT;
  const separator = key.indexOf('_');
  return separator > 0 ? key.slice(0, separator) : '';
};

export const isAccountScope = (scope: string): boolean =>
  REG_NO_PATTERN.test(scope) || scope === ANONYMOUS_ACCOUNT;

/** A cache key is user-scoped only when its owner segment is a real account. */
export const isUserScopedCacheKey = (key: string): boolean =>
  isAccountScope(ownerOf(key));

/** One place that turns a logical key into an account-owned cache key. */
export const scopedCacheKey = (
  key: string,
  accountId: string = currentCacheAccount(),
): string => {
  const logical = key.startsWith(CACHE_PREFIX)
    ? key.slice(CACHE_PREFIX.length)
    : key;
  if (isUserScopedCacheKey(logical)) return logical;
  const scope = isAccountScope(accountId) ? accountId : currentCacheAccount();
  return `${scope}_${logical}`;
};

const cacheKeysFor = (key: string): string[] => [`${CACHE_PREFIX}${key}`, key];

const firstStored = (
  storage: Record<string, any>,
  keys: string[],
): any | undefined => {
  for (const key of keys) {
    if (storage[key] !== undefined && storage[key] !== null) {
      return storage[key];
    }
  }
  return undefined;
};

/**
 * Unowned legacy copies cannot be attributed to a student, so a read deletes
 * them instead of adopting them into whichever account happens to be active.
 */
const removeLegacyGeneric = async (scopedKey: string): Promise<void> => {
  const owner = ownerOf(scopedKey);
  if (!owner) return;
  const baseKey = scopedKey.slice(owner.length + 1);
  if (!baseKey) return;
  const legacyKeys = cacheKeysFor(baseKey);
  const legacy = await getStorageData(legacyKeys);
  if (legacyKeys.some((key) => legacy[key] !== undefined)) {
    await removeStorageKeys(legacyKeys);
  }
};

export const getCachedDataWithTimestamp = async <T>(
  key: string,
): Promise<{ data: T; timestamp: number } | null> => {
  try {
    const scope = currentCacheAccount();
    const effectiveKey = scopedCacheKey(key, scope);
    const keysToTry = cacheKeysFor(effectiveKey);

    const storageRes = await getStorageData(keysToTry);
    const stored = firstStored(storageRes, keysToTry);
    await removeLegacyGeneric(effectiveKey);

    if (stored !== undefined) {
      if (
        typeof stored === 'object' &&
        stored.timestamp &&
        stored.data !== undefined
      ) {
        const age = Date.now() - stored.timestamp;
        if (stored.timestamp > 0 && age > CACHE_TTL) return null;
        return { data: stored.data as T, timestamp: stored.timestamp };
      }
      return { data: stored as T, timestamp: Date.now() };
    }
  } catch (e: any) {
    console.warn('[Storage Engine] Cache read failed', e);
  }

  return null;
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  const res = await getCachedDataWithTimestamp<T>(key);
  return res ? res.data : null;
};

export const setCachedData = async (key: string, data: any): Promise<void> => {
  const timestamp = Date.now();
  // Generic writes are gone: every record has one account owner.
  const cacheKey = `${CACHE_PREFIX}${scopedCacheKey(key)}`;

  try {
    await setStorageData({
      [cacheKey]: {
        timestamp,
        data,
      },
    });
  } catch (e: any) {
    console.error('[Storage Engine] Cache write failed', e);
  }
};

export const getAllCachedKeys = async (
  accountRegNo?: string,
): Promise<{ key: string; timestamp: number }[]> => {
  const result: { key: string; timestamp: number }[] = [];
  const targetReg = scopedRegNo(accountRegNo);

  try {
    const allData = await getAllStorageData();
    for (const [k, v] of Object.entries(allData)) {
      if (
        k.startsWith(CACHE_PREFIX) &&
        v &&
        typeof v === 'object' &&
        (v as any).timestamp
      ) {
        const rawKey = k.substring(CACHE_PREFIX.length);
        const lowerRaw = rawKey.toLowerCase();

        // A generic key is one whose owner segment is not a registration number.
        const isGeneric = !isUserScopedCacheKey(rawKey);
        const isUserKey = targetReg
          ? lowerRaw.startsWith(`${targetReg}_`)
          : false;
        if (targetReg && !isUserKey && !isGeneric) continue;

        result.push({ key: rawKey, timestamp: (v as any).timestamp });
      }
    }
  } catch (e) {
    console.error('[Storage Engine] getAllCachedKeys failed', e);
  }
  return result;
};

export const removeCacheKey = async (key: string): Promise<void> => {
  const cacheKey = key.startsWith(CACHE_PREFIX) ? key : `${CACHE_PREFIX}${key}`;
  // The same key is written to chrome.storage, IndexedDB and localStorage, so it
  // has to be removed from all three or the next read resurrects it.
  await removeStorageKeys([cacheKey, key]);
};

export const clearAccountCache = async (
  accountRegNo?: string,
): Promise<void> => {
  const regNo = (
    accountRegNo ||
    currentAuthId() ||
    ANONYMOUS_ACCOUNT
  ).toLowerCase();
  const scopedLocalPrefixes = [
    `retop-cal-groups-${regNo}-`,
    `retop-cal-selected-group-${regNo}`,
    `retop-cal-selected-sem-${regNo}`,
    `retop-tt-selected-sem-${regNo}`,
  ];
  const legacyPreferences = new Set([
    'retop-cal-selected-group',
    'retop-cal-selected-sem',
    'retop-tt-selected-sem',
  ]);

  const matches = (k: string): boolean => {
    const lower = String(k).toLowerCase();
    if (legacyPreferences.has(lower)) return true;
    if (scopedLocalPrefixes.some((prefix) => lower.startsWith(prefix))) {
      return true;
    }

    const cacheRaw = lower.startsWith(CACHE_PREFIX)
      ? String(k).substring(CACHE_PREFIX.length)
      : null;

    // Generic copies must die with the account's scoped copies or the next
    // offline read would expose unowned data.
    if (cacheRaw !== null) {
      if (!isUserScopedCacheKey(cacheRaw)) return true;
      return cacheRaw.toLowerCase().startsWith(`${regNo}_`);
    }
    return lower.startsWith(`${regNo}_`) || lower === `${regNo}_profileimage`;
  };

  const genericLogicalKey = (k: string): string | null => {
    if (!k.startsWith(CACHE_PREFIX)) return null;
    const logical = k.substring(CACHE_PREFIX.length);
    return isUserScopedCacheKey(logical) ? null : logical;
  };
  const keysToRemove = new Set<string>();
  const collect = (k: string) => {
    if (matches(k)) keysToRemove.add(k);
    const generic = genericLogicalKey(k);
    if (generic) keysToRemove.add(generic);
  };

  const allData = await getAllStorageData();
  for (const k of Object.keys(allData)) collect(k);

  // localStorage is not covered by getAllStorageData, so check it separately.
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) collect(k);
    }
  }

  try {
    await removeStorageKeys(Array.from(keysToRemove));
  } catch (e) {
    console.warn('[Storage Engine] Account cache clear failed', e);
  }
};

export const clearCache = async (keyPrefix?: string): Promise<void> => {
  return clearAccountCache(keyPrefix);
};
