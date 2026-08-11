import React from "react";
import { AppSettings } from "../../utils/settings-store";
import { SettingTopicCard } from "./SettingTopicCard";
import { MaterialSwitch } from "../MaterialSwitch";

interface SyncSectionProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  isDriveSyncing: boolean;
  driveStatus: string;
  handleDriveBackup: () => void;
  handleDriveRestore: () => void;
  icalOptions: {
    includeTimetable: boolean;
    includeCalendar: boolean;
    includeEvents: boolean;
    includeExams: boolean;
  };
  setIcalOptions: React.Dispatch<React.SetStateAction<{
    includeTimetable: boolean;
    includeCalendar: boolean;
    includeEvents: boolean;
    includeExams: boolean;
  }>>;
  handleExportICal: () => void;
}

export const SyncSection: React.FC<SyncSectionProps> = ({
  settings,
  updateSetting,
  isDriveSyncing,
  driveStatus,
  handleDriveBackup,
  handleDriveRestore,
  icalOptions,
  setIcalOptions,
  handleExportICal,
}) => {
  return (
    <>
      <SettingTopicCard
        title="Google Drive Backup & Restore"
        description="Securely sync settings and preferences to your Google Drive AppData folder"
      >
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-(--text-main)">
                Drive Automatic Sync
              </span>
              <span className="text-xs text-(--text-muted)">
                Auto-sync settings across devices using Google Drive
              </span>
            </div>
            <MaterialSwitch
              selected={settings.driveSync}
              onChange={() => {
                const next = !settings.driveSync;
                updateSetting("driveSync", next);
                if (next) handleDriveBackup();
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            <button
              onClick={handleDriveBackup}
              disabled={isDriveSyncing}
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-2 border-zinc-300 dark:border-zinc-700 transition-all cursor-pointer disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>Sign in with Google
            </button>
            <button
              onClick={handleDriveBackup}
              disabled={isDriveSyncing}
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase bg-(--accent-base) text-(--text-inverse) transition-all border-0 cursor-pointer disabled:opacity-50 hover:opacity-90"
            >
              Backup Now
            </button>
            <button
              onClick={handleDriveRestore}
              disabled={isDriveSyncing}
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase bg-(--bg-main) text-(--text-main) border-2 border-(--border-dim) transition-all cursor-pointer disabled:opacity-50 hover:bg-(--bg-highlight)"
            >
              Restore
            </button>
          </div>

          {driveStatus && (
            <span className="text-xs font-bold text-(--text-muted) mt-1">
              {driveStatus}
            </span>
          )}
        </div>
      </SettingTopicCard>

      <SettingTopicCard
        title="Google Calendar Export"
        description="Synchronize timetable classes directly to Google Calendar"
      >
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-(--text-main)">
              Google Calendar Sync
            </span>
            <span className="text-xs text-(--text-muted)">
              Export scheduled classes as Google Calendar events
            </span>
          </div>
          <MaterialSwitch
            selected={settings.calendarSync}
            onChange={() =>
              updateSetting("calendarSync", !settings.calendarSync)
            }
          />
        </div>
      </SettingTopicCard>

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
                  onChange={(e) => setIcalOptions(prev => ({ ...prev, includeTimetable: e.target.checked }))}
                  className="w-4 h-4 accent-(--accent-base) rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-(--text-main)">Timetable (Classes & Slots)</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-(--bg-main) border border-(--border-dim) cursor-pointer hover:bg-(--bg-highlight) transition-colors">
                <input
                  type="checkbox"
                  checked={icalOptions.includeCalendar}
                  onChange={(e) => setIcalOptions(prev => ({ ...prev, includeCalendar: e.target.checked }))}
                  className="w-4 h-4 accent-(--accent-base) rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-(--text-main)">Academic Calendar</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-(--bg-main) border border-(--border-dim) cursor-pointer hover:bg-(--bg-highlight) transition-colors">
                <input
                  type="checkbox"
                  checked={icalOptions.includeExams}
                  onChange={(e) => setIcalOptions(prev => ({ ...prev, includeExams: e.target.checked }))}
                  className="w-4 h-4 accent-(--accent-base) rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-(--text-main)">Exam Schedules</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-(--bg-main) border border-(--border-dim) cursor-pointer hover:bg-(--bg-highlight) transition-colors">
                <input
                  type="checkbox"
                  checked={icalOptions.includeEvents}
                  onChange={(e) => setIcalOptions(prev => ({ ...prev, includeEvents: e.target.checked }))}
                  className="w-4 h-4 accent-(--accent-base) rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-(--text-main)">University Events</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-(--border-dim)">
            <button
              onClick={handleExportICal}
              className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider bg-(--accent-base) text-(--text-inverse) transition-all border-0 cursor-pointer hover:opacity-90"
            >
              Export iCal (.ics) File
            </button>
          </div>
        </div>
      </SettingTopicCard>
    </>
  );
};
