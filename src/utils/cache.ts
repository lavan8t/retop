import { getStorageData, setStorageData, getAllStorageData, removeStorageKeys } from "./storageAdapter";
import { del as idbDel, entries as idbEntries } from "idb-keyval";
import { isSchemaStale, ParserModuleId, PARSER_SCHEMA_VERSIONS } from "../parsers/version";

const CACHE_PREFIX = "retop_cache_";
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days default TTL

export { isSchemaStale, PARSER_SCHEMA_VERSIONS };
export type { ParserModuleId };

export const getCachedDataWithTimestamp = async <T>(key: string): Promise<{ data: T; timestamp: number } | null> => {
  try {
    // Keys scoped to a user look like "<regNo|username>_<dataKey>" (6–15 char alphanum prefix)
    const isUserScoped = /^[A-Za-z0-9]{6,15}_/.test(key);
    const keysToTry: string[] = [
      `${CACHE_PREFIX}${key}`,
      key,
    ];

    if (!isUserScoped) {
      // If key is generic, check if active user has a scoped version
      try {
        const activeUser = localStorage.getItem("retop_active_user") || localStorage.getItem("retop_lastAuthId");
        if (activeUser) {
          keysToTry.unshift(`${CACHE_PREFIX}${activeUser}_${key}`, `${activeUser}_${key}`);
        }
      } catch {}
    }

    const storageRes = await getStorageData(keysToTry);
    let stored: any = undefined;

    for (const k of keysToTry) {
      if (storageRes[k] !== undefined && storageRes[k] !== null) {
        stored = storageRes[k];
        break;
      }
    }

    if (stored !== undefined && stored !== null) {
      if (typeof stored === "object" && stored.timestamp && stored.data !== undefined) {
        const age = Date.now() - stored.timestamp;
        if (stored.timestamp > 0 && age > CACHE_TTL) return null;
        return { data: stored.data as T, timestamp: stored.timestamp };
      }
      return { data: stored as T, timestamp: Date.now() };
    }
  } catch (e: any) {
    console.warn("[Storage Engine] Cache read failed", e);
  }

  return null;
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  const res = await getCachedDataWithTimestamp<T>(key);
  return res ? res.data : null;
};

export const setCachedData = async (key: string, data: any): Promise<void> => {
  const timestamp = Date.now();
  const cacheKey = `${CACHE_PREFIX}${key}`;

  try {
    await setStorageData({
      [cacheKey]: {
        timestamp,
        data,
      },
    });
  } catch (e: any) {
    console.error("[Storage Engine] Cache write failed", e);
  }
};

export const getAllCachedKeys = async (accountRegNo?: string): Promise<{ key: string; timestamp: number }[]> => {
  const result: { key: string; timestamp: number }[] = [];
  const targetReg = (
    accountRegNo ||
    (typeof document !== "undefined" && (document.getElementById("authorizedIDX") as HTMLInputElement)?.value) ||
    ""
  ).toLowerCase();

  try {
    const allData = await getAllStorageData();
    for (const [k, v] of Object.entries(allData)) {
      if (k.startsWith(CACHE_PREFIX) && v && typeof v === "object" && (v as any).timestamp) {
        const rawKey = k.substring(CACHE_PREFIX.length);
        const lowerRaw = rawKey.toLowerCase();
        
        // If an account is active, only show keys belonging to this account or generic keys
        if (targetReg) {
          const isUserKey = lowerRaw.startsWith(`${targetReg}_`);
          const isGeneric = !lowerRaw.match(/^[a-z0-9]{8,12}_/);
          if (!isUserKey && !isGeneric) continue;
        }

        result.push({ key: rawKey, timestamp: (v as any).timestamp });
      }
    }
  } catch (e) {
    console.error("[Storage Engine] getAllCachedKeys failed", e);
  }
  return result;
};

export const removeCacheKey = async (key: string): Promise<void> => {
  const cacheKey = key.startsWith(CACHE_PREFIX) ? key : `${CACHE_PREFIX}${key}`;
  try {
    await idbDel(cacheKey);
    await idbDel(key);
  } catch (e) {}
};

export const clearAccountCache = async (accountRegNo?: string): Promise<void> => {
  const regNo = (
    accountRegNo ||
    (typeof document !== "undefined" && (document.getElementById("authorizedIDX") as HTMLInputElement)?.value) ||
    ""
  ).toLowerCase();

  const allData = await getAllStorageData();
  const keysToRemove: string[] = [];

  for (const k of Object.keys(allData)) {
    const keyStr = String(k).toLowerCase();
    const matches = regNo
      ? (keyStr.startsWith(`${CACHE_PREFIX.toLowerCase()}${regNo}_`) ||
        keyStr.startsWith(`${regNo}_`) ||
        keyStr === `${regNo}_profileimage`)
      : keyStr.startsWith(CACHE_PREFIX.toLowerCase());
    if (matches) keysToRemove.push(k);
  }

  // localStorage is not covered by getAllStorageData, so check it separately.
  if (typeof localStorage !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const keyStr = String(k).toLowerCase();
      const matches = regNo
        ? (keyStr.startsWith(`${CACHE_PREFIX.toLowerCase()}${regNo}_`) ||
          keyStr.startsWith(`${regNo}_`) ||
          keyStr === `${regNo}_profileimage`)
        : keyStr.startsWith(CACHE_PREFIX.toLowerCase());
      if (matches && !keysToRemove.includes(k)) keysToRemove.push(k);
    }
  }

  try {
    await removeStorageKeys(keysToRemove);
  } catch (e) {
    console.warn("[Storage Engine] Account cache clear failed", e);
  }
};

export const clearCache = async (keyPrefix?: string): Promise<void> => {
  return clearAccountCache(keyPrefix);
};

