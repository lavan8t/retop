import {
  Event,
  Refresh,
  Warning,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import type { DetailedAttendanceCourse } from '../../types/vtop';
import type { AttendanceForecast } from '../../utils/attendanceForecaster';
import { leaveImpact, overallVerdict } from './attendanceView';
import { IconAction } from './IconAction';

export const Overview = ({
  courses,
  forecast,
  total,
  attended,
  isNinePointer,
  refreshing,
  onRefresh,
}: {
  courses: DetailedAttendanceCourse[];
  forecast: AttendanceForecast | null | undefined;
  total: number;
  attended: number;
  isNinePointer: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) => {
  const verdict = overallVerdict(courses, isNinePointer);
  const impact = leaveImpact(forecast, total, attended);

  return (
    <header className="shrink-0 flex flex-col gap-3 px-4 pt-4 pb-3">
      <p
        role="status"
        className={`text-center text-sm font-medium ${
          verdict.critical ? 'text-(--att-danger)' : 'text-(--text-muted)'
        }`}
      >
        {verdict.text}
      </p>

      {impact && (
        <div
          className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
            impact.critical
              ? 'bg-(--att-danger-container) text-(--att-danger)'
              : 'bg-(--bg-primary-container) text-(--text-on-primary-container)'
          }`}
        >
          {impact.critical ? (
            <Warning aria-hidden="true" className="text-xl shrink-0" />
          ) : (
            <Event aria-hidden="true" className="text-xl shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-tight wrap-break-word">
              {impact.title}
            </p>
            <p className="text-xs opacity-80">{impact.dates}</p>
          </div>
          <span className="text-xs font-bold shrink-0">{impact.missed}</span>
        </div>
      )}

      <div className="flex justify-end">
        <IconAction
          icon={<Refresh aria-hidden="true" />}
          label={refreshing ? 'Refreshing attendance' : 'Refresh attendance'}
          onClick={onRefresh}
          disabled={refreshing}
        />
      </div>
    </header>
  );
};
