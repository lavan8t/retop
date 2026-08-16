import { get as idbGet, set as idbSet, del as idbDel, entries as idbEntries, clear as idbClear } from "idb-keyval";

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

export const getStorageData = async (keys: string[]): Promise<Record<string, any>> => {
  const result: Record<string, any> = {};

  if (typeof indexedDB === "undefined") return result;

  try {
    await Promise.all(
      keys.map(async (key) => {
        const val = await idbGet(key);
        if (val !== undefined && val !== null) {
          result[key] = parseStored(val);
        }
      })
    );
  } catch (e) {
    console.warn("[Storage Adapter] IndexedDB read failed", e);
  }

  return result;
};

export const setStorageData = async (data: Record<string, any>): Promise<void> => {
  if (typeof indexedDB === "undefined") return;

  try {
    await Promise.all(
      Object.entries(data).map(([key, val]) => idbSet(key, val))
    );
  } catch (e) {
    console.warn("[Storage Adapter] IndexedDB write failed", e);
  }
};

export const getAllStorageData = async (): Promise<Record<string, any>> => {
  const result: Record<string, any> = {};

  if (typeof indexedDB === "undefined") return result;

  try {
    const entries = await idbEntries();
    for (const [k, v] of entries) {
      result[String(k)] = parseStored(v);
    }
  } catch (e) {
    console.warn("[Storage Adapter] IndexedDB read all failed", e);
  }

  return result;
};

export const removeStorageKeys = async (keys: string[]): Promise<void> => {
  if (typeof indexedDB === "undefined") return;
  try {
    await Promise.all(keys.map((k) => idbDel(k)));
  } catch (e) {}
};

export const clearAllStorage = async (): Promise<void> => {
  if (typeof indexedDB === "undefined") return;
  try {
    await idbClear();
  } catch (e) {}
};



