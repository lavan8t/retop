import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { getAppRoot } from "./bridge";
import { QuickLink } from "../types/vtop";

export interface AppSettings {
  defaultView: "modern" | "legacy";
  themeMode: "dark" | "light" | "amoled" | "auto";
  accentColor: "blue" | "purple" | "pink" | "red" | "orange" | "yellow" | "lime" | "green" | "cyan" | "indigo" | "random";
  randomAccentColor: boolean;
  blurCgpa: boolean;
  googleLinked: boolean;
  calendarSync: boolean;
  driveSync: boolean;
  pinnedLinks: QuickLink[];
  use24HourTime: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultView: "modern",
  themeMode: "dark",
  accentColor: "blue",
  randomAccentColor: false,
  blurCgpa: false,
  googleLinked: false,
  calendarSync: false,
  driveSync: false,
  use24HourTime: true,
  pinnedLinks: [
    { title: "Time Table", url: "studenttimetable", category: "Core" },
    { title: "Marks", url: "mark", category: "Core" },
    {
      title: "Student Profile",
      url: "studentprofileallview",
      category: "System",
    },
  ],
};

const MATERIAL_ACCENTS: Record<string, string> = {
  blue: "#2563eb",
  indigo: "#4f46e5",
  purple: "#9333ea",
  pink: "#db2777",
  red: "#dc2626",
  orange: "#ea580c",
  yellow: "#ca8a04",
  lime: "#65a30d",
  green: "#16a34a",
  cyan: "#0891b2",
};

export const applyTheme = (settings: AppSettings) => {
  if (typeof document === "undefined") return;
  const root = getAppRoot();
  if (!root) return;

  root.setAttribute("data-theme", settings.themeMode);
  document.documentElement.setAttribute("data-theme", settings.themeMode);

  let baseColor = MATERIAL_ACCENTS[settings.accentColor] || MATERIAL_ACCENTS.blue;
  if (settings.randomAccentColor) {
    const hue = Math.floor(Math.random() * 360);
    baseColor = `hsl(${hue}, 70%, 45%)`;
  }
  root.style.setProperty("--accent-base", baseColor);
  document.documentElement.style.setProperty("--accent-base", baseColor);
};

export const resetDynamicThemeSeed = () => {
  sessionStorage.removeItem("vtop-random-theme");
};

interface SettingsStore {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const chromeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(name, (result) => {
        resolve((result[name] as string) || null);
      });
    });
  },
  setItem: async (name: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [name]: value }, () => {
        resolve();
      });
    });
  },
  removeItem: async (name: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove(name, () => {
        resolve();
      });
    });
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      updateSetting: (key, value) => {
        set((state) => {
          const newSettings = { ...state.settings, [key]: value };
          applyTheme(newSettings);
          return { settings: newSettings };
        });
      },
    }),
    {
      name: "retop-settings",
      storage: createJSONStorage(() => chromeStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.settings);
        }
      },
    }
  )
);

export const useSettings = () => {
  return useSettingsStore();
};
