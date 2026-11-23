import { Face } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Block,
  CalendarMonth,
  Error,
  Fingerprint,
  History,
  Refresh,
  Search,
  SearchOff,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { VTOPNetwork } from '../utils/network';
import { currentCampus } from '../utils/campus';
import {
  groupPunchesByDate,
  parseBiometricHistory,
  summarizePunches,
} from '../parsers/biometric';
import { BiometricPunch } from '../types/vtop';
import { EmptyState } from '../components/EmptyState';
import { M3eButton } from '../components/attendance/m3eTags';
import { ensureM3eComponents } from '../utils/m3e';
import {
  isPastDate,
  readBiometricCache,
  recentPastDates,
  toIsoDate,
  writeBiometricCache,
} from '../utils/biometricCache';

interface BiometricPageProps {
  network: VTOPNetwork;
}

type LoadState = 'idle' | 'loading' | 'done' | 'error';
type HistoryState = 'idle' | 'loading' | 'done';
type Mode = 'search' | 'history';

const HISTORY_DAYS = 30;

const today = () => toIsoDate(new Date());

/** VTOP expects dd/mm/yyyy; the native date input holds yyyy-mm-dd. */
const toVtopDate = (iso: string) => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

const fromVtopDate = (value: string) => {
  const [day, month, year] = value.split('/');
  return `${year}-${month}-${day}`;
};

