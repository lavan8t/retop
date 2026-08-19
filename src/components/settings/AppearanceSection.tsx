import React from "react";
import { AppSettings, getMaterialThemeColor, getMaterialOnThemeColor } from "../../utils/settings-store";
import { SettingTopicCard } from "./SettingTopicCard";
import { SettingsDropdown } from "../ui/Dropdown";
import { MaterialSwitch } from "../MaterialSwitch";
import { useIsDark } from "../../hooks/useTheme";
import { WbSunny, DarkMode, Computer, LocationOn } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

interface AppearanceSectionProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  handleThemeChange: (e: any, targetMode: "light" | "dark" | "amoled" | "auto") => void;
  COLORS: { id: string; hex: string; label: string }[];
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  settings,
  updateSetting,
  handleThemeChange,
  COLORS,
}) => {
  const isDark = useIsDark();

  const activeClassKey = settings.calendarClassColor;
  const activeEventKey = settings.calendarEventColor;

  const dummyClassBg = getMaterialThemeColor(activeClassKey, isDark);
  const dummyClassFg = getMaterialOnThemeColor(activeClassKey, isDark);
  const dummyEventBg = getMaterialThemeColor(activeEventKey, isDark);
  const dummyEventFg = getMaterialOnThemeColor(activeEventKey, isDark);

  return (
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
            <div className="flex items-center justify-around w-full py-2 gap-3">
              {[
                { id: "light", label: "Light", icon: WbSunny },
                { id: "dark", label: "Dark", icon: DarkMode },
                { id: "auto", label: "System", icon: Computer },
              ].map((item) => {
                const isSelected =
                  settings.themeMode === item.id ||
                  (item.id === "dark" && settings.themeMode === "amoled");

                return (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleThemeChange(e, item.id as any);
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 w-20 h-20 rounded-2xl transition-all cursor-pointer border-2 shadow-none ${
                      isSelected
                        ? "bg-(--accent-base) text-(--text-inverse) border-(--accent-base)"
                        : "bg-transparent text-(--text-muted) hover:text-(--text-main) border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-7 h-7 shrink-0" />
                    <span className="text-xs font-bold font-expanded">
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
                settings.themeMode === "amoled" || settings.pureBlack
              }
              disabled={settings.themeMode === "light"}
              onChange={(checked) => {
                updateSetting("pureBlack", checked);
                if (
                  settings.themeMode === "dark" ||
                  settings.themeMode === "amoled"
                ) {
                  handleThemeChange(
                    null,
                    checked ? "amoled" : "dark",
                  );
                }
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full items-start sm:items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-(--text-main)">Accent Color</span>
              <span className="text-xs text-(--text-muted)">Select primary accent color across retop</span>
            </div>
            <SettingsDropdown
              options={COLORS.map((c) => ({ label: c.label, value: c.id }))}
              value={settings.accentColor}
              onChange={(val) => updateSetting("accentColor", val as any)}
              colorHex={(val) => COLORS.find((c) => c.id === val)?.hex || "#f97316"}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full items-start sm:items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-(--text-main)">Palette Style</span>
              <span className="text-xs text-(--text-muted)">Select Material Design 3 tone algorithm</span>
            </div>
            <SettingsDropdown
              options={[
                { label: "Vibrant", value: "vibrant" },
                { label: "Tonal Spot", value: "tonal" },
                { label: "Expressive", value: "expressive" },
                { label: "Content", value: "content" },
                { label: "Fidelity", value: "fidelity" },
                { label: "Fruit Salad", value: "fruitSalad" },
                { label: "Rainbow", value: "rainbow" },
                { label: "Neutral", value: "neutral" },
                { label: "Monochrome", value: "monochrome" },
              ]}
              value={settings.colorSchemeStyle || "vibrant"}
              onChange={(val) => updateSetting("colorSchemeStyle", val as any)}
            />
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

          <div className="flex flex-col sm:flex-row gap-4 w-full items-start sm:items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-(--text-main)">Classes Color</span>
              <span className="text-xs text-(--text-muted)">Theme tone for timetable class cards</span>
            </div>
            <SettingsDropdown
              options={COLORS.map((c) => ({ label: c.label, value: c.id }))}
              value={settings.calendarClassColor}
              onChange={(val) => updateSetting("calendarClassColor", val as any)}
              colorHex={(val) => COLORS.find((c) => c.id === val)?.hex || "#3b82f6"}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full items-start sm:items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-(--text-main)">Events Color</span>
              <span className="text-xs text-(--text-muted)">Theme tone for event & custom cards</span>
            </div>
            <SettingsDropdown
              options={COLORS.map((c) => ({ label: c.label, value: c.id }))}
              value={settings.calendarEventColor}
              onChange={(val) => updateSetting("calendarEventColor", val as any)}
              colorHex={(val) => COLORS.find((c) => c.id === val)?.hex || "#a855f7"}
            />
          </div>
        </div>
      </SettingTopicCard>

      <SettingTopicCard
        title="Font Scaling & Weight"
        description="Adjust text size and thickness across the entire interface"
      >
        <div className="flex flex-col sm:flex-row gap-6 w-full items-start sm:items-center justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-(--text-main)">Font Size</span>
            <span className="text-xs text-(--text-muted)">Scale text size across retop</span>
            <SettingsDropdown
              options={[
                { label: "80% (Compact)", value: 80 },
                { label: "90% (Small)", value: 90 },
                { label: "100% (Default)", value: 100 },
                { label: "110% (Large)", value: 110 },
                { label: "120% (Extra Large)", value: 120 },
                { label: "130% (Huge)", value: 130 },
              ]}
              value={settings.fontScale ?? 100}
              onChange={(val) => {
                updateSetting("fontScale", val);
                document.documentElement.style.fontSize = `${val}%`;
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-(--text-main)">Font Weight</span>
            <span className="text-xs text-(--text-muted)">Body text weight across the app</span>
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-(--bg-main) border-2 border-(--border-dim)">
              {(["regular", "medium", "bold"] as const).map((fw) => {
                const label = fw.charAt(0).toUpperCase() + fw.slice(1);
                const isActive = (settings.fontWeight ?? "bold") === fw;
                return (
                  <button
                    key={fw}
                    onClick={() => updateSetting("fontWeight", fw)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isActive
                        ? "bg-(--accent-base) text-(--text-inverse) font-black"
                        : "text-(--text-muted) hover:text-(--text-main) font-bold"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SettingTopicCard>

      <SettingTopicCard
        title={<><span className="font-vtop font-bold">VTOP</span> (Legacy View)</>}
        description={<>Theme & appearance settings for the original <span className="font-vtop font-bold">VTOP</span> interface</>}
      >
        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col sm:flex-row gap-4 w-full items-start sm:items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-(--text-main)"><span className="font-vtop font-bold">VTOP</span> Dark Mode</span>
              <span className="text-xs text-(--text-muted)">Dark mode styling for native <span className="font-vtop font-bold">VTOP</span> pages and tables</span>
            </div>
            <SettingsDropdown
              options={[
                { label: "Match retop theme", value: "same" },
                { label: "Always Dark", value: "dark" },
                { label: "Pure Black (AMOLED)", value: "amoled" },
                { label: "Always Light", value: "light" },
                { label: "Original (Untouched)", value: "none" },
              ]}
              value={settings.vtopThemeMode ?? "same"}
              onChange={(val) => updateSetting("vtopThemeMode", val as any)}
            />
          </div>
        </div>
      </SettingTopicCard>
    </>
  );
};
