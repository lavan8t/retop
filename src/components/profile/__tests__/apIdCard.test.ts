import { describe, expect, it } from 'bun:test';
import { apContactNumber, apOfficialAddress } from '../apIdCard';
import type { StudentProfile } from '../../../types/vtop';

const profileWith = (overrides: {
  friendMobile?: string;
  personalMobile?: string;
  fatherMobile?: string;
  motherMobile?: string;
}): StudentProfile =>
  ({
    family: {
      friendMobile: overrides.friendMobile ?? '',
      father: { mobile: overrides.fatherMobile ?? '' },
      mother: { mobile: overrides.motherMobile ?? '' },
    },
    personal: { mobile: overrides.personalMobile ?? '' },
  }) as unknown as StudentProfile;

describe('AP ID card field derivation', () => {
  it('returns the Inavolu / Amaravati official address', () => {
    const address = apOfficialAddress();
    expect(address).toContain('VIT-AP University');
    expect(address).toContain('Inavolu, Beside AP Secretariat');
    expect(address).toContain('Amaravati - 522 237');
  });

  it('picks friend mobile, then personal, then parents for emergency contact', () => {
    expect(
      apContactNumber(
        profileWith({
          friendMobile: '11111',
          personalMobile: '22222',
          fatherMobile: '33333',
        }),
      ),
    ).toBe('11111');

    expect(
      apContactNumber(
        profileWith({ personalMobile: '22222', fatherMobile: '33333' }),
      ),
    ).toBe('22222');

    expect(apContactNumber(profileWith({ fatherMobile: '33333' }))).toBe(
      '33333',
    );

    expect(apContactNumber(profileWith({ motherMobile: '44444' }))).toBe(
      '44444',
    );
  });

  it('falls back to Not Provided when no number exists', () => {
    expect(apContactNumber(profileWith({}))).toBe('Not Provided');
  });
});
