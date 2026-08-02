import React, { useState } from "react";
import {
  AppSettings,
  resetDynamicThemeSeed,
  getMaterialThemeColor,
  getMaterialOnThemeColor,
} from "../utils/settings-store";
import { uploadBackup, downloadBackup } from "../utils/googleDriveSync";
import { clearCache } from "../utils/cache";
import {
  Check,
  Casino,
  LocationOn,
  Palette,
  Sync,
  Tune,
  Storage,
  KeyboardArrowDown,
  Info,
  WbSunny,
  DarkMode,
  Computer,
  Language,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

import { SyncManager } from "../components/SyncManager";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { MaterialSwitch } from "../components/MaterialSwitch";
import { Tooltip } from "../components/ui/Tooltip";

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

declare const __BUILD_NUMBER__: string;

const SettingTopicCard = ({
  title,
  description,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`p-6 rounded-3xl bg-transparent border-2 border-(--border-dim) flex flex-col gap-4 ${className}`}
  >
    {(title || description) && (
      <div className="flex flex-col gap-1 border-b-2 border-(--border-dim) pb-4">
        {title && (
          <h3 className="font-expanded font-black text-lg md:text-xl text-(--text-main)">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-xs md:text-sm font-medium text-(--text-muted)">
            {description}
          </p>
        )}
      </div>
    )}
    {children}
  </div>
);

export function SettingsPage({ settings, updateSetting }: SettingsPageProps) {
  const [activeCategory, setActiveCategory] =
    useState<CategoryId>("appearance");
  const [isDriveSyncing, setIsDriveSyncing] = useState<boolean>(false);
  const [driveStatus, setDriveStatus] = useState<string>("");
  const [clearStatus, setClearStatus] = useState<string>("");
  const [isHoveredRetop, setIsHoveredRetop] = useState<boolean>(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] =
    useState<boolean>(false);

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

  const COLORS = [
    { id: "grey", hex: "#71717a", label: "Monochrome" },
    { id: "red", hex: "#ef4444", label: "Red" },
    { id: "orange", hex: "#f97316", label: "Orange" },
    { id: "yellow", hex: "#eab308", label: "Yellow" },
    { id: "green", hex: "#22c55e", label: "Green" },
    { id: "blue", hex: "#3b82f6", label: "Blue" },
    { id: "pink", hex: "#ec4899", label: "Pink" },
  ];

  const handleThemeChange = (
    e: React.MouseEvent | { clientX: number; clientY: number } | undefined,
    targetMode: "light" | "dark" | "amoled" | "auto",
  ) => {
    // 1. Pre-calculate layout & geometry before dirtying the DOM
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Fallback to center if no event provided
    const x = e && "clientX" in e ? e.clientX : window.innerWidth / 2;
    const y = e && "clientY" in e ? e.clientY : window.innerHeight / 2;

    // Calculate max radius needed to cover the screen from click origin
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const root = document.getElementById("retop-root");
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => {
        ready: Promise<void>;
      };
    };

    // Helper to apply the actual DOM update
    const applyThemeUpdate = () => {
      updateSetting("themeMode", targetMode as any);
      if (root) {
        let activeTheme = targetMode;
        if (activeTheme === "auto") {
          const sysDark =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;
          activeTheme = sysDark
            ? settings.pureBlack
              ? "amoled"
              : "dark"
            : "light";
        } else if (activeTheme === "dark" && settings.pureBlack) {
          activeTheme = "amoled";
        }
        root.setAttribute("data-theme", activeTheme);
      }
    };

    // 2. Bypass transition if not supported or user prefers reduced motion
    if (!doc.startViewTransition || prefersReducedMotion) {
      applyThemeUpdate();
      return;
    }

    // 3. Start transition
    const transition = doc.startViewTransition(applyThemeUpdate);

    // 4. Animate safely using pre-calculated dimensions
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 400,
          easing: "cubic-bezier(0.25, 1, 0.5, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  const sysDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark =
    settings.themeMode === "dark" ||
    settings.themeMode === "amoled" ||
    (settings.themeMode === "auto" && sysDark);

  const activeClassKey = settings.calendarClassColor;
  const activeEventKey = settings.calendarEventColor;

  const dummyClassBg = getMaterialThemeColor(activeClassKey, isDark);
  const dummyClassFg = getMaterialOnThemeColor(activeClassKey, isDark);
  const dummyEventBg = getMaterialThemeColor(activeEventKey, isDark);
  const dummyEventFg = getMaterialOnThemeColor(activeEventKey, isDark);

  return (
    <>
      <style>{`
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation: none;
          mix-blend-mode: normal;
        }
        ::view-transition-old(root) {
          z-index: 1;
        }
        ::view-transition-new(root) {
          z-index: 9999;
          will-change: clip-path;
        }
        ::view-transition-old(root) *,
        ::view-transition-new(root) * {
          backdrop-filter: none !important;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full w-full bg-(--bg-main) text-(--text-main) relative overflow-hidden flex flex-col px-3 md:px-6"
      >
        <div className="max-w-270 w-full mx-auto flex-1 flex flex-col md:flex-row gap-6 md:gap-8 min-h-0 overflow-hidden h-full">
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
                      className={`text-xs font-medium leading-snug ${isSelected ? "opacity-90 text-(--text-inverse)" : "text-(--text-muted)"}`}
                    >
                      {cat.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Topic Content Area (Separately Scrollable behind TopBar) */}
          <div className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar pt-18 md:pt-22 pb-24 md:pb-12 pr-2">
            <div className="flex flex-col gap-6 max-w-2xl">
              {/* 1. APPEARANCE */}
              {activeCategory === "appearance" && (
                <>
                  <SettingTopicCard
                    title="Theme & Color Scheme"
                    description="Choose light, dark, or automatic system theme"
                  >
                    <div className="flex flex-col gap-6 w-full">
                      <div className="flex flex-col gap-2 w-full min-w-0">
                        <span className="text-xs font-bold text-(--text-muted) uppercase font-expanded">
                          Color Scheme
                        </span>
                        <div className="flex items-center justify-around w-full py-2">
                          {[
                            { id: "light", label: "Light", icon: WbSunny },
                            { id: "dark", label: "Dark", icon: DarkMode },
                            { id: "auto", label: "System", icon: Computer },
                          ].map((item) => {
                            const isSelected =
                              settings.themeMode === item.id ||
                              (item.id === "dark" &&
                                settings.themeMode === "amoled");

                            return (
                              <button
                                key={item.id}
                                onClick={(e) =>
                                  handleThemeChange(e, item.id as any)
                                }
                                className={`flex flex-col items-center justify-center gap-2 p-3 w-20 h-20 rounded-2xl transition-all cursor-pointer border-0 ${
                                  isSelected
                                    ? "bg-(--accent-base) text-(--text-inverse) shadow-md"
                                    : "bg-transparent hover:bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main)"
                                }`}
                              >
                                <item.icon className="w-8 h-8 shrink-0" />
                                <span className="text-[10px] font-bold font-expanded">
                                  {item.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-3 w-fit mx-auto px-4 py-1.5 rounded-full border-2 border-(--border-dim) mt-2">
                        <span className="text-sm font-bold text-(--text-muted)">
                          Use Pure Black
                        </span>
                        <MaterialSwitch
                          selected={
                            settings.themeMode === "amoled" ||
                            settings.pureBlack
                          }
                          disabled={settings.themeMode === "light"}
                          onChange={(checked) => {
                            updateSetting("pureBlack", checked);
                            if (
                              settings.themeMode === "dark" ||
                              settings.themeMode === "amoled"
                            ) {
                              const e = {
                                clientX: window.innerWidth / 2,
                                clientY: window.innerHeight / 2,
                              };
                              handleThemeChange(
                                e as any,
                                checked ? "amoled" : "dark",
                              );
                            }
                          }}
                        />
                      </div>

                      <div className="flex flex-col gap-2 w-full min-w-0">
                        <span className="text-xs font-bold text-(--text-muted) uppercase font-expanded">
                          Accent
                        </span>
                        <div className="flex flex-nowrap overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden gap-3 snap-x py-3 px-2 min-w-0">
                          {COLORS.map((c) => (
                            <button
                              key={c.id}
                              onClick={() =>
                                updateSetting("accentColor", c.id as any)
                              }
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                settings.accentColor === c.id
                                  ? "ring-2 ring-offset-2 ring-(--text-main) scale-105"
                                  : "hover:scale-105 opacity-80 hover:opacity-100"
                              }`}
                              style={{ backgroundColor: c.hex }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </SettingTopicCard>

                  <SettingTopicCard
                    title="Calendar Card Theme Colors"
                    description="Tone-derived theme colors for class and event cards"
                  >
                    <div className="flex flex-col gap-6 w-full">
                      {/* Live Class & Event Dummy Preview */}
                      <div className="flex flex-col gap-1.5 rounded-2xl overflow-hidden w-full max-w-md border-2 border-(--border-dim) p-2 bg-(--bg-main)">
                        <div
                          className="flex flex-col p-3 rounded-xl shadow-none border-0 transition-colors"
                          style={{
                            backgroundColor: dummyClassBg,
                            color: dummyClassFg,
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="font-mono text-xs font-bold shrink-0">
                                08:00
                              </span>
                              <span className="text-sm font-black truncate">
                                Operating Systems
                              </span>
                            </div>
                            <span className="text-[10px] font-bold font-mono shrink-0 flex items-center gap-1 opacity-90">
                              <LocationOn className="w-3 h-3" />
                              SJT 412
                            </span>
                          </div>
                        </div>

                        <div
                          className="flex flex-col p-3 rounded-xl shadow-none border-0 transition-colors"
                          style={{
                            backgroundColor: dummyEventBg,
                            color: dummyEventFg,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-black leading-tight flex-1">
                              Do Good Hackathon
                            </span>
                            <span className="shrink-0 text-[10px] font-bold opacity-80 text-right">
                              The Club
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 w-full min-w-0">
                        <span className="text-xs font-bold text-(--text-muted) uppercase font-expanded">
                          Classes
                        </span>
                        <div className="flex flex-nowrap overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden gap-3 snap-x py-2 px-5 min-w-0">
                          {COLORS.map((c) => (
                            <button
                              key={`class-${c.id}`}
                              onClick={() =>
                                updateSetting("calendarClassColor", c.id as any)
                              }
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                settings.calendarClassColor === c.id
                                  ? "ring-2 ring-offset-2 ring-(--text-main) scale-105"
                                  : "hover:scale-105 opacity-80 hover:opacity-100"
                              }`}
                              style={{
                                backgroundColor: getMaterialThemeColor(
                                  c.id,
                                  isDark,
                                ),
                              }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 w-full min-w-0">
                        <span className="text-xs font-bold text-(--text-muted) uppercase font-expanded">
                          Events
                        </span>
                        <div className="flex flex-nowrap overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden gap-3 snap-x py-2 px-5 min-w-0">
                          {COLORS.map((c) => (
                            <button
                              key={`event-${c.id}`}
                              onClick={() =>
                                updateSetting("calendarEventColor", c.id as any)
                              }
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                settings.calendarEventColor === c.id
                                  ? "ring-2 ring-offset-2 ring-(--text-main) scale-105"
                                  : "hover:scale-105 opacity-80 hover:opacity-100"
                              }`}
                              style={{
                                backgroundColor: getMaterialThemeColor(
                                  c.id,
                                  isDark,
                                ),
                              }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </SettingTopicCard>
                </>
              )}

              {/* 2. DEFAULTS */}
              {activeCategory === "defaults" && (
                <>
                  <SettingTopicCard
                    title="Timetable View Mode"
                    description="Select preferred default timetable layout format"
                  >
                    <div className="flex flex-col gap-4 w-full">
                      <div className="flex bg-transparent rounded-2xl border-2 border-(--border-main) p-1 w-full max-w-xl">
                        <SegmentedControl
                          options={[
                            { label: "Weekly View", value: "weekly" },
                            { label: "Slot Grid", value: "slot" },
                            { label: "Consolidated", value: "consolidated" },
                            { label: "Full Month", value: "fullMonth" },
                          ]}
                          value={settings.timetableMode || "weekly"}
                          onChange={(val) =>
                            updateSetting("timetableMode", val as any)
                          }
                          className="w-full flex-1 *:flex-1"
                        />
                      </div>
                    </div>
                  </SettingTopicCard>

                  <SettingTopicCard
                    title="Default Launch View"
                    description="Always load retop modernized view on login"
                  >
                    <div className="flex items-center justify-between gap-4 w-full">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-(--text-main)">
                          Load retop on Login
                        </span>
                        <span className="text-xs text-(--text-muted)">
                          Automatically show retop dashboard instead of legacy
                          VTOP UI
                        </span>
                      </div>
                      <MaterialSwitch
                        selected={settings.defaultView === "modern"}
                        onChange={() => {
                          const newVal =
                            settings.defaultView === "modern"
                              ? "legacy"
                              : "modern";
                          updateSetting("defaultView", newVal);
                          if (newVal === "legacy") {
                            sessionStorage.setItem("vtop-legacy-mode", "true");
                          } else {
                            sessionStorage.setItem("vtop-legacy-mode", "false");
                          }
                        }}
                      />
                    </div>
                  </SettingTopicCard>

                  <SettingTopicCard
                    title="Display & Privacy Preferences"
                    description="Time format display and private data masking"
                  >
                    <div className="flex flex-col gap-6 w-full">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-(--text-main)">
                            24-Hour Railway Time
                          </span>
                          <span className="text-xs text-(--text-muted)">
                            Display times in 24-hour format (14:00 instead of
                            02:00 PM)
                          </span>
                        </div>
                        <MaterialSwitch
                          selected={settings.use24HourTime}
                          onChange={() =>
                            updateSetting(
                              "use24HourTime",
                              !settings.use24HourTime,
                            )
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-(--text-main)">
                            Blur CGPA & Credits
                          </span>
                          <span className="text-xs text-(--text-muted)">
                            Hide CGPA and credit totals on home dashboard for
                            privacy
                          </span>
                        </div>
                        <MaterialSwitch
                          selected={settings.blurCgpa}
                          onChange={() =>
                            updateSetting("blurCgpa", !settings.blurCgpa)
                          }
                        />
                      </div>
                    </div>
                  </SettingTopicCard>
                </>
              )}

              {/* 3. SYNC */}
              {activeCategory === "sync" && (
                <>
                  <SettingTopicCard
                    title="Google Drive Backup & Restore"
                    description="Securely sync settings and preferences to your Google Drive AppData folder"
                  >
                    <div className="flex flex-col gap-4 w-full">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-(--text-main)">
                            Drive Automatic Sync
                          </span>
                          <span className="text-xs text-(--text-muted)">
                            Auto-sync settings across devices using Google Drive
                          </span>
                        </div>
                        <MaterialSwitch
                          selected={settings.driveSync}
                          onChange={() => {
                            const next = !settings.driveSync;
                            updateSetting("driveSync", next);
                            if (next) handleDriveBackup();
                          }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <button
                          onClick={handleDriveBackup}
                          disabled={isDriveSyncing}
                          className="px-4 py-2.5 rounded-xl text-xs font-black uppercase bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-2 border-zinc-300 dark:border-zinc-700 transition-all cursor-pointer disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                        >
                          <Icon icon="logos:google-icon" className="w-4 h-4" />
                          Sign in with Google
                        </button>
                        <button
                          onClick={handleDriveBackup}
                          disabled={isDriveSyncing}
                          className="px-4 py-2.5 rounded-xl text-xs font-black uppercase bg-(--accent-base) text-(--text-inverse) transition-all border-0 cursor-pointer disabled:opacity-50 hover:opacity-90"
                        >
                          Backup Now
                        </button>
                        <button
                          onClick={handleDriveRestore}
                          disabled={isDriveSyncing}
                          className="px-4 py-2.5 rounded-xl text-xs font-black uppercase bg-(--bg-main) text-(--text-main) border-2 border-(--border-dim) transition-all cursor-pointer disabled:opacity-50 hover:bg-(--bg-highlight)"
                        >
                          Restore
                        </button>
                      </div>

                      {driveStatus && (
                        <span className="text-xs font-bold text-(--text-muted) mt-1">
                          {driveStatus}
                        </span>
                      )}
                    </div>
                  </SettingTopicCard>

                  <SettingTopicCard
                    title="Google Calendar Export"
                    description="Synchronize timetable classes directly to Google Calendar"
                  >
                    <div className="flex items-center justify-between gap-4 w-full">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-(--text-main)">
                          Google Calendar Sync
                        </span>
                        <span className="text-xs text-(--text-muted)">
                          Export scheduled classes as Google Calendar events
                        </span>
                      </div>
                      <MaterialSwitch
                        selected={settings.calendarSync}
                        onChange={() =>
                          updateSetting("calendarSync", !settings.calendarSync)
                        }
                      />
                    </div>
                  </SettingTopicCard>
                </>
              )}

              {/* 4. DATA & STORAGE */}
              {activeCategory === "data" && (
                <>
                  <SettingTopicCard
                    title="Cache & Storage Management"
                    description="Clear cached VTOP portal data or manage specific cached endpoints"
                  >
                    <div className="flex flex-col gap-4 w-full">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-(--text-main)">
                            Clear All Portal Cache
                          </span>
                          <span className="text-xs text-(--text-muted)">
                            Removes offline cached data for timetable, marks,
                            attendance, and assignments
                          </span>
                        </div>
                        <button
                          onClick={handleClearAllCache}
                          className="px-5 py-2.5 rounded-full text-xs font-black uppercase bg-(--accent-base) text-(--text-inverse) transition-all border-0 cursor-pointer disabled:opacity-50 hover:opacity-90 ml-2 shadow-sm"
                        >
                          Clear Cache
                        </button>
                      </div>

                      {clearStatus && (
                        <span className="text-xs font-bold text-(--text-muted)">
                          {clearStatus}
                        </span>
                      )}

                      <div className="border-t-2 border-(--border-dim) pt-4 mt-2">
                        <span className="text-xs font-bold uppercase font-expanded text-(--text-muted) mb-2 block">
                          Cached Endpoint Explorer
                        </span>
                        <SyncManager />
                      </div>
                    </div>
                  </SettingTopicCard>
                </>
              )}

              {/* 5. ABOUT */}
              {activeCategory === "about" && (
                <>
                  <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-3xl bg-transparent border-2 border-(--border-dim) gap-6 w-full max-w-2xl mx-auto">
                    {/* retop Signature Logo */}
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="font-logo retop-logo text-6xl md:text-7xl lg:text-8xl cursor-pointer inline-block select-none text-(--text-main) hover:text-(--accent-base) lowercase tracking-tighter">
                        retop
                      </span>
                      <p className="text-sm md:text-base font-bold font-expanded text-(--text-muted) max-w-md mt-1">
                        Next-generation Material You extension & re-skin for
                        VTOP
                      </p>
                    </div>

                    {/* Version & Build Pill */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-(--bg-surface) border-2 border-(--border-dim) text-xs md:text-sm font-bold font-mono text-(--text-muted)">
                      <span>
                        v
                        {(() => {
                          try {
                            return (
                              (typeof chrome !== "undefined" &&
                                chrome.runtime?.getManifest?.()?.version) ||
                              "0.3.0"
                            );
                          } catch {
                            return "0.3.0";
                          }
                        })()}
                      </span>
                      <span>•</span>
                      <span>
                        Build{" "}
                        {typeof __BUILD_NUMBER__ !== "undefined"
                          ? __BUILD_NUMBER__
                          : "dev"}
                      </span>
                    </div>

                    {/* Official Link Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2 w-full">
                      <a
                        href="https://getretop.web.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3.5 rounded-2xl text-sm md:text-base font-bold bg-(--accent-base) text-(--text-inverse) transition-all border-0 hover:opacity-90 flex items-center gap-2.5 shadow-sm hover:scale-[1.03] active:scale-[0.98]"
                      >
                        <Language className="w-5 h-5 shrink-0" />
                        <span>getretop.web.app</span>
                      </a>
                      <a
                        href="https://github.com/lavan8t/retop"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3.5 rounded-2xl text-sm md:text-base font-bold bg-(--bg-surface) text-(--text-main) border-2 border-(--border-dim) transition-all hover:bg-(--bg-highlight) flex items-center gap-2.5 shadow-sm hover:scale-[1.03] active:scale-[0.98]"
                      >
                        <Icon icon="mdi:github" className="w-5 h-5 shrink-0" />
                        <span>lavan8t/retop</span>
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default SettingsPage;
