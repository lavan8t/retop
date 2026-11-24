import React from 'react';
import {
  AppSettings,
  getMaterialThemeColor,
  getMaterialOnThemeColor,
} from '../../utils/settings-store';
import { SettingTopicList } from './SettingTopicList';
import { ColorCirclePicker } from './ColorCirclePicker';
import { SettingsDropdown } from '../ui/Dropdown';
import { MaterialSwitch } from '../MaterialSwitch';
import { useIsDark } from '../../hooks/useTheme';
import { M3eButton, M3eButtonGroup, M3eIcon } from '../attendance/m3eTags';
import { LocationOn } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

const THEME_MODES = [
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
  { value: 'auto', label: 'System', icon: 'computer' },
] as const;

interface AppearanceSectionProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
  handleThemeChange: (
    e: any,
    targetMode: 'light' | 'dark' | 'amoled' | 'auto',
  ) => void;
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
      <SettingTopicList title="Theme & Color Scheme">
        <m3e-list-item className="min-h-0">
          <M3eButtonGroup
            variant="connected"
            size="medium"
            aria-label="Color scheme"
            className="w-full max-w-md"
            style={
              {
                display: 'flex',
                '--m3e-button-container-height': '48px',
                '--m3e-button-label-text-font-size': '13px',
                '--m3e-button-label-text-font-weight': '700',
                '--m3e-button-icon-size': '20px',
                '--m3e-button-unselected-label-text-color':
                  'var(--md-sys-color-on-surface)',
                '--m3e-button-unselected-icon-color':
                  'var(--md-sys-color-on-surface-variant)',
                '--m3e-button-selected-container-color':
                  'var(--md-sys-color-secondary-container)',
                '--m3e-button-selected-label-text-color':
                  'var(--md-sys-color-on-secondary-container)',
                '--m3e-button-selected-icon-color':
                  'var(--md-sys-color-on-secondary-container)',
              } as React.CSSProperties
            }
          >
            {THEME_MODES.map((mode) => (
              <M3eButton
                key={mode.value}
                toggle
                value={mode.value}
                selected={
                  (settings.themeMode === 'amoled'
                    ? 'dark'
                    : settings.themeMode) === mode.value
                }
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleThemeChange(e.nativeEvent, mode.value);
                }}
                className="flex-1"
              >
                <M3eIcon slot="icon" name={mode.icon} />
                {mode.label}
              </M3eButton>
            ))}
          </M3eButtonGroup>
        </m3e-list-item>

        <m3e-list-item>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-(--text-main)">
                Use Pure Black
              </span>
              <span className="text-xs text-(--text-muted)">
                Deeper black background for the dark theme
              </span>
            </div>
            <MaterialSwitch
              selected={settings.themeMode === 'amoled' || settings.pureBlack}
              disabled={settings.themeMode === 'light'}
              onChange={(checked) => {
                updateSetting('pureBlack', checked);
                if (
                  settings.themeMode === 'dark' ||
                  settings.themeMode === 'amoled'
                ) {
                  handleThemeChange(null, checked ? 'amoled' : 'dark');
                }
              }}
            />
          </div>
        </m3e-list-item>

        <m3e-list-item>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-(--text-main)">
                Apply theme to classic <span className="font-vtop">VTOP</span>
              </span>
              <span className="text-xs text-(--text-muted)">
                Match the legacy portal to your theme
              </span>
            </div>
            <MaterialSwitch
              selected={settings.vtopThemeMode !== 'none'}
              onChange={(checked) =>
                updateSetting('vtopThemeMode', checked ? 'same' : 'none')
              }
            />
          </div>
        </m3e-list-item>

        <m3e-list-item>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-(--text-main)">
                Accent Color
              </span>
              <span className="text-xs text-(--text-muted)">
                Select primary accent color across retop
              </span>
            </div>
            <ColorCirclePicker
              colors={COLORS}
              value={settings.accentColor}
              onChange={(id) => updateSetting('accentColor', id as any)}
              label="Accent color"
            />
          </div>
        </m3e-list-item>
      </SettingTopicList>

      <SettingTopicList title="Calendar Card Theme Colors">
        <m3e-list-item className="min-h-0">
          <div className="flex flex-col gap-2 rounded-xl overflow-hidden w-full max-w-md bg-(--bg-main) p-3">
            <div
              className="flex flex-col p-3 rounded-xl transition-colors"
              style={{
                backgroundColor: dummyClassBg,
                color: dummyClassFg,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono text-xs font-semibold shrink-0">
                    08:00
                  </span>
                  <span className="text-sm font-semibold truncate">
                    Operating Systems
                  </span>
                </div>
                <span className="text-xs font-semibold font-mono shrink-0 flex items-center gap-1 opacity-90">
                  <LocationOn className="w-3 h-3" />
                  SJT 412
                </span>
              </div>
            </div>

            <div
              className="flex flex-col p-3 rounded-xl transition-colors"
              style={{
                backgroundColor: dummyEventBg,
                color: dummyEventFg,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold leading-tight flex-1">
                  Do Good Hackathon
                </span>
                <span className="shrink-0 text-xs font-semibold opacity-80 text-right">
                  The Club
                </span>
              </div>
            </div>
          </div>
        </m3e-list-item>

        <m3e-list-item>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-(--text-main)">
                Classes Color
              </span>
              <span className="text-xs text-(--text-muted)">
                Theme tone for timetable class cards
              </span>
            </div>
            <ColorCirclePicker
              colors={COLORS}
              value={settings.calendarClassColor}
              onChange={(id) => updateSetting('calendarClassColor', id as any)}
              label="Classes color"
            />
          </div>
        </m3e-list-item>

        <m3e-list-item>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-(--text-main)">
                Events Color
              </span>
              <span className="text-xs text-(--text-muted)">
                Theme tone for event &amp; custom cards
              </span>
            </div>
            <ColorCirclePicker
              colors={COLORS}
              value={settings.calendarEventColor}
              onChange={(id) => updateSetting('calendarEventColor', id as any)}
              label="Events color"
            />
          </div>
        </m3e-list-item>
      </SettingTopicList>

      <SettingTopicList title="Font Scaling & Weight">
        <m3e-list-item>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-(--text-main)">
                Font Size
              </span>
              <span className="text-xs text-(--text-muted)">
                Scale text size across retop
              </span>
            </div>
            <SettingsDropdown
              options={[
                { label: '80% (Compact)', value: 80 },
                { label: '90% (Small)', value: 90 },
                { label: '100% (Default)', value: 100 },
                { label: '110% (Large)', value: 110 },
                { label: '120% (Extra Large)', value: 120 },
                { label: '130% (Huge)', value: 130 },
              ]}
              value={settings.fontScale ?? 100}
              onChange={(val) => {
                updateSetting('fontScale', val);
                document.documentElement.style.fontSize = `${val}%`;
              }}
            />
          </div>
        </m3e-list-item>
      </SettingTopicList>
    </>
  );
};
