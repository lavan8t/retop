import { M3eButton, M3eButtonGroup, M3eList, M3eListItem } from './m3eTags';
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
  parseRecordDate,
  recordStatus,
  HISTORY_STATUS_TEXT_CLASS,
  HISTORY_STATUS_FILL_CLASS,
  type HistoryEntry,
} from './attendanceView';
import { M3eIconAction } from './M3eIconAction';
import { HOME_ITEM, PAGE_CROSSFADE } from '../../utils/motion';

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

const FULL_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Android class-history row: full weekday, comma, then the full time. */
const slotInfo = (record: AttendanceRecord): string => {
  const parsed = parseRecordDate(record.date);
  const weekday = parsed
    ? FULL_DAYS[parsed.getDay()]
    : record.dayTime.match(/[A-Za-z]+/)?.[0] || '';
  const parts = record.dayTime.split(/\s*(?:\/|•|-|–|to)\s*/i);
  const time = (
    parts.length > 1 ? parts[parts.length - 1] : record.dayTime
  ).trim();
  return [weekday, time].filter(Boolean).join(', ');
};

/** Filled rounded-square tile: date only, tinted like its status label. */
const DateTile = ({ entry, slot }: { entry: HistoryEntry; slot?: string }) => {
  const day = entry.date
    ? entry.date.toLocaleDateString('en-GB', { day: '2-digit' })
    : '--';
  const status = recordStatus(entry.record.status);
  return (
    <div
      slot={slot}
      className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-sm font-black tabular-nums ${HISTORY_STATUS_FILL_CLASS[status]}`}
    >
      {day}
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
        <h3 className="text-xs font-bold text-(--md-sys-color-on-surface-variant)">
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
          <M3eButtonGroup variant="connected" aria-label="Class history layout">
            <M3eButton
              variant="tonal"
              toggle
              value="list"
              selected={view === 'list'}
              aria-label="List view"
              onClick={() => setView('list')}
            >
              <List slot="icon" aria-hidden="true" />
            </M3eButton>
            <M3eButton
              variant="tonal"
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
              className="h-12 rounded-xl bg-(--md-sys-color-surface-container) animate-pulse"
            />
          ))}
        </div>
      ) : months.length === 0 ? (
        <p className="text-sm text-(--md-sys-color-on-surface-variant) rounded-2xl bg-(--md-sys-color-surface-container) px-4 py-6 text-center">
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
                className="self-start flex items-center gap-2 rounded-full px-2 py-1 text-xs font-bold text-(--md-sys-color-on-surface-variant) outline-none focus-visible:ring-2 focus-visible:ring-(--md-sys-color-primary) cursor-pointer hover:text-(--md-sys-color-on-surface)"
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
                  <M3eList
                    key={sortOrder}
                    variant="segmented"
                    className={PAGE_CROSSFADE}
                  >
                    {month.entries.map((entry, index) => (
                      <M3eListItem key={`${entry.record.date}-${index}`}>
                        <DateTile slot="leading" entry={entry} />
                        <span className="min-w-0 truncate text-(--md-sys-color-on-surface)">
                          {slotInfo(entry.record)}
                        </span>
                        <span
                          slot="trailing"
                          className={`shrink-0 font-bold ${
                            HISTORY_STATUS_TEXT_CLASS[
                              recordStatus(entry.record.status)
                            ]
                          }`}
                        >
                          {historyStatusLabel(entry.record.status)}
                        </span>
                      </M3eListItem>
                    ))}
                  </M3eList>
                ) : (
                  <ul
                    key={sortOrder}
                    className={`grid grid-cols-7 gap-1 w-fit max-w-full ${PAGE_CROSSFADE}`}
                  >
                    {month.entries.map((entry, index) => (
                      <li key={`${entry.record.date}-${index}`}>
                        <TileCell entry={entry} />
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          );
        })
      )}
    </section>
  );
};
