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
  use24HourTime: boolean;
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

// Professional Material 3 Base Accents
const MATERIAL_ACCENTS: Record<string, string> = {
  blue: "#2563eb", // Professional Royal Blue
  purple: "#6366f1", // Sleek Indigo
  orange: "#ea580c", // Burnt Orange / Rust
  lime: "#059669", // Mapped to Emerald Green for a professional look
  cyan: "#0e7490", // Deep Slate Cyan
};

export const applyTheme = (settings: AppSettings) => {
  if (typeof document === "undefined") return;

  const root = getAppRoot();
  if (!root) return;

  root.setAttribute("data-theme", settings.themeMode);

  let baseColor =
    MATERIAL_ACCENTS[settings.accentColor] || MATERIAL_ACCENTS.blue;

  if (settings.randomAccentColor) {
    // Generate a professional muted random color
    const hue = Math.floor(Math.random() * 360);
    baseColor = `hsl(${hue}, 70%, 45%)`;
  }

  // Inject only the base color; CSS color-mix() does the heavy lifting
  root.style.setProperty("--accent-base", baseColor);
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
