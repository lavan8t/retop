import React from 'react';
import { SettingTopicCard } from './SettingTopicCard';

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
  googleCalendarName: string;
  googleStatus: string;
  googleBusy: boolean;
  handleGoogleSync: () => void;
}

export const SyncSection: React.FC<SyncSectionProps> = ({
  icalOptions,
  setIcalOptions,
  handleExportICal,
  googleCalendarName,
  googleStatus,
  googleBusy,
  handleGoogleSync,
}) => {
  return (
    <>
      <SettingTopicCard
        title="Export iCal (.ics) File"
        description="Export your schedule, exams, and calendar events as a standard .ics calendar file for Apple Calendar, Outlook, or Google Calendar"
      >
        <div className="flex flex-col gap-5 w-full">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase font-expanded text-(--text-muted) tracking-wider">
              Choose Data to Include
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-(--bg-main) border border-(--border-dim) cursor-pointer hover:bg-(--bg-highlight) transition-colors">
                <input
                  type="checkbox"
                  checked={icalOptions.includeTimetable}
                  onChange={(e) =>
                    setIcalOptions((prev) => ({
                      ...prev,
                      includeTimetable: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-(--accent-base) rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-(--text-main)">
                  Timetable (Classes &amp; Slots)
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-(--bg-main) border border-(--border-dim) cursor-pointer hover:bg-(--bg-highlight) transition-colors">
                <input
                  type="checkbox"
                  checked={icalOptions.includeCalendar}
                  onChange={(e) =>
                    setIcalOptions((prev) => ({
                      ...prev,
                      includeCalendar: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-(--accent-base) rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-(--text-main)">
                  Academic Calendar
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-(--bg-main) border border-(--border-dim) cursor-pointer hover:bg-(--bg-highlight) transition-colors">
                <input
                  type="checkbox"
                  checked={icalOptions.includeExams}
                  onChange={(e) =>
                    setIcalOptions((prev) => ({
                      ...prev,
                      includeExams: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-(--accent-base) rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-(--text-main)">
                  Exam Schedules
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-(--bg-main) border border-(--border-dim) cursor-pointer hover:bg-(--bg-highlight) transition-colors">
                <input
                  type="checkbox"
                  checked={icalOptions.includeEvents}
                  onChange={(e) =>
                    setIcalOptions((prev) => ({
                      ...prev,
                      includeEvents: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-(--accent-base) rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-(--text-main)">
                  University Events
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-(--border-dim)">
            <button
              onClick={handleExportICal}
              className="px-6 py-2.5 rounded-full text-xs font-black uppercase bg-(--accent-base) text-(--text-inverse) transition-all border-0 cursor-pointer hover:opacity-90"
            >
              Export iCal (.ics) File
            </button>
          </div>
        </div>
      </SettingTopicCard>

      <SettingTopicCard
        title="Google Calendar"
        description="Push your schedule into a dedicated Google Calendar that keeps itself up to date on every device. Uses the same data selection as the iCal export above."
      >
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase font-expanded text-(--text-muted) tracking-wider">
              Calendar
            </span>
            <span className="font-mono text-xs text-(--text-main) bg-(--bg-highlight) px-2.5 py-1 rounded-lg">
              {googleCalendarName}
            </span>
          </div>

          {googleStatus && (
            <p className="text-xs md:text-sm text-(--text-muted) leading-relaxed">
              {googleStatus}
            </p>
          )}

          <div className="flex justify-end pt-2 border-t border-(--border-dim)">
            <button
              onClick={handleGoogleSync}
              disabled={googleBusy}
              className="px-6 py-2.5 rounded-full text-xs font-black uppercase bg-(--accent-base) text-(--text-inverse) transition-all border-0 cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleBusy ? 'Syncing…' : 'Sync to Google Calendar'}
            </button>
          </div>
        </div>
      </SettingTopicCard>
    </>
  );
};
