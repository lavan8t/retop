import React, { useState } from "react";
import { AppSettings, resetDynamicThemeSeed } from "../utils/settings-store";
import { clearCache } from "../utils/cache";
import { parseGradesSemesters, parseGrades, parseGradeHistory } from "../parsers/grades";
import { parseMarksSemesters, parseStudentMarks } from "../parsers/marks";
import {
  Check,
  Casino,
  Close,
  Language,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_SNAPPY } from "../utils/motion";
import { Icon } from "@iconify/react";
import { MaterialSwitch } from "../components/MaterialSwitch";
import { useDataStore } from "../store/dataStore";

interface SettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
  network?: any;
}

const SettingsCard = ({
  title,
  description,
  children,
  className = "",
  contentClassName = "mt-auto self-start relative z-10 flex w-full",
  disabled = false,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
}) => (
  <motion.div
    variants={{
      hidden: {
        opacity: 0,
        scale: 0.95,
        boxShadow: "0px 0px 0px 0px var(--shadow-main)",
      },
      show: {
        opacity: 1,
        scale: 1,
        boxShadow: "0px 0px 0px 0px var(--shadow-main)",
      },
      hover: {
        y: -2,
        boxShadow: "var(--brutal-shadow-hover)",
      }
    }}
    whileHover="hover"
    transition={SPRING_SNAPPY}
    className={`break-inside-avoid w-full mb-4 lg:mb-6 bg-(--bg-surface) rounded-[32px] p-6 lg:p-8 flex flex-col justify-between gap-6 overflow-hidden relative border-4 border-(--border-main) shadow-none ${className} ${disabled ? "opacity-40 grayscale pointer-events-none" : ""}`}
  >
    {(title || description) && (
      <div className="flex flex-col gap-2 relative z-10">
        {title && (
          <div className="font-expanded font-black text-xl text-(--text-main) leading-tight">
            {title}
          </div>
        )}
        {description && (
          <div className="text-sm font-bold text-(--text-muted) leading-snug">
            {description}
          </div>
        )}
      </div>
    )}
    <div className={contentClassName}>{children}</div>
  </motion.div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  updateSetting,
  network,
}) => {
  const COLORS = [
    { id: "blue", hex: "#3b82f6", label: "Blue" },
    { id: "indigo", hex: "#6366f1", label: "Indigo" },
    { id: "purple", hex: "#a855f7", label: "Purple" },
    { id: "pink", hex: "#ec4899", label: "Pink" },
    { id: "red", hex: "#ef4444", label: "Red" },
    { id: "orange", hex: "#f97316", label: "Orange" },
    { id: "yellow", hex: "#eab308", label: "Yellow" },
    { id: "lime", hex: "#84cc16", label: "Lime" },
    { id: "green", hex: "#22c55e", label: "Green" },
    { id: "cyan", hex: "#06b6d4", label: "Cyan" },
  ];

  const handleThemeChange = (
    e: React.MouseEvent | { clientX: number; clientY: number },
    targetMode: "light" | "dark" | "amoled" | "auto",
  ) => {
    const x = e.clientX;
    const y = e.clientY;
    const root = document.getElementById("retop-root");

    const bgColors: Record<string, string> = {
      light: "#f8fafc",
      dark: "#09090b",
      amoled: "#000000",
    };
    // Set the old background color on html before taking the snapshot so it doesn't default to white
    document.documentElement.style.backgroundColor =
      bgColors[settings.themeMode] || "#09090b";

    if (!(document as any).startViewTransition) {
      updateSetting("themeMode", targetMode as any);
      if (root) {
        let activeTheme = targetMode;
        if (activeTheme === "auto") {
          const hour = new Date().getHours();
          activeTheme = hour >= 6 && hour < 18 ? "light" : "dark";
        }
        root.setAttribute("data-theme", activeTheme);
      }
      return;
    }

    const transition = (document as any).startViewTransition(() => {
      updateSetting("themeMode", targetMode as any);
      if (root) {
        let activeTheme = targetMode;
        if (activeTheme === "auto") {
          const hour = new Date().getHours();
          activeTheme = hour >= 6 && hour < 18 ? "light" : "dark";
        }
        root.setAttribute("data-theme", activeTheme);
      }
    });

    transition.ready.then(() => {
      const endRadius = Math.hypot(
        Math.max(x, innerWidth - x),
        Math.max(y, innerHeight - y),
      );
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  return (
    <>
      <style>{`
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation: none;
          mix-blend-mode: normal;
        }
      `}</style>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
          },
        }}
        className="h-full overflow-y-auto custom-scrollbar p-2 md:p-4 pt-16 md:pt-20 lg:pt-24 pb-32 md:pb-12 bg-(--bg-main) text-(--text-main) relative"
      >
        <div className="max-w-[1380px] mx-auto relative z-10 columns-1 md:columns-2 lg:columns-4 gap-4 lg:gap-6 pb-16">
          {/* Appearance Box */}
          <SettingsCard
            title="Theme"
            className="col-span-1 md:col-span-2 lg:col-span-1"
          >
            <div className="flex flex-col items-start justify-between gap-8 w-full min-w-0">
              <div className="flex flex-col gap-4 w-full min-w-0">
                <div className="flex flex-col gap-2 w-full">
                  <span className="text-sm font-bold text-(--text-muted)">
                    Color Scheme
                  </span>
                  <div className="flex bg-(--bg-highlight) rounded-lg p-1 w-full gap-1">
                    {["light", "dark", "auto"].map((mode) => {
                      const isActive =
                        settings.themeMode === mode ||
                        (mode === "dark" && settings.themeMode === "amoled");

                      return (
                        <button
                          key={mode}
                          onClick={(e) => {
                            let targetMode = mode;
                            if (mode === "light") targetMode = "light";
                            handleThemeChange(e, targetMode as any);
                          }}
                          className={`flex-1 py-1.5 text-xs font-bold font-expanded uppercase transition-all rounded-md ${
                            isActive
                              ? "bg-(--text-main) text-(--bg-main) shadow-none"
                              : "text-(--text-muted) hover:text-(--text-main)"
                          }`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 w-full">
                  <span
                    className={`text-sm font-bold ${settings.themeMode !== "dark" && settings.themeMode !== "amoled" ? "text-(--text-muted) opacity-50" : "text-(--text-muted)"}`}
                  >
                    Use pure black
                  </span>
                  <MaterialSwitch
                    selected={settings.themeMode === "amoled"}
                    disabled={
                      settings.themeMode !== "dark" &&
                      settings.themeMode !== "amoled"
                    }
                    onChange={(checked) => {
                      const e = {
                        clientX: window.innerWidth / 2,
                        clientY: window.innerHeight / 2,
                      };
                      handleThemeChange(e, checked ? "amoled" : "dark");
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full min-w-0">
                <span className="text-sm font-bold text-(--text-muted)">
                  Accent
                </span>
                <div className="flex flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-4 snap-x py-2 px-6 lg:px-8 -mx-6 lg:-mx-8 min-w-0">
                  <button
                    onClick={() => {
                      if (!settings.randomAccentColor) resetDynamicThemeSeed();
                      updateSetting("randomAccentColor", true);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-fast shrink-0 ${
                      settings.randomAccentColor
                        ? "ring-4 ring-offset-4 ring-offset-(--bg-surface) ring-(--text-main) bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500"
                        : "ring-4 ring-transparent ring-offset-4 ring-offset-(--bg-surface) bg-(--bg-highlight) hover:ring-(--border-dim)"
                    }`}
                    title="Random Accent"
                  >
                    {settings.randomAccentColor ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <Casino className="w-4 h-4 text-(--text-muted)" />
                    )}
                  </button>
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        updateSetting("randomAccentColor", false);
                        updateSetting("accentColor", c.id as any);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.setAttribute(
                          "data-orig",
                          document.documentElement.style.getPropertyValue(
                            "--accent-base",
                          ),
                        );
                        document.documentElement.style.setProperty(
                          "--accent-base",
                          c.hex,
                        );
                      }}
                      onMouseLeave={(e) => {
                        const orig = e.currentTarget.getAttribute("data-orig");
                        if (orig) {
                          document.documentElement.style.setProperty(
                            "--accent-base",
                            orig,
                          );
                        } else {
                          document.documentElement.style.removeProperty(
                            "--accent-base",
                          );
                        }
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-fast shrink-0 ${
                        settings.accentColor === c.id &&
                        !settings.randomAccentColor
                          ? "ring-4 ring-offset-4 ring-offset-(--bg-surface) ring-(--text-main)"
                          : "ring-4 ring-transparent ring-offset-4 ring-offset-(--bg-surface) hover:ring-(--border-dim)"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    >
                      {settings.accentColor === c.id &&
                        !settings.randomAccentColor && (
                          <Check className="w-6 h-6 text-white" />
                        )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            title={
              <span
                className="lowercase tracking-tighter"
                style={{
                  fontFamily: "'Google Sans Flex', system-ui, sans-serif",
                  fontVariationSettings:
                    '"wdth" 151, "wght" 800, "GRAD" 100, "ROND" 100, "slnt" -10',
                }}
              >
                retop
              </span>
            }
            description="Always load the modernized view on login"
            className="col-span-1"
          >
            <div className="w-full flex justify-end">
              <MaterialSwitch
                selected={settings.defaultView === "modern"}
                onChange={() =>
                  updateSetting(
                    "defaultView",
                    settings.defaultView === "modern" ? "legacy" : "modern",
                  )
                }
              />
            </div>
          </SettingsCard>

          {/* About Retop Section */}
          <SettingsCard
            className="col-span-1 text-center"
            contentClassName="relative z-10 flex flex-col justify-between w-full flex-1"
          >
            <div className="flex flex-col items-center gap-3 w-full">
              <motion.h2
                variants={{
                  show: { fontVariationSettings: '"wdth" 125, "wght" 800, "GRAD" 100, "ROND" 100, "slnt" -10' },
                  hover: { fontVariationSettings: '"wdth" 125, "wght" 1, "GRAD" 100, "ROND" 100, "slnt" -10' }
                }}
                transition={SPRING_SNAPPY}
                className="text-5xl text-(--text-main) font-logo cursor-default tracking-tighter leading-none lowercase"
              >
                retop
              </motion.h2>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span className="bg-(--bg-highlight) text-(--text-main) px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase">
                  v{(() => {
                    try {
                      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) {
                        return chrome.runtime.getManifest().version;
                      }
                    } catch (e) {
                      // Extension context invalidated
                    }
                    return "dev";
                  })()}
                </span>
                <span className="bg-(--bg-highlight) text-(--text-muted) px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase">
                  {typeof __BUILD_NUMBER__ !== "undefined"
                    ? __BUILD_NUMBER__
                    : "unknown_build"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
              <a
                href="https://github.com/lavan8t/retop"
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-full transition-all bg-(--bg-highlight) text-(--text-main) hover:bg-(--text-main) hover:text-(--bg-main) hover:scale-105 active:scale-95 flex items-center justify-center shadow-none hover:shadow-lg"
                title="GitHub"
              >
                <Icon icon="mdi:github" className="w-8 h-8" />
              </a>
              <a
                href="https://getretop.web.app"
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-full transition-all bg-(--bg-highlight) text-(--text-main) hover:bg-(--text-main) hover:text-(--bg-main) hover:scale-105 active:scale-95 flex items-center justify-center shadow-none hover:shadow-lg"
                title="Website"
              >
                <Language className="w-8 h-8" />
              </a>
            </div>
          </SettingsCard>



          <SettingsCard
            title="Hide CGPA"
            description="Hide your CGPA on the dashboard until you point it"
            className="col-span-1"
          >
            <div className="w-full flex justify-end">
              <MaterialSwitch
                selected={settings.blurCgpa}
                onChange={() => updateSetting("blurCgpa", !settings.blurCgpa)}
              />
            </div>
          </SettingsCard>

          <SettingsCard
            title="System Animations"
            description="Adjust global animation speed"
            className="col-span-1"
          >
            <div className="flex flex-col gap-2 w-full">
              <div className="flex bg-(--bg-highlight) rounded-lg p-1 w-full gap-1">
                {(["1x", "0.5x", "0x"] as const).map((scale) => {
                  const isActive = settings.animationScale === scale;
                  return (
                    <button
                      key={scale}
                      onClick={() => updateSetting("animationScale", scale)}
                      className={`flex-1 py-1.5 text-xs font-bold font-expanded uppercase transition-all rounded-md ${
                        isActive
                          ? "bg-(--text-main) text-(--bg-main) shadow-none"
                          : "text-(--text-muted) hover:text-(--text-main)"
                      }`}
                    >
                      {scale === "0x" ? "Off" : scale}
                    </button>
                  );
                })}
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Search Hotkey"
            description="Choose how to open search"
            className="col-span-1"
          >
            <div className="flex flex-col gap-2 w-full">
              <div className="flex bg-(--bg-highlight) rounded-lg p-1 w-full gap-1">
                {(["/", "space", "instant"] as const).map((key) => {
                  const isActive = (settings.searchHotkey || "/") === key;
                  return (
                    <button
                      key={key}
                      onClick={() => updateSetting("searchHotkey", key)}
                      className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold font-expanded uppercase transition-all rounded-md ${
                        isActive
                          ? "bg-(--text-main) text-(--bg-main) shadow-none"
                          : "text-(--text-muted) hover:text-(--text-main)"
                      }`}
                    >
                      {key === "instant" ? "Any" : key === "space" ? "Space" : key}
                    </button>
                  );
                })}
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Cloud & Sync"
            className="col-span-1 md:col-span-2 lg:col-span-2"
          >
            <div className="flex flex-col w-full gap-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm md:text-base font-bold text-(--text-main)">
                    Google Account
                  </span>
                  <span className="text-xs text-(--text-muted)">
                    {settings.googleLinked
                      ? "Connected to student account"
                      : "Not connected"}
                  </span>
                </div>
                <button
                  onClick={() =>
                    updateSetting("googleLinked", !settings.googleLinked)
                  }
                  className={`px-5 py-2.5 shrink-0 rounded-xl text-xs font-black font-expanded uppercase transition-all border-2 border-(--border-main) shadow-none hover:-translate-y-px hover:shadow-[var(--brutal-shadow-hover)] active:translate-y-0 active:shadow-[var(--brutal-shadow-active)] cursor-pointer ${
                    settings.googleLinked
                      ? "bg-(--bg-surface) text-(--text-main) hover:text-red-500 hover:bg-red-500/10"
                      : "bg-(--text-main) text-(--bg-main)"
                  }`}
                >
                  {settings.googleLinked ? "Disconnect" : "Connect"}
                </button>
              </div>
              <div
                className={`flex flex-col gap-5 transition-all duration-fast ${settings.googleLinked ? "opacity-100" : "opacity-40 grayscale pointer-events-none"}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-(--text-main)">
                      Sync Timetable
                    </span>
                    <span className="text-xs text-(--text-muted)">
                      Sync classes to Google Calendar
                    </span>
                  </div>
                  <MaterialSwitch
                    selected={settings.calendarSync}
                    onChange={() =>
                      updateSetting("calendarSync", !settings.calendarSync)
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-(--text-main)">
                      Drive Backup
                    </span>
                    <span className="text-xs text-(--text-muted)">
                      Save settings to Google Drive
                    </span>
                  </div>
                  <MaterialSwitch
                    selected={settings.driveSync}
                    onChange={() =>
                      updateSetting("driveSync", !settings.driveSync)
                    }
                  />
                </div>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            title="24-Hour Time"
            description="Use railway time format"
            className="col-span-1"
          >
            <div className="w-full flex justify-end">
              <MaterialSwitch
                selected={settings.use24HourTime}
                onChange={() =>
                  updateSetting("use24HourTime", !settings.use24HourTime)
                }
              />
            </div>
          </SettingsCard>

          <SettingsCard
            title="Data & Cache"
            description="Clear locally cached academic data to force a fresh fetch on your next visit."
            className="col-span-1 md:col-span-2"
          >
            <div className="w-full flex justify-end">
              <button
                onClick={() => {
                  clearCache();
                  window.location.reload();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black font-expanded uppercase transition-all border-2 border-(--border-main) shadow-none hover:-translate-y-px hover:shadow-[var(--brutal-shadow-hover)] active:translate-y-0 active:shadow-[var(--brutal-shadow-active)] cursor-pointer bg-(--bg-surface) text-red-500 hover:bg-red-500/10"
              >
                Clear Cache
              </button>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Developer Options"
            description="Fill all VTOP types with dummy data for testing UI rendering across all pages."
            className="col-span-1 md:col-span-2 lg:col-span-4 bg-[var(--accent-base)]/5 border-[var(--accent-base)]/20"
          >
            <div className="w-full flex flex-col md:flex-row justify-end gap-3">
              <button
                id="export-btn"
                onClick={async () => {
                  if (!network) {
                    alert("Network instance not found.");
                    return;
                  }
                  const btn = document.getElementById("export-btn");
                  if (btn) btn.innerText = "CAPTURING...";
                  try {
                    await useDataStore.getState().fetchDashboardData(network, network.csrf, network.authorizedID);
                    
                    const state = useDataStore.getState();

                    const gradesViewHTML = await network.getGradesView();
                    const gradesSems = parseGradesSemesters(gradesViewHTML);
                    let grades = null;
                    if (gradesSems.length > 0) {
                        const html = await network.getStudentGrades(gradesSems[0].id);
                        grades = parseGrades(html);
                    }
                    const historyHtml = await network.getStudentGradeHistory();
                    const gradeHistory = parseGradeHistory(historyHtml);

                    const marksViewHTML = await network.getMarksView();
                    const marksSems = parseMarksSemesters(marksViewHTML);
                    let marks = null;
                    if (marksSems.length > 0) {
                        const html = await network.getStudentMarks(marksSems[0].id);
                        marks = parseStudentMarks(html);
                    }

                    const exportData = {
                        stats: state.stats,
                        attendance: state.attendance,
                        assignments: state.assignments,
                        events: state.events,
                        ttCourses: state.ttCourses,
                        ttSemesters: state.ttSemesters,
                        calSemesters: state.calSemesters,
                        grades,
                        gradeHistory,
                        marks
                    };
                    
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "vtop_dummy_data.json";
                    a.click();
                    URL.revokeObjectURL(url);

                    if (btn) btn.innerText = "DONE! CHECK DOWNLOADS";
                    setTimeout(() => { if (btn) btn.innerText = "EXPORT REAL DATA AS JSON"; }, 3000);
                  } catch (e) {
                    console.error(e);
                    if (btn) btn.innerText = "ERROR!";
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black font-expanded uppercase transition-all border-2 border-(--border-main) shadow-none hover:-translate-y-px hover:shadow-[var(--brutal-shadow-hover)] active:translate-y-0 active:shadow-[var(--brutal-shadow-active)] cursor-pointer bg-(--bg-highlight) text-(--text-main)"
              >
                Export Real Data As JSON
              </button>
              <button
                onClick={() => {
                  useDataStore.getState().enableDemoMode();
                  alert("Demo Mode Active: Dummy data injected.");
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black font-expanded uppercase transition-all border-2 border-(--border-main) shadow-none hover:-translate-y-px hover:shadow-[var(--brutal-shadow-hover)] active:translate-y-0 active:shadow-[var(--brutal-shadow-active)] cursor-pointer bg-(--text-main) text-(--bg-main)"
              >
                Fill Dummy Data
              </button>
            </div>
          </SettingsCard>
        </div>
      </motion.div>
    </>
  );
};
