import React from 'react';
import { AppSettings } from '../../utils/settings-store';
import { SettingTopicCard } from './SettingTopicCard';
import { SegmentedControl } from '../ui/SegmentedControl';
import { SemesterDropdown } from '../ui/Dropdown';
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
      <SettingTopicCard
        title="Timetable View Mode"
        description="Select preferred default timetable layout format"
      >
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
      </SettingTopicCard>

      <SettingTopicCard
        title="Date Format Pattern"
        description="Choose default date display pattern across retop"
      >
        <SemesterDropdown
          semesters={[
            { id: 'DD Mon YYYY', label: 'DD Mon YYYY' },
            { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
            { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
            { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
            { id: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
            { id: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
          ]}
          selectedId={settings.dateFormat || 'DD Mon YYYY'}
          onChange={(id: string) => updateSetting('dateFormat', id as any)}
        />
      </SettingTopicCard>

      <SettingTopicCard
        title="Default Launch View"
        description="Always load retop modernized view on login"
      >
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
      </SettingTopicCard>

      <SettingTopicCard
        title="Display & Privacy Preferences"
        description="Time format display and private data masking"
      >
        <div className="flex flex-col divide-y divide-(--border-dim)">
          <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
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

          <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
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
        </div>
      </SettingTopicCard>
    </>
  );
};
