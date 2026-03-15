import { useState, useEffect } from "react";
import { QuickLink } from "../types/vtop";

export interface AppSettings {
  defaultView: "modern" | "legacy";
  themeMode: "dark" | "light" | "amoled";
  accentColor: "blue" | "purple" | "orange" | "lime" | "cyan" | "random";
  randomAccentColor: boolean;
  showSemesterProgress: boolean;
  googleLinked: boolean;
  calendarSync: boolean;
  driveSync: boolean;
  pinnedLinks: QuickLink[];
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultView: "modern",
  themeMode: "dark",
  accentColor: "blue",
  randomAccentColor: false,
  showSemesterProgress: false,
  googleLinked: false,
  calendarSync: false,
  driveSync: false,
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

const DYNAMIC_THEME_STORAGE_KEY = "vtop-random-theme";
const LEGACY_RANDOM_KEY = "vtop-random-accent";
const STATIC_ACCENTS: Record<
  string,
  { base: string; hover: string; active: string; tint: string }
> = {
  blue: {
    base: "#3b82f6",
    hover: "#60a5fa",
    active: "#2563eb",
    tint: "#1e3a8a",
  },
  purple: {
    base: "#a855f7",
    hover: "#c084fc",
    active: "#9333ea",
    tint: "#581c87",
  },
  orange: {
    base: "#f97316",
    hover: "#fb923c",
    active: "#ea580c",
    tint: "#7c2d12",
  },
  lime: {
    base: "#84cc16",
    hover: "#a3e635",
    active: "#65a30d",
    tint: "#365314",
  },
  cyan: {
    base: "#06b6d4",
    hover: "#22d3ee",
    active: "#0891b2",
    tint: "#164e63",
  },
  random: {
    base: "#3b82f6",
    hover: "#60a5fa",
    active: "#2563eb",
    tint: "#1e3a8a",
  },
};

const DYNAMIC_VARIABLES = [
  "--bg-main",
  "--bg-surface",
  "--bg-highlight",
  "--border-main",
  "--border-dim",
  "--text-main",
  "--text-muted",
  "--text-dim",
  "--text-inverse",
  "--accent-base",
  "--accent-hover",
  "--accent-active",
  "--accent-tint",
  "--card-cyan",
  "--card-lime",
  "--card-yellow",
  "--card-blue",
  "--card-red",
];

type ThemePalette = Record<string, string>;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const wrapHue = (hue: number) => ((hue % 360) + 360) % 360;

const tone = (hue: number, saturation: number, lightness: number) => {
  const h = Math.round(wrapHue(hue));
  const s = Math.round(clamp(saturation, 0, 100));
  const l = Math.round(clamp(lightness, 0, 100));
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const purgeLegacyAccent = () => {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.removeItem(LEGACY_RANDOM_KEY);
  } catch {
    /* noop */
  }
};

const persistSeed = (seed: number) => {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.setItem(
      DYNAMIC_THEME_STORAGE_KEY,
      JSON.stringify({ seed }),
    );
  } catch {
    /* noop */
  }
};

const readStoredSeed = (): number | null => {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(DYNAMIC_THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.seed === "number") {
      return parsed.seed;
    }
    return null;
  } catch {
    return null;
  }
};

const getOrCreateSeed = () => {
  purgeLegacyAccent();
  const existing = readStoredSeed();
  if (typeof existing === "number") return existing;
  const seed = Math.floor(Math.random() * 360);
  persistSeed(seed);
  return seed;
};

const generateDynamicPalette = (
  seed: number,
  mode: AppSettings["themeMode"],
): ThemePalette => {
  const isLight = mode === "light";
  const accentLight = isLight ? 48 : 56;
  const accentSat = isLight ? 72 : 78;
  const neutralHue = wrapHue(seed - 18);
  const neutralSat = isLight ? 14 : 18;

  const palette: ThemePalette = {
    "--accent-base": tone(seed, accentSat, accentLight),
    "--accent-hover": tone(seed, accentSat, accentLight + (isLight ? 7 : 5)),
    "--accent-active": tone(seed, accentSat, accentLight - 10),
    "--accent-tint": tone(seed, accentSat, accentLight - 28),
    "--bg-main": tone(neutralHue, neutralSat, isLight ? 96 : 10),
    "--bg-surface": tone(neutralHue, neutralSat + 2, isLight ? 92 : 14),
    "--bg-highlight": tone(neutralHue, neutralSat + 4, isLight ? 88 : 20),
    "--border-main": tone(neutralHue, neutralSat + 8, isLight ? 35 : 38),
    "--border-dim": tone(neutralHue, neutralSat + 4, isLight ? 60 : 26),
    "--text-main": tone(neutralHue, neutralSat + 6, isLight ? 12 : 93),
    "--text-muted": tone(neutralHue, neutralSat + 3, isLight ? 38 : 72),
    "--text-dim": tone(neutralHue, neutralSat + 2, isLight ? 48 : 60),
    "--text-inverse": tone(neutralHue, neutralSat, isLight ? 6 : 96),
  };

  const cardSat = isLight ? 70 : 68;
  const cardLight = isLight ? 78 : 56;

  palette["--card-cyan"] = tone(seed + 20, cardSat, cardLight);
  palette["--card-lime"] = tone(
    seed + 85,
    cardSat,
    cardLight + (isLight ? -4 : 6),
  );
  palette["--card-yellow"] = tone(
    seed + 130,
    cardSat,
    cardLight + (isLight ? -2 : 8),
  );
  palette["--card-blue"] = tone(
    seed - 35,
    cardSat,
    cardLight + (isLight ? -6 : 4),
  );
  palette["--card-red"] = tone(
    seed + 180,
    cardSat,
    cardLight - (isLight ? 6 : 2),
  );

  return palette;
};

const applyPalette = (root: HTMLElement, palette: ThemePalette) => {
  Object.entries(palette).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });
};

const clearDynamicOverrides = (root: HTMLElement) => {
  DYNAMIC_VARIABLES.forEach((token) => root.style.removeProperty(token));
};

export const resetDynamicThemeSeed = () => {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.removeItem(DYNAMIC_THEME_STORAGE_KEY);
  } catch {}
};

export const applyTheme = (settings: AppSettings) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  root.setAttribute("data-theme", settings.themeMode);

  if (settings.randomAccentColor) {
    const seed = getOrCreateSeed();
    const palette = generateDynamicPalette(seed, settings.themeMode);
    applyPalette(root as HTMLElement, palette);
    return;
  }

  clearDynamicOverrides(root as HTMLElement);

  const accent = STATIC_ACCENTS[settings.accentColor] || STATIC_ACCENTS.blue;
  root.style.setProperty("--accent-base", accent.base);
  root.style.setProperty("--accent-hover", accent.hover);
  root.style.setProperty("--accent-active", accent.active);
  root.style.setProperty("--accent-tint", accent.tint);
  const inverse = settings.themeMode === "light" ? "#050505" : "#f8fafc";
  root.style.setProperty("--text-inverse", inverse);
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = localStorage.getItem("retop-settings");
        if (saved) {
          setSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
        }
      }
    } catch (e) {
      console.warn("Failed to load settings:", e);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      applyTheme(settings);
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("retop-settings", JSON.stringify(settings));
      }
    }
  }, [settings, mounted]);

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
};
