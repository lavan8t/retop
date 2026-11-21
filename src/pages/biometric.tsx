import React, { useCallback, useState } from 'react';
import {
  Block,
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

export const BiometricPage: React.FC<BiometricPageProps> = ({ network }) => {
  const isAp = currentCampus() === 'vitap';
  const [date, setDate] = useState(today);
  const [punches, setPunches] = useState<BiometricPunch[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState('');

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

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar bg-(--bg-main) text-(--text-main) px-4 md:px-6 lg:px-8 pt-20 md:pt-23 lg:pt-25 pb-24">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
        {!isAp ? (
          <EmptyState
            icon={Block}
            msg="Only available on VIT-AP"
            subMsg="The Biometric Log is an AP-campus feature and cannot be used on this campus."
          />
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row sm:items-end gap-3 p-4 rounded-3xl bg-(--bg-surface) border border-(--border-dim)/50"
            >
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <label
                  htmlFor="biometric-date"
                  className="text-xs font-bold text-(--text-muted)"
                >
                  Punch date
                </label>
                <input
                  id="biometric-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-h-12 px-4 rounded-2xl bg-(--bg-main) border border-(--border-dim)/50 text-sm font-medium text-(--text-main) outline-none focus-visible:border-(--accent-base) focus-visible:ring-2 focus-visible:ring-(--accent-base)"
                />
              </div>
              <button
                type="submit"
                disabled={state === 'loading' || !date}
                className="min-h-12 px-6 rounded-2xl border-0 bg-(--accent-base) text-(--text-inverse) text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface) disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                {state === 'loading' ? 'Searching…' : 'Search'}
              </button>
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
              <div
                role="alert"
                className="flex items-center gap-3 p-4 rounded-3xl bg-(--md-sys-color-error-container) text-(--md-sys-color-on-error-container) border border-(--md-sys-color-error)/30"
              >
                <Error className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="text-xs font-bold">{error}</span>
              </div>
            ) : state === 'loading' ? (
              <div className="flex flex-col gap-2 p-4 rounded-3xl bg-(--bg-surface) border border-(--border-dim)/50">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-10 rounded-2xl bg-(--bg-highlight) animate-pulse"
                  />
                ))}
              </div>
            ) : state === 'done' && punches.length === 0 ? (
              <EmptyState
                icon={SearchOff}
                msg="No punches found"
                subMsg="No biometric punches were recorded for the selected date."
              />
            ) : state === 'done' ? (
              <div className="overflow-x-auto rounded-3xl bg-(--bg-surface) border border-(--border-dim)/50">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <caption className="sr-only">
                    Biometric punches for {toVtopDate(date)}
                  </caption>
                  <thead>
                    <tr className="text-(--text-muted) uppercase tracking-wider border-b border-(--border-dim)/50">
                      <th scope="col" className="px-4 py-3 font-bold w-16">
                        Sl.No
                      </th>
                      <th scope="col" className="px-4 py-3 font-bold">
                        Punch Date
                      </th>
                      <th scope="col" className="px-4 py-3 font-bold">
                        Punch Time
                      </th>
                      <th scope="col" className="px-4 py-3 font-bold">
                        Venue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {punches.map((punch, index) => (
                      <tr
                        key={`${punch.punchDate}-${punch.punchTime}-${index}`}
                        className="border-b border-(--border-dim)/30 last:border-0"
                      >
                        <td className="px-4 py-3 font-mono">{punch.slNo}</td>
                        <td className="px-4 py-3 font-mono">
                          {punch.punchDate}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {punch.punchTime}
                        </td>
                        <td className="px-4 py-3 break-words">{punch.venue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Fingerprint}
                msg="Biometric Log"
                subMsg="Pick a date and search to see your punch history."
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BiometricPage;
