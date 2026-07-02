import React, { useState } from "react";
import { AppSettings, resetDynamicThemeSeed } from "../utils/settings-store";
import {
  Check,
  Casino,
  Close,
} from "@nine-thirty-five/material-symbols-react/rounded";
import { motion, AnimatePresence } from "framer-motion";
import "@nine-thirty-five/material-symbols-react/rounded";
import { MaterialSwitch } from "../components/MaterialSwitch";

interface SettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
}

const BentoBox = ({
  title,
  description,
  children,
  className = "",
  disabled = false,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, scale: 0.95 },
      show: { opacity: 1, scale: 1 },
    }}
    whileHover={{ y: -6 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
    className={`bg-(--bg-surface) rounded-[32px] p-6 lg:p-8 flex flex-col justify-between gap-6 overflow-hidden relative border-4 border-(--border-main) shadow-none hover:shadow-[6px_6px_0px_0px_var(--shadow-main)] transition-shadow duration-300 ${className} ${disabled ? "opacity-40 grayscale pointer-events-none" : ""}`}
  >
    <div className="flex flex-col gap-2 relative z-10">
      <div className="font-expanded font-black text-xl text-(--text-main) leading-tight">
        {title}
      </div>
      {description && (
        <div className="text-sm font-bold text-(--text-muted) leading-snug">
          {description}
        </div>
      )}
    </div>
    <div className="mt-auto self-start relative z-10 flex w-full">
      {children}
    </div>
  </motion.div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  updateSetting,
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
        className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 pt-20 md:pt-24 lg:pt-28 pb-32 md:pb-12 bg-(--bg-main) text-(--text-main) relative"
      >
        <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">
          {/* Appearance Box */}
          <BentoBox
            title="Appearance"
            className="col-span-1 md:col-span-2 lg:col-span-4"
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 w-full">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-(--text-muted)">
                  Theme
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  {["light", "dark", "auto"].map((mode, idx, arr) => {
                    const isActive =
                      settings.themeMode === mode ||
                      (mode === "dark" && settings.themeMode === "amoled");
                    const isFirst = idx === 0;
                    const isLast = idx === arr.length - 1;
                    const rounding = isFirst
                      ? "rounded-l-[20px] rounded-r-md"
                      : isLast
                        ? "rounded-l-md rounded-r-[20px]"
                        : "rounded-md";
                    const activeRounding = "rounded-[20px]";

                    return (
                      <button
                        key={mode}
                        onClick={(e) => {
                          let targetMode = mode;
                          // If switching to dark and amoled was previously on, it will keep amoled off (reset to dark) or we can restore amoled.
                          // Actually, standard behavior: selecting dark sets it to dark. Pure black is a separate modifier.
                          if (mode === "light") targetMode = "light";
                          handleThemeChange(e, targetMode as any);
                        }}
                        className={`px-4 py-2.5 text-xs font-bold font-expanded uppercase transition-all duration-300 ${
                          isActive
                            ? `bg-(--text-main) text-(--bg-main) shadow-none ${activeRounding}`
                            : `bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) shadow-none ${rounding}`
                        }`}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 w-full lg:w-auto mt-2 lg:mt-0">
                <span className="text-sm font-bold text-(--text-muted)">
                  Use pure black
                </span>
                <MaterialSwitch
                  selected={settings.themeMode === "amoled"}
                  onChange={(checked) => {
                    const e = {
                      clientX: window.innerWidth / 2,
                      clientY: window.innerHeight / 2,
                    };
                    handleThemeChange(e, checked ? "amoled" : "dark");
                  }}
                />
              </div>

              <div className="flex flex-col gap-2 w-full lg:w-auto">
                <span className="text-sm font-bold text-(--text-muted)">
                  Accent
                </span>
                <div className="flex flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-4 w-full lg:w-auto snap-x py-6 px-4 -mx-4 lg:mx-0">
                  <button
                    onClick={() => {
                      if (!settings.randomAccentColor) resetDynamicThemeSeed();
                      updateSetting("randomAccentColor", true);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
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
                        if (orig)
                          document.documentElement.style.setProperty(
                            "--accent-base",
                            orig,
                          );
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
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
          </BentoBox>

          <BentoBox
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
            <MaterialSwitch
              selected={settings.defaultView === "modern"}
              onChange={() =>
                updateSetting(
                  "defaultView",
                  settings.defaultView === "modern" ? "legacy" : "modern",
                )
              }
            />
          </BentoBox>

          <BentoBox
            title="Hide CGPA"
            description="Hide your CGPA on the dashboard until you point it"
            className="col-span-1"
          >
            <MaterialSwitch
              selected={settings.blurCgpa}
              onChange={() => updateSetting("blurCgpa", !settings.blurCgpa)}
            />
          </BentoBox>

          <BentoBox
            title="24-Hour Time"
            description="Use railway time format"
            className="col-span-1"
          >
            <MaterialSwitch
              selected={settings.use24HourTime}
              onChange={() =>
                updateSetting("use24HourTime", !settings.use24HourTime)
              }
            />
          </BentoBox>

          <BentoBox
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
                  className={`px-5 py-2.5 shrink-0 rounded-full text-xs font-black font-expanded uppercase transition-all ${
                    settings.googleLinked
                      ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      : "bg-(--text-main) text-(--bg-main) hover:scale-95"
                  }`}
                >
                  {settings.googleLinked ? "Disconnect" : "Connect"}
                </button>
              </div>
              <div
                className={`flex flex-col gap-5 transition-all duration-300 ${settings.googleLinked ? "opacity-100" : "opacity-40 grayscale pointer-events-none"}`}
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
          </BentoBox>

          <BentoBox
            title="System Cache"
            description="Force fetch the latest schedule from VTOP"
            className="col-span-1"
          >
            <button
              onClick={() => {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith("vtop-tt-cache-")) keys.push(key);
                }
                keys.forEach((k) => localStorage.removeItem(k));
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-full text-xs font-black font-expanded uppercase transition-all bg-(--bg-highlight) text-(--text-main) hover:bg-(--text-main) hover:text-(--bg-main)"
            >
              Clear Cache
            </button>
          </BentoBox>
        </div>
      </motion.div>
    </>
  );
};
