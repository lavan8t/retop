import { beforeEach, describe, expect, it, mock } from 'bun:test';

const idbStore = new Map<string, unknown>();

// Photo keys must stay in IndexedDB; keep an in-memory stand-in for the tests.
mock.module('idb-keyval', () => ({
  get: async (key: string) => idbStore.get(key),
  set: async (key: string, value: unknown) => {
    idbStore.set(key, value);
  },
  del: async (key: string) => {
    idbStore.delete(key);
  },
  entries: async () => Array.from(idbStore.entries()),
  clear: async () => idbStore.clear(),
}));

const {
  decryptUserData,
  encryptUserData,
  getUserPinRecord,
  getUserProfileImage,
  migrateLegacyPhotoData,
  saveUserPin,
  saveUserProfileImage,
  verifyUserPin,
} = await import('../pinSecurity');

const REG = '21BCE1234';
const PIN_KEY = `retop_pin_${REG.toLowerCase()}`;
const IMG_KEY = `retop_img_${REG.toLowerCase()}`;
const KEY_KEY = `retop_photo_key_${REG.toLowerCase()}`;
const PHOTO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jpXcAAAAASUVORK5CYII=';

const toHex = (buf: ArrayBuffer | ArrayBufferView): string => {
  const bytes = ArrayBuffer.isView(buf)
    ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    : new Uint8Array(buf);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const legacyPinRecord = async (pin: string, salt: string) => ({
  salt,
  hash: toHex(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`retop_${REG.toLowerCase()}_${pin}_${salt}`),
    ),
  ),
});

const legacyCipher = async (plain: string): Promise<string> => {
  const material = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`retop_enc_key_${REG.toLowerCase()}`),
  );
  const key = await crypto.subtle.importKey(
    'raw',
    material,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const iv = new Uint8Array(12).fill(7);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );
  return `enc_${toHex(iv)}_${toHex(cipher)}`;
};

describe('PIN records and migration', () => {
  beforeEach(() => {
    localStorage.clear();
    idbStore.clear();
  });

  it('verifies a legacy SHA-256 record and upgrades it with the same salt', async () => {
    const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const legacy = await legacyPinRecord('1234', salt);
    localStorage.setItem(PIN_KEY, JSON.stringify(legacy));

    expect(await verifyUserPin(REG, '1234')).toBe(true);

    const upgraded = JSON.parse(localStorage.getItem(PIN_KEY)!);
    expect(upgraded.version).toBe(1);
    expect(upgraded.algorithm).toBe('PBKDF2-SHA-256');
    expect(upgraded.iterations).toBe(100_000);
    expect(upgraded.salt).toBe(salt);
    expect(upgraded.hash).toHaveLength(64);
    expect(upgraded.hash).not.toBe(legacy.hash);
    expect(await verifyUserPin(REG, '1234')).toBe(true);
  });

  it('rejects a wrong PIN without changing the stored record', async () => {
    const legacy = await legacyPinRecord(
      '1234',
      '00112233445566778899aabbccddeeff',
    );
    localStorage.setItem(PIN_KEY, JSON.stringify(legacy));

    expect(await verifyUserPin(REG, '9999')).toBe(false);
    expect(JSON.parse(localStorage.getItem(PIN_KEY)!)).toEqual(legacy);
    expect(await getUserPinRecord(REG)).toEqual(legacy);
  });

  it('stores new PINs as versioned PBKDF2 records', async () => {
    const record = await saveUserPin(REG, '4321');

    expect(record.version).toBe(1);
    expect(record.algorithm).toBe('PBKDF2-SHA-256');
    expect(record.iterations).toBe(100_000);
    expect(record.hash).toHaveLength(64);
    expect(JSON.parse(localStorage.getItem(PIN_KEY)!)).toEqual(record);
    expect(await verifyUserPin(REG, '4321')).toBe(true);
    expect(await verifyUserPin(REG, '4322')).toBe(false);
  });
});

