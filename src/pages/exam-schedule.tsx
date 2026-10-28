import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getAppRoot } from '../utils/bridge';
import { VTOPNetwork } from '../utils/network';
import { useDataStore } from '../store/dataStore';
import { useSettingsStore } from '../utils/settings-store';
import { formatDateStr } from '../utils/formatting';
import { EmptyState } from '../components/EmptyState';
import { OfflineNotSynced } from '../components/ui/OfflineNotSynced';
import {
  Event,
  LocationOn,
  Schedule,
  EventSeat,
  Info,
  KeyboardArrowDown,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { ExamEntry } from '../parsers/exam-schedule';
import { Pill } from '../components/ui/Pill';

interface ExamSchedulePageProps {
  network: VTOPNetwork;
}

function parseTimeline(examTimeStr: string, reportingTimeStr: string) {
  let startTime = '';
  let endTime = '';
  let durationText = '';

  if (examTimeStr && examTimeStr.includes('-')) {
    const parts = examTimeStr.split('-').map((s) => s.trim());
    startTime = parts[0];
    endTime = parts[1];
  } else {
    startTime = examTimeStr || '';
  }

  const parseMins = (tStr: string) => {
    if (!tStr) return NaN;
    const clean = tStr.replace(/(AM|PM)/i, '').trim();
    const parts = clean.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return NaN;
      if (tStr.toUpperCase().includes('PM') && h < 12) h += 12;
      if (tStr.toUpperCase().includes('AM') && h === 12) h = 0;
      return h * 60 + m;
    }
    return NaN;
  };

  const startMins = parseMins(startTime);
  const endMins = parseMins(endTime);

  if (!isNaN(startMins) && !isNaN(endMins) && endMins > startMins) {
    const diff = endMins - startMins;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hrs > 0 && mins > 0) durationText = `${hrs}h ${mins}m`;
    else if (hrs > 0) durationText = `${hrs} hr${hrs > 1 ? 's' : ''}`;
    else durationText = `${mins} mins`;
  }

  return {
    reportingTime: reportingTimeStr || 'N/A',
    startTime: startTime || 'TBA',
    endTime: endTime || '',
    durationText,
  };
}

export function parseSeatPosition(
  seatLocation: string = '',
  seatNo: string = '',
): { row: number; col: number; seatNumber: number } | null {
  const combined = `${seatLocation} ${seatNo}`.trim().toUpperCase();

  const rcMatch = combined.match(/R(\d+)\s*C(\d+)/i);
  if (rcMatch) {
    const row = parseInt(rcMatch[1], 10);
    const col = parseInt(rcMatch[2], 10);
    if (row >= 1 && row <= 7 && col >= 1 && col <= 10) {
      const seatNumber = (row - 1) * 10 + col;
      return { row, col, seatNumber };
    }
  }

  const numVal = parseInt(seatNo || seatLocation.replace(/\D/g, ''), 10);
  if (!isNaN(numVal) && numVal >= 1 && numVal <= 70) {
    const row = Math.ceil(numVal / 10);
    const col = ((numVal - 1) % 10) + 1;
    return { row, col, seatNumber: numVal };
  }

  return null;
}

