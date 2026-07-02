import React from "react";
import { AppSettings, resetDynamicThemeSeed } from "../utils/settings-store";
import { Check, Casino } from '@nine-thirty-five/material-symbols-react/outlined';
import { motion } from "framer-motion";

interface SettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xs md:text-sm font-expanded uppercase tracking-[0.2em] text-(--text-muted) mb-4 pb-4">
    {children}
  </h2>
);

const SettingsGroup = ({ children, isCard }: { children: React.ReactNode, isCard?: boolean }) => (
  <div className={`flex flex-col ${isCard ? "bg-(--bg-surface) border border-(--border-dim) rounded-2xl shadow-sm" : ""}`}>
    {children}
  </div>
);

const SettingsRow = ({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) => (
  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 md:py-5 border-b border-(--border-dim) last:border-0 ${className}`}>
    <div className="flex-1 min-w-0 pr-4">
      <h3 className="text-sm md:text-base font-bold text-(--text-main) truncate">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-(--text-muted) mt-1 md:mt-0.5">
          {description}
        </p>
      )}
    </div>
    {children && <div className="shrink-0">{children}</div>}
  </div>
);

const RoundedSwitch = ({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    className={`relative w-12 h-7 rounded-full transition-colors duration-300 shrink-0 border border-transparent ${
      active ? "bg-(--accent-base)" : "bg-(--bg-highlight) border-(--border-dim)"
    }`}
  >
    <div
      className={`absolute top-[1px] left-[2px] w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
        active ? "translate-x-[18px]" : "translate-x-0"
      }`}
    />
  </button>
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
        <div className="max-w-3xl mx-auto space-y-10 md:space-y-12 relative z-10">
          
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <SectionTitle>Appearance</SectionTitle>
            <SettingsGroup isCard>
              <div className="flex flex-col items-center gap-8 py-8">
                <div className="flex flex-col items-center gap-3">
                  <h3 className="text-xs font-bold text-(--text-muted) uppercase tracking-[0.1em] pb-2">Theme</h3>
                  <div className="flex bg-(--bg-highlight) p-1 rounded-xl border border-(--border-dim) min-w-[240px]">
                    {["dark", "light", "amoled"].map((mode) => (
                      <button
                        key={mode}
                        onClick={(e) => {
                          const x = e.clientX;
                          const y = e.clientY;
                          if (!(document as any).startViewTransition) {
                            updateSetting("themeMode", mode as any);
                            return;
                          }
                          const transition = (document as any).startViewTransition(() => {
                            updateSetting("themeMode", mode as any);
                            // applyTheme is called in useEffect, but we force it here for synchronous DOM update during transition
                            const root = document.getElementById("retop-root");
                            if (root) root.setAttribute("data-theme", mode);
                          });
                          transition.ready.then(() => {
                            const endRadius = Math.hypot(
                              Math.max(x, innerWidth - x),
                              Math.max(y, innerHeight - y)
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
                              }
                            );
                          });
                        }}
                        className={`flex-1 py-2 px-3 text-[11px] font-bold uppercase rounded-lg transition-all ${
                          settings.themeMode === mode
                            ? "bg-(--bg-surface) text-(--text-main) shadow-sm border border-(--border-dim)"
                            : "text-(--text-muted) hover:text-(--text-main) border border-transparent"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 w-full max-w-[260px] md:max-w-[320px]">
                  <h3 className="text-xs font-bold text-(--text-muted) uppercase tracking-[0.1em] pb-2">Accent</h3>
                  <div className="flex flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-3 px-4 max-w-full pb-3 -mx-4 snap-x">
                    <button
                      onClick={() => {
                        if (!settings.randomAccentColor) resetDynamicThemeSeed();
                        updateSetting("randomAccentColor", true);
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
                        settings.randomAccentColor
                          ? "ring-2 ring-offset-2 ring-offset-(--bg-surface) ring-white scale-110 bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500"
                          : "hover:scale-110 ring-2 ring-transparent ring-offset-2 ring-offset-(--bg-surface) bg-(--bg-highlight) border border-(--border-dim)"
                      }`}
                      title="Random Accent"
                    >
                      {settings.randomAccentColor ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <Casino className="w-5 h-5 text-(--text-muted)" />
                      )}
                    </button>
                    {COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          updateSetting("randomAccentColor", false);
                          updateSetting("accentColor", c.id as any);
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
                          settings.accentColor === c.id && !settings.randomAccentColor
                            ? "ring-2 ring-offset-2 ring-offset-(--bg-surface) ring-white scale-110"
                            : "hover:scale-110 ring-2 ring-transparent ring-offset-2 ring-offset-(--bg-surface)"
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {settings.accentColor === c.id && !settings.randomAccentColor && (
                          <Check className="w-5 h-5 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SettingsGroup>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <SectionTitle>Workspace</SectionTitle>
            <SettingsGroup>
              <SettingsRow title="Default Modern UI" description="Always load the modernized view on login.">
                <RoundedSwitch
                  active={settings.defaultView === "modern"}
                  onToggle={() =>
                    updateSetting("defaultView", settings.defaultView === "modern" ? "legacy" : "modern")
                  }
                />
              </SettingsRow>
              <SettingsRow title="Blur CGPA" description="Hide your CGPA on the dashboard until you hover over it.">
                <RoundedSwitch
                  active={settings.blurCgpa}
                  onToggle={() => updateSetting("blurCgpa", !settings.blurCgpa)}
                />
              </SettingsRow>
              <SettingsRow title="24-Hour Time Format" description="Use railway time (e.g., 14:00) instead of AM/PM format.">
                <RoundedSwitch
                  active={settings.use24HourTime}
                  onToggle={() => updateSetting("use24HourTime", !settings.use24HourTime)}
                />
              </SettingsRow>
            </SettingsGroup>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <SectionTitle>Connectivity</SectionTitle>
            <SettingsGroup>
              <SettingsRow
                title="Google Account"
                description={settings.googleLinked ? "Connected to your student account." : "Not connected."}
              >
                <button
                  onClick={() => updateSetting("googleLinked", !settings.googleLinked)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors ${
                    settings.googleLinked
                      ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      : "bg-(--accent-base) text-(--text-inverse) hover:opacity-90"
                  }`}
                >
                  {settings.googleLinked ? "Disconnect" : "Connect"}
                </button>
              </SettingsRow>
              <div className={`transition-opacity duration-300 ${settings.googleLinked ? "opacity-100" : "opacity-40 pointer-events-none grayscale"}`}>
                <SettingsRow title="Sync Timetable" description="Automatically sync classes with Google CalendarMonth.">
                  <RoundedSwitch
                    active={settings.calendarSync}
                    onToggle={() => updateSetting("calendarSync", !settings.calendarSync)}
                  />
                </SettingsRow>
                <SettingsRow title="Backup to Drive" description="Save settings and offline data to Google Drive.">
                  <RoundedSwitch
                    active={settings.driveSync}
                    onToggle={() => updateSetting("driveSync", !settings.driveSync)}
                  />
                </SettingsRow>
              </div>
            </SettingsGroup>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <SectionTitle>System</SectionTitle>
            <SettingsGroup>
              <SettingsRow title="Clear Timetable Cache" description="Force fetch the latest schedule directly from VTOP.">
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
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors bg-(--bg-highlight) text-(--text-main) border border-(--border-dim) hover:bg-(--border-dim)"
                >
                  Clear Cache
                </button>
              </SettingsRow>
            </SettingsGroup>
          </motion.div>

        </div>
      </motion.div>
    </>
  );
};
