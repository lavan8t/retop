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
  timeFormat?: "24h" | "12h" | "12h-ampm";
  animationScale: "1x" | "0.5x" | "0x";
  searchHotkey: "/" | "space" | "instant";
  calendarClassColor: string;
  calendarEventColor: string;
  timetableMode: "weekly" | "slot" | "consolidated" | "fullMonth";
  googleClientId: string;
  dateFormat: DateFormatPattern;
  fontScale: number;
  fontWeight: "regular" | "medium" | "bold";
  skipRoleSelection: boolean;
}


const DEFAULT_SETTINGS: AppSettings = {
  defaultView: "modern",
  themeMode: "dark",
  vtopThemeMode: "same",
  accentColor: "orange",
  randomAccentColor: false,
  blurCgpa: false,
  googleLinked: false,
  calendarSync: false,
  driveSync: false,
  pureBlack: false,
  use24HourTime: false,
  timeFormat: "12h",
  animationScale: "1x",
  searchHotkey: "/",
  calendarClassColor: "blue",
  calendarEventColor: "purple",
  timetableMode: "weekly",
  googleClientId: "",
  dateFormat: "DD Mon YYYY",
  fontScale: 100,
  fontWeight: "bold",
  skipRoleSelection: false,

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

export const getMaterialThemeColor = (colorKey: string, _isDark: boolean = true): string => {
  if (colorKey === "grey" || colorKey === "monochrome") {
    return "#27272a";
  }
  const hex = MATERIAL_ACCENTS[colorKey] || (colorKey && colorKey.startsWith("#") ? colorKey : MATERIAL_ACCENTS.blue);
  try {
    const hct = Hct.fromInt(argbFromHex(hex));
    const containerHct = Hct.from(hct.hue, hct.chroma, 30);
    return hexFromArgb(containerHct.toInt());
  } catch {
    return hex;
  }
};

export const getMaterialOnThemeColor = (colorKey: string, _isDark: boolean = true): string => {
  if (colorKey === "grey" || colorKey === "monochrome") {
    return "#f4f4f5";
  }
  const hex = MATERIAL_ACCENTS[colorKey] || (colorKey && colorKey.startsWith("#") ? colorKey : MATERIAL_ACCENTS.blue);
  try {
    const hct = Hct.fromInt(argbFromHex(hex));
    const onContainerHct = Hct.from(hct.hue, hct.chroma, 95);
    return hexFromArgb(onContainerHct.toInt());
  } catch {
    return "#ffffff";
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

  if (typeof settings.fontScale === "number" && settings.fontScale > 0) {
    document.documentElement.style.fontSize = `${settings.fontScale}%`;
  }

  const wghtMap: Record<string, string> = { regular: "400", medium: "550", bold: "700" };
  const wght = wghtMap[settings.fontWeight ?? "bold"] ?? "700";
  if (root) root.style.setProperty("--app-font-wght", wght);
  document.documentElement.style.setProperty("--app-font-wght", wght);

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

const encodeStorage = (str: string): string => {
  try {
    return "enc_" + btoa(encodeURIComponent(str));
  } catch {
    return str;
  }
};

const decodeStorage = (str: string): string => {
  try {
    if (str && str.startsWith("enc_")) {
      return decodeURIComponent(atob(str.slice(4)));
    }
    return str;
  } catch {
    return str;
  }
};

const chromeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const parseValue = (rawVal: any) => {
          if (rawVal !== undefined && rawVal !== null) {
            const strVal = typeof rawVal === "string" ? rawVal : JSON.stringify(rawVal);
            return decodeStorage(strVal);
          }
          return null;
        };

        if (typeof chrome !== "undefined" && chrome.runtime?.id && chrome.storage?.local) {
          chrome.storage.local.get(name, (result) => {
            if (chrome.runtime?.lastError) {
              try { resolve(parseValue(localStorage.getItem(name))); } catch { resolve(null); }
            } else {
              const res = parseValue(result?.[name]);
              if (res !== null) {
                resolve(res);
              } else {
                try { resolve(parseValue(localStorage.getItem(name))); } catch { resolve(null); }
              }
            }
          });
        } else {
          try { resolve(parseValue(localStorage.getItem(name))); } catch { resolve(null); }
        }
      } catch (e) {
        try { resolve(decodeStorage(localStorage.getItem(name) || "")); } catch { resolve(null); }
      }
    });
  },
  setItem: async (name: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const encoded = encodeStorage(value);
        try { localStorage.setItem(name, encoded); } catch {}

        if (typeof chrome !== "undefined" && chrome.runtime?.id && chrome.storage?.local) {
          const payload = { [name]: encoded };
          chrome.storage.local.set(payload, () => {
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
          chrome.storage.local.remove([name, "retop_settings_obj"], () => {
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

let localUpdateTimer: any = null;
let isLocallyUpdating = false;

const setLocalUpdateLock = () => {
  isLocallyUpdating = true;
  if (localUpdateTimer) clearTimeout(localUpdateTimer);
  localUpdateTimer = setTimeout(() => {
    isLocallyUpdating = false;
  }, 1000);
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      updateSetting: (key, value) => {
        setLocalUpdateLock();
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
    if (isLocallyUpdating) return; // Ignore storage echo during active local updates
    if (namespace === "local" && (changes["retop-settings"] || changes["retop_settings_obj"])) {
      const changeItem = changes["retop-settings"] || changes["retop_settings_obj"];
      const newValue = changeItem?.newValue;
      if (newValue) {
        try {
          let parsed;
          if (typeof newValue === "string") {
            const decoded = decodeStorage(newValue);
            parsed = JSON.parse(decoded);
          } else {
            parsed = newValue;
          }

          const extractedSettings = parsed?.state?.settings || parsed?.settings || (parsed?.defaultView ? parsed : null);

          if (extractedSettings) {
            const currentSettings = useSettingsStore.getState().settings;
            if (JSON.stringify(currentSettings) !== JSON.stringify(extractedSettings)) {
              useSettingsStore.setState({ settings: extractedSettings });
              applyTheme(extractedSettings);
            }
          }
        } catch (e) {
          console.error("Failed to sync settings cross-context", e);
        }
      }
    }
  });
}