/** Centered tinted state tile — the grades/attendance empty-and-error pattern. */
const StateTile = ({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-(--bg-surface) px-6 py-16 text-center">
    <Icon className="h-16 w-16 text-(--accent-base)" aria-hidden="true" />
    <h2 className="text-2xl font-bold font-expanded text-(--text-main)">
      {title}
    </h2>
    <p className="max-w-sm text-sm text-(--text-muted)">{message}</p>
    {action}
  </div>
);

export const BiometricPage: React.FC<BiometricPageProps> = ({ network }) => {
  const isAp = currentCampus() === 'vitap';
  const authId =
    network.authorizedID ||
    (typeof localStorage !== 'undefined'
      ? localStorage.getItem('retop_lastAuthId') || ''
      : '');

  const [date, setDate] = useState(today);
  const [punches, setPunches] = useState<BiometricPunch[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState('');

  const [mode, setMode] = useState<Mode>('search');
  const [history, setHistory] = useState<BiometricPunch[]>([]);
  const [historyState, setHistoryState] = useState<HistoryState>('idle');
  const [progress, setProgress] = useState({ fetched: 0, total: 0, failed: 0 });
  const [historyCancelled, setHistoryCancelled] = useState(false);
  const [cachedDays, setCachedDays] = useState<Set<string>>(new Set());
  const [refreshingDate, setRefreshingDate] = useState<string | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    void ensureM3eComponents();
  }, []);

  const markCached = useCallback((day: string) => {
    setCachedDays((prev) => new Set(prev).add(day));
  }, []);

  /** Single-day search: past dates are cache-first, today always goes to VTOP. */
  const load = useCallback(
    async (force = false) => {
      if (!isAp || !date) return;
      setState('loading');
      setError('');
      setMode('search');
      const past = isPastDate(date);
      try {
        if (past && !force) {
          const cached = await readBiometricCache(authId, date);
          if (cached) {
            setPunches(cached);
            markCached(toVtopDate(date));
            setState('done');
            return;
          }
        }
        const parsed = parseBiometricHistory(
          await network.getBiometricHistory(toVtopDate(date)),
        );
        setPunches(parsed);
        if (past) {
          await writeBiometricCache(authId, date, parsed);
          markCached(toVtopDate(date));
        }
        setState('done');
      } catch (e: any) {
        setPunches([]);
        setError(e?.message || 'Could not load the biometric log.');
        setState('error');
      }
    },
    [isAp, date, network, authId, markCached],
  );

  /** Sequential single-day fetches; VTOP only accepts one fromDate per request. */
  const loadPastHistory = useCallback(async () => {
    if (!isAp) return;
    cancelRef.current = false;
    const dates = recentPastDates(HISTORY_DAYS);
    setMode('history');
    setHistory([]);
    setError('');
    setHistoryCancelled(false);
    setHistoryState('loading');
    setCachedDays(new Set());
    setProgress({ fetched: 0, total: dates.length, failed: 0 });

    const collected: BiometricPunch[] = [];
    let failed = 0;
    let fetched = 0;
    for (const iso of dates) {
      if (cancelRef.current) break;
      const day = toVtopDate(iso);
      try {
        const cached = await readBiometricCache(authId, iso);
        const parsed = cached
          ? cached
          : parseBiometricHistory(await network.getBiometricHistory(day));
        if (!cached) await writeBiometricCache(authId, iso, parsed);
        collected.push(...parsed);
        markCached(day);
      } catch {
        failed++;
      }
      fetched++;
      setProgress({ fetched, total: dates.length, failed });
      setHistory([...collected]);
    }
    setHistoryState('done');
  }, [isAp, authId, network, markCached]);

  const cancelHistory = useCallback(() => {
    cancelRef.current = true;
    setHistoryCancelled(true);
  }, []);

  /** Force a fresh fetch for one cached day and replace it in the current view. */
  const refreshDay = useCallback(
    async (day: string) => {
      const iso = fromVtopDate(day);
      if (!isPastDate(iso) || refreshingDate) return;
      setRefreshingDate(day);
      setError('');
      try {
        const parsed = parseBiometricHistory(
          await network.getBiometricHistory(day),
        );
        await writeBiometricCache(authId, iso, parsed);
        markCached(day);
        if (mode === 'history') {
          setHistory((prev) => [
            ...prev.filter((punch) => punch.punchDate !== day),
            ...parsed,
          ]);
        } else {
          setPunches(parsed);
        }
      } catch (e: any) {
        setError(e?.message || `Could not refresh ${day}.`);
      } finally {
        setRefreshingDate(null);
      }
    },
    [network, authId, mode, refreshingDate, markCached],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void load();
  };

  const activePunches = mode === 'history' ? history : punches;
  const groups = useMemo(
    () => groupPunchesByDate(activePunches),
    [activePunches],
  );
  const busy =
    state === 'loading' ||
    historyState === 'loading' ||
    refreshingDate !== null;

  const statusText = (() => {
    if (historyState === 'loading')
      return `Fetched ${progress.fetched} of ${progress.total} days`;
    if (error && state !== 'error') return error;
    if (mode === 'history' && historyState === 'done') {
      const parts = [
        `${history.length} punch${history.length === 1 ? '' : 'es'} from ${progress.fetched} day${progress.fetched === 1 ? '' : 's'}`,
      ];
      if (progress.failed)
        parts.push(
          `${progress.failed} day${progress.failed === 1 ? '' : 's'} failed`,
        );
      if (historyCancelled) parts.push('stopped early');
      return parts.join(' · ');
    }
    if (state === 'loading') return 'Loading punches…';
    if (state === 'done')
      return `${punches.length} punch${punches.length === 1 ? '' : 'es'} on ${toVtopDate(date)}`;
    return '';
  })();

  return (
    <div className="h-full flex flex-col bg-(--bg-main) text-(--text-main) overflow-hidden text-left">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 lg:px-10 xl:px-12 pb-32">
        <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
          {!isAp ? (
            <EmptyState
              icon={Face}
              msg="Only available on VIT-AP"
              subMsg="The Biometric Log is an AP-campus feature and cannot be used on this campus."
            />
          ) : (
            <>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row sm:items-end gap-3"
              >
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <label
                    htmlFor="biometric-date"
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-(--text-muted)"
                  >
                    <CalendarMonth className="w-4 h-4" aria-hidden="true" />
                    Punch date
                  </label>
                  <input
                    id="biometric-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={busy}
                    className="w-full min-h-12 px-4 rounded-2xl bg-(--bg-surface) border border-(--border-dim) text-sm font-bold text-(--text-main) outline-none transition-colors hover:bg-(--bg-highlight) focus-visible:ring-2 focus-visible:ring-(--accent-base) disabled:opacity-60"
                  />
                </div>
                <M3eButton
                  type="button"
                  variant="filled"
                  disabled={busy || !date}
                  onClick={() => void load()}
                  className="min-h-12"
                >
                  <Search slot="icon" aria-hidden="true" />
                  {state === 'loading' && mode === 'search'
                    ? 'Searching…'
                    : 'Search'}
                </M3eButton>
              </form>

              <div className="flex flex-col sm:flex-row gap-3">
                <M3eButton
                  type="button"
                  variant="tonal"
                  disabled={busy}
                  onClick={() => void loadPastHistory()}
                  className="min-h-12 flex-1"
                >
                  <History slot="icon" aria-hidden="true" />
                  {historyState === 'loading'
                    ? 'Loading history…'
                    : `Load past ${HISTORY_DAYS} days`}
                </M3eButton>
                {historyState === 'loading' && (
                  <M3eButton
                    type="button"
                    variant="text"
                    onClick={cancelHistory}
                    className="min-h-12"
                  >
                    Cancel
                  </M3eButton>
                )}
              </div>

              {statusText && (
                <p
                  aria-live="polite"
                  className="text-xs font-medium text-(--text-muted) px-1"
                >
                  {statusText}
                </p>
              )}

              {historyState === 'loading' && (
                <div
                  role="status"
                  aria-busy="true"
                  aria-label="Loading past history"
                  className="h-1.5 w-full overflow-hidden rounded-full bg-(--bg-highlight)"
                >
                  <div
                    className="h-full rounded-full bg-(--accent-base) transition-[width] duration-200 motion-reduce:transition-none"
                    style={{
                      width: `${progress.total ? (progress.fetched / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              )}

              {state === 'error' && mode === 'search' ? (
                <div role="alert">
                  <StateTile
                    icon={Error}
                    title="Unable to load biometric log"
                    message={error}
                    action={
                      <M3eButton variant="filled" onClick={() => void load()}>
                        Retry
                      </M3eButton>
                    }
                  />
                </div>
              ) : (state === 'loading' && mode === 'search') ||
                (historyState === 'loading' && activePunches.length === 0) ? (
                <div
                  className="flex flex-col gap-2"
                  role="status"
                  aria-busy="true"
                  aria-label="Loading punches"
                >
                  <div className="h-8 w-1/3 rounded-xl bg-(--bg-highlight) animate-pulse" />
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-14 rounded-2xl bg-(--bg-highlight) animate-pulse"
                    />
                  ))}
                </div>
              ) : activePunches.length === 0 ? (
                <StateTile
                  icon={SearchOff}
                  title="No punches found"
                  message={
                    mode === 'history'
                      ? `No biometric punches were recorded in the last ${HISTORY_DAYS} days.`
                      : 'No biometric punches were recorded for the selected date.'
                  }
                  action={
                    mode === 'search' ? (
                      <M3eButton variant="tonal" onClick={() => void load()}>
                        Try again
                      </M3eButton>
                    ) : undefined
                  }
                />
              ) : (
                <div className="flex flex-col gap-5">
                  <p className="sr-only">
                    {activePunches.length} biometric punch
                    {activePunches.length === 1 ? '' : 'es'}, grouped by day
                    with the most recent day first.
                  </p>
                  {groups.map((group) => {
                    const summary = summarizePunches(group.punches);
                    const cached = cachedDays.has(group.date);
                    return (
                      <section
                        key={group.date}
                        className="flex flex-col gap-2"
                        aria-label={`Punches on ${group.date}`}
                      >
                        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
                          <h2 className="text-sm font-bold text-(--text-main)">
                            {group.date}
                          </h2>
                          <div className="flex items-center gap-2">
                            {summary.firstIn && (
                              <p className="text-[11px] font-bold text-(--text-muted)">
                                In {summary.firstIn} · Out {summary.lastOut} ·{' '}
                                {summary.count} punch
                                {summary.count === 1 ? '' : 'es'}
                              </p>
                            )}
                            {cached && (
                              <span className="rounded-full bg-(--bg-highlight) px-2 py-0.5 text-[10px] font-bold text-(--text-muted)">
                                Cached
                              </span>
                            )}
                            {cached && (
                              <button
                                type="button"
                                onClick={() => void refreshDay(group.date)}
                                disabled={refreshingDate !== null}
                                aria-label={`Refresh punches for ${group.date}`}
                                className="flex min-h-12 min-w-12 items-center justify-center rounded-full text-(--accent-base) outline-none transition-colors hover:bg-(--bg-highlight) focus-visible:ring-2 focus-visible:ring-(--accent-base) disabled:opacity-50"
                              >
                                <Refresh
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </button>
                            )}
                          </div>
                        </header>
                        <ol className="relative ml-1 flex flex-col border-l border-(--border-dim) pl-5">
                          {group.punches.map((punch, index) => (
                            <li
                              key={`${punch.punchDate}-${punch.punchTime}-${index}`}
                              className="relative flex min-h-12 items-center gap-3 py-2.5"
                            >
                              <span
                                className="absolute -left-[27px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-(--accent-base) ring-4 ring-(--bg-main)"
                                aria-hidden="true"
                              />
                              <span className="w-14 shrink-0 text-xs font-bold tabular-nums text-(--text-main)">
                                {punch.punchTime}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold leading-tight text-(--text-main) wrap-break-word">
                                  {punch.venue}
                                </span>
                                <span className="mt-0.5 block text-[11px] font-bold text-(--text-muted)">
                                  Sl.No {punch.slNo}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ol>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiometricPage;
