import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const offline = readFileSync(
  new URL('../../offline.tsx', import.meta.url),
  'utf8',
);
const profileSlice = readFileSync(
  new URL('../../store/slices/profileSlice.ts', import.meta.url),
  'utf8',
);
const profilePage = readFileSync(
  new URL('../../pages/profile.tsx', import.meta.url),
  'utf8',
);

describe('offline photo sources', () => {
  it('uses the encrypted scoped photo instead of legacy raw copies', () => {
    expect(offline).not.toContain("'retop_profileImage'");
    expect(offline).not.toMatch(
      /rawUser\.profileImgBase64|existing\?\.profileImgBase64/,
    );
    expect(offline).toContain('migrateLegacyPhotoData');
    expect(profileSlice).not.toContain('cached.profileImgBase64');
    expect(profileSlice).not.toContain('get().user.profileImgBase64');
  });

  it('hydrates the profile photo without persisting it in the profile cache', () => {
    expect(profilePage).toContain('getUserProfileImage');
    expect(profilePage).not.toContain('storeUser.profileImgBase64');
    expect(profilePage).toContain("photoUrl: ''");
    expect(profilePage).toContain('persistProfile');
    expect(profilePage).toContain(
      'parsedData.basic.photoUrl = await hydrateStudentPhoto',
    );
    expect(profilePage).not.toContain('setData((prev) =>');
  });

  it('only recognizes real registration numbers in the recovery scan', () => {
    expect(offline).toContain('REG_NO_PATTERN.source');
    expect(offline).not.toMatch(/\^\[A-Za-z0-9\]\{8,12\}_/);
  });
});
