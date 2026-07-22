import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { getAppRoot } from "./bridge";
import { QuickLink } from "../types/vtop";

export interface AppSettings {
  defaultView: "modern" | "legacy";
  themeMode: "dark" | "light" | "amoled" | "auto";
  accentColor: "blue" | "purple" | "pink" | "red" | "orange" | "yellow" | "lime" | "green" | "cyan" | "indigo" | "random" | "neon-green" | "neon-yellow" | "neon-orange" | "neon-red";
  randomAccentColor: boolean;
  blurCgpa: boolean;
  googleLinked: boolean;
  calendarSync: boolean;
  driveSync: boolean;
  pinnedLinks: QuickLink[];
  use24HourTime: boolean;
  animationScale: "1x" | "0.5x" | "0x";
  searchHotkey: "/" | "space" | "instant";
  calendarClassColor: string;
  calendarEventColor: string;
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
  animationScale: "1x",
  searchHotkey: "/",
  calendarClassColor: "blue",
  calendarEventColor: "purple",
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
  "neon-green": "#39ff14",
  "neon-yellow": "#eaff00",
  "neon-orange": "#ff6700",
  "neon-red": "#ff073a",
};

import { argbFromHex, hexFromArgb, Hct, SchemeVibrant, MaterialDynamicColors } from "@material/material-color-utilities";

// Convert an HSL string to Hex
const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const applyTheme = (settings: AppSettings) => {
  if (typeof document === "undefined") return;
  const root = getAppRoot();

  let appliedTheme = settings.themeMode;
  if (appliedTheme === "auto") {
    const hour = new Date().getHours();
    appliedTheme = (hour >= 18 || hour < 6) ? "dark" : "light";
  }

  if (root) root.setAttribute("data-theme", appliedTheme);
  document.documentElement.setAttribute("data-theme", appliedTheme);

  let baseColor = MATERIAL_ACCENTS[settings.accentColor] || MATERIAL_ACCENTS.blue;
  if (settings.randomAccentColor) {
    const hue = Math.floor(Math.random() * 360);
    baseColor = hslToHex(hue, 70, 45);
  }

  const isDark = appliedTheme === "dark" || appliedTheme === "amoled";
  
  // Initialize Material Theme
  const hct = Hct.fromInt(argbFromHex(baseColor));
  const scheme = isDark 
    ? new SchemeVibrant(hct, true, 0.0) 
    : new SchemeVibrant(hct, false, 0.0);
  
  // Set the base variables
  if (root) root.style.setProperty("--accent-base", hexFromArgb(scheme.primary));
  document.documentElement.style.setProperty("--accent-base", hexFromArgb(scheme.primary));

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
        chrome.storage.local.get(name, (result) => {
          resolve((result?.[name] as string) || null);
        });
      } catch (e) {
        console.warn("Storage get failed", e);
        resolve(null);
      }
    });
  },
  setItem: async (name: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [name]: value }, () => resolve());
      } catch (e) {
        console.warn("Storage set failed", e);
        resolve();
      }
    });
  },
  removeItem: async (name: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.remove(name, () => resolve());
      } catch (e) {
        console.warn("Storage remove failed", e);
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
