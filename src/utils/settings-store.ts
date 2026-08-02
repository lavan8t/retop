import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { getAppRoot } from "./bridge";
import { QuickLink } from "../types/vtop";

export type DateFormatPattern =
  | "DD Mon YYYY"
  | "DD Mon YY"
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "YYYY-MM-DD"
  | "DD.MM.YYYY"
  | "DD-MM-YYYY";

export interface AppSettings {
  defaultView: "modern" | "legacy";
  themeMode: "dark" | "light" | "amoled" | "auto";
  vtopThemeMode: "same" | "dark" | "light" | "amoled" | "none";
  accentColor: "grey" | "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "cyan" | "indigo" | "lime" | "monochrome";
  randomAccentColor: boolean;
  blurCgpa: boolean;
  googleLinked: boolean;
  calendarSync: boolean;
  driveSync: boolean;
  pureBlack: boolean;
  pinnedLinks: QuickLink[];
  use24HourTime: boolean;
  animationScale: "1x" | "0.5x" | "0x";
  searchHotkey: "/" | "space" | "instant";
  calendarClassColor: string;
  calendarEventColor: string;
  timetableMode: "weekly" | "slot" | "consolidated" | "fullMonth";
  googleClientId: string;
  dateFormat: DateFormatPattern;
  fontScale: number;
  fontWeight: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultView: "modern",
  themeMode: "dark",
  vtopThemeMode: "same",
  accentColor: "blue",
  randomAccentColor: false,
  blurCgpa: false,
  googleLinked: false,
  calendarSync: false,
  driveSync: false,
  pureBlack: false,
  use24HourTime: true,
  animationScale: "1x",
  searchHotkey: "/",
  calendarClassColor: "blue",
  calendarEventColor: "purple",
  timetableMode: "weekly",
  googleClientId: "",
  dateFormat: "DD Mon YYYY",
  fontScale: 100,
  fontWeight: 700,
  pinnedLinks: [
    { title: "Time Table", url: "studenttimetable", category: "Core" },
    { title: "Marks", url: "mark", category: "Core" },
    {
      title: "Profile",
      url: "studentprofileallview",
      category: "System",
    },
  ],
};

export const MATERIAL_ACCENTS: Record<string, string> = {
  grey: "#71717a",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#a855f7",
  violet: "#8b5cf6",
  pink: "#ec4899",
  rose: "#f43f5e",
  lime: "#84cc16",
  deepOrange: "#ff5722",
};

import { argbFromHex, hexFromArgb, Hct, SchemeVibrant, SchemeMonochrome } from "@material/material-color-utilities";

export const getMaterialThemeColor = (colorKey: string, isDark: boolean = true): string => {
  if (colorKey === "grey" || colorKey === "monochrome") {
    return isDark ? "#27272a" : "#f4f4f5";
  }
  const hex = MATERIAL_ACCENTS[colorKey] || (colorKey && colorKey.startsWith("#") ? colorKey : MATERIAL_ACCENTS.blue);
  try {
    const hct = Hct.fromInt(argbFromHex(hex));
    const containerTone = isDark ? 30 : 90;
    const containerHct = Hct.from(hct.hue, hct.chroma, containerTone);
    return hexFromArgb(containerHct.toInt());
  } catch {
    return hex;
  }
};

export const getMaterialOnThemeColor = (colorKey: string, isDark: boolean = true): string => {
  if (colorKey === "grey" || colorKey === "monochrome") {
    return isDark ? "#f4f4f5" : "#18181b";
  }
  const hex = MATERIAL_ACCENTS[colorKey] || (colorKey && colorKey.startsWith("#") ? colorKey : MATERIAL_ACCENTS.blue);
  try {
    const hct = Hct.fromInt(argbFromHex(hex));
    const onContainerTone = isDark ? 95 : 15;
    const onContainerHct = Hct.from(hct.hue, hct.chroma, onContainerTone);
    return hexFromArgb(onContainerHct.toInt());
  } catch {
    return isDark ? "#ffffff" : "#000000";
  }
};

