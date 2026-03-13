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
    className="space-y-6"
  >
    <div className="flex items-center gap-4">
      {/* Icon Container */}
      <div className="p-3 bg-(--accent-base) border-4 border-(--border-main) shadow-[4px_4px_0px_0px_var(--border-main)] rounded-xl">
        <Icon className="w-6 h-6 text-white" />
      </div>
      {/* Title */}
      <h2 className="text-3xl font-black font-expanded text-(--text-main) uppercase tracking-tighter drop-shadow-sm">
        {title}
      </h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
  </motion.section>
);

const NeoCard = ({ children, className = "" }: any) => (
  <div
    className={`
    bg-(--bg-surface) border-4 border-(--border-main) rounded-4xl p-6 
    shadow-[8px_8px_0px_0px_var(--border-main)] hover:shadow-[12px_12px_0px_0px_var(--border-main)]
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
      relative w-16 h-8 border-4 border-(--border-main) rounded-lg transition-colors duration-300 
      ${active ? "bg-(--accent-base)" : "bg-(--bg-highlight)"}
    `}
  >
    {/* Track Line */}
    <div className="absolute inset-x-2 top-1/2 h-1 bg-black/20 -translate-y-1/2 rounded-full"></div>

    {/* Rhombus Knob */}
    <div
      className={`
        absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-4 border-(--border-main) 
        transform rotate-45 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${active ? "left-[calc(100%-28px)] rotate-225" : "left-1 rotate-45"}
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
      className="h-full overflow-y-auto custom-scrollbar p-6 md:p-8 bg-(--bg-main) text-(--text-main)"
    >
      <div className="max-w-5xl mx-auto space-y-12">
        {/* APPEARANCE */}
        <NeoSection title="Aesthetics" icon={Palette}>
          {/* Theme Mode */}
          <NeoCard>
            <div className="flex justify-between items-start mb-6">
              <div>
                {/* FIX: Changed text-white to text-zinc-200 */}
                <h3 className="text-xl font-black font-expanded uppercase text-zinc-200">
                  Interface Mode
                </h3>
                <p className="text-xs font-mono text-zinc-500 mt-1">
                  Select your preferred brightness
                </p>
              </div>
              <div className="p-2 bg-zinc-950 border-2 border-zinc-800 rounded-lg">
                {settings.themeMode === "dark" ? (
                  <Moon className="w-5 h-5 text-blue-500" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-500" />
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => updateSetting("themeMode", "dark")}
                className={`flex-1 py-4 rounded-xl border-4 font-bold uppercase tracking-wider transition-all ${
                  settings.themeMode === "dark"
                    ? "bg-(--bg-highlight) border-(--accent-base) text-(--accent-base) shadow-[4px_4px_0px_0px_var(--accent-base)]"
                    : "bg-(--bg-surface) border-(--border-dim) text-(--text-muted) hover:border-(--border-main)"
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => updateSetting("themeMode", "light")}
                className={`flex-1 py-4 rounded-xl border-4 font-bold uppercase tracking-wider transition-all ${
                  settings.themeMode === "light"
                    ? "bg-white border-(--accent-base) text-black shadow-[4px_4px_0px_0px_var(--accent-base)]"
                    : "bg-(--bg-surface) border-(--border-dim) text-(--text-muted) hover:border-(--border-main)"
                }`}
              >
                Light
              </button>
              <button
                onClick={() => updateSetting("themeMode", "amoled")}
                className={`flex-1 py-4 rounded-xl border-4 font-bold uppercase tracking-wider transition-all ${
                  settings.themeMode === "amoled"
                    ? "bg-black border-(--accent-base) text-(--accent-base) shadow-[4px_4px_0px_0px_var(--accent-base)]"
                    : "bg-(--bg-surface) border-(--border-dim) text-(--text-muted) hover:border-(--border-main)"
                }`}
              >
                AMOLED
              </button>
            </div>
          </NeoCard>

          {/* Accent Color */}
          <NeoCard>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black font-expanded uppercase text-zinc-200">
                  Accent Color
                </h3>
                <p className="text-xs font-mono text-zinc-500 mt-1">
                  Personalize your experience
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
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
              className={`flex justify-between gap-2 p-2 bg-zinc-950/50 rounded-xl border-2 border-zinc-800 transition-opacity ${settings.randomAccentColor ? "opacity-50 pointer-events-none" : "opacity-100"}`}
            >
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    !settings.randomAccentColor &&
                    updateSetting("accentColor", c.id as any)
                  }
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-lg border-4 flex items-center justify-center transition-all duration-300 transform ${
                    settings.accentColor === c.id && !settings.randomAccentColor
                      ? "scale-110 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] border-white rotate-45"
                      : "border-zinc-800 hover:scale-105 hover:border-zinc-600"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {settings.accentColor === c.id &&
                    !settings.randomAccentColor && (
                      <Check className="w-6 h-6 text-white drop-shadow-md -rotate-45" />
                    )}
                </button>
              ))}
            </div>
          </NeoCard>
        </NeoSection>

        {/* INTERFACE */}
        <NeoSection title="Workspace" icon={Layout}>
          <NeoCard className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Modern UI Toggle */}
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-zinc-950 border-4 border-zinc-800 rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                    <Monitor className="w-7 h-7 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-200 text-lg font-expanded uppercase">
                      Default Modern UI
                    </h3>
                    <p className="text-xs font-mono text-zinc-500">
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

              {/* Progress Toggle */}
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-zinc-950 border-4 border-zinc-800 rounded-xl flex items-center justify-center group-hover:-rotate-6 transition-transform duration-300">
                    <TrendingUp className="w-7 h-7 text-zinc-400 group-hover:text-lime-500 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-200 text-lg font-expanded uppercase">
                      Semester Progress
                    </h3>
                    <p className="text-xs font-mono text-zinc-500">
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
          <NeoCard className="md:col-span-2 bg-linear-to-br from-zinc-900 to-zinc-950">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b-4 border-zinc-800 pb-6">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-[6px_6px_0px_0px_#000] border-4 border-zinc-200 shrink-0">
                  <img
                    src="https://www.google.com/favicon.ico"
                    alt="Google"
                    className="w-10 h-10"
                  />
                </div>
                <div>
                  {/* FIX: Changed text-white to text-zinc-200 */}
                  <h3 className="text-2xl font-black font-expanded text-zinc-200 uppercase">
                    Google Account
                  </h3>
                  <p className="text-sm font-mono text-zinc-500 mt-1">
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
                  px-8 py-3 rounded-xl font-black font-expanded uppercase tracking-wider text-sm transition-all border-4 
                  ${
                    settings.googleLinked
                      ? "bg-zinc-950 text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                      : "bg-blue-500 text-white border-black hover:bg-blue-400 shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none"
                  }
                `}
              >
                {settings.googleLinked ? "Disconnect" : "Connect Now"}
              </button>
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-300 ${settings.googleLinked ? "opacity-100" : "opacity-40 pointer-events-none grayscale"}`}
            >
              {/* Calendar Sync */}
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border-4 border-zinc-800">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <span className="font-bold text-zinc-300 font-expanded uppercase tracking-tight">
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
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border-4 border-zinc-800">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-green-500" />
                  <span className="font-bold text-zinc-300 font-expanded uppercase tracking-tight">
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
        <div className="text-center pt-8 pb-4">
          <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.3em]">
            retop v0.2.0
          </p>
        </div>
      </div>
    </motion.div>
  );
};
