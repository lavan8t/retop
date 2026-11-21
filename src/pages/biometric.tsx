import React, { useCallback, useEffect, useState } from 'react';
import {
  Block,
  CalendarMonth,
  Error,
  Fingerprint,
  Search,
  SearchOff,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { VTOPNetwork } from '../utils/network';
import { currentCampus } from '../utils/campus';
import { parseBiometricHistory } from '../parsers/biometric';
import { BiometricPunch } from '../types/vtop';
import { EmptyState } from '../components/EmptyState';
import { M3eButton } from '../components/attendance/m3eTags';
import { ensureM3eComponents } from '../utils/m3e';

interface BiometricPageProps {
  network: VTOPNetwork;
}

type LoadState = 'idle' | 'loading' | 'done' | 'error';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** VTOP expects dd/mm/yyyy; the native date input holds yyyy-mm-dd. */
const toVtopDate = (iso: string) => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
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
  const [date, setDate] = useState(today);
  const [punches, setPunches] = useState<BiometricPunch[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    void ensureM3eComponents();
  }, []);

  const load = useCallback(async () => {
    if (!isAp || !date) return;
    setState('loading');
    setError('');
    try {
      const html = await network.getBiometricHistory(toVtopDate(date));
      setPunches(parseBiometricHistory(html));
      setState('done');
    } catch (e: any) {
      setPunches([]);
      setError(e?.message || 'Could not load the biometric log.');
      setState('error');
    }
  }, [isAp, date, network]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void load();
  };

  const grouped = new Map<string, BiometricPunch[]>();
  for (const punch of punches) {
    const rows = grouped.get(punch.punchDate) ?? [];
    rows.push(punch);
    grouped.set(punch.punchDate, rows);
  }

  return (
    <div className="h-full flex flex-col bg-(--bg-main) text-(--text-main) overflow-hidden text-left">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 lg:px-10 xl:px-12 pt-20 md:pt-24 pb-32">
        <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
          {!isAp ? (
            <EmptyState
              icon={Block}
              msg="Only available on VIT-AP"
              subMsg="The Biometric Log is an AP-campus feature and cannot be used on this campus."
            />
          ) : (
            <>
              <h1 className="text-2xl font-black font-expanded text-(--text-main)">
                Biometric Log
              </h1>

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
                    className="w-full min-h-12 px-4 rounded-2xl bg-(--bg-surface) border border-(--border-dim) text-sm font-bold text-(--text-main) outline-none transition-colors hover:bg-(--bg-highlight) focus-visible:ring-2 focus-visible:ring-(--accent-base)"
                  />
                </div>
                <M3eButton
                  type="button"
                  variant="filled"
                  disabled={state === 'loading' || !date}
                  onClick={() => void load()}
                  className="min-h-12"
                >
                  <Search slot="icon" aria-hidden="true" />
                  {state === 'loading' ? 'Searching…' : 'Search'}
                </M3eButton>
              </form>

              <p
                aria-live="polite"
                className="text-xs font-medium text-(--text-muted) px-1"
              >
                {state === 'loading'
                  ? 'Loading punches…'
                  : state === 'done'
                    ? `${punches.length} punch${punches.length === 1 ? '' : 'es'} on ${toVtopDate(date)}`
                    : 'Dates are sent to VTOP as dd/mm/yyyy.'}
              </p>

              {state === 'error' ? (
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
              ) : state === 'loading' ? (
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
              ) : state === 'done' && punches.length === 0 ? (
                <StateTile
                  icon={SearchOff}
                  title="No punches found"
                  message="No biometric punches were recorded for the selected date."
                  action={
                    <M3eButton variant="tonal" onClick={() => void load()}>
                      Try again
                    </M3eButton>
                  }
                />
              ) : state === 'done' ? (
                <div className="flex flex-col gap-5">
                  <p className="sr-only">
                    {punches.length} biometric punch
                    {punches.length === 1 ? '' : 'es'} on {toVtopDate(date)},
                    grouped by punch date.
                  </p>
                  {Array.from(grouped.entries()).map(([punchDate, rows]) => (
                    <section
                      key={punchDate}
                      className="flex flex-col gap-2"
                      aria-label={`Punches on ${punchDate}`}
                    >
                      <h2 className="text-sm font-bold text-(--text-main) px-1">
                        {punchDate}
                      </h2>
                      <div
                        role="list"
                        aria-label={`Punches on ${punchDate}`}
                        className="flex flex-col gap-px overflow-hidden rounded-2xl"
                      >
                        {rows.map((punch, index) => (
                          <div
                            key={`${punch.punchDate}-${punch.punchTime}-${index}`}
                            role="listitem"
                            className={`flex min-h-12 items-center gap-3 bg-(--bg-surface) px-4 py-2.5 text-left transition-colors hover:bg-(--bg-highlight) ${
                              index === 0 ? 'rounded-t-2xl' : ''
                            } ${index === rows.length - 1 ? 'rounded-b-2xl' : ''}`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold leading-tight text-(--text-main) wrap-break-word">
                                {punch.venue}
                              </span>
                              <span className="mt-0.5 block text-[11px] font-bold text-(--text-muted)">
                                Sl.No {punch.slNo}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-xs font-bold tabular-nums text-(--text-main)">
                                {punch.punchDate}
                              </span>
                              <span className="block text-[10px] font-bold tabular-nums text-(--text-muted)">
                                {punch.punchTime}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <StateTile
                  icon={Fingerprint}
                  title="Biometric Log"
                  message="Pick a date and search to see your punch history."
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiometricPage;
