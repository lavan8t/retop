import { StateCreator } from 'zustand';
import { VTOPNetwork } from '../../utils/network';
import { getCachedData, setCachedData } from '../../utils/cache';
import {
  parseCalendarDays,
  parseCalendarGroupsAndMonths,
} from '../../parsers/calendar';
import {
  CalendarMonthPreview,
  CalendarEvent,
  ClassGroup,
} from '../../types/vtop';
import { DataState } from '../dataStore';

export interface CustomCalendarEvent {
  id: string;
  title: string;
  type: 'quiz' | 'assessment' | 'event' | 'task' | 'note';
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  venue?: string;
  description?: string;
}

export interface CalendarSlice {
  calSemesters: { id: string; label: string; selected?: boolean }[];
  setCalSemesters: (
    sems: { id: string; label: string; selected?: boolean }[],
  ) => void;
  calSelectedSem: string;
  setCalSelectedSem: (semId: string) => void;

  calClassGroups: ClassGroup[];
  calSelectedGroup: string;
  setCalSelectedGroup: (id: string) => void;
  calAvailableMonths: CalendarMonthPreview[];
  calGridData: {
    month: CalendarMonthPreview;
    days: CalendarEvent[];
    startOffset: number;
  }[];
  calLoadingInitial: boolean;
  calLoadingMonths: boolean;
  calLoadingGrid: boolean;

  fetchCalendarMonthsAndGroups: (
    network: VTOPNetwork,
    semId: string,
  ) => Promise<void>;
  fetchCalendarGrid: (
    network: VTOPNetwork,
    semId: string,
    groupId: string,
    months: CalendarMonthPreview[],
    forceFetch?: boolean,
  ) => Promise<void>;
}

export const createCalendarSlice: StateCreator<
  DataState,
  [],
  [],
  CalendarSlice
> = (set, get) => ({
  calSemesters: [],
  setCalSemesters: (calSemesters) => set({ calSemesters }),
  calSelectedSem: '',
  setCalSelectedSem: (calSelectedSem) => {
    localStorage.setItem('retop-cal-selected-sem', calSelectedSem);
    set({
      calSelectedSem,
      calGridData: [],
      calAvailableMonths: [],
      calClassGroups: [],
      calSelectedGroup: '',
    });
  },

  calClassGroups: [],
  calSelectedGroup: localStorage.getItem('retop-cal-selected-group') || '',
  setCalSelectedGroup: (id) => {
    localStorage.setItem('retop-cal-selected-group', id);
    set({ calSelectedGroup: id, calGridData: [] });
  },
  calAvailableMonths: [],
  calGridData: [],
  calLoadingInitial: true,
  calLoadingMonths: false,
  calLoadingGrid: false,

  fetchCalendarMonthsAndGroups: async (network, semId) => {
    set({ calLoadingMonths: true });
    try {
      const cacheKey = `cal_groups_${semId}`;
      const cached = await getCachedData<{
        groups: ClassGroup[];
        months: CalendarMonthPreview[];
      }>(cacheKey);

      let groups: ClassGroup[] = cached?.groups || [];
      let months: CalendarMonthPreview[] = cached?.months || [];

      if (!groups.length || !months.length) {
        const rawLocal = localStorage.getItem(`retop-cal-groups-${semId}`);
        if (rawLocal) {
          try {
            const parsed = JSON.parse(rawLocal);
            const data = parsed.data || parsed;
            if (data?.groups && data?.months) {
              groups = data.groups;
              months = data.months;
            }
          } catch {}
        }
      }

      if (groups.length > 0 && months.length > 0) {
        const savedGroup = localStorage.getItem('retop-cal-selected-group');
        const defaultGroup =
          savedGroup && groups.some((g) => g.id === savedGroup)
            ? savedGroup
            : groups.length > 1
              ? groups[1].id
              : groups[0]?.id || '';

        if (defaultGroup) {
          localStorage.setItem('retop-cal-selected-group', defaultGroup);
        }

        set({
          calClassGroups: groups,
          calAvailableMonths: months,
          calSelectedGroup: defaultGroup,
          calLoadingMonths: false,
        });
      }

      const isOfflineMode =
        (typeof window !== 'undefined' && (window as any).__RETOP_OFFLINE__) ||
        !network ||
        !network.csrf;

      if (isOfflineMode) {
        set({ calLoadingMonths: false });
        return;
      }

      const body = new URLSearchParams();
      body.append('_csrf', network.csrf);
      body.append('paramReturnId', 'getDateForSemesterPreview');
      body.append('semSubId', semId);
      body.append('authorizedID', network.authorizedID);
      body.append('x', new Date().toUTCString());

      const res = await fetch('/vtop/getDateForSemesterPreview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: body,
      });

      const html = await res.text();
      const parsed = parseCalendarGroupsAndMonths(html);

      if (parsed.groups.length > 0 && parsed.months.length > 0) {
        await setCachedData(cacheKey, {
          groups: parsed.groups,
          months: parsed.months,
        });
        localStorage.setItem(
          `retop-cal-groups-${semId}`,
          JSON.stringify({
            date: new Date().toDateString(),
            data: { groups: parsed.groups, months: parsed.months },
          }),
        );

        const savedGroup = localStorage.getItem('retop-cal-selected-group');
        const defaultGroup =
          savedGroup && parsed.groups.some((g) => g.id === savedGroup)
            ? savedGroup
            : parsed.groups.length > 1
              ? parsed.groups[1].id
              : parsed.groups[0]?.id || '';

        if (defaultGroup) {
          localStorage.setItem('retop-cal-selected-group', defaultGroup);
        }

        set({
          calClassGroups: parsed.groups,
          calAvailableMonths: parsed.months,
          calSelectedGroup: defaultGroup,
          calLoadingMonths: false,
        });
      } else {
        set({ calLoadingMonths: false });
      }
    } catch (e) {
      console.warn('Failed to fetch months and groups:', e);
      set({ calLoadingMonths: false });
    }
  },

  fetchCalendarGrid: async (
    network,
    semId,
    groupId,
    months,
    forceFetch = false,
  ) => {
    set({ calLoadingGrid: true, calGridData: [] });
    try {
      const results = [];
      for (const month of months) {
        const cacheKey = `cal_${semId}_${groupId}_${month.dateString}`;
        const html = await network.fetchWithCache(
          cacheKey,
          async () => {
            return await network.fetchFragment('processViewCalendar', {
              calDate: month.dateString,
              semSubId: semId,
              classGroupId: groupId,
            });
          },
          forceFetch,
          undefined,
          (data) => {
            return (
              data.includes('calendar-table') ||
              data.includes('table-responsive')
            );
          },
        );

        const days = parseCalendarDays(html, month.label);
        const dateObj = new Date(month.dateString);
        const startOffset = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          1,
        ).getDay();

        results.push({ month, days, startOffset });
      }
      set({ calGridData: results, calLoadingGrid: false });
    } catch (e) {
      console.error('Failed to fetch grid data:', e);
      set({ calLoadingGrid: false });
    }
  },
});
