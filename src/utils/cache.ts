const CACHE_PREFIX = "retop_";
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

const DB_NAME = "RetopCacheDB";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = async (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("keys")) {
        db.createObjectStore("keys");
      }
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
};

const getEncryptionKey = async (): Promise<CryptoKey> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("keys", "readwrite");
    const store = tx.objectStore("keys");
    const req = store.get("master");
    req.onsuccess = async () => {
      if (req.result) {
        resolve(req.result);
      } else {
        const key = await crypto.subtle.generateKey(
          { name: "AES-GCM", length: 256 },
          false, // NON-EXTRACTABLE
          ["encrypt", "decrypt"]
        );
        const putReq = store.put(key, "master");
        putReq.onsuccess = () => resolve(key);
        putReq.onerror = () => reject(putReq.error);
      }
    };
    req.onerror = () => reject(req.error);
  });
};

const encryptData = async (data: string): Promise<{ ciphertext: ArrayBuffer, iv: Uint8Array }> => {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { ciphertext, iv };
};

const decryptData = async (ciphertext: ArrayBuffer, iv: Uint8Array): Promise<string> => {
  const key = await getEncryptionKey();
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
};

export const getCachedDataWithTimestamp = async <T>(key: string): Promise<{data: T, timestamp: number} | null> => {
  try {
    const db = await getDB();
    const tx = db.transaction("cache", "readonly");
    const store = tx.objectStore("cache");
    
    const payload = await new Promise<any>((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!payload) {
      return null;
    }

    const { timestamp, ciphertext, iv } = payload;
    const age = Date.now() - timestamp;
    
    if (timestamp > 0 && age > CACHE_TTL) {
       console.log(`[Cache] Expired: ${key}`);
       const delTx = db.transaction("cache", "readwrite");
       delTx.objectStore("cache").delete(key);
       return null;
    }

    const decryptedStr = await decryptData(ciphertext, iv);
    const parsed = JSON.parse(decryptedStr);
    return { data: parsed as T, timestamp };

  } catch (e) {
    console.warn("Cache parse failed", e);
    return null;
  }
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
   const res = await getCachedDataWithTimestamp<T>(key);
   return res ? res.data : null;
};

export const setCachedData = async (key: string, data: any): Promise<void> => {
  try {
    const { ciphertext, iv } = await encryptData(JSON.stringify(data));
    const payload = {
      timestamp: Date.now(),
      ciphertext,
      iv
    };
    const db = await getDB();
    const tx = db.transaction("cache", "readwrite");
    tx.objectStore("cache").put(payload, key);
  } catch (e) {
    console.error("Cache write failed", e);
  }
};

export const clearCache = (keyPrefix?: string): void => {
  getDB().then(db => {
    const tx = db.transaction("cache", "readwrite");
    const store = tx.objectStore("cache");
    if (!keyPrefix) {
      store.clear();
    } else {
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          if (cursor.key.toString().startsWith(keyPrefix)) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }
  });

  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(
        (key) =>
          key.startsWith(CACHE_PREFIX + (keyPrefix || "")) ||
          key.startsWith("retop_" + (keyPrefix || "")) ||
          key === "retop_crypto_key"
      );
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove);
      }
    });
  }
};

export const removeCacheKey = async (exactKey: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cache", "readwrite");
    const req = tx.objectStore("cache").delete(exactKey);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getAllCachedKeys = async (): Promise<{ key: string, timestamp: number }[]> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cache", "readonly");
    const store = tx.objectStore("cache");
    const req = store.openCursor();
    const results: { key: string, timestamp: number }[] = [];

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        if (cursor.value && cursor.value.timestamp) {
          results.push({ key: cursor.key.toString(), timestamp: cursor.value.timestamp });
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
};
