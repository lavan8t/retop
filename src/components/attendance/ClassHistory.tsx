import { M3eButton, M3eButtonGroup } from './m3eTags';
import { useState, type CSSProperties } from 'react';
import {
  ArrowDownward,
  ArrowUpward,
  ChevronRight,
  GridView,
  KeyboardArrowDown,
  List,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import type { AttendanceRecord } from '../../types/vtop';
import {
  groupRecordsByMonth,
  historyStatusLabel,
  recordStatus,
  type HistoryEntry,
  type RecordStatus,
} from './attendanceView';
import { M3eIconAction } from './M3eIconAction';
import { HOME_ITEM, PAGE_CROSSFADE } from '../../utils/motion';

const STATUS_TEXT: Record<RecordStatus, string> = {
  present: 'text-(--att-safe)',
  absent: 'text-(--att-danger)',
  other: 'text-(--att-warn)',
};

export type TileCategory = 'present' | 'absent' | 'other' | 'upcoming';

/** Android toColorCategory(): upcoming, absent, duty/leave/excused, else attended. */
export const tileCategoryFor = (status: string): TileCategory => {
  const lower = (status || '').toLowerCase();
  if (lower.includes('upcoming')) return 'upcoming';
  if (lower.includes('absent')) return 'absent';
  if (lower.includes('present')) return 'present';
  return 'other';
};

/* Token-only styles: the exact light/dark hexes live in attendance-tiles.css. */
const TILE_STYLES: Record<TileCategory, CSSProperties> = {
  present: {
    backgroundColor: 'var(--att-present-tile)',
    color: 'var(--att-on-present-tile)',
  },
  absent: {
    backgroundColor: 'var(--att-absent-tile)',
    color: 'var(--att-on-absent-tile)',
  },
  other: {
    backgroundColor: 'var(--att-other-tile)',
    color: 'var(--att-on-other-tile)',
  },
  upcoming: {
    backgroundColor: 'var(--att-upcoming-tile)',
    color: 'var(--att-on-upcoming-tile)',
  },
};

export const tileStyleFor = (status: string): CSSProperties =>
  TILE_STYLES[tileCategoryFor(status)];

const slotInfo = (record: AttendanceRecord): string =>
  record.dayTime
    .replace(/\s*(?:-|to)\s*(?:(?!-|to).)*$/i, '')
    .replace(/\//g, ' · ');

const DateTile = ({
  entry,
  status,
}: {
  entry: HistoryEntry;
  status: RecordStatus;
}) => {
  const day = entry.date
    ? entry.date.toLocaleDateString('en-GB', { day: '2-digit' })
    : '--';
  const month = entry.date
    ? entry.date.toLocaleDateString('en-GB', { month: 'short' })
    : '—';
  return (
    <div className="w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center">
      <span className="text-sm font-black leading-none tabular-nums">
        {day}
      </span>
      <span className="text-[10px] uppercase font-bold text-(--text-muted)">
        {month}
      </span>
      <span className={`text-[10px] font-bold ${STATUS_TEXT[status]}`}>
        {historyStatusLabel(entry.record.status)}
      </span>
    </div>
  );
};

/** Android AttendanceTileCell: square, status-tinted, day number only. */
const TileCell = ({ entry }: { entry: HistoryEntry }) => {
  const day = entry.date
    ? entry.date.toLocaleDateString('en-GB', { day: '2-digit' })
    : '--';
  return (
    <div
      className="aspect-square w-11 rounded-xl flex items-center justify-center font-bold text-base tabular-nums"
      style={tileStyleFor(entry.record.status)}
    >
      {day}
    </div>
  );
};

export const ClassHistory = ({
  records,
  sortOrder,
  loading,
  noClasses = false,
  onSortChange,
}: {
  records: AttendanceRecord[] | null;
  sortOrder: 'asc' | 'desc';
  loading: boolean;
  noClasses?: boolean;
  onSortChange: (order: 'asc' | 'desc') => void;
}) => {
  const [view, setView] = useState<'list' | 'tiles'>('list');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const months = records ? groupRecordsByMonth(records, sortOrder) : [];

  const toggleMonth = (key: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="flex flex-col gap-3" aria-label="Class history">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">
          Class history
        </h3>
        <div className="flex items-center gap-1">
          <M3eIconAction
            icon={
              sortOrder === 'desc' ? (
                <ArrowDownward aria-hidden="true" />
              ) : (
                <ArrowUpward aria-hidden="true" />
              )
            }
            label={
              sortOrder === 'desc'
                ? 'Sort newest first, switch to oldest first'
                : 'Sort oldest first, switch to newest first'
            }
            onClick={() => onSortChange(sortOrder === 'desc' ? 'asc' : 'desc')}
          />
          <M3eButtonGroup aria-label="Class history layout">
            <M3eButton
              toggle
              value="list"
              selected={view === 'list'}
              aria-label="List view"
              onClick={() => setView('list')}
            >
              <List slot="icon" aria-hidden="true" />
            </M3eButton>
            <M3eButton
              toggle
              value="tiles"
              selected={view === 'tiles'}
              aria-label="Tiles view"
              onClick={() => setView('tiles')}
            >
              <GridView slot="icon" aria-hidden="true" />
            </M3eButton>
          </M3eButtonGroup>
        </div>
      </div>

      {loading && !records ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-(--bg-highlight) animate-pulse"
            />
          ))}
        </div>
      ) : months.length === 0 ? (
        <p className="text-sm text-(--text-muted) rounded-2xl bg-(--bg-surface) px-4 py-6 text-center">
          {noClasses
            ? 'No classes conducted yet'
            : 'No history records found for this class.'}
        </p>
      ) : (
        months.map((month, monthIndex) => {
          const isCollapsed = collapsed.has(month.key);
          return (
            <div
              key={month.key}
              className={`flex flex-col gap-2 ${HOME_ITEM}`}
              style={{ animationDelay: `${monthIndex * 40}ms` }}
            >
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => toggleMonth(month.key)}
                className="self-start flex items-center gap-2 rounded-full px-2 py-1 text-xs font-bold text-(--text-muted) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) cursor-pointer hover:text-(--text-main)"
              >
                {isCollapsed ? (
                  <ChevronRight aria-hidden="true" />
                ) : (
                  <KeyboardArrowDown aria-hidden="true" />
                )}
                {month.label}
              </button>
              {!isCollapsed &&
                (view === 'list' ? (
                  <ul
                    key={sortOrder}
                    className={`flex flex-col gap-0.5 ${PAGE_CROSSFADE}`}
                  >
                    {month.entries.map((entry, index) => {
                      const status = recordStatus(entry.record.status);
                      return (
                        <li
                          key={`${entry.record.date}-${index}`}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <DateTile entry={entry} status={status} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-(--text-muted) truncate">
                              {slotInfo(entry.record)}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-bold shrink-0 ${STATUS_TEXT[status]}`}
                          >
                            {historyStatusLabel(entry.record.status)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul
                    key={sortOrder}
                    className={`grid grid-cols-7 gap-1 w-fit max-w-full ${PAGE_CROSSFADE}`}
                  >
                    {month.entries.map((entry, index) => {
                      const label = historyStatusLabel(entry.record.status);
                      return (
                        <li
                          key={`${entry.record.date}-${index}`}
                          title={undefined}
                        >
                          <TileCell entry={entry} />
                        </li>
                      );
                    })}
                  </ul>
                ))}
            </div>
          );
        })
      )}
    </section>
  );
};
