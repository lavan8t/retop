const CACHE_PREFIX = "vtop_remastered_";
const CACHE_TTL = 24 * 60 * 60 * 1000;

export const getCachedData = <T>(key: string): T | null => {
  if (typeof localStorage === "undefined") return null;

  const cacheKey = CACHE_PREFIX + key;
  const raw = localStorage.getItem(cacheKey);

  if (!raw) return null;

  try {
    const { timestamp, data } = JSON.parse(raw);
    const age = Date.now() - timestamp;

    if (age > CACHE_TTL) {
      console.log(`[Cache] Expired: ${key}`);
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data as T;
  } catch (e) {
    console.warn("Cache parse failed", e);
    return null;
  }
};

export const setCachedData = (key: string, data: any) => {
  if (typeof localStorage === "undefined") return;

  const cacheKey = CACHE_PREFIX + key;
  const payload = {
    timestamp: Date.now(),
    data: data,
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch (e) {
    console.error("Cache write failed (Quota exceeded?)", e);
  }
};

export const clearCache = (keyPrefix?: string) => {
  if (typeof localStorage === "undefined") return;

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(CACHE_PREFIX + (keyPrefix || ""))) {
      localStorage.removeItem(key);
    }
  });
};
