import React from 'react';
import { SettingTopicCard } from './SettingTopicCard';
import { M3eCheckbox } from '../attendance/m3eTags';

interface SyncSectionProps {
  icalOptions: {
    includeTimetable: boolean;
    includeCalendar: boolean;
    includeEvents: boolean;
    includeExams: boolean;
  };
  setIcalOptions: React.Dispatch<
    React.SetStateAction<{
      includeTimetable: boolean;
      includeCalendar: boolean;
      includeEvents: boolean;
      includeExams: boolean;
    }>
  >;
  handleExportICal: () => void;
  googleConnected: boolean;
  googleAccount: string;
  googleStatus: string;
  googleBusy: boolean;
  handleGoogleConnect: () => void;
  handleGoogleSync: () => void;
}

const checkboxClass =
  'min-h-12 flex items-center gap-3 px-3 rounded-xl bg-(--bg-main) cursor-pointer hover:bg-(--bg-highlight) transition-colors';
const checkboxStyle = {
  '--m3e-checkbox-container-size': '32px',
  '--m3e-checkbox-icon-size': '16px',
} as React.CSSProperties;
const optionLabelClass = 'text-xs font-semibold text-(--text-main)';

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
  return (
    <>
      <SettingTopicCard
        title="Export iCal (.ics) File"
        description="Export your schedule, exams, and calendar events as a standard .ics file for Apple Calendar, Outlook, or Google Calendar"
      >
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase font-expanded text-(--text-muted) tracking-wider">
              Choose Data to Include
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className={checkboxClass}>
                <M3eCheckbox
                  checked={icalOptions.includeTimetable}
                  onChange={(e: any) =>
                    setIcalOptions((prev) => ({
                      ...prev,
                      includeTimetable: e.target.checked,
                    }))
                  }
                  style={checkboxStyle}
                />
                <span className={optionLabelClass}>
                  Timetable (Classes &amp; Slots)
                </span>
              </label>

              <label className={checkboxClass}>
                <M3eCheckbox
                  checked={icalOptions.includeCalendar}
                  onChange={(e: any) =>
                    setIcalOptions((prev) => ({
                      ...prev,
                      includeCalendar: e.target.checked,
                    }))
                  }
                  style={checkboxStyle}
                />
                <span className={optionLabelClass}>Academic Calendar</span>
              </label>

              <label className={checkboxClass}>
                <M3eCheckbox
                  checked={icalOptions.includeExams}
                  onChange={(e: any) =>
                    setIcalOptions((prev) => ({
                      ...prev,
                      includeExams: e.target.checked,
                    }))
                  }
                  style={checkboxStyle}
                />
                <span className={optionLabelClass}>Exam Schedules</span>
              </label>

              <label className={checkboxClass}>
                <M3eCheckbox
                  checked={icalOptions.includeEvents}
                  onChange={(e: any) =>
                    setIcalOptions((prev) => ({
                      ...prev,
                      includeEvents: e.target.checked,
                    }))
                  }
                  style={checkboxStyle}
                />
                <span className={optionLabelClass}>University Events</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-(--border-dim)">
            <button
              onClick={handleExportICal}
              className="min-h-12 px-6 rounded-full text-sm font-semibold bg-(--accent-base) text-(--text-inverse) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) transition-colors border-0 cursor-pointer hover:opacity-90"
            >
              Export iCal (.ics) File
            </button>
          </div>
        </div>
      </SettingTopicCard>

      <SettingTopicCard
        title="Google Calendar Sync"
        description="Sync your VTOP classes and exams to your Google Calendar with a personal Google Account."
      >
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase font-expanded text-(--text-muted) tracking-wider">
              Google Account
            </span>
            <span className="font-mono text-xs text-(--text-main) bg-(--bg-highlight) px-2.5 py-1 rounded-lg">
              {googleConnected
                ? googleAccount || 'Connected'
                : 'Connect Google Account to begin'}
            </span>
          </div>

          {googleStatus && (
            <p className="text-xs leading-relaxed text-(--text-muted)">
              {googleStatus}
            </p>
          )}

          <div className="flex justify-end pt-3 border-t border-(--border-dim)">
            <button
              onClick={googleConnected ? handleGoogleSync : handleGoogleConnect}
              disabled={googleBusy}
              className="min-h-12 px-6 rounded-full text-sm font-semibold bg-(--accent-base) text-(--text-inverse) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) transition-colors border-0 cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleBusy
                ? 'Working…'
                : googleConnected
                  ? 'Sync to Google Calendar'
                  : 'Connect Google Account'}
            </button>
          </div>
        </div>
      </SettingTopicCard>
    </>
  );
};
