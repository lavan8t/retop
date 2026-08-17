import {
  get as idbGet,
  set as idbSet,
  del as idbDel,
  entries as idbEntries,
  clear as idbClear,
} from "idb-keyval";

const parseStored = (val: any) => {
  if (val === undefined || val === null) return val;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

const hasChromeStorage = (): boolean => {
  try {
    return (
      typeof chrome !== "undefined" &&
      Boolean(chrome?.runtime?.id) &&
      Boolean(chrome.storage) &&
      Boolean(chrome.storage.local)
    );
  } catch {
    return false;
  }
};

const isContextInvalidated = (e: any): boolean => {
  const msg = e?.message || String(e || "");
  return msg.toLowerCase().includes("extension context invalidated");
};

export const getStorageData = async (
  keys: string[],
): Promise<Record<string, any>> => {
  const result: Record<string, any> = {};

  // 1. Try reading from chrome.storage.local
  if (hasChromeStorage()) {
    try {
      const items = await new Promise<Record<string, any>>((resolve) => {
        chrome.storage.local.get(keys, (res) => {
          if (chrome.runtime?.lastError) {
            resolve({});
          } else {
            resolve(res || {});
          }
        });
      });
      for (const k of keys) {
        if (items[k] !== undefined && items[k] !== null) {
          result[k] = parseStored(items[k]);
        }
      }
    } catch (e: any) {
      if (!isContextInvalidated(e)) {
        console.warn("[Storage Adapter] chrome.storage.local read failed", e);
      }
    }
  }

  // 2. Check for any missing keys in IndexedDB
  const missingKeys = keys.filter(
    (k) => result[k] === undefined || result[k] === null,
  );
  if (missingKeys.length > 0 && typeof indexedDB !== "undefined") {
    try {
      await Promise.all(
        missingKeys.map(async (key) => {
          try {
            const val = await idbGet(key);
            if (val !== undefined && val !== null) {
              result[key] = parseStored(val);
              // Sync to chrome.storage.local if still active
              if (hasChromeStorage()) {
                chrome.storage.local.set({ [key]: val }).catch(() => {});
              }
            }
          } catch {}
        }),
      );
    } catch (e: any) {
      if (!isContextInvalidated(e)) {
        console.warn("[Storage Adapter] IndexedDB read failed", e);
      }
    }
  }

  // 3. Fallback to localStorage for any remaining missing keys
  const stillMissing = keys.filter(
    (k) => result[k] === undefined || result[k] === null,
  );
  if (stillMissing.length > 0 && typeof localStorage !== "undefined") {
    for (const key of stillMissing) {
      try {
        const item = localStorage.getItem(key);
        if (item !== null) {
          result[key] = parseStored(item);
        }
      } catch {}
    }
  }

  return result;
};

export const setStorageData = async (
  data: Record<string, any>,
): Promise<void> => {
  // 1. Write to chrome.storage.local
  if (hasChromeStorage()) {
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime?.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    } catch (e: any) {
      if (!isContextInvalidated(e)) {
        console.warn("[Storage Adapter] chrome.storage.local write failed", e);
      }
    }
  }

  // 2. Write to IndexedDB
  if (typeof indexedDB !== "undefined") {
    try {
      await Promise.all(
        Object.entries(data).map(([key, val]) => idbSet(key, val)),
      );
    } catch (e: any) {
      if (!isContextInvalidated(e)) {
        console.warn("[Storage Adapter] IndexedDB write failed", e);
      }
    }
  }

  // 3. Write to localStorage as safety backup
  if (typeof localStorage !== "undefined") {
    Object.entries(data).forEach(([k, v]) => {
      try {
        localStorage.setItem(
          k,
          typeof v === "string" ? v : JSON.stringify(v),
        );
      } catch {}
    });
  }
};

export const getAllStorageData = async (): Promise<Record<string, any>> => {
  const result: Record<string, any> = {};

  // 1. Read from chrome.storage.local
  if (hasChromeStorage()) {
    try {
      const items = await new Promise<Record<string, any>>((resolve) => {
        chrome.storage.local.get(null, (res) => {
          if (chrome.runtime?.lastError) resolve({});
          else resolve(res || {});
        });
      });
      for (const [k, v] of Object.entries(items)) {
        result[k] = parseStored(v);
      }
    } catch (e: any) {
      if (!isContextInvalidated(e)) {
        console.warn("[Storage Adapter] chrome.storage.local read all failed", e);
      }
    }
  }

  // 2. Read from IndexedDB
  if (typeof indexedDB !== "undefined") {
    try {
      const entries = await idbEntries();
      for (const [k, v] of entries) {
        if (result[String(k)] === undefined) {
          result[String(k)] = parseStored(v);
        }
      }
    } catch (e: any) {
      if (!isContextInvalidated(e)) {
        console.warn("[Storage Adapter] IndexedDB read all failed", e);
      }
    }
  }

  return result;
};

export const removeStorageKeys = async (keys: string[]): Promise<void> => {
  if (hasChromeStorage()) {
    try {
      chrome.storage.local.remove(keys);
    } catch (e) {}
  }
  if (typeof indexedDB !== "undefined") {
    try {
      await Promise.all(keys.map((k) => idbDel(k)));
    } catch (e) {}
  }
  if (typeof localStorage !== "undefined") {
    keys.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  }
};

export const clearAllStorage = async (): Promise<void> => {
  if (hasChromeStorage()) {
    try {
      chrome.storage.local.clear();
    } catch (e) {}
  }
  if (typeof indexedDB !== "undefined") {
    try {
      await idbClear();
    } catch (e) {}
  }
};
