import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// getAllStorageData only sees chrome.storage/IndexedDB; model those tiers here.
const tiers: Record<string, any> = {};
mock.module('../storageAdapter', () => ({
  getStorageData: async (keys: string[]) =>
    Object.fromEntries(
      keys.filter((k) => tiers[k] !== undefined).map((k) => [k, tiers[k]]),
    ),
  setStorageData: async (data: Record<string, any>) => {
    Object.assign(tiers, data);
    if (typeof localStorage !== 'undefined') {
      Object.entries(data).forEach(([k, v]) =>
        localStorage.setItem(k, JSON.stringify(v)),
      );
    }
  },
  getAllStorageData: async () => ({ ...tiers }),
  removeStorageKeys: async (keys: string[]) => {
    keys.forEach((k) => {
      delete tiers[k];
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  },
}));

const {
  clearAccountCache,
  getCachedData,
  getAllCachedKeys,
  scopedCacheKey,
  setCachedData,
} = await import('../cache');

const ACCOUNT = '21BCE1234';
const OTHER = '21BCE9999';
const ENVELOPE = (data: any) => ({ timestamp: Date.now(), data });

const root = resolve(import.meta.dir, '../../..');
const source = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

const seed = (key: string, data: any) => {
  tiers[key] = ENVELOPE(data);
  localStorage.setItem(key, JSON.stringify(tiers[key]));
};

describe('cache account isolation', () => {
  beforeEach(() => {
    for (const key of Object.keys(tiers)) delete tiers[key];
    localStorage.clear();
    localStorage.setItem('retop_active_user', ACCOUNT);
  });

  it('lists generic cache keys instead of hiding them as user keys', async () => {
    seed('retop_cache_dashboard_stats', { cgpa: '9' });
    seed('retop_cache_dashboard_attendance', [{ code: 'CSE1001' }]);
    await setCachedData('dashboard_events', [{ title: 'Event' }]);

    const keys = (await getAllCachedKeys(ACCOUNT)).map((k) => k.key);
    expect(keys).toContain('dashboard_stats');
    expect(keys).toContain('dashboard_attendance');
    expect(keys).toContain(`${ACCOUNT}_dashboard_events`);
    expect(keys).not.toContain(`${OTHER}_dashboard_stats`);
  });

  it('writes only the account-owned key, never a generic duplicate', async () => {
    await setCachedData('dashboard_stats', { cgpa: '9' });

    expect(tiers['retop_cache_dashboard_stats']).toBeUndefined();
    expect(tiers[`retop_cache_${ACCOUNT}_dashboard_stats`]).not.toBeUndefined();
    expect(await getCachedData('dashboard_stats')).toEqual({ cgpa: '9' });
  });

  it('deletes an unowned legacy generic copy instead of adopting it', async () => {
    seed('retop_cache_dashboard_stats', { cgpa: '8' });

    expect(await getCachedData('dashboard_stats')).toBeNull();
    expect(tiers[`retop_cache_${ACCOUNT}_dashboard_stats`]).toBeUndefined();
    expect(tiers['retop_cache_dashboard_stats']).toBeUndefined();
    expect(localStorage.getItem('retop_cache_dashboard_stats')).toBeNull();
  });

  it('keeps an existing scoped copy while deleting the generic orphan', async () => {
    await setCachedData('dashboard_stats', { cgpa: '9' });
    seed('retop_cache_dashboard_stats', { cgpa: '1' });

    expect(await getCachedData('dashboard_stats')).toEqual({ cgpa: '9' });
    expect(tiers['retop_cache_dashboard_stats']).toBeUndefined();
  });

  it('deletes generic keys instead of adopting them when nobody is signed in', async () => {
    seed('retop_cache_dashboard_stats', { a: 1 });
    localStorage.removeItem('retop_active_user');
    localStorage.removeItem('retop_lastAuthId');

    expect(await getCachedData('dashboard_stats')).toBeNull();
    expect(tiers['retop_cache_dashboard_stats']).toBeUndefined();
    expect(localStorage.getItem('retop_cache_dashboard_stats')).toBeNull();
  });

  it('cannot resurrect cleared data through a generic copy', async () => {
    await setCachedData('dashboard_stats', { cgpa: '9' });
    seed('retop_cache_dashboard_stats', { cgpa: 'stale' });
    expect(await getCachedData('dashboard_stats')).toEqual({ cgpa: '9' });

    await clearAccountCache(ACCOUNT);

    expect(tiers[`retop_cache_${ACCOUNT}_dashboard_stats`]).toBeUndefined();
    expect(tiers['retop_cache_dashboard_stats']).toBeUndefined();
    expect(await getCachedData('dashboard_stats')).toBeNull();
  });

  it('never attributes a generic value to another account', async () => {
    seed('retop_cache_dashboard_stats', { cgpa: '8' });

    expect(await getCachedData(`${OTHER}_dashboard_stats`)).toBeNull();
    expect(tiers[`retop_cache_${OTHER}_dashboard_stats`]).toBeUndefined();
    expect(tiers['retop_cache_dashboard_stats']).toBeUndefined();
  });

  it('removes both prefixed and bare generic copies on clear', async () => {
    seed('retop_cache_dashboard_stats', { cgpa: '9' });
    tiers.dashboard_stats = ENVELOPE({ cgpa: '9' });
    localStorage.setItem(
      'dashboard_stats',
      JSON.stringify(tiers.dashboard_stats),
    );

    await clearAccountCache(ACCOUNT);

    expect(tiers['retop_cache_dashboard_stats']).toBeUndefined();
    expect(tiers.dashboard_stats).toBeUndefined();
    expect(localStorage.getItem('dashboard_stats')).toBeNull();
  });

  it('clears scoped calendar localStorage keys that readers would resurrect', async () => {
    localStorage.setItem(`retop-cal-groups-${ACCOUNT}-SEM1`, 'groups');
    localStorage.setItem(`retop-cal-selected-group-${ACCOUNT}`, 'group');
    localStorage.setItem(`retop-cal-selected-sem-${ACCOUNT}`, 'SEM1');
    localStorage.setItem(`retop-tt-selected-sem-${ACCOUNT}`, 'SEM1');
    localStorage.setItem(`retop-cal-groups-${OTHER}-SEM1`, 'keep');

    await clearAccountCache(ACCOUNT);

    expect(localStorage.getItem(`retop-cal-groups-${ACCOUNT}-SEM1`)).toBeNull();
    expect(
      localStorage.getItem(`retop-cal-selected-group-${ACCOUNT}`),
    ).toBeNull();
    expect(
      localStorage.getItem(`retop-cal-selected-sem-${ACCOUNT}`),
    ).toBeNull();
    expect(localStorage.getItem(`retop-tt-selected-sem-${ACCOUNT}`)).toBeNull();
    expect(localStorage.getItem(`retop-cal-groups-${OTHER}-SEM1`)).toBe('keep');
  });
});

describe('no generic cache writes in owned writers', () => {
  it('uses the shared scope helper for every direct cache read and write', () => {
    const writers = [
      'src/utils/syncOrchestrator.ts',
      'src/utils/dashboardInterceptor.ts',
      'src/store/slices/dashboardSlice.ts',
      'src/store/slices/calendarSlice.ts',
      'src/pages/app.tsx',
      'src/utils/network.ts',
    ];
    for (const file of writers) {
      expect(source(file)).not.toMatch(/setCachedData\(\s*['"][^'"]*['"]/);
      expect(source(file)).not.toMatch(
        /getCachedData(?:WithTimestamp)?\(\s*['"][^'"]*['"]/,
      );
    }
    expect(source('src/utils/dashboardInterceptor.ts')).toContain(
      'readSessionFactsFromDocument',
    );
  });

  it('categorizes generic keys by their full logical name', () => {
    const syncManager = source('src/components/SyncManager.tsx');
    expect(syncManager).toContain('isUserScopedCacheKey(key)');
    expect(syncManager).not.toContain(
      "const stripped = key.substring(key.indexOf('_') + 1);",
    );
  });
});
