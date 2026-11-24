import React, { useState } from 'react';
import { useCourseAttendanceForecast } from '../../hooks/useCourseAttendanceForecast';
import { KeyboardArrowDown } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

interface AttendanceMeterProps {
  courseCode: string;
}

export const AttendanceMeter: React.FC<AttendanceMeterProps> = ({
  courseCode,
}) => {
  const forecast = useCourseAttendanceForecast(courseCode);
  const [isOpen, setIsOpen] = useState(false);

  if (!forecast) return null;

  const {
    status,
    safeSkips,
    requiredToPass,
    classesNeededBeforeExam,
    futureScheduledClasses,
    examName,
  } = forecast;

  let accentColor = 'text-(--md-sys-color-success)';
  let copy = `Safe! Can skip ${safeSkips} class${safeSkips !== 1 ? 'es' : ''}.`;

  if (status === 'WARNING') {
    accentColor = 'text-(--md-sys-color-warning)';
    copy = `Caution! Only ${safeSkips} safe skip${safeSkips !== 1 ? 's' : ''} left.`;
  } else if (status === 'CRITICAL') {
    accentColor = 'text-(--md-sys-color-error)';
    copy =
      safeSkips === 0
        ? `Must attend ${classesNeededBeforeExam || requiredToPass} class${
            (classesNeededBeforeExam || requiredToPass) !== 1 ? 'es' : ''
          } before ${examName || 'exams'}.`
        : `Attend ${requiredToPass} class${requiredToPass !== 1 ? 'es' : ''} to reach 75%.`;
  }

  return (
    <div className="flex flex-col items-center mt-2 w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 group outline-none cursor-pointer"
      >
        <span className={`text-center font-bold text-sm ${accentColor}`}>
          {copy}
        </span>
        <KeyboardArrowDown
          className={`w-4 h-4 ${accentColor} transition-transform duration-fast ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="mt-3 p-4 bg-(--md-sys-color-surface-container)/60 rounded-2xl w-full max-w-sm border-0 flex flex-col gap-3">
          <p className="text-[11px] text-center text-(--md-sys-color-on-surface-variant) font-mono font-bold uppercase tracking-wider">
            {futureScheduledClasses > 0
              ? `${futureScheduledClasses} classes remaining before ${
                  examName || 'Exams'
                }`
              : `Semester Schedule`}
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-(--md-sys-color-outline-variant)/20">
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-mono font-bold text-(--md-sys-color-on-surface-variant) tracking-wider mb-0.5">
                Classes Left
              </span>
              <span className="text-xl font-mono font-black text-(--md-sys-color-on-surface)">
                {futureScheduledClasses}
              </span>
            </div>

            <div className="flex flex-col items-center border-x border-(--md-sys-color-outline-variant)/30">
              <span className="text-[9px] uppercase font-mono font-bold text-(--md-sys-color-on-surface-variant) tracking-wider mb-0.5">
                Safe Skips
              </span>
              <span className="text-xl font-mono font-black text-(--md-sys-color-success)">
                {safeSkips}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-mono font-bold text-(--md-sys-color-on-surface-variant) tracking-wider mb-0.5">
                Needed @ 75%
              </span>
              <span className="text-xl font-mono font-black text-(--md-sys-color-warning)">
                {classesNeededBeforeExam}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
