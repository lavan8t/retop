import { useState } from 'react';
import { AppSettings } from '../utils/settings-store';
import { clearCache } from '../utils/cache';
import {
  Palette,
  Sync,
  Tune,
  Info,
  ArrowBack,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

import { downloadICalFile, generateICalFile } from '../utils/ical-export';
import { googleCalendarName } from '../utils/google-calendar';
import { useDataStore } from '../store/dataStore';

import { AppearanceSection } from '../components/settings/AppearanceSection';
import { DefaultsSection } from '../components/settings/DefaultsSection';
import { SyncSection } from '../components/settings/SyncSection';
import { DataStorageSection } from '../components/settings/DataStorageSection';
import { AboutSection } from '../components/settings/AboutSection';

interface SettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
  network?: any;
}

const CATEGORIES = [
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme, accent color, and typography',
    icon: Palette,
  },
  {
    id: 'preferences',
    label: 'Preferences',
    description: 'Timetable, dates, launch view, and privacy',
    icon: Tune,
  },
  {
    id: 'syncData',
    label: 'Sync & Data',
    description: 'Calendar export, Google sync, and storage',
    icon: Sync,
  },
  {
    id: 'about',
    label: 'About',
    description: 'Version, links, and project info',
    icon: Info,
  },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

const COLORS = [
  { id: 'grey', hex: '#71717a', label: 'Monochrome' },
  { id: 'red', hex: '#ef4444', label: 'Red' },
  { id: 'orange', hex: '#f97316', label: 'Orange' },
  { id: 'amber', hex: '#f59e0b', label: 'Amber' },
  { id: 'yellow', hex: '#eab308', label: 'Yellow' },
  { id: 'lime', hex: '#84cc16', label: 'Lime' },
  { id: 'green', hex: '#22c55e', label: 'Green' },
  { id: 'emerald', hex: '#10b981', label: 'Emerald' },
  { id: 'teal', hex: '#14b8a6', label: 'Teal' },
  { id: 'cyan', hex: '#06b6d4', label: 'Cyan' },
  { id: 'sky', hex: '#0ea5e9', label: 'Sky' },
  { id: 'blue', hex: '#3b82f6', label: 'Blue' },
  { id: 'indigo', hex: '#6366f1', label: 'Indigo' },
  { id: 'purple', hex: '#a855f7', label: 'Purple' },
  { id: 'violet', hex: '#8b5cf6', label: 'Violet' },
  { id: 'pink', hex: '#ec4899', label: 'Pink' },
  { id: 'rose', hex: '#f43f5e', label: 'Rose' },
];

