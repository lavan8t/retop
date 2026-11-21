import type { StudentProfile } from '../../types/vtop';

// Physical VIT-AP card back uses this address verbatim; newlines are rendered
// with `whitespace-pre-line` so the helper stays a pure string producer.
export const apOfficialAddress = (): string =>
  'VIT-AP University,\nInavolu, Beside AP Secretariat,\nAmaravati - 522 237, Andhra Pradesh, India.';

export const apContactNumber = (profile: StudentProfile): string =>
  profile.family.friendMobile ||
  profile.personal.mobile ||
  profile.family.father?.mobile ||
  profile.family.mother?.mobile ||
  'Not Provided';
