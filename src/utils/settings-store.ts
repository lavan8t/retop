import { useState, useEffect } from "react";
import { getAppRoot } from "./bridge";

export interface AppSettings {
  defaultView: "modern" | "legacy";
  themeMode: "dark" | "light" | "amoled";
  accentColor: "blue" | "purple" | "orange" | "lime" | "cyan";
  showSemesterProgress: boolean;
  googleLinked: boolean;
  calendarSync: boolean;
  driveSync: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultView: "modern",
  themeMode: "dark",
  accentColor: "blue",
  showSemesterProgress: false,
  googleLinked: false,
  calendarSync: false,
  driveSync: false,
};

export const applyTheme = (settings: AppSettings) => {
  if (typeof document === "undefined") return;

  const root = getAppRoot() || document.documentElement;

  root.setAttribute("data-theme", settings.themeMode);

  const accents: Record<
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
  };

  const color = accents[settings.accentColor] || accents.blue;

  root.style.setProperty("--accent-base", color.base);
  root.style.setProperty("--accent-hover", color.hover);
  root.style.setProperty("--accent-active", color.active);
  root.style.setProperty("--accent-tint", color.tint);
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = localStorage.getItem("vtop-remastered-settings");
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
        localStorage.setItem(
          "vtop-remastered-settings",
          JSON.stringify(settings),
        );
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