export function SettingsPage({ settings, updateSetting }: SettingsPageProps) {
  const [activeCategory, setActiveCategory] =
    useState<CategoryId>('appearance');
  const [mobileSelectedCategory, setMobileSelectedCategory] =
    useState<CategoryId | null>(null);
  const [clearStatus, setClearStatus] = useState<string>('');

  const [icalOptions, setIcalOptions] = useState({
    includeTimetable: true,
    includeCalendar: true,
    includeEvents: true,
    includeExams: true,
  });

  const [googleStatus, setGoogleStatus] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);

  const currentRegNo = (() => {
    const { user } = useDataStore.getState();
    return user?.regNo && user.regNo !== '...' ? user.regNo : '';
  })();

  const handleExportICal = () => {
    const { ttCourses, calGridData, examGroups, events } =
      useDataStore.getState();
    downloadICalFile({
      courses: ttCourses,
      calGridData,
      examGroups,
      events,
      includeTimetable: icalOptions.includeTimetable,
      includeCalendar: icalOptions.includeCalendar,
      includeEvents: icalOptions.includeEvents,
      includeExams: icalOptions.includeExams,
    });
  };

  const handleGoogleSync = async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setGoogleStatus(
        'Google Calendar sync needs the browser extension — it is not available in the offline app.',
      );
      return;
    }
    if (!currentRegNo) {
      setGoogleStatus(
        'Sign in to VTOP first — the calendar is named after your registration number.',
      );
      return;
    }

    setGoogleBusy(true);
    setGoogleStatus('Connecting to Google…');
    try {
      const { ttCourses, calGridData, examGroups, events } =
        useDataStore.getState();
      const ics = generateICalFile({
        courses: ttCourses,
        calGridData,
        examGroups,
        events,
        includeTimetable: icalOptions.includeTimetable,
        includeCalendar: icalOptions.includeCalendar,
        includeEvents: icalOptions.includeEvents,
        includeExams: icalOptions.includeExams,
      });

      setGoogleStatus('Syncing your schedule…');
      const res: any = await chrome.runtime.sendMessage({
        action: 'GOOGLE_CALENDAR_SYNC',
        ics,
        regNo: currentRegNo,
      });

      if (res?.success) {
        setGoogleStatus(
          `Synced ${res.total} events to "${res.calendarName}" — ${res.created} new, ${res.updated} updated, ${res.removed} removed.`,
        );
      } else {
        setGoogleStatus(res?.error || 'Google Calendar sync failed.');
      }
    } catch (e: any) {
      setGoogleStatus(e?.message || String(e));
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleClearAllCache = async () => {
    try {
      const { user } = useDataStore.getState();
      const currentRegNo =
        user?.regNo && user.regNo !== '...' ? user.regNo : undefined;
      await clearCache(currentRegNo);
      setClearStatus('Account cache cleared successfully!');
      setTimeout(() => setClearStatus(''), 3000);
    } catch (e) {
      setClearStatus('Failed to clear account cache.');
    }
  };

  const handleThemeChange = (
    _e: any,
    targetMode: 'light' | 'dark' | 'amoled' | 'auto',
  ) => {
    updateSetting('themeMode', targetMode as any);
  };

  const renderSectionContent = (categoryId: CategoryId) => {
    switch (categoryId) {
      case 'appearance':
        return (
          <AppearanceSection
            settings={settings}
            updateSetting={updateSetting}
            handleThemeChange={handleThemeChange}
            COLORS={COLORS}
          />
        );
      case 'preferences':
        return (
          <DefaultsSection settings={settings} updateSetting={updateSetting} />
        );
      case 'syncData':
        return (
          <>
            <SyncSection
              icalOptions={icalOptions}
              setIcalOptions={setIcalOptions}
              handleExportICal={handleExportICal}
              googleCalendarName={googleCalendarName(currentRegNo)}
              googleStatus={googleStatus}
              googleBusy={googleBusy}
              handleGoogleSync={handleGoogleSync}
            />
            <DataStorageSection
              handleClearAllCache={handleClearAllCache}
              clearStatus={clearStatus}
            />
          </>
        );
      case 'about':
        return <AboutSection />;
      default:
        return null;
    }
  };

  const currentMobileCatObj = CATEGORIES.find(
    (c) => c.id === mobileSelectedCategory,
  );

  return (
    <div className="h-full w-full flex flex-col md:flex-row gap-6 lg:gap-8 py-0 px-4 md:px-6 lg:px-8 overflow-y-auto md:overflow-hidden bg-(--bg-main) text-(--text-main) relative custom-scrollbar">
      {/* MOBILE DRILL-DOWN (< md) */}
      <div className="flex md:hidden flex-col w-full min-h-0 pb-24">
        {!mobileSelectedCategory ? (
          <nav
            aria-label="Settings sections"
            className="flex flex-col gap-1 w-full"
          >
            {CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setMobileSelectedCategory(cat.id);
                  }}
                  className="w-full flex items-center gap-3 min-h-14 px-4 py-3 rounded-2xl text-left text-(--text-main) hover:bg-(--bg-highlight) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) transition-colors cursor-pointer"
                >
                  <CatIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="font-expanded font-semibold text-sm leading-tight">
                      {cat.label}
                    </span>
                    <span className="text-xs text-(--text-muted) leading-snug truncate">
                      {cat.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center gap-2 pb-3 border-b border-(--border-dim)">
              <button
                onClick={() => setMobileSelectedCategory(null)}
                className="min-h-12 min-w-12 p-2 -ml-2 rounded-full hover:bg-(--bg-highlight) text-(--text-main) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) transition-colors flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Back to settings"
              >
                <ArrowBack className="w-5 h-5" aria-hidden="true" />
              </button>
              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="text-base font-expanded font-semibold text-(--text-main) leading-tight truncate">
                  {currentMobileCatObj?.label}
                </h2>
                <span className="text-xs text-(--text-muted) leading-snug truncate">
                  {currentMobileCatObj?.description}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-6 pt-1">
              {renderSectionContent(mobileSelectedCategory)}
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP LIST-DETAIL (>= md) */}
      <div className="hidden md:flex w-full flex-1 flex-row gap-6 lg:gap-8 min-h-0 overflow-hidden h-full">
        <nav
          aria-label="Settings sections"
          className="w-64 lg:w-72 shrink-0 flex flex-col gap-1 h-fit overflow-y-auto scrollbar-none pb-6 pr-1"
        >
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.id}
                aria-current={isSelected ? 'page' : undefined}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 min-h-14 px-4 py-3 rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-(--bg-primary-container) text-(--text-on-primary-container)'
                    : 'text-(--text-main) hover:bg-(--bg-highlight)'
                }`}
              >
                <CatIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span
                    className={`font-expanded text-sm leading-tight ${
                      isSelected ? 'font-bold' : 'font-semibold'
                    }`}
                  >
                    {cat.label}
                  </span>
                  <span
                    className={`text-xs leading-snug truncate ${
                      isSelected ? 'opacity-80' : 'text-(--text-muted)'
                    }`}
                  >
                    {cat.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar pb-24 md:pb-12 pr-2">
          <div className="flex flex-col gap-6 max-w-3xl">
            {renderSectionContent(activeCategory)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
