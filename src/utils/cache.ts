const CACHE_PREFIX = "retop_";
const CACHE_TTL = 24 * 60 * 60 * 1000;

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  if (typeof chrome === "undefined" || !chrome.storage) return null;

  const cacheKey = CACHE_PREFIX + key;

  return new Promise((resolve) => {
    chrome.storage.local.get(cacheKey, (result) => {
      const raw = result[cacheKey] as string;
      if (!raw) return resolve(null);

      try {
        const { timestamp, data } = JSON.parse(raw);
        const age = Date.now() - timestamp;

        if (age > CACHE_TTL) {
          console.log(`[Cache] Expired: ${key}`);
          chrome.storage.local.remove(cacheKey);
          return resolve(null);
        }

        resolve(data as T);
      } catch (e) {
        console.warn("Cache parse failed", e);
        resolve(null);
      }
    });
  });
};

export const setCachedData = (key: string, data: any): void => {
  if (typeof chrome === "undefined" || !chrome.storage) return;

  const cacheKey = CACHE_PREFIX + key;
  const payload = {
    timestamp: Date.now(),
    data: data,
  };

  try {
    chrome.storage.local.set({ [cacheKey]: JSON.stringify(payload) });
  } catch (e) {
    console.error("Cache write failed", e);
  }
};

export const clearCache = (keyPrefix?: string): void => {
  if (typeof chrome === "undefined" || !chrome.storage) return;

  chrome.storage.local.get(null, (items) => {
    const keysToRemove = Object.keys(items).filter((key) =>
      key.startsWith(CACHE_PREFIX + (keyPrefix || "")),
    );
    if (keysToRemove.length > 0) {
      chrome.storage.local.remove(keysToRemove);
    }
  });
};
