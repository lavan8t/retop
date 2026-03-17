import React from "react";
import { AppSettings, resetDynamicThemeSeed } from "../utils/settings-store";
import {
  Monitor,
  Moon,
  Sun,
  Calendar,
  HardDrive,
  Check,
  Palette,
  Layout,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

interface SettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
}

const NeoSection = ({ title, icon: Icon, children }: any) => (
  <motion.section
    variants={{
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 },
    }}
    className="space-y-4 md:space-y-6"
  >
    <div className="flex items-center gap-3 md:gap-4">
      {/* Icon Container */}
      <div className="p-2.5 md:p-3 bg-(--accent-base) border-2 md:border-4 border-(--border-main) shadow-[2px_2px_0px_0px_var(--border-main)] md:shadow-[4px_4px_0px_0px_var(--border-main)] rounded-xl">
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
      </div>
      {/* Title */}
      <h2 className="text-xl md:text-3xl font-black font-expanded text-(--text-main) uppercase tracking-tighter drop-shadow-sm">
        {title}
      </h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {children}
    </div>
  </motion.section>
);

const NeoCard = ({ children, className = "" }: any) => (
  <div
    className={`
    bg-(--bg-surface) border-2 md:border-4 border-(--border-main) rounded-3xl md:rounded-4xl p-4 md:p-6 
    shadow-[4px_4px_0px_0px_var(--border-main)] md:shadow-[8px_8px_0px_0px_var(--border-main)] hover:shadow-[6px_6px_0px_0px_var(--border-main)] md:hover:shadow-[12px_12px_0px_0px_var(--border-main)]
    hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group
    ${className}
  `}
  >
    {children}
  </div>
);