export const applyTheme = (settings: AppSettings) => {
  if (typeof document === "undefined") return;
  const root = getAppRoot();

  let appliedTheme = settings.themeMode;
  if (appliedTheme === "auto") {
    const systemDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    appliedTheme = systemDark ? (settings.pureBlack ? "amoled" : "dark") : "light";
  } else if (appliedTheme === "dark" && settings.pureBlack) {
    appliedTheme = "amoled";
  }

  if (root) root.setAttribute("data-theme", appliedTheme);

  let vtopTheme = settings.vtopThemeMode || "same";
  let appliedVtopTheme = vtopTheme === "same" ? appliedTheme : vtopTheme;
  if (appliedVtopTheme === "none") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", appliedVtopTheme);
  }

  const isMonochrome = settings.accentColor === "grey" || (settings as any).accentColor === "monochrome";
  const baseColor = MATERIAL_ACCENTS[settings.accentColor] || MATERIAL_ACCENTS.grey;
  const isDark = appliedTheme === "dark" || appliedTheme === "amoled";

  // Initialize Material Theme
  const hct = Hct.fromInt(argbFromHex(baseColor));
  const scheme = isMonochrome
    ? new SchemeMonochrome(hct, isDark, 0.0)
    : new SchemeVibrant(hct, isDark, 0.0);

  const primaryHex = isMonochrome
    ? (isDark ? "#a1a1aa" : "#52525b")
    : hexFromArgb(scheme.primary);

  // Set the base variables
  if (root) root.style.setProperty("--accent-base", primaryHex);
  document.documentElement.style.setProperty("--accent-base", primaryHex);

  // Set standard Material Design 3 variables
  const sysColors = {
    primary: hexFromArgb(scheme.primary),
    "on-primary": hexFromArgb(scheme.onPrimary),
    "primary-container": hexFromArgb(scheme.primaryContainer),
    "on-primary-container": hexFromArgb(scheme.onPrimaryContainer),
    secondary: hexFromArgb(scheme.secondary),
    "on-secondary": hexFromArgb(scheme.onSecondary),
    "secondary-container": hexFromArgb(scheme.secondaryContainer),
    "on-secondary-container": hexFromArgb(scheme.onSecondaryContainer),
    tertiary: hexFromArgb(scheme.tertiary),
    "on-tertiary": hexFromArgb(scheme.onTertiary),
    "tertiary-container": hexFromArgb(scheme.tertiaryContainer),
    "on-tertiary-container": hexFromArgb(scheme.onTertiaryContainer),
    error: hexFromArgb(scheme.error),
    "on-error": hexFromArgb(scheme.onError),
    "error-container": hexFromArgb(scheme.errorContainer),
    "on-error-container": hexFromArgb(scheme.onErrorContainer),
    background: hexFromArgb(scheme.background),
    "on-background": hexFromArgb(scheme.onBackground),
    surface: hexFromArgb(scheme.surface),
    "on-surface": hexFromArgb(scheme.onSurface),
    "surface-variant": hexFromArgb(scheme.surfaceVariant),
    "on-surface-variant": hexFromArgb(scheme.onSurfaceVariant),
    outline: hexFromArgb(scheme.outline),
    "outline-variant": hexFromArgb(scheme.outlineVariant)
  };

  Object.entries(sysColors).forEach(([name, val]) => {
    if (root) root.style.setProperty(`--md-sys-color-${name}`, val);
    document.documentElement.style.setProperty(`--md-sys-color-${name}`, val);
  });
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
      try {
        if (typeof chrome !== "undefined" && chrome.runtime?.id && chrome.storage?.local) {
          chrome.storage.local.get(name, (result) => {
            if (chrome.runtime?.lastError) {
              try { resolve(localStorage.getItem(name)); } catch { resolve(null); }
            } else {
              const val = (result?.[name] as string) || null;
              if (val) resolve(val);
              else {
                try { resolve(localStorage.getItem(name)); } catch { resolve(null); }
              }
            }
          });
        } else {
          try { resolve(localStorage.getItem(name)); } catch { resolve(null); }
        }
      } catch (e) {
        try { resolve(localStorage.getItem(name)); } catch { resolve(null); }
      }
    });
  },
  setItem: async (name: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        try { localStorage.setItem(name, value); } catch {}

        if (typeof chrome !== "undefined" && chrome.runtime?.id && chrome.storage?.local) {
          chrome.storage.local.set({ [name]: value }, () => {
            const _err = chrome.runtime?.lastError;
            resolve();
          });
        } else {
          resolve();
        }
      } catch (e) {
        resolve();
      }
    });
  },
  removeItem: async (name: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        try { localStorage.removeItem(name); } catch {}

        if (typeof chrome !== "undefined" && chrome.runtime?.id && chrome.storage?.local) {
          chrome.storage.local.remove(name, () => {
            const _err = chrome.runtime?.lastError;
            resolve();
          });
        } else {
          resolve();
        }
      } catch (e) {
        resolve();
      }
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

if (typeof chrome !== "undefined" && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes["retop-settings"]) {
      const newValue = changes["retop-settings"].newValue;
      if (newValue) {
        try {
          let parsed;
          if (typeof newValue === "string") {
            parsed = JSON.parse(newValue);
          } else {
            parsed = newValue; // chrome.storage sometimes parses it automatically if set as object
          }

          if (parsed && parsed.state && parsed.state.settings) {
            const currentSettings = useSettingsStore.getState().settings;
            // Prevent infinite loops if this tab triggered the change
            if (JSON.stringify(currentSettings) !== JSON.stringify(parsed.state.settings)) {
              useSettingsStore.setState({ settings: parsed.state.settings });
              applyTheme(parsed.state.settings);
            }
          }
        } catch (e) {
          console.error("Failed to sync settings cross-context", e);
        }
      }
    }
  });
}
