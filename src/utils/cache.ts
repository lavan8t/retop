import { getStorageData, setStorageData, getAllStorageData } from "./storageAdapter";
import { del as idbDel, entries as idbEntries } from "idb-keyval";

const CACHE_PREFIX = "retop_cache_";
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days default TTL

export const getCachedDataWithTimestamp = async <T>(key: string): Promise<{ data: T; timestamp: number } | null> => {
  try {
    const keysToTry: string[] = [
      `${CACHE_PREFIX}${key}`,
      key,
    ];

    // If key contains a user prefix (e.g. "21BCE0001_dashboard_stats"), also try un-prefixed versions
    const unPrefixed = key.replace(/^[A-Za-z0-9]+_/, "");
    if (unPrefixed !== key) {
      keysToTry.push(`${CACHE_PREFIX}${unPrefixed}`, unPrefixed);
    } else {
      // If key is un-prefixed, also try with active user authId prefix
      try {
        const activeUser = localStorage.getItem("retop_active_user") || localStorage.getItem("retop_lastAuthId");
        if (activeUser) {
          keysToTry.push(`${CACHE_PREFIX}${activeUser}_${key}`, `${activeUser}_${key}`);
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

    // Fallback: Check Zustand PWA sync storage ("portal-app-storage") in IndexedDB
    const portalRes = await getStorageData(["portal-app-storage"]);
    const portalPayload = portalRes["portal-app-storage"]?.state?.data || portalRes["portal-app-storage"]?.data;
    if (portalPayload && typeof portalPayload === "object") {
      const matchKey = unPrefixed.toLowerCase();
      if (matchKey.includes("stat") && portalPayload.stats) {
        return { data: portalPayload.stats as T, timestamp: Date.now() };
      }
      if (matchKey.includes("attendance") && portalPayload.attendance) {
        return { data: portalPayload.attendance as T, timestamp: Date.now() };
      }
      if (matchKey.includes("assignment") && portalPayload.assignments) {
        return { data: portalPayload.assignments as T, timestamp: Date.now() };
      }
      if (matchKey.includes("event") && portalPayload.events) {
        return { data: portalPayload.events as T, timestamp: Date.now() };
      }
      if (matchKey.includes("timetable") || matchKey.includes("tt_")) {
        if (portalPayload.ttCourses) return { data: portalPayload.ttCourses as T, timestamp: Date.now() };
      }
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

  try {
    const entries = await idbEntries();
    for (const [k] of entries) {
      const keyStr = String(k).toLowerCase();
      if (regNo) {
        // Only remove keys strictly prefixed with this account's regNo
        if (
          keyStr.startsWith(`${CACHE_PREFIX.toLowerCase()}${regNo}_`) ||
          keyStr.startsWith(`${regNo}_`) ||
          keyStr === `${regNo}_profileimage`
        ) {
          await idbDel(k);
        }
      } else {
        // Fallback: only remove generic cache entries
        if (keyStr.startsWith(CACHE_PREFIX.toLowerCase())) {
          await idbDel(k);
        }
      }
    }
  } catch (e) {
    console.warn("[Storage Engine] Account cache clear failed", e);
  }
};

export const clearCache = async (keyPrefix?: string): Promise<void> => {
  return clearAccountCache(keyPrefix);
};