describe('photo encryption', () => {
  beforeEach(() => {
    localStorage.clear();
    idbStore.clear();
  });

  it('decrypts a legacy envelope and rewraps it under the account key', async () => {
    localStorage.setItem(IMG_KEY, await legacyCipher(PHOTO));

    expect(await getUserProfileImage(REG)).toBe(PHOTO);

    const rewritten = localStorage.getItem(IMG_KEY)!;
    expect(rewritten.startsWith('enc2_')).toBe(true);
    expect(idbStore.has(KEY_KEY)).toBe(true);
    expect(localStorage.getItem(KEY_KEY)).toBeNull();
    expect(await decryptUserData(rewritten, REG)).toBe(PHOTO);
  });

  it('replaces a random photo key and re-encrypts the photo when a PIN is set', async () => {
    await saveUserProfileImage(REG, PHOTO);
    const randomKey = idbStore.get(KEY_KEY);
    const before = localStorage.getItem(IMG_KEY)!;
    expect(before.startsWith('enc2_')).toBe(true);

    await saveUserPin(REG, '1234');

    expect(idbStore.get(KEY_KEY)).not.toEqual(randomKey);
    const after = localStorage.getItem(IMG_KEY)!;
    expect(after).not.toBe(before);
    expect(await decryptUserData(after, REG)).toBe(PHOTO);
  });

  it('rewraps an existing photo when a legacy PIN is unlocked', async () => {
    const salt = 'fedcba9876543210fedcba9876543210';
    localStorage.setItem(
      PIN_KEY,
      JSON.stringify(await legacyPinRecord('2468', salt)),
    );
    await saveUserProfileImage(REG, PHOTO);
    const randomKey = idbStore.get(KEY_KEY);
    const before = localStorage.getItem(IMG_KEY)!;

    expect(await verifyUserPin(REG, '2468')).toBe(true);

    expect(idbStore.get(KEY_KEY)).not.toEqual(randomKey);
    const after = localStorage.getItem(IMG_KEY)!;
    expect(after).not.toBe(before);
    expect(await decryptUserData(after, REG)).toBe(PHOTO);
    expect(JSON.parse(localStorage.getItem(PIN_KEY)!).version).toBe(1);
  });

  it('throws instead of returning plaintext when encryption fails', async () => {
    const subtle = crypto.subtle;
    const original = subtle.encrypt;
    Object.defineProperty(subtle, 'encrypt', {
      configurable: true,
      value: () => Promise.reject(new Error('crypto down')),
    });
    try {
      await expect(encryptUserData('TOP_SECRET', REG)).rejects.toThrow(
        'crypto down',
      );
    } finally {
      Object.defineProperty(subtle, 'encrypt', {
        configurable: true,
        value: original,
      });
    }
    expect(localStorage.getItem(IMG_KEY)).toBeNull();
    expect(await decryptUserData('TOP_SECRET', REG)).toBe('');
  });

  it('does not trust the global retop_profileImage key', async () => {
    localStorage.setItem('retop_profileImage', PHOTO);

    expect(await getUserProfileImage(REG)).toBe('');
    expect(localStorage.getItem(IMG_KEY)).toBeNull();
  });

  it('encrypts legacy scoped photos and strips plaintext from cached copies', async () => {
    const reg = '21BCE9999';
    const legacyKey = `${reg}_profileImage`;
    const imgKey = `retop_img_${reg.toLowerCase()}`;
    const profileKey = `${reg}_user_basic_profile`;
    localStorage.setItem(legacyKey, PHOTO);
    localStorage.setItem('retop_profileImage', PHOTO);
    localStorage.setItem(
      'retop_cached_users',
      JSON.stringify([
        { regNo: reg, name: 'A', profileImgBase64: PHOTO },
        { regNo: '21BCE1111', name: 'B', profileImgBase64: PHOTO },
      ]),
    );
    localStorage.setItem(
      profileKey,
      JSON.stringify({ regNo: reg, profileImgBase64: PHOTO }),
    );

    await migrateLegacyPhotoData(reg);

    expect(await getUserProfileImage(reg)).toBe(PHOTO);
    expect(localStorage.getItem(legacyKey)).toBeNull();
    expect(localStorage.getItem('retop_profileImage')).toBeNull();
    expect(localStorage.getItem(imgKey)!.startsWith('enc2_')).toBe(true);
    expect(await decryptUserData(localStorage.getItem(imgKey)!, reg)).toBe(
      PHOTO,
    );

    const users = JSON.parse(localStorage.getItem('retop_cached_users')!);
    expect(users).toHaveLength(2);
    expect(users.every((u: any) => !('profileImgBase64' in u))).toBe(true);
    const profile = JSON.parse(localStorage.getItem(profileKey)!);
    expect('profileImgBase64' in profile).toBe(false);
  });

  it('strips photos from cached student-profile records', async () => {
    const cacheKeys = [
      `retop_cache_${REG}_student_profile_parsed`,
      `retop_cache_${REG}_student_profile_data`,
    ];
    for (const cacheKey of cacheKeys) {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: 1,
          data: {
            basic: { name: 'A', photoUrl: PHOTO },
            proctor: { name: 'P', photoUrl: PHOTO },
          },
        }),
      );
    }

    await migrateLegacyPhotoData(REG);

    for (const cacheKey of cacheKeys) {
      const cached = JSON.parse(localStorage.getItem(cacheKey)!);
      expect(cached.data.basic).toEqual({ name: 'A' });
      expect(cached.data.proctor).toEqual({ name: 'P' });
      expect(localStorage.getItem(cacheKey)!.includes(PHOTO)).toBe(false);
    }
  });
});
