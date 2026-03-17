import { useState, useEffect } from "react";
import { getAppRoot } from "./bridge";
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

const STATIC_ACCENTS: Record<string, any> = {
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
};

export const applyTheme = (settings: AppSettings) => {
  if (typeof document === "undefined") return;

  const root = getAppRoot(); // Targeted to #vtop-remastered-root inside Shadow DOM
  if (!root) return;

  root.setAttribute("data-theme", settings.themeMode);

  if (settings.randomAccentColor) {
    // Palette generation logic...
    return;
  }

  const accent = STATIC_ACCENTS[settings.accentColor] || STATIC_ACCENTS.blue;
  root.style.setProperty("--accent-base", accent.base);
  root.style.setProperty("--accent-hover", accent.hover);
  root.style.setProperty("--accent-active", accent.active);
  root.style.setProperty("--accent-tint", accent.tint);
};

export const resetDynamicThemeSeed = () => {
  sessionStorage.removeItem("vtop-random-theme");
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("retop-settings");
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (mounted) {
      applyTheme(settings);
      localStorage.setItem("retop-settings", JSON.stringify(settings));
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
