import React from "react";
import { SettingTopicCard } from "./SettingTopicCard";

interface SyncSectionProps {
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
  icalOptions,
  setIcalOptions,
  handleExportICal,
}) => {
  return (
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
              <span className="text-xs font-bold text-(--text-main)">Timetable (Classes &amp; Slots)</span>
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
            className="px-6 py-2.5 rounded-full text-xs font-black uppercase bg-(--accent-base) text-(--text-inverse) transition-all border-0 cursor-pointer hover:opacity-90"
          >
            Export iCal (.ics) File
          </button>
        </div>
      </div>
    </SettingTopicCard>
  );
};
