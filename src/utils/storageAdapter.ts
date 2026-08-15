import { get as idbGet, set as idbSet, del as idbDel, entries as idbEntries } from "idb-keyval";

export const isChromeExtensionValid = (): boolean => {
  try {
    return (
      typeof chrome !== "undefined" &&
      Boolean(chrome.runtime?.id) &&
      Boolean(chrome.storage?.local)
    );
  } catch (e) {
    return false;
  }
};

export const requestStorageFromBridge = async (keys?: string[], timeoutMs = 600): Promise<Record<string, any>> => {
  if (typeof window === "undefined") return {};

  return new Promise((resolve) => {
    const requestId = "retop_req_" + Math.random().toString(36).substring(2);
    let timer: any = null;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.source === window &&
        event.data &&
        (event.data.type === "RETOP_STORAGE_DATA" || event.data.type === "RETOP_ALL_STORAGE_DATA") &&
        event.data.requestId === requestId
      ) {
        clearTimeout(timer);
        window.removeEventListener("message", handleMessage);
        resolve(event.data.data || {});
      }
    };

    window.addEventListener("message", handleMessage);

    window.postMessage(
      {
        type: keys ? "RETOP_GET_STORAGE" : "RETOP_GET_ALL_STORAGE",
        keys,
        requestId,
      },
      window.location.origin
    );

    timer = setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      resolve({});
    }, timeoutMs);
  });
};

export const getStorageData = async (keys: string[]): Promise<Record<string, any>> => {
  const result: Record<string, any> = {};

  // 1. Read from localStorage as universal fast base
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          result[key] = JSON.parse(raw);
        } catch {
          result[key] = raw;
        }
      }
    } catch (e) {
      // Ignored in restricted contexts
    }
  }

  // 2. Read from IndexedDB for persistent/offline-first storage
  if (typeof indexedDB !== "undefined") {
    try {
      await Promise.all(
        keys.map(async (key) => {
          if (result[key] === undefined) {
            const val = await idbGet(key);
            if (val !== undefined && val !== null) {
              try {
                result[key] = typeof val === "string" ? JSON.parse(val) : val;
              } catch {
                result[key] = val;
              }
            }
          }
        })
      );
    } catch (e) {
      // IndexedDB read fallback
    }
  }

  // 3. Overlay with chrome.storage.local if extension runtime is valid and active
  if (isChromeExtensionValid()) {
    try {
      await new Promise<void>((resolve) => {
        chrome.storage.local.get(keys, (res) => {
          if (chrome.runtime.lastError) {
            resolve();
            return;
          }
          if (res) {
            for (const k of keys) {
              if (res[k] !== undefined) {
                result[k] = res[k];
              }
            }
          }
          resolve();
        });
      });
    } catch (e) {
      // Safely ignore extension context invalidation during extension reloads
    }
  }

  // 4. Query bridge for any keys still missing (covers offline.html + web.app + localhost)
  if (typeof window !== "undefined") {
    const missingKeys = keys.filter((k) => result[k] === undefined);
    if (missingKeys.length > 0) {
      const bridgeData = await requestStorageFromBridge(missingKeys, 600);
      for (const k of missingKeys) {
        if (bridgeData[k] !== undefined) {
          result[k] = bridgeData[k];
        }
      }
    }
  }

  return result;
};

export const setStorageData = async (data: Record<string, any>): Promise<void> => {
  // 1. Sync to localStorage
  for (const [key, val] of Object.entries(data)) {
    try {
      const strVal = typeof val === "string" ? val : JSON.stringify(val);
      // Skip very large raw cache blobs (>500KB) in localStorage to prevent QuotaExceededError
      if (strVal.length < 500000) {
        localStorage.setItem(key, strVal);
      }
    } catch (e) {
      // Ignored if storage quota exceeded or in restricted context
    }
  }

  // 2. Sync to IndexedDB (unlimited storage for offline PWA)
  if (typeof indexedDB !== "undefined") {
    try {
      await Promise.all(
        Object.entries(data).map(([key, val]) => idbSet(key, val))
      );
    } catch (e) {
      console.warn("[Storage Adapter] IndexedDB write failed", e);
    }
  }

  // 3. Sync to chrome.storage.local if extension runtime is present & valid
  if (isChromeExtensionValid()) {
    try {
      await new Promise<void>((resolve) => {
        let safeData = data;
        try { safeData = JSON.parse(JSON.stringify(data)); } catch {}
        chrome.storage.local.set(safeData, () => resolve());
      });
    } catch (e) {
      // Ignore extension context invalidation
    }
  } else if (typeof window !== "undefined") {
    // 4. Post message to extension content script bridge if present on web app page
    try {
      window.postMessage({ type: "RETOP_SET_STORAGE", data }, window.location.origin);
    } catch (e) {}
  }
};

export const getAllStorageData = async (): Promise<Record<string, any>> => {
  // 1. If in extension, use chrome.storage directly
  if (isChromeExtensionValid()) {
    try {
      return await new Promise((resolve) => {
        chrome.storage.local.get(null, (res) => {
          if (chrome.runtime.lastError) {
            resolve({});
            return;
          }
          resolve(res || {});
        });
      });
    } catch (e) {
      // Fallback below
    }
  }

  // 2. If in browser/PWA context, read from IndexedDB
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
  
  // 3. If in web app context, fetch ALL via bridge
  if (typeof window !== "undefined") {
    return await requestStorageFromBridge(undefined, 600);
  }
  
  return {};
};

