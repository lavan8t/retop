import { get as idbGet, set as idbSet } from 'idb-keyval';
import {
  getStorageData,
  setStorageData,
  removeStorageKeys,
  getAllStorageData,
} from './storageAdapter';
import { stripProfilePhotosForCache } from './profileCache';

const PIN_VERSION = 1;
const PIN_ALGORITHM = 'PBKDF2-SHA-256' as const;
const PIN_ITERATIONS = 100_000;
const PIN_KEY_BITS = 256;

const CIPHER_V2 = 'enc2_';
const CIPHER_V1 = 'enc_';

/** Current PIN record format. Older records only have salt/hash. */
export interface PinRecord {
  version: typeof PIN_VERSION;
  algorithm: typeof PIN_ALGORITHM;
  iterations: number;
  salt: string;
  hash: string;
}

interface LegacyPinRecord {
  salt: string;
  hash: string;
}

export type StoredPinRecord = PinRecord | LegacyPinRecord;

const toHex = (buf: ArrayBuffer | ArrayBufferView): string => {
  const bytes = ArrayBuffer.isView(buf)
    ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    : new Uint8Array(buf);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const asArrayBuffer = (value: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
};

const fromHex = (value: string): Uint8Array => {
  if (!value || value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) {
    throw new Error('Invalid hex value');
  }
  const bytes = value.match(/.{2}/g);
  if (!bytes) throw new Error('Invalid hex value');
  return new Uint8Array(bytes.map((b) => parseInt(b, 16)));
};

const pinStorageKey = (regNo: string): string =>
  `retop_pin_${regNo.trim().toLowerCase()}`;
const imageStorageKey = (regNo: string): string =>
  `retop_img_${regNo.trim().toLowerCase()}`;
const photoKeyIdbKey = (regNo: string): string =>
  `retop_photo_key_${regNo.trim().toLowerCase()}`;
const GLOBAL_PHOTO_KEY = 'retop_profileImage';
const CACHED_USERS_KEY = 'retop_cached_users';
const migratedScopedPhotos = new Set<string>();

const derivePinBits = async (pin: string, salt: Uint8Array) => {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    asArrayBuffer(new TextEncoder().encode(pin)),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: asArrayBuffer(salt),
      iterations: PIN_ITERATIONS,
    },
    baseKey,
    PIN_KEY_BITS,
  );
};

// The one-pass SHA-256 format already in users' storage.
const legacyPinHash = async (
  pin: string,
  regNo: string,
  salt: string,
): Promise<string> =>
  toHex(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`retop_${regNo.toLowerCase()}_${pin}_${salt}`),
    ),
  );

const isVersionedPinRecord = (raw: StoredPinRecord): raw is PinRecord =>
  (raw as PinRecord).version === PIN_VERSION &&
  (raw as PinRecord).algorithm === PIN_ALGORITHM &&
  typeof (raw as PinRecord).iterations === 'number';

/**
 * Computes a versioned PBKDF2-SHA-256 record for a 4-digit PIN.
 */
export async function hashPin(
  pin: string,
  regNo: string,
  existingSalt?: string,
): Promise<PinRecord> {
  const salt =
    existingSalt || toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = toHex(await derivePinBits(pin, fromHex(salt)));
  return {
    version: PIN_VERSION,
    algorithm: PIN_ALGORITHM,
    iterations: PIN_ITERATIONS,
    salt,
    hash,
  };
}

const importAesKey = async (raw: Uint8Array, usages: KeyUsage[]) =>
  crypto.subtle.importKey(
    'raw',
    asArrayBuffer(raw),
    { name: 'AES-GCM' },
    false,
    usages,
  );

const readPhotoKeyRaw = async (regNo: string): Promise<Uint8Array | null> => {
  const stored = await idbGet(photoKeyIdbKey(regNo));
  if (stored instanceof Uint8Array) return new Uint8Array(stored);
  if (Array.isArray(stored)) return Uint8Array.from(stored);
  if (typeof stored === 'string') {
    try {
      return fromHex(stored);
    } catch {
      return null;
    }
  }
  return null;
};

