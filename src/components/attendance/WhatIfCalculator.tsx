import { M3eButton, M3eCircularProgressIndicator } from './m3eTags';
import { useEffect, useState } from 'react';
import type React from 'react';
import {
  Add,
  Remove,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import type { DetailedAttendanceCourse } from '../../types/vtop';
import { useCourseAttendanceForecast } from '../../hooks/useCourseAttendanceForecast';
import {
  attendanceTone,
  forecastAdvice,
  isLabCourse,
  projectAttendance,
  TONE_LABEL,
  type AttendanceTone,
} from './attendanceView';
import { M3eIconAction } from './M3eIconAction';

const TONE_TEXT: Record<AttendanceTone, string> = {
  na: 'text-(--text-muted)',
  critical: 'text-(--att-danger)',
  warning: 'text-(--att-warn)',
  safe: 'text-(--att-safe)',
  neutral: 'text-(--text-muted)',
};

const ringStyle = {
  '--m3e-circular-flat-progress-indicator-diameter': '9rem',
  '--m3e-circular-progress-indicator-thickness': '0.75rem',
} as React.CSSProperties;

const Stepper = ({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (next: number) => void;
}) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-xs font-bold uppercase text-(--text-muted)">
      {label}
    </span>
    <div className="flex items-center justify-center gap-1">
      <M3eIconAction
        icon={<Remove aria-hidden="true" />}
        label={`Remove one predicted ${label.toLowerCase()} class`}
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
      />
      <span
        className="min-w-8 text-center font-expanded font-black text-xl tabular-nums"
        aria-live="polite"
        aria-label={`${label}: ${value} classes`}
      >
        {value}
      </span>
      <M3eIconAction
        icon={<Add aria-hidden="true" />}
        label={`Add one predicted ${label.toLowerCase()} class`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      />
    </div>
    <span className="text-[10px] text-(--text-muted)">
      Max {max} before exams
    </span>
  </div>
);

export const WhatIfCalculator = ({
  course,
  isNinePointer,
}: {
  course: DetailedAttendanceCourse;
  isNinePointer: boolean;
}) => {
  const forecast = useCourseAttendanceForecast(course.courseCode);
  const [attendCount, setAttendCount] = useState(0);
  const [bunkCount, setBunkCount] = useState(0);

  useEffect(() => {
    setAttendCount(0);
    setBunkCount(0);
  }, [course.courseId, course.classType]);

  const weight = isLabCourse(course) ? 2 : 1;
  const remainingClasses = forecast?.futureScheduledClasses ?? 20;
  const projection = projectAttendance({
    attended: course.attended || 0,
    conducted: course.total || 0,
    attend: attendCount,
    bunk: bunkCount,
    weight,
  });
  const tone = attendanceTone(projection.percentage, isNinePointer);
  const hasChanged = attendCount > 0 || bunkCount > 0;

  const reset = () => {
    setAttendCount(0);
    setBunkCount(0);
  };

  return (
    <section
      className="flex flex-col gap-4"
      aria-label="What-if attendance calculator"
    >
      <div className="flex flex-col items-center gap-2">
        {hasChanged && (
          <div className="self-end -mb-2">
            <M3eButton variant="text" onClick={reset}>
              Reset
            </M3eButton>
          </div>
        )}
        <div className="relative flex items-center justify-center">
          <div style={ringStyle} className="flex items-center justify-center">
            <M3eCircularProgressIndicator
              value={projection.percentage}
              variant="flat"
              aria-label={`Projected attendance ${projection.percentage} percent, ${TONE_LABEL[tone]}`}
            ></M3eCircularProgressIndicator>
          </div>
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <span
              className={`font-expanded font-black text-4xl leading-none tabular-nums ${TONE_TEXT[tone]}`}
            >
              {projection.invalid ? '>100%' : `${projection.percentage}%`}
            </span>
            <span className="text-[10px] font-bold uppercase text-(--text-muted) mt-1">
              {TONE_LABEL[tone]}
            </span>
          </div>
        </div>
        <p className="text-sm text-(--text-muted)" aria-live="polite">
          {projection.attended} / {projection.conducted} classes
        </p>
      </div>

      {forecast && (
        <p className="text-sm text-(--text-muted) text-center">
          {forecastAdvice(forecast)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stepper
          label="Attend"
          value={attendCount}
          max={remainingClasses}
          onChange={setAttendCount}
        />
        <Stepper
          label="Bunk"
          value={bunkCount}
          max={remainingClasses}
          onChange={setBunkCount}
        />
      </div>
    </section>
  );
};
