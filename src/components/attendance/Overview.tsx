import type { DetailedAttendanceCourse } from '../../types/vtop';
import { overallVerdict } from './attendanceView';

export const Overview = ({
  courses,
  isNinePointer,
}: {
  courses: DetailedAttendanceCourse[];
  isNinePointer: boolean;
}) => {
  const verdict = overallVerdict(courses, isNinePointer);
  return (
    <header className="shrink-0 px-4 pt-4 pb-1">
      <p
        role="status"
        className={`text-center text-sm font-medium ${
          verdict.critical ? 'text-(--att-danger)' : 'text-(--text-muted)'
        }`}
      >
        {verdict.text}
      </p>
    </header>
  );
};