const DiamondToggle = ({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    className={`
      relative w-12 h-6 md:w-16 md:h-8 border-2 md:border-4 border-(--border-main) rounded-lg transition-colors duration-300 shrink-0
      ${active ? "bg-(--accent-base)" : "bg-(--bg-highlight)"}
    `}
  >
    {/* Track Line */}
    <div className="absolute inset-x-1 md:inset-x-2 top-1/2 h-1 bg-black/20 -translate-y-1/2 rounded-full"></div>

    {/* Rhombus Knob */}
    <div
      className={`
        absolute top-1/2 -translate-y-1/2 w-4 h-4 md:w-6 md:h-6 bg-white border-2 md:border-4 border-(--border-main) 
        transform rotate-45 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${active ? "left-[calc(100%-20px)] md:left-[calc(100%-28px)] rotate-225" : "left-0 md:left-1 rotate-45"}
      `}
    />
  </button>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  updateSetting,
}) => {
  const COLORS = [
    { id: "blue", hex: "#3b82f6", label: "Electric Blue" },
    { id: "purple", hex: "#a855f7", label: "Cyber Purple" },
    { id: "orange", hex: "#f97316", label: "Tiger Orange" },
    { id: "lime", hex: "#84cc16", label: "Neon Lime" },
    { id: "cyan", hex: "#06b6d4", label: "Future Cyan" },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.15 },
        },
      }}
      className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 pb-32 md:pb-8 bg-(--bg-main) text-(--text-main)"
    >
      <div className="max-w-5xl mx-auto space-y-8 md:space-y-12">
        {/* APPEARANCE */}
        <NeoSection title="Aesthetics" icon={Palette}>
          {/* Theme Mode */}
          <NeoCard>
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-black font-expanded uppercase text-zinc-200 leading-tight">
                  Interface Mode
                </h3>
                <p className="text-[10px] md:text-xs font-mono text-zinc-500 mt-1">
                  Select your preferred brightness
                </p>
              </div>
              <div className="p-1.5 md:p-2 bg-zinc-950 border-2 border-zinc-800 rounded-lg shrink-0 ml-2">
                {settings.themeMode === "dark" ? (
                  <Moon className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                ) : (
                  <Sun className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
              <button
                onClick={() => updateSetting("themeMode", "dark")}
                className={`flex-1 py-2.5 md:py-4 rounded-xl border-2 md:border-4 font-bold uppercase tracking-wider text-xs md:text-sm transition-all ${
                  settings.themeMode === "dark"
                    ? "bg-(--bg-highlight) border-(--accent-base) text-(--accent-base) shadow-[2px_2px_0px_0px_var(--accent-base)] md:shadow-[4px_4px_0px_0px_var(--accent-base)]"
                    : "bg-(--bg-surface) border-(--border-dim) text-(--text-muted) hover:border-(--border-main)"
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => updateSetting("themeMode", "light")}
                className={`flex-1 py-2.5 md:py-4 rounded-xl border-2 md:border-4 font-bold uppercase tracking-wider text-xs md:text-sm transition-all ${
                  settings.themeMode === "light"
                    ? "bg-white border-(--accent-base) text-black shadow-[2px_2px_0px_0px_var(--accent-base)] md:shadow-[4px_4px_0px_0px_var(--accent-base)]"
                    : "bg-(--bg-surface) border-(--border-dim) text-(--text-muted) hover:border-(--border-main)"
                }`}
              >
                Light
              </button>
              <button
                onClick={() => updateSetting("themeMode", "amoled")}
                className={`flex-1 py-2.5 md:py-4 rounded-xl border-2 md:border-4 font-bold uppercase tracking-wider text-xs md:text-sm transition-all ${
                  settings.themeMode === "amoled"
                    ? "bg-black border-(--accent-base) text-(--accent-base) shadow-[2px_2px_0px_0px_var(--accent-base)] md:shadow-[4px_4px_0px_0px_var(--accent-base)]"
                    : "bg-(--bg-surface) border-(--border-dim) text-(--text-muted) hover:border-(--border-main)"
                }`}
              >
                AMOLED
              </button>
            </div>
          </NeoCard>

          {/* Accent Color */}
          <NeoCard>
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-black font-expanded uppercase text-zinc-200 leading-tight">
                  Accent Color
                </h3>
                <p className="text-[10px] md:text-xs font-mono text-zinc-500 mt-1">
                  Personalize your experience
                </p>
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2">
                <span className="text-[9px] md:text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Random
                </span>
                <DiamondToggle
                  active={settings.randomAccentColor}
                  onToggle={() => {
                    if (!settings.randomAccentColor) {
                      resetDynamicThemeSeed();
                    }
                    updateSetting(
                      "randomAccentColor",
                      !settings.randomAccentColor,
                    );
                  }}
                />
              </div>
            </div>
            <div
              className={`flex flex-wrap justify-between gap-2 p-2 bg-zinc-950 rounded-xl border-2 border-zinc-800 transition-opacity ${settings.randomAccentColor ? "opacity-50 pointer-events-none" : "opacity-100"}`}
            >
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    !settings.randomAccentColor &&
                    updateSetting("accentColor", c.id as any)
                  }
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-lg border-2 md:border-4 flex items-center justify-center transition-all duration-300 transform shrink-0 ${
                    settings.accentColor === c.id && !settings.randomAccentColor
                      ? "scale-110 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] md:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] border-white rotate-45"
                      : "border-zinc-800 hover:scale-105 hover:border-zinc-600"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {settings.accentColor === c.id &&
                    !settings.randomAccentColor && (
                      <Check className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md -rotate-45" />
                    )}
                </button>
              ))}
            </div>
          </NeoCard>
        </NeoSection>

        {/* INTERFACE */}
        <NeoSection title="Workspace" icon={Layout}>
          <NeoCard className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Modern UI Toggle */}
              <div className="flex items-center justify-between gap-4 group">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-10 h-10 md:w-14 md:h-14 shrink-0 bg-zinc-950 border-2 md:border-4 border-zinc-800 rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                    <Monitor className="w-5 h-5 md:w-7 md:h-7 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-200 text-sm md:text-lg font-expanded uppercase truncate">
                      Default Modern UI
                    </h3>
                    <p className="text-[10px] md:text-xs font-mono text-zinc-500 truncate">
                      Load retop view on login
                    </p>
                  </div>
                </div>
                <DiamondToggle
                  active={settings.defaultView === "modern"}
                  onToggle={() =>
                    updateSetting(
                      "defaultView",
                      settings.defaultView === "modern" ? "legacy" : "modern",
                    )
                  }
                />
              </div>

              {/* Vertical Divider for Desktop */}
              <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-1 bg-zinc-800 rounded-full"></div>
              {/* Horizontal Divider for Mobile */}
              <div className="block md:hidden w-full h-0.5 bg-zinc-800 rounded-full"></div>

              {/* Progress Toggle */}
              <div className="flex items-center justify-between gap-4 group">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-10 h-10 md:w-14 md:h-14 shrink-0 bg-zinc-950 border-2 md:border-4 border-zinc-800 rounded-xl flex items-center justify-center group-hover:-rotate-6 transition-transform duration-300">
                    <TrendingUp className="w-5 h-5 md:w-7 md:h-7 text-zinc-400 group-hover:text-lime-500 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-200 text-sm md:text-lg font-expanded uppercase truncate">
                      Semester Progress
                    </h3>
                    <p className="text-[10px] md:text-xs font-mono text-zinc-500 truncate">
                      Replace CGPA with timeline
                    </p>
                  </div>
                </div>
                <DiamondToggle
                  active={settings.showSemesterProgress}
                  onToggle={() =>
                    updateSetting(
                      "showSemesterProgress",
                      !settings.showSemesterProgress,
                    )
                  }
                />
              </div>
            </div>
          </NeoCard>
        </NeoSection>

        {/* CONNECTIVITY */}
        <NeoSection title="Connectivity" icon={Zap}>
          {/* Removed the conflicting gradient classes from NeoCard so it cleanly adapts to the theme */}
          <NeoCard className="md:col-span-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8 border-b-2 md:border-b-4 border-zinc-800 pb-4 md:pb-6">
              <div className="flex items-center gap-4 md:gap-5 w-full sm:w-auto">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-white rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_#000] md:shadow-[6px_6px_0px_0px_#000] border-2 md:border-4 border-zinc-200 shrink-0">
                  <img
                    src="https://www.google.com/favicon.ico"
                    alt="Google"
                    className="w-7 h-7 md:w-10 md:h-10"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg md:text-2xl font-black font-expanded text-zinc-200 uppercase leading-tight">
                    Google Account
                  </h3>
                  <p className="text-[10px] md:text-sm font-mono text-zinc-500 mt-1">
                    {settings.googleLinked
                      ? "Connected as Student"
                      : "Not connected"}
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  updateSetting("googleLinked", !settings.googleLinked)
                }
                className={`
                  w-full sm:w-auto px-6 py-2.5 md:px-8 md:py-3 rounded-xl font-black font-expanded uppercase tracking-wider text-xs md:text-sm transition-all border-2 md:border-4 shrink-0
                  ${
                    settings.googleLinked
                      ? "bg-zinc-950 text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                      : "bg-blue-500 text-white border-black hover:bg-blue-400 shadow-[2px_2px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none"
                  }
                `}
              >
                {settings.googleLinked ? "Disconnect" : "Connect Now"}
              </button>
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 transition-opacity duration-300 ${settings.googleLinked ? "opacity-100" : "opacity-40 pointer-events-none grayscale"}`}
            >
              {/* Calendar Sync */}
              <div className="flex items-center justify-between p-3 md:p-4 bg-zinc-950 rounded-xl border-2 md:border-4 border-zinc-800 gap-4">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-500 shrink-0" />
                  <span className="font-bold text-sm md:text-base text-zinc-300 font-expanded uppercase tracking-tight truncate">
                    Sync Timetable
                  </span>
                </div>
                <DiamondToggle
                  active={settings.calendarSync}
                  onToggle={() =>
                    updateSetting("calendarSync", !settings.calendarSync)
                  }
                />
              </div>

              {/* Drive Sync */}
              <div className="flex items-center justify-between p-3 md:p-4 bg-zinc-950 rounded-xl border-2 md:border-4 border-zinc-800 gap-4">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <HardDrive className="w-4 h-4 md:w-5 text-green-500 shrink-0" />
                  <span className="font-bold text-sm md:text-base text-zinc-300 font-expanded uppercase tracking-tight truncate">
                    Backup to Drive
                  </span>
                </div>
                <DiamondToggle
                  active={settings.driveSync}
                  onToggle={() =>
                    updateSetting("driveSync", !settings.driveSync)
                  }
                />
              </div>
            </div>
          </NeoCard>
        </NeoSection>

        {/* Footer */}
        <div className="text-center pt-4 md:pt-8 pb-4">
          <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.3em]">
            retop v0.2.0
          </p>
        </div>
      </div>
    </motion.div>
  );
};
