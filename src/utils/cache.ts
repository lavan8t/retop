import { getStorageData, setStorageData, getAllStorageData, isChromeExtensionValid } from "./storageAdapter";

const CACHE_PREFIX = "retop_cache_";
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days default TTL

export const getCachedDataWithTimestamp = async <T>(key: string): Promise<{ data: T; timestamp: number } | null> => {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const storageRes = await getStorageData([cacheKey, key]);
    const stored = storageRes[cacheKey] !== undefined ? storageRes[cacheKey] : storageRes[key];

    if (stored !== undefined && stored !== null) {
      if (typeof stored === "object" && stored.timestamp && stored.data !== undefined) {
        const age = Date.now() - stored.timestamp;
        if (stored.timestamp > 0 && age > CACHE_TTL) return null;
        return { data: stored.data as T, timestamp: stored.timestamp };
      }
      return { data: stored as T, timestamp: Date.now() };
    }
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    if (!msg.includes("Extension context invalidated")) {
      console.warn("[Storage Engine] Cache read failed", e);
    }
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
    const msg = String(e?.message || e || "");
    if (!msg.includes("Extension context invalidated")) {
      console.error("[Storage Engine] Cache write failed", e);
    }
  }
};

export const getAllCachedKeys = async (): Promise<{ key: string; timestamp: number }[]> => {
  const result: { key: string; timestamp: number }[] = [];
  try {
    const allData = await getAllStorageData();
    for (const [k, v] of Object.entries(allData)) {
      if (k.startsWith(CACHE_PREFIX) && v && typeof v === "object" && (v as any).timestamp) {
        const rawKey = k.substring(CACHE_PREFIX.length);
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
  if (isChromeExtensionValid()) {
    try {
      await new Promise<void>((resolve) => {
        chrome.storage.local.remove([cacheKey, key], () => resolve());
      });
    } catch (e) {}
  }
  try {
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(key);
  } catch (e) {}
};

export const clearCache = (keyPrefix?: string): void => {
  if (isChromeExtensionValid()) {
    try {
      chrome.storage.local.get(null, (items) => {
        if (chrome.runtime.lastError) return;
        const target = keyPrefix ? `${CACHE_PREFIX}${keyPrefix}` : CACHE_PREFIX;
        const keysToRemove = Object.keys(items || {}).filter(
          (k) => k.startsWith(target) || k.startsWith("retop_")
        );
        if (keysToRemove.length > 0) {
          chrome.storage.local.remove(keysToRemove);
        }
      });
    } catch (e) {}
  }

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("retop_") || k.startsWith(CACHE_PREFIX))) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {}
};