/** Photo keys live only in IndexedDB, never in the relayed storage tiers. */
const loadPhotoKey = async (
  regNo: string,
  create = true,
): Promise<CryptoKey | null> => {
  const existing = await readPhotoKeyRaw(regNo);
  if (existing) return importAesKey(existing, ['encrypt', 'decrypt']);
  if (!create) return null;
  const raw = crypto.getRandomValues(new Uint8Array(32));
  await idbSet(photoKeyIdbKey(regNo), raw);
  return importAesKey(raw, ['encrypt', 'decrypt']);
};

// Domain-separated from the PIN hash by a different PBKDF2 salt.
const derivePhotoKeyRaw = async (
  pin: string,
  regNo: string,
  salt: string,
): Promise<Uint8Array> =>
  new Uint8Array(
    await derivePinBits(
      pin,
      new TextEncoder().encode(`retop_photo_${regNo.toLowerCase()}_${salt}`),
    ),
  );

interface Envelope {
  iv: Uint8Array;
  data: Uint8Array;
}

const parseEnvelope = (value: string): Envelope | null => {
  const prefix = value.startsWith(CIPHER_V2)
    ? CIPHER_V2
    : value.startsWith(CIPHER_V1)
      ? CIPHER_V1
      : null;
  if (!prefix) return null;
  const parts = value.slice(prefix.length).split('_');
  if (parts.length !== 2) return null;
  try {
    return { iv: fromHex(parts[0]), data: fromHex(parts[1]) };
  } catch {
    return null;
  }
};

const decryptWithKey = async (
  envelope: string,
  key: CryptoKey,
): Promise<string> => {
  const parsed = parseEnvelope(envelope);
  if (!parsed) return '';
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asArrayBuffer(parsed.iv) },
      key,
      asArrayBuffer(parsed.data),
    );
    return new TextDecoder().decode(plain);
  } catch (e) {
    console.warn('Failed to decrypt user data', e);
    return '';
  }
};

const legacyPhotoKey = async (regNo: string): Promise<CryptoKey> => {
  const material = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`retop_enc_key_${regNo.toLowerCase()}`),
  );
  return importAesKey(new Uint8Array(material), ['decrypt']);
};

const encryptWithKey = async (
  text: string,
  key: CryptoKey,
): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asArrayBuffer(iv) },
    key,
    asArrayBuffer(new TextEncoder().encode(text)),
  );
  return `${CIPHER_V2}${toHex(iv)}_${toHex(encrypted)}`;
};

/** Replaces the account photo key with one bound to the entered PIN. */
const bindPhotoKeyToPin = async (
  regNo: string,
  pin: string,
  salt: string,
): Promise<void> => {
  const previous = await readPhotoKeyRaw(regNo).catch(() => null);
  const next = await derivePhotoKeyRaw(pin, regNo, salt);

  let rewrapped: string | null = null;
  try {
    const stored = await getStorageData([imageStorageKey(regNo)]);
    const envelope = stored[imageStorageKey(regNo)];
    if (typeof envelope === 'string' && envelope) {
      let plain = '';
      if (envelope.startsWith(CIPHER_V2)) {
        if (!previous) return; // Cannot rewrap without the old key; keep the photo intact.
        plain = await decryptWithKey(
          envelope,
          await importAesKey(previous, ['decrypt']),
        );
      } else if (envelope.startsWith(CIPHER_V1)) {
        plain = await decryptWithKey(envelope, await legacyPhotoKey(regNo));
      }
      if (!plain.startsWith('data:image')) return;
      rewrapped = await encryptWithKey(
        plain,
        await importAesKey(next, ['encrypt']),
      );
    }
  } catch (e) {
    console.warn('[pinSecurity] Could not rewrap profile photo', e);
    return;
  }

  await idbSet(photoKeyIdbKey(regNo), next);
  if (rewrapped) {
    await setStorageData({ [imageStorageKey(regNo)]: rewrapped });
  }
};

/**
 * Saves an encrypted/hashed PIN for a given regNo and binds the photo key to it.
 */
