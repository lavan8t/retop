import { BiometricPunch } from '../types/vtop';
import { getStorageData, setStorageData } from './storageAdapter';

/** Local yyyy-mm-dd for an instant (a UTC conversion would shift the day). */
export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Today's punches change during the day, so only strictly past days are cached. */
export const isPastDate = (iso: string, now: Date = new Date()): boolean =>
  iso < toIsoDate(now);

export const biometricCacheKey = (authId: string, iso: string): string =>
  `retop_biometric_${authId}_${iso}`;

/** Yesterday and older, newest first: the days a bulk fetch should cover. */
export const recentPastDates = (
  days: number,
  now: Date = new Date(),
): string[] => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const result: string[] = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push(toIsoDate(d));
  }
  return result;
};

export const readBiometricCache = async (
  authId: string,
  iso: string,
  now: Date = new Date(),
): Promise<BiometricPunch[] | null> => {
  if (!isPastDate(iso, now)) return null;
  const key = biometricCacheKey(authId, iso);
  const stored = (await getStorageData([key]))[key];
  return Array.isArray(stored) ? (stored as BiometricPunch[]) : null;
};

export const writeBiometricCache = async (
  authId: string,
  iso: string,
  punches: BiometricPunch[],
  now: Date = new Date(),
): Promise<void> => {
  if (!isPastDate(iso, now)) return;
  await setStorageData({ [biometricCacheKey(authId, iso)]: punches });
};
