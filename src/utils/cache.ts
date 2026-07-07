const CACHE_PREFIX = "retop_";
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

const getEncryptionKey = async (): Promise<CryptoKey> => {
  return new Promise((resolve) => {
    chrome.storage.local.get('retop_crypto_key', async (result) => {
      if (result.retop_crypto_key) {
        const keyData = new Uint8Array(result.retop_crypto_key as number[]);
        const key = await crypto.subtle.importKey(
          'raw',
          keyData,
          'AES-GCM',
          true,
          ['encrypt', 'decrypt']
        );
        resolve(key);
      } else {
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        const exported = await crypto.subtle.exportKey('raw', key);
        chrome.storage.local.set({ retop_crypto_key: Array.from(new Uint8Array(exported)) }, () => {
          resolve(key);
        });
      }
    });
  });
};

const encryptData = async (data: string): Promise<string> => {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  
  const payload = new Uint8Array(iv.length + ciphertext.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ciphertext), iv.length);
  
  let binary = '';
  for (let i = 0; i < payload.byteLength; i++) {
    binary += String.fromCharCode(payload[i]);
  }
  return btoa(binary);
};

const decryptData = async (encryptedBase64: string): Promise<string> => {
  const key = await getEncryptionKey();
  const binary = atob(encryptedBase64);
  const payload = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    payload[i] = binary.charCodeAt(i);
  }
  const iv = payload.slice(0, 12);
  const ciphertext = payload.slice(12);
  
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  if (typeof chrome === "undefined" || !chrome.storage) return null;

  const cacheKey = CACHE_PREFIX + key;

  return new Promise((resolve) => {
    chrome.storage.local.get(cacheKey, async (result) => {
      const raw = result[cacheKey] as string;
      if (!raw) return resolve(null);

      try {
        const parsed = JSON.parse(raw);
        const timestamp = parsed.timestamp || 0;
        let data = parsed.data !== undefined ? parsed.data : parsed;
        
        if (parsed.encrypted && typeof data === 'string') {
          try {
            data = JSON.parse(await decryptData(data));
          } catch (e) {
            console.warn("Decryption failed for", key, e);
            return resolve(null);
          }
        }

        const age = Date.now() - timestamp;

        if (timestamp > 0 && age > CACHE_TTL) {
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

export const getCachedDataWithTimestamp = async <T>(key: string): Promise<{data: T, timestamp: number} | null> => {
  if (typeof chrome === "undefined" || !chrome.storage) return null;

  const cacheKey = CACHE_PREFIX + key;

  return new Promise((resolve) => {
    chrome.storage.local.get(cacheKey, async (result) => {
      const raw = result[cacheKey] as string;
      if (!raw) return resolve(null);

      try {
        const parsed = JSON.parse(raw);
        const timestamp = parsed.timestamp || 0;
        let data = parsed.data !== undefined ? parsed.data : parsed;
        
        if (parsed.encrypted && typeof data === 'string') {
          try {
            data = JSON.parse(await decryptData(data));
          } catch (e) {
            console.warn("Decryption failed for", key, e);
            return resolve(null);
          }
        }

        const age = Date.now() - timestamp;

        if (timestamp > 0 && age > CACHE_TTL) {
          console.log(`[Cache] Expired: ${key}`);
          chrome.storage.local.remove(cacheKey);
          return resolve(null);
        }

        resolve({ data: data as T, timestamp });
      } catch (e) {
        console.warn("Cache parse failed", e);
        resolve(null);
      }
    });
  });
};

export const setCachedData = async (key: string, data: any): Promise<void> => {
  if (typeof chrome === "undefined" || !chrome.storage) return;

  const cacheKey = CACHE_PREFIX + key;
  try {
    const encrypted = await encryptData(JSON.stringify(data));
    const payload = {
      timestamp: Date.now(),
      data: encrypted,
      encrypted: true
    };
    chrome.storage.local.set({ [cacheKey]: JSON.stringify(payload) });
  } catch (e) {
    console.error("Cache write failed", e);
  }
};

export const clearCache = (keyPrefix?: string): void => {
  if (typeof chrome === "undefined" || !chrome.storage) return;

  chrome.storage.local.get(null, (items) => {
    const keysToRemove = Object.keys(items).filter(
      (key) =>
        key.startsWith(CACHE_PREFIX + (keyPrefix || "")) ||
        key.startsWith("retop_" + (keyPrefix || "")),
    );
    if (keysToRemove.length > 0) {
      chrome.storage.local.remove(keysToRemove);
    }
  });
};
