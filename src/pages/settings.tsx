import React, { useState } from "react";
import { AppSettings } from "../utils/settings-store";
import { uploadBackup, downloadBackup } from "../utils/googleDriveSync";
import { clearCache } from "../utils/cache";
import {
  Palette,
  Sync,
  Tune,
  Storage,
  Info,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

import { downloadICalFile } from "../utils/ical-export";
import { useDataStore } from "../store/dataStore";

import { AppearanceSection } from "../components/settings/AppearanceSection";
import { DefaultsSection } from "../components/settings/DefaultsSection";
import { SyncSection } from "../components/settings/SyncSection";
import { DataStorageSection } from "../components/settings/DataStorageSection";
import { AboutSection } from "../components/settings/AboutSection";

interface SettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
  network?: any;
}

const CATEGORIES = [
  {
    id: "appearance",
    label: "Appearance",
    description: "Colors, themes, and calendar card accents",
    icon: Palette,
  },
  {
    id: "defaults",
    label: "Defaults",
    description: "Timetable mode, launch view, and display preferences",
    icon: Tune,
  },
  {
    id: "sync",
    label: "Sync",
    description: "Google Drive backups and Google Calendar export",
    icon: Sync,
  },
  {
    id: "data",
    label: "Data & Storage",
    description: "Cache management and endpoint storage explorer",
    icon: Storage,
  },
  {
    id: "about",
    label: "About",
    description: "retop version, links, and project info",
    icon: Info,
  },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

const COLORS = [
  { id: "grey", hex: "#71717a", label: "Monochrome" },
  { id: "red", hex: "#ef4444", label: "Red" },
  { id: "orange", hex: "#f97316", label: "Orange" },
  { id: "amber", hex: "#f59e0b", label: "Amber" },
  { id: "yellow", hex: "#eab308", label: "Yellow" },
  { id: "lime", hex: "#84cc16", label: "Lime" },
  { id: "green", hex: "#22c55e", label: "Green" },
  { id: "emerald", hex: "#10b981", label: "Emerald" },
  { id: "teal", hex: "#14b8a6", label: "Teal" },
  { id: "cyan", hex: "#06b6d4", label: "Cyan" },
  { id: "sky", hex: "#0ea5e9", label: "Sky" },
  { id: "blue", hex: "#3b82f6", label: "Blue" },
  { id: "indigo", hex: "#6366f1", label: "Indigo" },
  { id: "purple", hex: "#a855f7", label: "Purple" },
  { id: "violet", hex: "#8b5cf6", label: "Violet" },
  { id: "pink", hex: "#ec4899", label: "Pink" },
  { id: "rose", hex: "#f43f5e", label: "Rose" },
];

export function SettingsPage({ settings, updateSetting }: SettingsPageProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("appearance");
  const [isDriveSyncing, setIsDriveSyncing] = useState<boolean>(false);
  const [driveStatus, setDriveStatus] = useState<string>("");
  const [clearStatus, setClearStatus] = useState<string>("");

  const [icalOptions, setIcalOptions] = useState({
    includeTimetable: true,
    includeCalendar: true,
    includeEvents: true,
    includeExams: true,
  });

  const handleExportICal = () => {
    const { ttCourses, calGridData, examGroups } = useDataStore.getState();
    downloadICalFile({
      courses: ttCourses,
      calGridData,
      examGroups,
      includeTimetable: icalOptions.includeTimetable,
      includeCalendar: icalOptions.includeCalendar,
      includeEvents: icalOptions.includeEvents,
      includeExams: icalOptions.includeExams,
    });
  };

  const handleDriveBackup = async () => {
    setIsDriveSyncing(true);
    setDriveStatus("Backing up to Google Drive...");
    try {
      await uploadBackup(settings, settings.googleClientId);
      setDriveStatus("Backup successful!");
      updateSetting("driveSync", true);
    } catch (e: any) {
      setDriveStatus(`Backup failed: ${e.message || e}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleDriveRestore = async () => {
    setIsDriveSyncing(true);
    setDriveStatus("Restoring from Google Drive...");
    try {
      const data = await downloadBackup(settings.googleClientId);
      if (data && data.settings) {
        Object.entries(data.settings).forEach(([k, v]) => {
          updateSetting(k as keyof AppSettings, v as any);
        });
        setDriveStatus("Restore successful!");
      } else {
        setDriveStatus("No backup found on Drive.");
      }
    } catch (e: any) {
      setDriveStatus(`Restore failed: ${e.message || e}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleClearAllCache = async () => {
    try {
      await clearCache();
      setClearStatus("Cache cleared successfully!");
      setTimeout(() => setClearStatus(""), 3000);
    } catch (e) {
      setClearStatus("Failed to clear cache.");
    }
  };

  const handleThemeChange = (
    _e: any,
    targetMode: "light" | "dark" | "amoled" | "auto",
  ) => {
    updateSetting("themeMode", targetMode as any);
  };

  return (
    <div 
      className="h-full w-full flex flex-col lg:flex-row gap-6 py-0 pl-4 pr-0 md:py-0 md:pl-6 md:pr-0 lg:py-0 lg:px-8 overflow-y-auto lg:overflow-hidden bg-(--bg-main) text-(--text-main) max-w-425 mx-auto relative">
      <div className="w-full flex-1 flex flex-col md:flex-row gap-6 md:gap-8 min-h-0 overflow-hidden h-full">
        {/* Left Category Sidebar */}
        <div className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col gap-1 h-fit overflow-y-auto scrollbar-none pt-18 md:pt-22 pb-6 pr-1">
          {CATEGORIES.map((cat, i) => {
            const isSelected = activeCategory === cat.id;
            const CatIcon = cat.icon;
            const isFirst = i === 0;
            const isLast = i === CATEGORIES.length - 1;
            const roundingClass = isFirst
              ? "rounded-t-4xl rounded-b-xl"
              : isLast
                ? "rounded-b-4xl rounded-t-xl"
                : "rounded-xl";

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-start gap-4 px-5 py-4 ${roundingClass} transition-all cursor-pointer text-left border-2 ${
                  isSelected
                    ? "bg-(--accent-base) text-(--text-inverse) border-(--accent-base) shadow-none"
                    : "bg-(--bg-surface) text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main) border-(--border-dim)"
                }`}>
                <CatIcon
                  className={`w-6 h-6 shrink-0 mt-0.5 transition-transform ${isSelected ? "scale-105" : ""}`} />
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="font-expanded font-black text-sm md:text-base leading-snug">
                    {cat.label}
                  </span>
                  <span
                    className={`text-xs font-medium leading-snug ${isSelected ? "opacity-90 text-(--text-inverse)" : "text-(--text-muted)"}`}>
                    {cat.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Topic Content Area */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar pt-18 md:pt-22 pb-24 md:pb-12 pr-2">
          <div className="flex flex-col gap-6 max-w-2xl">
            {activeCategory === "appearance" && (
              <AppearanceSection
                settings={settings}
                updateSetting={updateSetting}
                handleThemeChange={handleThemeChange}
                COLORS={COLORS} />
            )}

            {activeCategory === "defaults" && (
              <DefaultsSection
                settings={settings}
                updateSetting={updateSetting} />
            )}

            {activeCategory === "sync" && (
              <SyncSection
                settings={settings}
                updateSetting={updateSetting}
                isDriveSyncing={isDriveSyncing}
                driveStatus={driveStatus}
                handleDriveBackup={handleDriveBackup}
                handleDriveRestore={handleDriveRestore}
                icalOptions={icalOptions}
                setIcalOptions={setIcalOptions}
                handleExportICal={handleExportICal} />
            )}

            {activeCategory === "data" && (
              <DataStorageSection
                handleClearAllCache={handleClearAllCache}
                clearStatus={clearStatus} />
            )}

            {activeCategory === "about" && (
              <AboutSection />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
