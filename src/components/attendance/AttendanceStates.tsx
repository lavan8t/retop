import { M3eButton, M3eCard } from './m3eTags';
import {
  Error,
  School,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

export const AttendanceLoading = () => (
  <div
    className="h-full w-full bg-(--bg-surface) flex overflow-hidden"
    aria-busy="true"
  >
    <div className="hidden lg:flex flex-1 h-full">
      <div className="w-2/5 shrink-0 flex flex-col gap-2 px-6 pt-4">
        <div className="h-10 w-2/3 rounded-2xl bg-(--bg-highlight) animate-pulse" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl bg-(--bg-highlight) animate-pulse"
          />
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-4 px-8 pt-4 border-l border-(--border-dim)">
        <div className="h-8 w-1/2 rounded-xl bg-(--bg-highlight) animate-pulse" />
        <div className="h-48 w-full rounded-3xl bg-(--bg-highlight) animate-pulse" />
        <div className="h-24 w-full rounded-3xl bg-(--bg-highlight) animate-pulse" />
      </div>
    </div>
    <div className="lg:hidden flex-1 flex flex-col gap-2 px-4 pt-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-20 rounded-2xl bg-(--bg-highlight) animate-pulse"
        />
      ))}
    </div>
  </div>
);

export const AttendanceEmpty = () => (
  <div className="h-full w-full flex items-center justify-center p-6 bg-(--bg-surface)">
    <M3eCard variant="filled" className="max-w-sm w-full">
      <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
        <School
          aria-hidden="true"
          className="w-12 h-12 text-(--text-muted) opacity-50"
        />
        <p className="text-base font-bold text-(--text-main)">
          No attendance data
        </p>
        <p className="text-sm text-(--text-muted)">
          Attendance is not available for the selected semester.
        </p>
      </div>
    </M3eCard>
  </div>
);

export const AttendanceError = ({ onRetry }: { onRetry: () => void }) => (
  <div
    role="alert"
    className="h-full w-full flex items-center justify-center p-6 bg-(--bg-surface)"
  >
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-(--att-danger-container) text-(--att-danger) px-6 py-6 text-center max-w-sm">
      <Error aria-hidden="true" />
      <p className="font-bold">Couldn’t load attendance</p>
      <p className="text-sm">Check your connection and try again.</p>
      <M3eButton variant="tonal" onClick={onRetry}>
        Retry
      </M3eButton>
    </div>
  </div>
);
