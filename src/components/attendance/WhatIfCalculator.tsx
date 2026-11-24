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
  TONE_TEXT_CLASS,
} from './attendanceView';
import { M3eIconAction } from './M3eIconAction';

const ringStyle = {
  '--m3e-circular-flat-progress-indicator-diameter': '9rem',
  '--m3e-circular-progress-indicator-thickness': '0.75rem',
} as React.CSSProperties;

const Stepper = ({
  label,
  actionLabel,
  labelClass,
  value,
  max,
  onChange,
}: {
  label: string;
  actionLabel: string;
  labelClass: string;
  value: number;
  max: number;
  onChange: (next: number) => void;
}) => (
  <div className="flex flex-col items-center gap-1">
    <span className={`text-xs font-bold ${labelClass}`}>{label}</span>
    <div className="flex items-center justify-center gap-1">
      <M3eIconAction
        variant="tonal"
        icon={<Remove aria-hidden="true" />}
        label={`Decrease ${actionLabel}`}
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
      />
      <span
        className="min-w-8 text-center font-expanded font-black text-xl tabular-nums text-(--md-sys-color-on-surface)"
        aria-live="polite"
        aria-label={`${label}: ${value} classes`}
      >
        {value}
      </span>
      <M3eIconAction
        variant="tonal"
        icon={<Add aria-hidden="true" />}
        label={`Increase ${actionLabel}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      />
    </div>
    <span className="text-[10px] text-(--md-sys-color-on-surface-variant)">
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
  const noClasses = course.total <= 0;
  const tone = noClasses
    ? 'na'
    : attendanceTone(
        projection.percentage,
        isNinePointer,
        projection.conducted,
      );
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
        {noClasses ? (
          <p
            role="status"
            className="text-sm font-bold text-(--md-sys-color-on-surface-variant) text-center"
          >
            No classes conducted yet
          </p>
        ) : (
          <>
            <p
              className="text-sm text-(--md-sys-color-on-surface-variant)"
              aria-live="polite"
            >
              {projection.attended} / {projection.conducted} classes
            </p>
            <div className="relative flex items-center justify-center">
              <div
                style={ringStyle}
                className="flex items-center justify-center"
              >
                <M3eCircularProgressIndicator
                  value={projection.percentage}
                  variant="flat"
                  aria-label={`Projected attendance ${projection.percentage} percent, ${TONE_LABEL[tone]}`}
                ></M3eCircularProgressIndicator>
              </div>
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <span
                  className={`font-expanded font-black text-4xl leading-none tabular-nums ${TONE_TEXT_CLASS[tone]}`}
                >
                  {projection.invalid ? '>100%' : `${projection.percentage}%`}
                </span>
                <span className="text-[10px] font-bold text-(--md-sys-color-on-surface-variant) mt-1">
                  {TONE_LABEL[tone]}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {forecast && !noClasses && (
        <p className="text-sm text-(--md-sys-color-on-surface-variant) text-center">
          {forecastAdvice(forecast)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stepper
          label="Attend"
          actionLabel="Attend"
          labelClass="text-(--md-sys-color-success)"
          value={attendCount}
          max={remainingClasses}
          onChange={setAttendCount}
        />
        <Stepper
          label="Miss"
          actionLabel="Miss"
          labelClass="text-(--md-sys-color-error)"
          value={bunkCount}
          max={remainingClasses}
          onChange={setBunkCount}
        />
      </div>
    </section>
  );
};
