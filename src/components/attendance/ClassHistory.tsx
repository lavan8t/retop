import { useState } from 'react';
import type React from 'react';
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
  formatRecordDate,
  groupRecordsByMonth,
  parseRecordDate,
  recordStatus,
  type HistoryEntry,
  type RecordStatus,
} from './attendanceView';
import { IconAction } from './IconAction';
import { SegmentedControl } from '../ui/SegmentedControl';

const STATUS_LABEL: Record<RecordStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  other: 'Other',
};

const STATUS_FILL: Record<RecordStatus, React.CSSProperties> = {
  present: { backgroundColor: 'var(--att-safe)' },
  absent: { backgroundColor: 'var(--att-danger)' },
  other: { backgroundColor: 'var(--att-warn)' },
};

const STATUS_TEXT: Record<RecordStatus, string> = {
  present: 'text-(--att-safe)',
  absent: 'text-(--att-danger)',
  other: 'text-(--att-warn)',
};

const STATUS_VALUE: Record<RecordStatus, number> = {
  present: 100,
  absent: 0,
  other: 50,
};

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
    <div className="w-11 h-11 shrink-0 rounded-xl bg-(--bg-highlight) flex flex-col items-center justify-center">
      <span className="text-sm font-black leading-none tabular-nums">
        {day}
      </span>
      <span className="text-[10px] uppercase font-bold text-(--text-muted)">
        {month}
      </span>
      <span className={`text-[10px] font-bold ${STATUS_TEXT[status]}`}>
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
};

export const ClassHistory = ({
  records,
  sortOrder,
  loading,
  onSortChange,
}: {
  records: AttendanceRecord[] | null;
  sortOrder: 'asc' | 'desc';
  loading: boolean;
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
          <IconAction
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
          <SegmentedControl
            ariaLabel="Class history layout"
            value={view}
            onChange={setView}
            options={[
              {
                value: 'list',
                label: (
                  <>
                    <List aria-hidden="true" /> List
                  </>
                ),
              },
              {
                value: 'tiles',
                label: (
                  <>
                    <GridView aria-hidden="true" /> Tiles
                  </>
                ),
              },
            ]}
          />
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
          No history records found for this class.
        </p>
      ) : (
        months.map((month) => {
          const isCollapsed = collapsed.has(month.key);
          return (
            <div key={month.key} className="flex flex-col gap-2">
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
                  <ul className="flex flex-col gap-1.5">
                    {month.entries.map((entry, index) => {
                      const status = recordStatus(entry.record.status);
                      return (
                        <li
                          key={`${entry.record.date}-${index}`}
                          className="flex items-center gap-3 rounded-xl bg-(--bg-surface) px-3 py-2"
                        >
                          <DateTile entry={entry} status={status} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-(--text-muted) truncate">
                              {slotInfo(entry.record)}
                            </p>
                            <div
                              role="progressbar"
                              aria-valuenow={STATUS_VALUE[status]}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${STATUS_LABEL[status]} on ${formatRecordDate(entry.date, entry.record.date)}`}
                              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-(--bg-highlight)"
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${STATUS_VALUE[status]}%`,
                                  ...STATUS_FILL[status],
                                }}
                              />
                            </div>
                          </div>
                          <span
                            className={`text-xs font-bold shrink-0 ${STATUS_TEXT[status]}`}
                          >
                            {STATUS_LABEL[status]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {month.entries.map((entry, index) => {
                      const status = recordStatus(entry.record.status);
                      return (
                        <li
                          key={`${entry.record.date}-${index}`}
                          className={`flex flex-col items-center gap-1 rounded-2xl bg-(--bg-surface) px-2 py-2 border ${STATUS_TEXT[status]}`}
                          aria-label={`${formatRecordDate(parseRecordDate(entry.record.date), entry.record.date)}: ${STATUS_LABEL[status]}`}
                        >
                          <DateTile entry={entry} status={status} />
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
