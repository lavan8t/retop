import React from 'react';
import { SettingTopicList } from './SettingTopicList';
import { M3eButton, M3eButtonGroup, M3eCheckbox } from '../attendance/m3eTags';

interface IcalOptions {
  includeTimetable: boolean;
  includeCalendar: boolean;
  includeEvents: boolean;
  includeExams: boolean;
}

interface SyncSectionProps {
  icalOptions: IcalOptions;
  setIcalOptions: React.Dispatch<React.SetStateAction<IcalOptions>>;
  handleExportICal: () => void;
  googleConnected: boolean;
  googleAccount: string;
  googleStatus: string;
  googleBusy: boolean;
  handleGoogleConnect: () => void;
  handleGoogleSync: () => void;
}

const checkboxClass =
  'min-h-12 flex items-center gap-3 px-3 rounded-xl bg-(--md-sys-color-surface-container-low) cursor-pointer';
const checkboxStyle = {
  '--m3e-checkbox-container-size': '32px',
  '--m3e-checkbox-icon-size': '16px',
} as React.CSSProperties;
const optionLabelClass =
  'text-xs font-semibold text-(--md-sys-color-on-surface)';

export const SyncSection: React.FC<SyncSectionProps> = ({
  icalOptions,
  setIcalOptions,
  handleExportICal,
  googleConnected,
  googleAccount,
  googleStatus,
  googleBusy,
  handleGoogleConnect,
  handleGoogleSync,
}) => {
  const toggleOption = (key: keyof IcalOptions) => (e: any) =>
    setIcalOptions((prev) => ({ ...prev, [key]: e.target.checked }));

  return (
    <SettingTopicList title="Calendar export & sync">
      <m3e-list-item className="min-h-0">
        <div className="grid grid-cols-1 gap-2 w-full sm:grid-cols-2">
          <label className={checkboxClass}>
            <M3eCheckbox
              checked={icalOptions.includeTimetable}
              onChange={toggleOption('includeTimetable')}
              style={checkboxStyle}
            />
            <span className={optionLabelClass}>
              Timetable (Classes &amp; Slots)
            </span>
          </label>
          <label className={checkboxClass}>
            <M3eCheckbox
              checked={icalOptions.includeCalendar}
              onChange={toggleOption('includeCalendar')}
              style={checkboxStyle}
            />
            <span className={optionLabelClass}>Academic Calendar</span>
          </label>
          <label className={checkboxClass}>
            <M3eCheckbox
              checked={icalOptions.includeExams}
              onChange={toggleOption('includeExams')}
              style={checkboxStyle}
            />
            <span className={optionLabelClass}>Exam Schedules</span>
          </label>
          <label className={checkboxClass}>
            <M3eCheckbox
              checked={icalOptions.includeEvents}
              onChange={toggleOption('includeEvents')}
              style={checkboxStyle}
            />
            <span className={optionLabelClass}>University Events</span>
          </label>
        </div>
      </m3e-list-item>

      <m3e-list-item className="min-h-0">
        <div className="flex flex-col gap-1 w-full">
          <span className="text-xs font-semibold text-(--md-sys-color-on-surface)">
            {googleConnected
              ? googleAccount || 'Google account connected'
              : 'Google account not connected'}
          </span>
          {googleStatus && (
            <span className="text-xs text-(--md-sys-color-on-surface-variant)">
              {googleStatus}
            </span>
          )}
        </div>
      </m3e-list-item>

      <m3e-list-item className="min-h-0">
        <M3eButtonGroup
          variant="standard"
          className="flex flex-wrap justify-end gap-2 w-full"
        >
          <M3eButton
            variant="filled"
            disabled={googleBusy}
            onClick={googleConnected ? handleGoogleSync : handleGoogleConnect}
          >
            {googleBusy
              ? 'Working…'
              : googleConnected
                ? 'Sync to Google Calendar'
                : 'Connect Google Account'}
          </M3eButton>
          <M3eButton variant="tonal" onClick={handleExportICal}>
            Download .ics
          </M3eButton>
        </M3eButtonGroup>
      </m3e-list-item>
    </SettingTopicList>
  );
};
