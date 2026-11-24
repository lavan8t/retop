import { beforeEach, describe, expect, it } from 'bun:test';
import { createCalendarSlice } from '../../store/slices/calendarSlice';
import { setCachedData, scopedCacheKey } from '../cache';

const SEM = 'VL20262701';
const ACCOUNT_A = '21BCE0001';
const ACCOUNT_B = '21BCE0002';

const groups = (id: string) => [
  { id, name: `Group ${id}` },
  { id: `${id}-2`, name: `Group ${id}-2` },
];
const months = [{ dateString: '2026-07-01', label: 'July' }];

const makeSlice = () => {
  let state: Record<string, any> = {};
  const set = (partial: any) => {
    state = {
      ...state,
      ...(typeof partial === 'function' ? partial(state) : partial),
    };
  };
  const get = () => state;
  const slice = createCalendarSlice(set as any, get as any, {} as any);
  state = { ...(slice as Record<string, any>) };
  return { slice, state: () => state };
};

const seedLocalGroups = (account: string, id: string) => {
  localStorage.setItem(
    `retop-cal-groups-${account}-${SEM}`,
    JSON.stringify({ date: 'today', data: { groups: groups(id), months } }),
  );
  localStorage.setItem(`retop-cal-selected-group-${account}`, id);
};

describe('calendar account scoping', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('isolates localStorage groups and the selected group between accounts', async () => {
    seedLocalGroups(ACCOUNT_A, 'A1');
    seedLocalGroups(ACCOUNT_B, 'B1');
    localStorage.setItem('retop-cal-selected-group', 'LEAK');

    localStorage.setItem('retop_active_user', ACCOUNT_A);
    const sliceA = makeSlice();
    expect(localStorage.getItem('retop-cal-selected-group')).toBeNull();
    await sliceA.slice.fetchCalendarMonthsAndGroups(null as any, SEM);
    expect(sliceA.state().calClassGroups.map((g: any) => g.id)).toEqual([
      'A1',
      'A1-2',
    ]);
    expect(sliceA.state().calSelectedGroup).toBe('A1');

    localStorage.setItem('retop_active_user', ACCOUNT_B);
    const sliceB = makeSlice();
    await sliceB.slice.fetchCalendarMonthsAndGroups(null as any, SEM);
    expect(sliceB.state().calClassGroups.map((g: any) => g.id)).toEqual([
      'B1',
      'B1-2',
    ]);
    expect(sliceB.state().calSelectedGroup).toBe('B1');
  });

  it('scopes the cached groups key and keeps account selections separate', async () => {
    localStorage.setItem('retop_active_user', ACCOUNT_A);
    await setCachedData(`cal_groups_${SEM}`, {
      groups: groups('A1'),
      months,
    });

    localStorage.setItem('retop_active_user', ACCOUNT_B);
    const sliceB = makeSlice();
    sliceB.slice.setCalSelectedGroup('B-selected');
    expect(localStorage.getItem(`retop-cal-selected-group-${ACCOUNT_B}`)).toBe(
      'B-selected',
    );
    expect(
      localStorage.getItem(`retop-cal-selected-group-${ACCOUNT_A}`),
    ).toBeNull();

    await sliceB.slice.fetchCalendarMonthsAndGroups(null as any, SEM);
    expect(sliceB.state().calClassGroups).toEqual([]);
    expect(
      localStorage.getItem(
        `retop_cache_${scopedCacheKey(`cal_groups_${SEM}`, ACCOUNT_A)}`,
      ),
    ).not.toBeNull();
  });

  it('writes the selection to the scoped key, not the legacy unscoped one', () => {
    localStorage.setItem('retop_active_user', ACCOUNT_A);
    const slice = makeSlice();
    slice.slice.setCalSelectedGroup('A-selected');

    expect(localStorage.getItem(`retop-cal-selected-group-${ACCOUNT_A}`)).toBe(
      'A-selected',
    );
    expect(localStorage.getItem('retop-cal-selected-group')).toBeNull();
  });

  it('scopes the calendar semester selection by account', () => {
    localStorage.setItem('retop_active_user', ACCOUNT_A);
    const sliceA = makeSlice();
    sliceA.slice.setCalSelectedSem('SEM-A');
    expect(localStorage.getItem(`retop-cal-selected-sem-${ACCOUNT_A}`)).toBe(
      'SEM-A',
    );

    localStorage.setItem('retop_active_user', ACCOUNT_B);
    const sliceB = makeSlice();
    expect(sliceB.state().calSelectedSem).toBe('');
    expect(
      localStorage.getItem(`retop-cal-selected-sem-${ACCOUNT_B}`),
    ).toBeNull();
    expect(localStorage.getItem('retop-cal-selected-sem')).toBeNull();
  });
});
