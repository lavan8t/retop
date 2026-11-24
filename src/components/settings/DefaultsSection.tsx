import React from 'react';
import { AppSettings } from '../../utils/settings-store';
import { SettingTopicList } from './SettingTopicList';
import { SegmentedControl } from '../ui/SegmentedControl';
import { MaterialSwitch } from '../MaterialSwitch';

interface DefaultsSectionProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
}

export const DefaultsSection: React.FC<DefaultsSectionProps> = ({
  settings,
  updateSetting,
}) => {
  return (
    <>
      <SettingTopicList title="Timetable View Mode">
        <m3e-list-item className="min-h-0">
          <div className="rounded-2xl bg-(--bg-main) p-1 w-full max-w-xl">
            <SegmentedControl
              ariaLabel="Timetable view mode"
              options={[
                { label: 'Weekly View', value: 'weekly' },
                { label: 'Slot Grid', value: 'slot' },
                { label: 'Consolidated', value: 'consolidated' },
                { label: 'Full Month', value: 'fullMonth' },
              ]}
              value={settings.timetableMode || 'weekly'}
              onChange={(val) => updateSetting('timetableMode', val as any)}
              className="w-full flex-1 *:flex-1"
            />
          </div>
        </m3e-list-item>
      </SettingTopicList>

      <SettingTopicList title="Default Launch View">
        <m3e-list-item>
          <div className="flex items-center justify-between gap-4 w-full">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-(--text-main)">
                Load retop on Login
              </span>
              <span className="text-xs text-(--text-muted)">
                Automatically show retop dashboard instead of legacy{' '}
                <span className="font-vtop">VTOP</span> UI
              </span>
            </div>
            <MaterialSwitch
              selected={settings.defaultView === 'modern'}
              onChange={() => {
                const newVal =
                  settings.defaultView === 'modern' ? 'legacy' : 'modern';
                updateSetting('defaultView', newVal);
                if (newVal === 'legacy') {
                  sessionStorage.setItem('vtop-legacy-mode', 'true');
                } else {
                  sessionStorage.setItem('vtop-legacy-mode', 'false');
                }
              }}
            />
          </div>
        </m3e-list-item>
      </SettingTopicList>

      <SettingTopicList title="Display & Privacy Preferences">
        <m3e-list-item>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-(--text-main)">
                Time Format
              </span>
              <span className="text-xs text-(--text-muted)">
                How times are displayed across schedules and calendar
              </span>
            </div>
            <div className="rounded-2xl bg-(--bg-main) p-1">
              <SegmentedControl
                ariaLabel="Time format"
                options={[
                  { value: '12h', label: '12h' },
                  { value: '12h-ampm', label: 'AM/PM' },
                  { value: '24h', label: '24h' },
                ]}
                value={(settings.timeFormat ?? '12h') as string}
                onChange={(val) => updateSetting('timeFormat', val as any)}
                buttonClassName="px-3 py-2.5"
              />
            </div>
          </div>
        </m3e-list-item>

        <m3e-list-item>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-(--text-main)">
                Blur CGPA &amp; Credits
              </span>
              <span className="text-xs text-(--text-muted)">
                Hide CGPA and credit totals on home dashboard for privacy
              </span>
            </div>
            <MaterialSwitch
              selected={settings.blurCgpa}
              onChange={() => updateSetting('blurCgpa', !settings.blurCgpa)}
            />
          </div>
        </m3e-list-item>
      </SettingTopicList>
    </>
  );
};
