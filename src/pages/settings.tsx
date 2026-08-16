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
  ArrowBack,
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
  const [mobileSelectedCategory, setMobileSelectedCategory] = useState<CategoryId | null>(null);
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
      const { user } = useDataStore.getState();
      const currentRegNo = user?.regNo && user.regNo !== "..." ? user.regNo : undefined;
      await clearCache(currentRegNo);
      setClearStatus("Account cache cleared successfully!");
      setTimeout(() => setClearStatus(""), 3000);
    } catch (e) {
      setClearStatus("Failed to clear account cache.");
    }
  };

  const handleThemeChange = (
    _e: any,
    targetMode: "light" | "dark" | "amoled" | "auto",
  ) => {
    updateSetting("themeMode", targetMode as any);
  };

  const renderSectionContent = (categoryId: CategoryId) => {
    switch (categoryId) {
      case "appearance":
        return (
          <AppearanceSection
            settings={settings}
            updateSetting={updateSetting}
            handleThemeChange={handleThemeChange}
            COLORS={COLORS}
          />
        );
      case "defaults":
        return (
          <DefaultsSection
            settings={settings}
            updateSetting={updateSetting}
          />
        );
      case "sync":
        return (
          <SyncSection
            settings={settings}
            updateSetting={updateSetting}
            isDriveSyncing={isDriveSyncing}
            driveStatus={driveStatus}
            handleDriveBackup={handleDriveBackup}
            handleDriveRestore={handleDriveRestore}
            icalOptions={icalOptions}
            setIcalOptions={setIcalOptions}
            handleExportICal={handleExportICal}
          />
        );
      case "data":
        return (
          <DataStorageSection
            handleClearAllCache={handleClearAllCache}
            clearStatus={clearStatus}
          />
        );
      case "about":
        return <AboutSection />;
      default:
        return null;
    }
  };

  const currentMobileCatObj = CATEGORIES.find((c) => c.id === mobileSelectedCategory);

  return (
    <div className="h-full w-full flex flex-col md:flex-row gap-6 py-0 px-4 md:px-6 lg:px-8 overflow-y-auto md:overflow-hidden bg-(--bg-main) text-(--text-main) max-w-425 mx-auto relative custom-scrollbar">
      {/* MOBILE DRILL-DOWN VIEW (< md screens) */}
      <div className="flex md:hidden flex-col w-full min-h-0 pt-16 pb-24">
        {!mobileSelectedCategory ? (
          /* Level 1: Category Sections List */
          <div className="flex flex-col gap-1 w-full">
            {CATEGORIES.map((cat, i) => {
              const CatIcon = cat.icon;
              const isFirst = i === 0;
              const isLast = i === CATEGORIES.length - 1;
              const roundingClass = isFirst
                ? "rounded-t-3xl rounded-b-xl"
                : isLast
                  ? "rounded-b-3xl rounded-t-xl"
                  : "rounded-xl";

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setMobileSelectedCategory(cat.id);
                  }}
                  className={`flex items-center gap-3.5 px-4 py-3.5 ${roundingClass} bg-(--bg-surface) hover:bg-(--bg-highlight) text-(--text-main) border-2 border-(--border-dim) active:scale-[0.99] transition-all cursor-pointer text-left shadow-(--brutal-shadow-sm)`}
                >
                  <div className="w-10 h-10 rounded-full bg-(--bg-highlight) flex items-center justify-center shrink-0 border border-(--border-dim)">
                    <CatIcon className="w-5 h-5 text-(--accent-base)" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="font-expanded font-black text-sm text-(--text-main) leading-snug">
                      {cat.label}
                    </span>
                    <span className="text-xs font-medium text-(--text-muted) leading-tight truncate">
                      {cat.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Level 2: Category Detail Page */
          <div className="flex flex-col gap-4 w-full animate-in fade-in duration-150">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-(--border-main)">
              <button
                onClick={() => setMobileSelectedCategory(null)}
                className="p-2 -ml-2 rounded-full hover:bg-(--bg-highlight) text-(--text-main) active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Back to settings"
              >
                <ArrowBack className="w-5 h-5 text-(--text-main)" />
              </button>
              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="text-lg font-expanded font-black text-(--text-main) leading-tight truncate">
                  {currentMobileCatObj?.label}
                </h2>
                <span className="text-xs font-medium text-(--text-muted) leading-tight truncate">
                  {currentMobileCatObj?.description}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-6 pt-1">
              {renderSectionContent(mobileSelectedCategory)}
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP 2-COLUMN VIEW (md:flex) */}
      <div className="hidden md:flex w-full flex-1 flex-row gap-6 md:gap-8 min-h-0 overflow-hidden h-full">
        {/* Left Category Sidebar */}
        <div className="w-72 lg:w-80 shrink-0 flex flex-col gap-1 h-fit overflow-y-auto scrollbar-none pt-18 md:pt-22 pb-6 pr-1">
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
                }`}
              >
                <CatIcon
                  className={`w-6 h-6 shrink-0 mt-0.5 transition-transform ${isSelected ? "scale-105" : ""}`}
                />
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="font-expanded font-black text-sm md:text-base leading-snug">
                    {cat.label}
                  </span>
                  <span
                    className={`text-xs font-medium leading-snug ${
                      isSelected
                        ? "opacity-90 text-(--text-inverse)"
                        : "text-(--text-muted)"
                    }`}
                  >
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
            {renderSectionContent(activeCategory)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