const SeatMapPopoverCard = ({
  entry,
  seatPos,
  visible,
  triggerRef,
}: {
  entry: ExamEntry;
  seatPos: { row: number; col: number; seatNumber: number } | null;
  visible: boolean;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    transformOrigin: string;
  }>({
    top: 0,
    left: 0,
    transformOrigin: 'bottom center',
  });

  useLayoutEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverHeight = 220;
      const popoverWidth = 260;

      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      let top = rect.top - popoverHeight - 8;
      let transformOrigin = 'bottom center';

      if (spaceAbove < popoverHeight && spaceBelow > spaceAbove) {
        top = rect.bottom + 8;
        transformOrigin = 'top center';
      }

      let left = rect.left + rect.width / 2 - popoverWidth / 2;
      if (left < 16) {
        left = 16;
      } else if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - 16 - popoverWidth;
      }

      setCoords({ top, left, transformOrigin });
    }
  }, [visible, triggerRef]);

  if (!visible) return null;

  const rows = [1, 2, 3, 4, 5, 6, 7];
  const colPairs = [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
    [9, 10],
  ];

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        transformOrigin: coords.transformOrigin,
      }}
      className="z-999999 p-3.5 rounded-2xl bg-(--bg-surface) border-2 border-(--border-main) popup-shadow shadow-2xl flex flex-col gap-2.5 w-65 text-(--text-main) pointer-events-none transition-all duration-150 ease-in-out animate-popup-open"
    >
      <div className="w-full text-center py-0.5 rounded bg-(--bg-main) border border-(--border-dim)/40 text-[8px] font-mono font-bold uppercase text-(--text-muted)">
        FRONT / BOARD
      </div>

      <div className="flex flex-col gap-1 w-full my-0.5">
        {rows.map((r) => (
          <div
            key={r}
            className="flex items-center justify-between gap-1 w-full"
          >
            <div className="flex items-center justify-between flex-1 gap-1">
              {colPairs.map((pair, pIdx) => (
                <div key={pIdx} className="flex items-center gap-0.5">
                  {pair.map((c) => {
                    const isUserSeat = seatPos?.row === r && seatPos?.col === c;
                    const seatNum = (r - 1) * 10 + c;

                    return (
                      <div
                        key={c}
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-mono font-bold transition-all ${
                          isUserSeat
                            ? 'bg-(--accent-base) text-(--text-inverse) scale-110 shadow-xs ring-2 ring-(--accent-base)/50 z-10'
                            : 'bg-(--bg-main) border border-(--border-dim)/40 text-transparent'
                        }`}
                      >
                        {isUserSeat ? seatNum : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    getAppRoot() || document.body,
  );
};

const ExamCardM3 = ({
  entry,
  dateFormatPattern,
}: {
  entry: ExamEntry;
  dateFormatPattern: string;
}) => {
  const [showSeatMap, setShowSeatMap] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeline = parseTimeline(entry.examTime, entry.reportingTime);
  const formattedDate = formatDateStr(entry.examDate, dateFormatPattern)
    .replace(/\s*\d{4}$/, '')
    .trim();
  const seatPos = parseSeatPosition(entry.seatLocation, entry.seatNo);

  return (
    <div className="bg-(--bg-surface) hover:bg-(--bg-highlight) border border-(--border-dim)/40 rounded-3xl p-4 md:p-5 shadow-xs transition-colors flex flex-col gap-3.5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Pill variant="accent">{entry.courseCode}</Pill>
            {entry.courseType && <Pill variant="main">{entry.courseType}</Pill>}
            {entry.slot && (
              <Pill variant="main">{entry.slot.replace(/^SLOT:\s*/i, '')}</Pill>
            )}
          </div>
          <h3 className="text-base md:text-lg font-bold text-(--text-main) leading-snug">
            {entry.courseTitle}
          </h3>
        </div>

        {/* Right column: date + venue pill */}
        <div className="flex flex-col items-start sm:items-end shrink-0 gap-1.5">
          <span className="text-sm md:text-base font-black font-mono text-(--text-main)">
            {formattedDate}
          </span>
          <div
            ref={triggerRef}
            onMouseEnter={() => setShowSeatMap(true)}
            onMouseLeave={() => setShowSeatMap(false)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-transparent border border-(--border-dim)/60 text-(--text-main) text-xs font-mono font-bold cursor-pointer hover:bg-(--bg-main) transition-all relative"
          >
            <LocationOn className="w-3.5 h-3.5 text-(--accent-base) shrink-0" />
            <span>{entry.venue || 'Venue TBA'}</span>

            {(entry.seatNo || entry.seatLocation) && (
              <>
                <EventSeat className="w-3.5 h-3.5 text-(--accent-base) shrink-0 ml-0.5" />
                <span className="text-(--accent-base)">
                  Seat #
                  {seatPos?.seatNumber || entry.seatNo || entry.seatLocation}
                </span>
              </>
            )}

            {(seatPos || entry.seatNo) && (
              <SeatMapPopoverCard
                entry={entry}
                seatPos={seatPos}
                visible={showSeatMap}
                triggerRef={triggerRef}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0 w-full">
        {/* Report Time Pill on Left - fully rounded, flush to main pill */}
        <div className="px-3.5 py-2 rounded-full bg-(--bg-main) border border-r-0 border-(--border-dim)/60 text-xs font-mono font-bold flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-(--text-muted) uppercase leading-none mb-0.5">
            Report
          </span>
          <span className="text-(--text-main) leading-none">
            {timeline.reportingTime}
          </span>
        </div>

        {/* Main Exam Timeline Pill */}
        <div className="flex-1 flex items-center justify-between py-2 px-4 rounded-2xl bg-(--bg-main)/60 border border-(--border-dim)/40 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-(--text-muted) uppercase">
              Start
            </span>
            <span className="font-bold text-(--text-main)">
              {timeline.startTime}
            </span>
          </div>

          {timeline.durationText && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-(--bg-surface) border border-(--border-dim)/40 text-[10px] font-bold text-(--text-main)">
              <Schedule className="w-3.5 h-3.5 text-(--accent-base)" />
              {timeline.durationText}
            </div>
          )}

          <div className="flex flex-col text-right">
            <span className="text-[9px] font-bold text-(--text-muted) uppercase">
              End
            </span>
            <span className="font-bold text-(--text-main)">
              {timeline.endTime || 'TBA'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export function getLatestUpcomingExamType(
  groups: { examType: string; entries: ExamEntry[] }[],
): string {
  if (!groups || groups.length === 0) return 'ALL';

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const parseExamDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.replace(/[-/.]/g, ' ').trim();
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d;

    const parts = cleanStr.split(/\s+/);
    if (parts.length >= 3) {
      let day = parseInt(parts[0], 10);
      let year = parseInt(parts[2], 10);
      let monthStr = parts[1].toLowerCase();
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        day = parseInt(parts[2], 10);
      }
      const months = [
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
      ];
      let monthIndex = months.indexOf(monthStr.slice(0, 3));
      if (monthIndex === -1 && !isNaN(parseInt(monthStr, 10))) {
        monthIndex = parseInt(monthStr, 10) - 1;
      }
      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
        return new Date(year, monthIndex, day);
      }
    }
    return null;
  };

  let bestUpcomingGroupType: string | null = null;
  let minUpcomingDiff = Infinity;

  let latestPastGroupType: string | null = null;
  let maxPastTime = -Infinity;

  for (const group of groups) {
    for (const entry of group.entries) {
      const dateObj = parseExamDate(entry.examDate);
      if (!dateObj) continue;

      const time = dateObj.getTime();
      if (time >= now.getTime()) {
        const diff = time - now.getTime();
        if (diff < minUpcomingDiff) {
          minUpcomingDiff = diff;
          bestUpcomingGroupType = group.examType;
        }
      } else {
        if (time > maxPastTime) {
          maxPastTime = time;
          latestPastGroupType = group.examType;
        }
      }
    }
  }

  return (
    bestUpcomingGroupType || latestPastGroupType || groups[0]?.examType || 'ALL'
  );
}

export const ExamSchedulePage: React.FC<ExamSchedulePageProps> = ({
  network,
}) => {
  const {
    examSemesters,
    examGroups,
    examReportingNote,
    examLoading,
    status,
    fetchExamSemesters,
  } = useDataStore();

  const { settings } = useSettingsStore();
  const dateFormatPattern = settings.dateFormat || 'DD Mon YYYY';

  const [selectedExamType, setSelectedExamType] = useState<string>(() =>
    getLatestUpcomingExamType(useDataStore.getState().examGroups),
  );
  const [showDone, setShowDone] = useState(
    () => localStorage.getItem('retop_show_done_exams') === 'true',
  );

  useEffect(() => {
    localStorage.setItem('retop_show_done_exams', String(showDone));
  }, [showDone]);

  useEffect(() => {
    if (examGroups.length > 0) {
      setSelectedExamType(getLatestUpcomingExamType(examGroups));
    }
  }, [examGroups]);

  useEffect(() => {
    if (status !== 'Demo Mode Active' && examSemesters.length === 0) {
      fetchExamSemesters(network);
    }

    const handleRefresh = () => {
      const sem = useDataStore.getState().examSelectedSem;
      if (sem) {
        useDataStore.getState().fetchExamSchedule(network, sem);
      } else {
        useDataStore.getState().fetchExamSemesters(network);
      }
    };
    window.addEventListener('retop-refresh-exams', handleRefresh);
    return () =>
      window.removeEventListener('retop-refresh-exams', handleRefresh);
  }, [status, examSemesters.length, fetchExamSemesters, network]);

  const totalExamCount = examGroups.reduce(
    (acc, grp) => acc + grp.entries.length,
    0,
  );

  const visibleGroups =
    selectedExamType === 'ALL'
      ? examGroups
      : examGroups.filter((grp) => grp.examType === selectedExamType);

  const parseExamDate = (s: string): Date | null => {
    if (!s) return null;
    const c = s.replace(/[-/.]/g, ' ').trim();
    const d = new Date(c);
    if (!isNaN(d.getTime())) return d;
    const parts = c.split(/\s+/);
    if (parts.length >= 3) {
      let day = parseInt(parts[0], 10);
      let year = parseInt(parts[2], 10);
      let monthStr = parts[1].toLowerCase();
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        day = parseInt(parts[2], 10);
      }
      const months = [
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
      ];
      let mi = months.indexOf(monthStr.slice(0, 3));
      if (mi === -1 && !isNaN(parseInt(monthStr, 10)))
        mi = parseInt(monthStr, 10) - 1;
      if (mi >= 0 && !isNaN(day) && !isNaN(year))
        return new Date(year, mi, day);
    }
    return null;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (status === 'Offline - Not Synced') {
    return <OfflineNotSynced pageName="Exam Schedule" />;
  }

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-0 py-0 px-4 md:px-6 lg:px-8 overflow-y-auto lg:overflow-hidden bg-(--bg-main) text-(--text-main) max-w-425 mx-auto relative">
      {/* LEFT COLUMN: Sidebar controls */}
      <div className="w-full lg:w-[27%] xl:w-[24%] flex flex-col shrink-0 h-auto lg:h-full overflow-y-auto custom-scrollbar relative z-40 pt-20 md:pt-23 lg:pt-25 pb-4 md:pb-6 lg:pb-8 pl-4 lg:pl-6 pr-2 lg:pr-3 gap-4">
        {/* Category Buttons List (CAT 1, CAT 2, FAT, All) */}
        {examGroups.length > 0 && (
          <div className="hidden lg:flex flex-col gap-2">
            <button
              onClick={() => setSelectedExamType('ALL')}
              className={`w-full p-4 rounded-3xl flex items-center justify-between gap-3 transition-all cursor-pointer border ${
                selectedExamType === 'ALL'
                  ? 'bg-(--text-main) text-(--bg-main) border-(--text-main)'
                  : 'bg-(--bg-surface)/60 text-(--text-main) border-(--border-dim)/40 hover:bg-(--bg-surface)'
              }`}
            >
              <span className="text-xs md:text-sm font-black font-expanded uppercase truncate">
                All Exams
              </span>
              <span className="text-xs font-mono font-bold shrink-0 px-2 py-0.5 rounded-full bg-current/10">
                {totalExamCount}
              </span>
            </button>

            {examGroups.map((grp) => (
              <button
                key={grp.examType}
                onClick={() => setSelectedExamType(grp.examType)}
                className={`w-full p-4 rounded-3xl flex items-center justify-between gap-3 transition-all cursor-pointer border ${
                  selectedExamType === grp.examType
                    ? 'bg-(--text-main) text-(--bg-main) border-(--text-main)'
                    : 'bg-(--bg-surface)/60 text-(--text-main) border-(--border-dim)/40 hover:bg-(--bg-surface)'
                }`}
              >
                <span className="text-xs md:text-sm font-black font-expanded uppercase truncate">
                  {grp.examType}
                </span>
                <span className="text-xs font-mono font-bold shrink-0 px-2 py-0.5 rounded-full bg-current/10">
                  {grp.entries.length}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Exam Reporting Note */}
        {examReportingNote && (
          <div className="p-4 md:p-5 rounded-3xl bg-(--bg-surface) border border-(--border-dim)/40 text-(--text-main) flex items-start gap-3.5 shadow-xs">
            <Info className="w-6 h-6 text-(--accent-base) shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <h4 className="text-sm md:text-base font-black font-expanded text-(--text-main)">
                Exam Reporting Time
              </h4>
              <p className="text-xs md:text-sm text-(--accent-base) leading-relaxed font-normal">
                {examReportingNote.replace(/^[^:]+:\s*/i, '').trim()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Course Cards */}
      <div className="flex-1 flex flex-col min-w-0 h-auto lg:h-full px-2 md:px-4 lg:px-6">
        <div className="w-full max-w-2xl h-full overflow-y-auto custom-scrollbar pt-20 md:pt-23 lg:pt-25 pb-20 pr-4 border-r border-(--border-dim)/30">
          {/* Mobile Top Category Tabs (lg:hidden) */}
          {examGroups.length > 0 && (
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 mb-4 shrink-0">
              <button
                onClick={() => setSelectedExamType('ALL')}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  selectedExamType === 'ALL'
                    ? 'bg-(--accent-base) text-(--text-inverse) shadow-xs'
                    : 'bg-(--bg-surface) text-(--text-muted) border border-(--border-dim)/60'
                }`}
              >
                All ({totalExamCount})
              </button>
              {examGroups.map((grp) => (
                <button
                  key={grp.examType}
                  onClick={() => setSelectedExamType(grp.examType)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    selectedExamType === grp.examType
                      ? 'bg-(--accent-base) text-(--text-inverse) shadow-xs'
                      : 'bg-(--bg-surface) text-(--text-muted) border border-(--border-dim)/60'
                  }`}
                >
                  {grp.examType} ({grp.entries.length})
                </button>
              ))}
            </div>
          )}

          {examLoading && examGroups.length === 0 ? (
            <div className="flex flex-col gap-1 max-w-2xl">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 rounded-3xl bg-(--bg-surface) border border-(--border-dim)/40 animate-pulse p-6"
                />
              ))}
            </div>
          ) : visibleGroups.length > 0 ? (
            <div className="flex flex-col gap-1 max-w-2xl">
              {(() => {
                const allEntries = visibleGroups.flatMap((group) =>
                  group.entries.map((entry) => ({ group, entry })),
                );
                const doneEntries = allEntries.filter(({ entry }) => {
                  const d = parseExamDate(entry.examDate);
                  return d !== null && d < today;
                });
                const upcomingEntries = allEntries.filter(({ entry }) => {
                  const d = parseExamDate(entry.examDate);
                  return d === null || d >= today;
                });

                const renderCards = (list: typeof allEntries) =>
                  list.flatMap(({ group, entry }, idx) => {
                    const items: React.ReactNode[] = [];
                    if (idx > 0) {
                      const prevEntry = list[idx - 1].entry;
                      const prevDate = parseExamDate(prevEntry.examDate);
                      const currDate = parseExamDate(entry.examDate);
                      if (prevDate && currDate) {
                        const diffDays = Math.round(
                          (currDate.getTime() - prevDate.getTime()) / 86400000,
                        );
                        if (diffDays > 1) {
                          items.push(
                            <div
                              key={`gap-${group.examType}-${idx}`}
                              className="text-xs font-mono text-(--text-muted) text-center py-1"
                            >
                              {diffDays - 1}{' '}
                              {diffDays - 1 === 1 ? 'day' : 'days'} free
                            </div>,
                          );
                        }
                      }
                    }
                    items.push(
                      <ExamCardM3
                        key={`${group.examType}-${idx}-${entry.courseCode}`}
                        entry={entry}
                        dateFormatPattern={dateFormatPattern}
                      />,
                    );
                    return items;
                  });

                return (
                  <>
                    {doneEntries.length > 0 && (
                      <button
                        onClick={() => setShowDone((v) => !v)}
                        className="flex items-center gap-2 text-xs font-mono text-(--text-muted) hover:text-(--text-main) cursor-pointer py-2 group w-full max-w-2xl transition-colors"
                      >
                        <span className="flex-1 h-px bg-(--border-dim)/50 group-hover:bg-(--border-dim)" />
                        <span className="shrink-0 font-bold">
                          {showDone
                            ? 'hide completed exams'
                            : `${doneEntries.length} ${doneEntries.length === 1 ? 'completed exam' : 'completed exams'}`}
                        </span>
                        <KeyboardArrowDown
                          className={`w-4 h-4 shrink-0 transition-transform duration-150 ${showDone ? 'rotate-180' : ''}`}
                        />
                        <span className="flex-1 h-px bg-(--border-dim)/50 group-hover:bg-(--border-dim)" />
                      </button>
                    )}
                    {showDone && renderCards(doneEntries)}
                    {renderCards(upcomingEntries)}
                  </>
                );
              })()}
            </div>
          ) : (
            <EmptyState
              icon={Event}
              msg="No Exams Scheduled"
              subMsg="Could not find any exam schedule entries for the selected category or semester."
            />
          )}
        </div>
      </div>
    </div>
  );
};
