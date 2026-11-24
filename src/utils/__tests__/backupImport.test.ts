import { beforeEach, describe, expect, it, mock } from 'bun:test';

const idbStore = new Map<string, any>();
const chromeStore = new Map<string, any>();

// The adapter fans out to all three tiers; model each one so a stale
// chrome.storage.local value cannot be silently ignored by a test.
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

// storageAdapter gates IndexedDB writes on this global; the idb-keyval module
// itself is mocked above.
(globalThis as any).indexedDB = (globalThis as any).indexedDB || {};

(globalThis as any).chrome = {
  runtime: { id: 'test-extension' },
  storage: {
    local: {
      get: (
        keys: string[] | null,
        cb: (items: Record<string, any>) => void,
      ) => {
        const wanted = keys === null ? Array.from(chromeStore.keys()) : keys;
        const items: Record<string, any> = {};
        for (const key of wanted) {
          if (chromeStore.has(key)) items[key] = chromeStore.get(key);
        }
        cb(items);
      },
      set: (items: Record<string, any>, cb?: () => void) => {
        for (const [key, value] of Object.entries(items)) {
          chromeStore.set(key, value);
        }
        cb?.();
        return Promise.resolve();
      },
      remove: (keys: string[], cb?: () => void) => {
        for (const key of keys) chromeStore.delete(key);
        cb?.();
        return Promise.resolve();
      },
      clear: (cb?: () => void) => {
        chromeStore.clear();
        cb?.();
        return Promise.resolve();
      },
    },
  },
};

const { BackupImportError, createBackupJson, importBackupFromText } =
  await import('../backupImport');

const ACTIVE = '21BCE0001';
const SOURCE = '21BCE0002';
const OTHER = '21BCE3333';
const PHOTO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jpXcAAAAASUVORK5CYII=';

const PIN_RECORD = {
  version: 1,
  algorithm: 'PBKDF2-SHA-256',
  iterations: 100_000,
  salt: 'a1'.repeat(16),
  hash: 'b2'.repeat(32),
};

const seedAll = (key: string, value: any) => {
  localStorage.setItem(
    key,
    typeof value === 'string' ? value : JSON.stringify(value),
  );
  chromeStore.set(key, value);
  idbStore.set(key, value);
};

const snapshot = (key: string) => ({
  local: localStorage.getItem(key),
  chrome: chromeStore.has(key) ? chromeStore.get(key) : undefined,
  idb: idbStore.has(key) ? idbStore.get(key) : undefined,
});

const seedTwoAccounts = () => {
  seedAll('retop_active_user', ACTIVE);
  seedAll('retop_lastAuthId', ACTIVE);
  seedAll('retop_lastName', 'ACTIVE STUDENT');
  seedAll(`retop_pin_${ACTIVE.toLowerCase()}`, PIN_RECORD);
  seedAll(`retop_img_${ACTIVE.toLowerCase()}`, 'enc2_abcdef_123456');
  idbStore.set(
    `retop_photo_key_${ACTIVE.toLowerCase()}`,
    new Uint8Array([1, 2, 3]),
  );

  // A second account that must survive the restore untouched.
  seedAll(`retop_cache_${SOURCE}_tt_KEEP`, {
    timestamp: 1,
    data: { value: 'keep', regNo: SOURCE },
  });
  seedAll(`${SOURCE.toLowerCase()}_user_basic_profile`, {
    timestamp: 1,
    data: { regNo: SOURCE, name: 'KEEP' },
  });

  // Stale active-account keys, including a chrome-only copy of a key that is
  // about to be restored. Both must disappear before the new value is written.
  seedAll(`retop_cache_${ACTIVE}_tt_OLD`, {
    timestamp: 1,
    data: { value: 'old' },
  });
  seedAll(`${ACTIVE}_user_basic_profile`, {
    timestamp: 1,
    data: { regNo: ACTIVE, name: 'OLD' },
  });
  chromeStore.set(`retop_cache_${ACTIVE}_tt_NEW`, {
    timestamp: 0,
    data: { value: 'stale' },
  });

  // Scoped calendar preferences live only in localStorage.
  localStorage.setItem(`retop-cal-selected-sem-${SOURCE}`, 'SRC_SEM');
  localStorage.setItem(`retop-cal-selected-group-${SOURCE}`, 'SRC_GROUP');
  localStorage.setItem(`retop-cal-selected-sem-${ACTIVE}`, 'OLD_SEM');
  localStorage.setItem(`retop-cal-groups-${SOURCE}_SRC_SEM`, '{}');
  seedAll('retop_cache_dashboard_stats', {
    timestamp: 1,
    data: { value: 'orphan' },
  });
};

const plaintextInStorage = () => {
  const localValues: (string | null)[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    localValues.push(localStorage.getItem(localStorage.key(i)!));
  }
  const values = [
    ...localValues,
    ...chromeStore.values(),
    ...idbStore.values(),
  ];
  return values.some((value) => JSON.stringify(value)?.includes(PHOTO));
};

