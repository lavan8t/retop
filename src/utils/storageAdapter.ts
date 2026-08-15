import { get as idbGet, set as idbSet, del as idbDel, entries as idbEntries } from "idb-keyval";

export const getStorageData = async (keys: string[]): Promise<Record<string, any>> => {
  const result: Record<string, any> = {};

  // 1. Read from IndexedDB for persistent/offline-first storage
  if (typeof indexedDB !== "undefined") {
    try {
      await Promise.all(
        keys.map(async (key) => {
          const val = await idbGet(key);
          if (val !== undefined && val !== null) {
            try {
              result[key] = typeof val === "string" ? JSON.parse(val) : val;
            } catch {
              result[key] = val;
            }
          }
        })
      );
    } catch (e) {
      // IndexedDB read fallback
    }
  }

  // 2. Fast local fallback for any keys missing in IDB
  for (const key of keys) {
    if (result[key] === undefined) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try {
            result[key] = JSON.parse(raw);
          } catch {
            result[key] = raw;
          }
        }
      } catch (e) {}
    }
  }

  return result;
};

export const setStorageData = async (data: Record<string, any>): Promise<void> => {
  // 1. Sync to IndexedDB
  if (typeof indexedDB !== "undefined") {
    try {
      await Promise.all(
        Object.entries(data).map(([key, val]) => idbSet(key, val))
      );
    } catch (e) {
      console.warn("[Storage Adapter] IndexedDB write failed", e);
    }
  }

  // 2. Mirror small values to localStorage for instant synchronous boots
  for (const [key, val] of Object.entries(data)) {
    try {
      const strVal = typeof val === "string" ? val : JSON.stringify(val);
      if (strVal.length < 500000) {
        localStorage.setItem(key, strVal);
      }
    } catch (e) {}
  }
};

export const getAllStorageData = async (): Promise<Record<string, any>> => {
  if (typeof indexedDB !== "undefined") {
    try {
      const entries = await idbEntries();
      if (entries.length > 0) {
        const idbData: Record<string, any> = {};
        for (const [k, v] of entries) {
          idbData[String(k)] = v;
        }
        return idbData;
      }
    } catch (e) {}
  }

  // Fallback to localStorage
  const fallback: Record<string, any> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          fallback[key] = JSON.parse(localStorage.getItem(key) || "");
        } catch {
          fallback[key] = localStorage.getItem(key);
        }
      }
    }
  } catch (e) {}

  return fallback;
};


