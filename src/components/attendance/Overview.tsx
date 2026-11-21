import { Refresh } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import type { DetailedAttendanceCourse } from '../../types/vtop';
import { overallVerdict } from './attendanceView';
import { M3eIconAction } from './M3eIconAction';

export const Overview = ({
  courses,
  isNinePointer,
  refreshing,
  onRefresh,
}: {
  courses: DetailedAttendanceCourse[];
  isNinePointer: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) => {
  const verdict = overallVerdict(courses, isNinePointer);

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
      <div className="flex justify-end">
        <M3eIconAction
          icon={<Refresh aria-hidden="true" />}
          label={refreshing ? 'Refreshing attendance' : 'Refresh attendance'}
          onClick={onRefresh}
          disabled={refreshing}
        />
      </div>
    </header>
  );
};