describe('versioned backup import', () => {
  beforeEach(() => {
    localStorage.clear();
    chromeStore.clear();
    idbStore.clear();
  });

  it('replaces only the active account scoped cache and strips secrets from the file', async () => {
    seedTwoAccounts();
    const protectedKeys = [
      'retop_active_user',
      'retop_lastAuthId',
      'retop_lastName',
      `retop_pin_${ACTIVE.toLowerCase()}`,
      `retop_img_${ACTIVE.toLowerCase()}`,
      `retop_photo_key_${ACTIVE.toLowerCase()}`,
      'retop_cached_users',
    ];
    const protectedBefore = protectedKeys.map(snapshot);
    const otherBefore = [
      snapshot(`retop_cache_${SOURCE}_tt_KEEP`),
      snapshot(`${SOURCE.toLowerCase()}_user_basic_profile`),
    ];

    const backup = {
      version: 1,
      sourceRegNo: SOURCE,
      data: {
        [`retop_pin_${SOURCE.toLowerCase()}`]: PIN_RECORD,
        [`retop_photo_key_${SOURCE.toLowerCase()}`]: new Uint8Array([9]),
        [`retop_img_${SOURCE.toLowerCase()}`]: 'enc2_dead_beef',
        retop_active_user: SOURCE,
        retop_lastAuthId: SOURCE,
        retop_cached_users: [{ regNo: SOURCE, profileImgBase64: PHOTO }],
        retop_profileImage: PHOTO,
        [`retop_cache_${SOURCE}_tt_NEW`]: {
          timestamp: 2,
          data: { value: 'new', regNo: SOURCE },
        },
        [`${SOURCE.toLowerCase()}_user_basic_profile`]: {
          timestamp: 2,
          data: {
            regNo: SOURCE,
            name: 'RESTORED',
            profileImgBase64: PHOTO,
          },
        },
        [`retop-cal-selected-sem-${SOURCE}`]: 'SRC_SEM',
        [`retop-cal-selected-group-${SOURCE}`]: 'SRC_GROUP',
        [`retop-cal-groups-${SOURCE}_SRC_SEM`]: '{}',
      },
    };

    const result = await importBackupFromText(JSON.stringify(backup));

    expect(result.sourceRegNo).toBe(SOURCE);
    expect(result.activeRegNo).toBe(ACTIVE);
    expect(result.removedKeys).toContain(`retop_cache_${ACTIVE}_tt_OLD`);
    expect(result.removedKeys).toContain(`retop-cal-selected-sem-${ACTIVE}`);
    expect(result.importedKeys).toContain(`retop_cache_${ACTIVE}_tt_NEW`);
    expect(result.importedKeys).toContain(`retop-cal-selected-sem-${ACTIVE}`);
    expect(result.importedKeys).not.toContain(
      `retop_pin_${SOURCE.toLowerCase()}`,
    );

    expect(protectedKeys.map(snapshot)).toEqual(protectedBefore);
    expect([
      snapshot(`retop_cache_${SOURCE}_tt_KEEP`),
      snapshot(`${SOURCE.toLowerCase()}_user_basic_profile`),
    ]).toEqual(otherBefore);

    const newCacheKey = `retop_cache_${ACTIVE}_tt_NEW`;
    for (const value of [
      JSON.parse(localStorage.getItem(newCacheKey)!),
      chromeStore.get(newCacheKey),
      idbStore.get(newCacheKey),
    ]) {
      expect(value).toEqual({
        timestamp: 2,
        data: { value: 'new', regNo: ACTIVE },
      });
    }

    const oldCacheKey = `retop_cache_${ACTIVE}_tt_OLD`;
    expect(localStorage.getItem(oldCacheKey)).toBeNull();
    expect(chromeStore.has(oldCacheKey)).toBe(false);
    expect(idbStore.has(oldCacheKey)).toBe(false);

    const profileKey = `${ACTIVE}_user_basic_profile`;
    const restoredProfile = JSON.parse(localStorage.getItem(profileKey)!);
    expect(restoredProfile.data.regNo).toBe(ACTIVE);
    expect(restoredProfile.data.name).toBe('RESTORED');
    expect('profileImgBase64' in restoredProfile.data).toBe(false);
    expect(localStorage.getItem(`retop-cal-selected-sem-${ACTIVE}`)).toBe(
      'SRC_SEM',
    );
    expect(localStorage.getItem(`retop-cal-selected-group-${ACTIVE}`)).toBe(
      'SRC_GROUP',
    );
    expect(localStorage.getItem(`retop-cal-selected-sem-${SOURCE}`)).toBe(
      'SRC_SEM',
    );
    expect(snapshot('retop_cache_dashboard_stats')).toEqual({
      local: null,
      chrome: undefined,
      idb: undefined,
    });
    expect(plaintextInStorage()).toBe(false);
  });

  it('imports legacy raw-object backups with the same remap', async () => {
    seedTwoAccounts();
    const legacyBackup = {
      [`retop_cache_${SOURCE}_tt_LEGACY`]: {
        timestamp: 3,
        data: { value: 'legacy', regNo: SOURCE },
      },
      [`${SOURCE.toLowerCase()}_user_basic_profile`]: {
        regNo: SOURCE,
        name: 'LEGACY',
        profileImgBase64: PHOTO,
      },
    };

    const result = await importBackupFromText(JSON.stringify(legacyBackup));

    expect(result.sourceRegNo).toBe(SOURCE);
    expect(result.activeRegNo).toBe(ACTIVE);
    expect(chromeStore.get(`retop_cache_${ACTIVE}_tt_LEGACY`).data.value).toBe(
      'legacy',
    );
    const profile = JSON.parse(
      localStorage.getItem(`${ACTIVE}_user_basic_profile`)!,
    );
    expect(profile.regNo).toBe(ACTIVE);
    expect('profileImgBase64' in profile).toBe(false);
    expect(plaintextInStorage()).toBe(false);
  });

  it('uses the cache-scoping active account when storage tiers disagree', async () => {
    seedTwoAccounts();
    chromeStore.set('retop_active_user', OTHER);
    idbStore.set('retop_active_user', OTHER);

    const result = await importBackupFromText(
      JSON.stringify({
        version: 1,
        sourceRegNo: SOURCE,
        data: {
          [`retop_cache_${SOURCE}_tt_RIGHT`]: {
            timestamp: 4,
            data: { value: 'right', regNo: SOURCE },
          },
        },
      }),
    );

    expect(result.activeRegNo).toBe(ACTIVE);
    expect(chromeStore.get(`retop_cache_${ACTIVE}_tt_RIGHT`).data.value).toBe(
      'right',
    );
    expect(chromeStore.has(`retop_cache_${OTHER}_tt_RIGHT`)).toBe(false);
  });

  it('writes to the exact scope case cache readers use', async () => {
    seedTwoAccounts();
    localStorage.setItem('retop_active_user', ACTIVE.toLowerCase());

    const result = await importBackupFromText(
      JSON.stringify({
        version: 1,
        sourceRegNo: SOURCE,
        data: {
          [`retop_cache_${SOURCE}_tt_RIGHT`]: {
            timestamp: 4,
            data: { value: 'right', regNo: SOURCE },
          },
        },
      }),
    );

    expect(result.activeRegNo).toBe(ACTIVE.toLowerCase());
    expect(chromeStore.has(`retop_cache_${ACTIVE}_tt_OLD`)).toBe(false);
    expect(
      chromeStore.get(`retop_cache_${ACTIVE.toLowerCase()}_tt_RIGHT`).data
        .value,
    ).toBe('right');
  });

  it('exports only allowlisted scoped entries with no photo bytes', async () => {
    seedTwoAccounts();
    localStorage.setItem(`retop_profileImage`, PHOTO);

    const json = await createBackupJson();
    const backup = JSON.parse(json);

    expect(backup.version).toBe(1);
    expect(backup.sourceRegNo).toBe(ACTIVE);
    expect(Object.keys(backup.data)).toContain(`retop_cache_${ACTIVE}_tt_OLD`);
    expect(Object.keys(backup.data)).toContain(
      `retop-cal-selected-sem-${ACTIVE}`,
    );
    expect(Object.keys(backup.data)).not.toContain(
      `retop_cache_${SOURCE}_tt_KEEP`,
    );
    expect(Object.keys(backup.data)).not.toContain(
      `retop-cal-selected-sem-${SOURCE}`,
    );
    expect(Object.keys(backup.data)).not.toContain(
      'retop_cache_dashboard_stats',
    );
    for (const key of Object.keys(backup.data)) {
      expect(key).not.toMatch(/pin|photo|img|active_user|lastAuthId/i);
    }
    expect(json.includes(PHOTO)).toBe(false);
  });

  it('reports invalid, empty and wrong-account backups clearly', async () => {
    seedTwoAccounts();

    await expect(importBackupFromText('{nope')).rejects.toThrow(
      'not valid JSON',
    );
    await expect(importBackupFromText('{}')).rejects.toThrow(
      'empty or has no account cache',
    );
    await expect(
      importBackupFromText(
        JSON.stringify({
          version: 1,
          sourceRegNo: SOURCE,
          data: { [`retop_cache_${OTHER}_tt_X`]: { timestamp: 1, data: {} } },
        }),
      ),
    ).rejects.toThrow('different account');
    await expect(
      importBackupFromText(
        JSON.stringify({
          [`retop_cache_${SOURCE}_tt_X`]: { timestamp: 1, data: {} },
          [`retop_cache_${OTHER}_tt_Y`]: { timestamp: 1, data: {} },
        }),
      ),
    ).rejects.toThrow('multiple accounts');

    localStorage.clear();
    chromeStore.clear();
    idbStore.clear();
    await expect(
      importBackupFromText(
        JSON.stringify({
          version: 1,
          sourceRegNo: SOURCE,
          data: { [`retop_cache_${SOURCE}_tt_X`]: { timestamp: 1, data: {} } },
        }),
      ),
    ).rejects.toThrow('No active offline account');
  });

  it('uses a named error type for user-facing messages', async () => {
    try {
      await importBackupFromText('null');
      throw new Error('expected import to fail');
    } catch (err) {
      expect(err).toBeInstanceOf(BackupImportError);
      expect((err as Error).message).toContain('Invalid backup file');
    }
  });
});