export async function saveUserPin(
  regNo: string,
  pin: string,
): Promise<PinRecord> {
  const record = await hashPin(pin, regNo);
  await setStorageData({ [pinStorageKey(regNo)]: record });
  await bindPhotoKeyToPin(regNo, pin, record.salt).catch(() => {});
  return record;
}

/**
 * Retrieves the PIN record for a given regNo, migrating a legacy plaintext PIN.
 */
export async function getUserPinRecord(
  regNo: string,
): Promise<StoredPinRecord | null> {
  const key = pinStorageKey(regNo);
  const res = await getStorageData([key]);
  const raw = res[key];

  if (!raw) return null;

  if (typeof raw === 'object' && raw.salt && raw.hash) {
    return raw as StoredPinRecord;
  }

  // Support legacy plain-text pin migration if present
  if (typeof raw === 'string' && raw.length === 4) {
    return await saveUserPin(regNo, raw);
  }

  return null;
}

/**
 * Verifies an entered PIN. Legacy SHA-256 records are upgraded in place after a
 * successful match, and the photo key is rebound on every successful unlock.
 */
export async function verifyUserPin(
  regNo: string,
  enteredPin: string,
): Promise<boolean> {
  const record = await getUserPinRecord(regNo);
  if (!record) return false;

  let valid: boolean;
  if (isVersionedPinRecord(record)) {
    const computed = toHex(
      await derivePinBits(enteredPin, fromHex(record.salt)),
    );
    valid = computed === record.hash;
  } else {
    valid =
      (await legacyPinHash(enteredPin, regNo, record.salt)) === record.hash;
    if (valid) {
      await setStorageData({
        [pinStorageKey(regNo)]: await hashPin(enteredPin, regNo, record.salt),
      });
    }
  }

  if (!valid) return false;
  await bindPhotoKeyToPin(regNo, enteredPin, record.salt).catch(() => {});
  return true;
}

/**
 * Encrypts sensitive string data with AES-GCM using the account photo key.
 * Fails closed: crypto/key errors propagate instead of leaking plaintext.
 */
export async function encryptUserData(
  text: string,
  regNo: string,
): Promise<string> {
  if (!text) return '';
  const key = await loadPhotoKey(regNo);
  return encryptWithKey(text, key!);
}

/**
 * Decrypts AES-GCM encrypted user string data. Legacy regNo-keyed ciphertext
 * is still readable; anything unrecognized or invalid yields ''.
 */
export async function decryptUserData(
  cipherText: string,
  regNo: string,
): Promise<string> {
  if (!cipherText) return '';
  if (cipherText.startsWith(CIPHER_V2)) {
    try {
      const key = await loadPhotoKey(regNo, false);
      return key ? decryptWithKey(cipherText, key) : '';
    } catch {
      return '';
    }
  }
  if (cipherText.startsWith(CIPHER_V1)) {
    try {
      return await decryptWithKey(cipherText, await legacyPhotoKey(regNo));
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Persists an encrypted profile image into IndexedDB mapped by registration number
 */
export async function saveUserProfileImage(
  regNo: string,
  base64Data: string,
): Promise<void> {
  if (!regNo || !base64Data) return;
  const cleanReg = regNo.trim();
  const lowerReg = cleanReg.toLowerCase();
  const upperReg = cleanReg.toUpperCase();
  const encrypted = await encryptUserData(base64Data, lowerReg);

  await setStorageData({
    [`retop_img_${lowerReg}`]: encrypted,
  });

  // Remove legacy plaintext photo copies so only the encrypted value remains.
  await removeStorageKeys([
    `${upperReg}_profileImage`,
    `${lowerReg}_profileImage`,
    'retop_profileImage',
  ]);
}

const stripPhotoField = (record: any): any => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return record;
  }
  if (!('profileImgBase64' in record)) return record;
  const { profileImgBase64: _photo, ...rest } = record;
  return rest;
};

/** Removes plaintext photos from persisted cache/profile records. */
const stripCachedPhotoCopies = async (regNo: string): Promise<void> => {
  const keys = [CACHED_USERS_KEY];
  if (regNo) {
    const clean = regNo.trim();
    keys.push(
      `${clean}_user_basic_profile`,
      `${clean.toUpperCase()}_user_basic_profile`,
      `${clean.toLowerCase()}_user_basic_profile`,
    );
  }
  const res = await getStorageData(Array.from(new Set(keys)));
  const update: Record<string, any> = {};

  const users = res[CACHED_USERS_KEY];
  if (Array.isArray(users)) {
    const stripped = users.map(stripPhotoField);
    if (stripped.some((user, i) => user !== users[i])) {
      update[CACHED_USERS_KEY] = stripped;
    }
  }

  for (const key of keys.slice(1)) {
    const raw = res[key];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    if ('profileImgBase64' in raw) {
      update[key] = stripPhotoField(raw);
    } else if (
      raw.data &&
      typeof raw.data === 'object' &&
      !Array.isArray(raw.data) &&
      'profileImgBase64' in raw.data
    ) {
      update[key] = { ...raw, data: stripPhotoField(raw.data) };
    }
  }

  const profileCacheKeys = new Set<string>(
    Object.keys(await getAllStorageData()).filter((key) =>
      /^retop_cache_.*student_profile_(parsed|data)$/i.test(key),
    ),
  );
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^retop_cache_.*student_profile_(parsed|data)$/i.test(key)) {
        profileCacheKeys.add(key);
      }
    }
  }
  const profileCache = await getStorageData(Array.from(profileCacheKeys));
  for (const [key, raw] of Object.entries(profileCache)) {
    if (!raw || typeof raw !== 'object' || !(raw as any).data) continue;
    const data = stripProfilePhotosForCache((raw as any).data);
    if (JSON.stringify(data) !== JSON.stringify((raw as any).data)) {
      update[key] = { ...raw, data };
    }
  }

  if (Object.keys(update).length) await setStorageData(update);
};

