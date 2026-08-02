import { StateCreator } from "zustand";
import { VTOPNetwork } from "../../utils/network";
import {
  parseCalendarDays,
  parseCalendarGroupsAndMonths,
} from "../../parsers/calendar";
import {
  CalendarMonthPreview,
  CalendarEvent,
  ClassGroup,
} from "../../types/vtop";
import { DataState } from "../dataStore";

export interface CustomCalendarEvent {
  id: string;
  title: string;
  type: "quiz" | "assessment" | "event" | "task" | "note";
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

  customEvents: CustomCalendarEvent[];
  addCustomEvent: (evt: Omit<CustomCalendarEvent, "id">) => void;
  removeCustomEvent: (id: string) => void;

  fetchCalendarMonthsAndGroups: (
    network: VTOPNetwork,
    semId: string,
  ) => Promise<void>;
  fetchCalendarGrid: (
    network: VTOPNetwork,
    semId: string,
    groupId: string,
    months: CalendarMonthPreview[],
  ) => Promise<void>;
}

const loadSavedCustomEvents = (): CustomCalendarEvent[] => {
  try {
    const raw = localStorage.getItem("retop-custom-calendar-events");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const createCalendarSlice: StateCreator<DataState, [], [], CalendarSlice> = (set, get) => ({
  calSemesters: [],
  setCalSemesters: (calSemesters) => set({ calSemesters }),
  calSelectedSem: "",
  setCalSelectedSem: (calSelectedSem) => {
    localStorage.setItem("retop-cal-selected-sem", calSelectedSem);
    set({
      calSelectedSem,
      calGridData: [],
      calAvailableMonths: [],
      calClassGroups: [],
      calSelectedGroup: "",
    });
  },

  calClassGroups: [],
  calSelectedGroup: localStorage.getItem("retop-cal-selected-group") || "",
  setCalSelectedGroup: (id) => {
    localStorage.setItem("retop-cal-selected-group", id);
    set({ calSelectedGroup: id, calGridData: [] });
  },
  calAvailableMonths: [],
  calGridData: [],
  calLoadingInitial: true,
  calLoadingMonths: false,
  calLoadingGrid: false,

  customEvents: loadSavedCustomEvents(),
  addCustomEvent: (evt) => {
    const newEvt: CustomCalendarEvent = {
      ...evt,
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    const updated = [...get().customEvents, newEvt];
    localStorage.setItem("retop-custom-calendar-events", JSON.stringify(updated));
    set({ customEvents: updated });
  },
  removeCustomEvent: (id) => {
    const updated = get().customEvents.filter((e) => e.id !== id);
    localStorage.setItem("retop-custom-calendar-events", JSON.stringify(updated));
    set({ customEvents: updated });
  },

  fetchCalendarMonthsAndGroups: async (network, semId) => {
    set({ calLoadingMonths: true, calAvailableMonths: [], calClassGroups: [] });
    try {
      const cacheKey = `retop-cal-groups-${semId}`;
      const today = new Date().toDateString();
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === today && parsed.data) {
          const savedGroup = localStorage.getItem("retop-cal-selected-group");
          const defaultGroup = (savedGroup && parsed.data.groups.some(
            (g: any) => g.id === savedGroup,
          ))
            ? savedGroup
            : parsed.data.groups.length > 0
              ? parsed.data.groups[0].id
              : "";

          if (defaultGroup) {
            localStorage.setItem("retop-cal-selected-group", defaultGroup);
          }

          set({
            calClassGroups: parsed.data.groups,
            calAvailableMonths: parsed.data.months,
            calSelectedGroup: defaultGroup,
            calLoadingMonths: false,
          });
          return;
        }
      }

      const body = new URLSearchParams();
      body.append("_csrf", network.csrf);
      body.append("paramReturnId", "getDateForSemesterPreview");
      body.append("semSubId", semId);
      body.append("authorizedID", network.authorizedID);
      body.append("x", new Date().toUTCString());

      const res = await fetch("/vtop/getDateForSemesterPreview", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: body,
      });

      const html = await res.text();
      const { groups, months } = parseCalendarGroupsAndMonths(html);

      if (groups.length > 0 && months.length > 0) {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ date: today, data: { groups, months } }),
        );
      }

      const savedGroup = localStorage.getItem("retop-cal-selected-group");
      const defaultGroup = (savedGroup && groups.some((g) => g.id === savedGroup))
        ? savedGroup
        : groups.length > 0
          ? groups[0].id
          : "";

      if (defaultGroup) {
        localStorage.setItem("retop-cal-selected-group", defaultGroup);
      }

      set({
        calClassGroups: groups,
        calAvailableMonths: months,
        calSelectedGroup: defaultGroup,
        calLoadingMonths: false,
      });
    } catch (e) {
      console.error("Failed to fetch months and groups:", e);
      set({ calLoadingMonths: false });
    }
  },

  fetchCalendarGrid: async (network, semId, groupId, months, forceFetch = false) => {
    set({ calLoadingGrid: true, calGridData: [] });
    try {
      const results = [];
      for (const month of months) {
        const cacheKey = `cal_${semId}_${groupId}_${month.dateString}`;
        const html = await network.fetchWithCache(
          cacheKey,
          async () => {
            return await network.fetchFragment("processViewCalendar", {
              calDate: month.dateString,
              semSubId: semId,
              classGroupId: groupId,
            });
          },
          forceFetch,
          undefined,
          (data) => {
            return data.includes("calendar-table") || data.includes("table-responsive");
          }
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
      console.error("Failed to fetch grid data:", e);
      set({ calLoadingGrid: false });
    }
  },
});
