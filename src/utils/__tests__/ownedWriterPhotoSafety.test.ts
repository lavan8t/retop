import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REG = '21BCE1234';
const PHOTO = 'data:image/jpeg;base64,/9j/PLAINTEXT_PHOTO';

const stored: Record<string, any> = {};

mock.module('../storageAdapter', () => ({
  getStorageData: async (keys: string[]) =>
    Object.fromEntries(
      keys.filter((k) => stored[k] !== undefined).map((k) => [k, stored[k]]),
    ),
  setStorageData: async (data: Record<string, any>) => {
    Object.assign(stored, data);
  },
  getAllStorageData: async () => ({ ...stored }),
  removeStorageKeys: async (keys: string[]) => {
    keys.forEach((k) => delete stored[k]);
  },
}));
mock.module('../pinSecurity', () => ({
  saveUserProfileImage: async () => {},
}));
mock.module('idb-keyval', () => ({
  get: async () => undefined,
  set: async () => {},
  del: async () => {},
  entries: async () => [],
  clear: async () => {},
}));
mock.module('../../parsers/profile', () => ({
  parseStudentProfile: () => ({
    basic: { name: 'A Student', profileImgBase64: PHOTO, photoUrl: PHOTO },
    proctor: { name: 'Dr X', photoUrl: PHOTO },
    profileImgBase64: PHOTO,
  }),
  fixBase64Image: (src?: string) => src || '',
  resolveProctorPhoto: async (profile: any) => profile,
}));

const { syncStudentData } = await import('../syncOrchestrator');

const root = resolve(import.meta.dir, '../../..');
const source = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

const client = {
  registrationNumber: REG,
  studentName: 'A Student',
  campus: 'vellore',
  csrf: 'csrf-token',
  getProfile: async () => '<html>' + 'x'.repeat(200) + '</html>',
  getSemesters: async () => '<html>' + 'y'.repeat(100) + '</html>',
} as any;

describe('owned writer photo safety', () => {
  beforeEach(() => {
    for (const key of Object.keys(stored)) delete stored[key];
    localStorage.clear();
  });

  it('keeps the photo in runtime state only', async () => {
    const result = await syncStudentData(client);

    expect(result.user.profileImgBase64).toBe(PHOTO);
    expect(JSON.stringify(stored)).not.toContain('PLAINTEXT_PHOTO');
    expect(stored.retop_cached_users[0].profileImgBase64).toBeUndefined();
    expect(
      stored[`${REG}_user_basic_profile`].profileImgBase64,
    ).toBeUndefined();
    expect(
      stored[`retop_cache_${REG}_student_profile_data`].data.profileImgBase64,
    ).toBeUndefined();
    expect(
      stored[`retop_cache_${REG}_student_profile_data`].data.basic
        .profileImgBase64,
    ).toBeUndefined();
    expect(
      stored[`retop_cache_${REG}_student_profile_data`].data.basic.photoUrl,
    ).toBeUndefined();
    expect(
      stored[`retop_cache_${REG}_student_profile_data`].data.proctor.photoUrl,
    ).toBeUndefined();
  });

  it('has no plaintext fallback reads in app or sync', () => {
    expect(source('src/pages/app.tsx')).not.toContain(
      'foundUser?.profileImgBase64',
    );
    expect(source('src/pages/app.tsx')).not.toContain(
      'existingUser?.profileImgBase64',
    );
    expect(source('src/utils/syncOrchestrator.ts')).not.toContain(
      'setCachedData(`student_profile_data`',
    );
    expect(source('src/utils/syncOrchestrator.ts')).not.toContain(
      "setCachedData('student_profile_data'",
    );
  });
});