const migrateScopedPhoto = async (regNo: string): Promise<void> => {
  const clean = regNo.trim();
  const legacyKeys = Array.from(
    new Set([
      `${clean.toUpperCase()}_profileImage`,
      `${clean.toLowerCase()}_profileImage`,
    ]),
  );
  const res = await getStorageData(legacyKeys);
  for (const key of legacyKeys) {
    const value = res[key];
    if (
      typeof value === 'string' &&
      value.startsWith('data:image') &&
      value.length > 50
    ) {
      await saveUserProfileImage(clean, value);
    }
  }
};

/**
 * One-time cleanup: encrypt legacy scoped photos, drop unscoped photo copies
 * and strip plaintext fields from persisted cache/profile records.
 */
export async function migrateLegacyPhotoData(regNo?: string): Promise<void> {
  // retop_profileImage is never an owned source; remove it wherever it appears.
  await removeStorageKeys([GLOBAL_PHOTO_KEY]);

  const scoped = regNo?.trim();
  if (scoped) {
    const marker = scoped.toUpperCase();
    if (!migratedScopedPhotos.has(marker)) {
      try {
        await migrateScopedPhoto(scoped);
        migratedScopedPhotos.add(marker);
      } catch (e) {
        console.warn('[pinSecurity] Legacy photo migration failed', e);
      }
    }
  }

  await stripCachedPhotoCopies(scoped || '');
}

/**
 * Retrieves and decrypts the profile image from storage. The encrypted scoped
 * record is the only trusted photo source.
 */
export async function getUserProfileImage(regNo: string): Promise<string> {
  if (!regNo) return '';
  const cleanReg = regNo.trim();
  const lowerReg = cleanReg.toLowerCase();

  await migrateLegacyPhotoData(cleanReg);

  const res = await getStorageData([`retop_img_${lowerReg}`]);
  const encrypted = res[`retop_img_${lowerReg}`];
  if (encrypted && typeof encrypted === 'string') {
    const decrypted = await decryptUserData(encrypted, lowerReg);
    if (decrypted && decrypted.startsWith('data:image')) {
      // Rewrite legacy ciphertext under the account key when one is available.
      if (encrypted.startsWith(CIPHER_V1)) {
        await saveUserProfileImage(regNo, decrypted).catch(() => {});
      }
      return decrypted;
    }
  }

  return '';
}
