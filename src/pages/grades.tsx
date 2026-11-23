import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VTOPNetwork } from '../utils/network';
import { Error as ErrorIcon } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { Dropdown } from '../components/ui/Dropdown';
import { OfflineNotSynced } from '../components/ui/OfflineNotSynced';
import { GradeBreakdown } from '../components/grades/GradeBreakdown';
import { CourseDetailBody } from '../components/grades/CourseDetailBody';
import { GradeCourseRow } from '../components/grades/GradeCourseRow';
import { GradeHero } from '../components/grades/GradeHero';
import {
  GradeTrendChart,
  GradeTrendPoint,
} from '../components/grades/GradeTrendChart';
import { SemesterSection } from '../components/grades/SemesterSection';
import {
  gradeColorVar,
  groupHistoryIntoSemesters,
} from '../components/grades/gradeLogic';
import { useGradesData } from '../hooks/useGradesData';
import { formatSemesterShorthand } from '../utils/formatting';
import type { GradeCourse } from '../types/vtop';
import { ensureM3eComponents } from '../utils/m3e';

interface GradesPageProps {
  network: VTOPNetwork;
  semesters: { id: string; label: string }[];
  setSemesters: (sems: { id: string; label: string }[]) => void;
  selectedSem: string;
  setSelectedSem: (sem: string) => void;
}

// The shared m3e.d.ts is deliberately loose and omits a few real element
// props (name/checked/dismissible/style). Local aliases keep those tags typed
// as the untyped custom elements they are without editing the shared file.
const M3eIcon: any = 'm3e-icon';
const M3eSegmentedButton: any = 'm3e-segmented-button';
const M3eButtonSegment: any = 'm3e-button-segment';
const M3eDialog: any = 'm3e-dialog';

const GRADE_OPTIONS = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'N'].map((g) => ({
  id: g,
  label: g,
}));
const NGCR_OPTIONS = ['P', 'F'].map((g) => ({ id: g, label: g }));

/** Wide windows show detail inline; compact windows use the M3E dialog. */
function useIsWide() {
  const [wide, setWide] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = () => setWide(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return wide;
}

export const GradesPage: React.FC<GradesPageProps> = ({
  network,
  semesters,
  setSemesters,
  selectedSem,
  setSelectedSem,
}) => {
  const {
    loading,
    gradesData,
    historyData,
    fetchingGrades,
    expandedCourseId,
    fetchingDetails,
    predictedGrades,
    setPredictedGrades,
    offlineMiss,
    handleToggleDetails,
    predictedGpa,
    predictedCgpa,
  } = useGradesData(
    network,
    semesters,
    setSemesters,
    selectedSem,
    setSelectedSem,
  );

  const isWide = useIsWide();
  const [view, setView] = useState<'history' | 'curriculum'>('history');
  const [selectedPoint, setSelectedPoint] = useState<GradeTrendPoint | null>(
    null,
  );
  const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(
    () => new Set([selectedSem]),
  );
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isLatestSem = Boolean(
    semesters && semesters.length > 0 && semesters[0].id === selectedSem,
  );
  const currentSemGpa =
    gradesData?.gpa && gradesData.gpa !== '0.0' && gradesData.gpa !== '0'
      ? gradesData.gpa
      : isLatestSem
        ? predictedGpa
        : null;
  const isPredictedGpa =
    isLatestSem &&
    (!gradesData?.gpa || gradesData.gpa === '0.0' || gradesData.gpa === '0');
  const hasPredictions = isLatestSem && Object.keys(predictedGrades).length > 0;

  const handleResetPredictions = () => {
    setSelectedPoint(null);
    setPredictedGrades({});
    try {
      if (selectedSem) {
        localStorage.removeItem(`retop_pred_grades_${selectedSem}`);
      }
    } catch {}
  };

  const refreshGrades = () =>
    window.dispatchEvent(new CustomEvent('retop-refresh-grades'));

  /** Dropdown selection resets the hero to the overall CGPA. */
  const handleSelectSem = (id: string) => {
    setSelectedPoint(null);
    setSelectedSem(id);
  };

  useEffect(() => {
    void ensureM3eComponents();
  }, []);

  useEffect(() => {
    if (selectedSem) {
      setExpandedSemesters((prev) => new Set(prev).add(selectedSem));
    }
  }, [selectedSem]);

  const historySemesters = useMemo(
    () => groupHistoryIntoSemesters(historyData?.courses ?? []),
    [historyData],
  );

  const currentSemNumber = Math.max(
    1,
    semesters.findIndex((s) => s.id === selectedSem) + 1,
  );
  const currentTerm =
    formatSemesterShorthand(
      semesters.find((s) => s.id === selectedSem)?.label || '',
    ) || selectedSem;

  const courseKey = (course: GradeCourse) => course.courseId || course.code;
  const currentGradeOf = (course: GradeCourse) => {
    const key = courseKey(course);
    return (
      predictedGrades[key] ||
      predictedGrades[course.courseId] ||
      predictedGrades[course.code] ||
      course.grade ||
      '-'
    );
  };
  const isPredictedOf = (course: GradeCourse) => {
    const key = courseKey(course);
    const value =
      predictedGrades[key] ||
      predictedGrades[course.courseId] ||
      predictedGrades[course.code];
    return Boolean(value && value !== course.grade);
  };

  const heroCgpa = selectedPoint?.cgpa
    ? selectedPoint.cgpa.toFixed(2)
    : hasPredictions && predictedCgpa
      ? predictedCgpa
      : selectedPoint
        ? '0.00'
        : historyData?.cgpa?.cgpa || '0.00';
  const heroLabel = selectedPoint
    ? `${selectedPoint.semShort} · CGPA`
    : hasPredictions
      ? 'Predicted CGPA'
      : 'CGPA';
  const heroSubLabel = selectedPoint
    ? selectedPoint.gpa !== null
      ? `Semester GPA ${selectedPoint.gpa.toFixed(2)}`
      : undefined
    : hasPredictions
      ? 'Based on your predicted grades'
      : historyData?.cgpa
        ? `${historyData.cgpa.creditsEarned} credits earned`
        : undefined;

  const toggleSemester = (key: string) =>
    setExpandedSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleHeaderKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setExpandedSemesters(new Set());
      return;
    }
    let next = index;
    if (e.key === 'ArrowDown')
      next = Math.min(headerRefs.current.length - 1, index + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, index - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = headerRefs.current.length - 1;
    else return;
    e.preventDefault();
    headerRefs.current[next]?.focus();
  };

  const expandedCourse = gradesData?.courses.find(
    (c) => c.courseId === expandedCourseId,
  );
  const dialogOpen = !isWide && Boolean(expandedCourse);

  const renderGradeSelect = (course: GradeCourse) => {
    const key = courseKey(course);
    const grade = course.grade.trim();
    const isEditable =
      isLatestSem && !isPredictedOf(course) && (grade === '' || grade === '-');
    if (!isEditable) return null;
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-(--bg-highlight) p-3">
        <span className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wide text-(--text-muted)">
            Predicted grade
          </span>
          <span className="text-[11px] text-(--text-muted)">
            Updates the summary instantly
          </span>
        </span>
        <Dropdown
          options={course.notIncludedInGpa ? NGCR_OPTIONS : GRADE_OPTIONS}
          value={currentGradeOf(course)}
          onChange={(g) =>
            setPredictedGrades((prev) => ({ ...prev, [key]: g }))
          }
        />
      </div>
    );
  };

  const renderInlineDetail = (course: GradeCourse) => {
    const key = courseKey(course);
    return (
      <div className="rounded-b-2xl bg-(--bg-surface) px-4 pb-4 pt-3 border-t border-(--border-dim)/50">
        {fetchingDetails && !course.assessments ? (
          <div
            className="flex flex-col gap-3 animate-pulse"
            role="status"
            aria-label="Loading course details"
          >
            <div className="h-16 rounded-2xl bg-(--bg-highlight)" />
            <div className="h-24 rounded-2xl bg-(--bg-highlight)" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <CourseDetailBody
              course={course}
              currentGrade={currentGradeOf(course)}
              isPredicted={isPredictedOf(course)}
              network={network}
              selectedSem={selectedSem}
              isLatestSem={isLatestSem}
              onGradePredicted={(g) => {
                setPredictedGrades((prev) => {
                  const next = { ...prev };
                  if (g === null) delete next[key];
                  else next[key] = g;
                  return next;
                });
              }}
              showCalculator
            />
            {renderGradeSelect(course)}
          </div>
        )}
      </div>
    );
  };

  if (offlineMiss) {
    return (
      <div className="h-full pb-32 md:pb-12 text-left">
        <OfflineNotSynced pageName="Grades" />
      </div>
    );
  }

  const isLoading = (loading || fetchingGrades) && !gradesData && !historyData;
  const isError =
    !isLoading && !gradesData && !historyData && semesters.length > 0;
  const isEmpty =
    !isLoading &&
    !isError &&
    !gradesData?.courses.length &&
    !historyData?.courses.length;

  return (
    <div className="h-full flex flex-col bg-transparent text-(--text-main) overflow-hidden text-left">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 lg:px-10 xl:px-12 pb-32 text-left">
        <div className="mx-auto w-full max-w-6xl">
          {/* Semester selector + refresh */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <Dropdown
              options={semesters.map((s) => ({
                id: s.id,
                label: formatSemesterShorthand(s.label) || s.label,
              }))}
              value={selectedSem}
              onChange={handleSelectSem}
              placeholder="Select Semester"
            />
            <div className="flex items-center gap-1">
              <m3e-icon-button
                id={`grades-refresh`}
                aria-label="Refresh grades"
                onClick={refreshGrades}
              >
                <M3eIcon name="refresh" variant="rounded" />
              </m3e-icon-button>
              <m3e-tooltip for={`grades-refresh`}>Refresh grades</m3e-tooltip>
            </div>
          </div>

          {isLoading ? (
            <div
              className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6"
              role="status"
              aria-busy="true"
              aria-label="Loading grades"
            >
              <div className="flex flex-col gap-3 animate-pulse">
                <div className="h-12 rounded-2xl bg-(--bg-highlight)" />
                <div className="h-64 rounded-3xl bg-(--bg-highlight)" />
                <div className="h-20 rounded-2xl bg-(--bg-highlight)" />
                <div className="h-20 rounded-2xl bg-(--bg-highlight)" />
              </div>
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-24 rounded-3xl bg-(--bg-highlight)" />
                <div className="h-40 rounded-3xl bg-(--bg-highlight)" />
              </div>
            </div>
          ) : isError || isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-(--bg-surface) px-6 py-16 text-center">
              <ErrorIcon
                className="h-16 w-16 text-(--accent-base)"
                aria-hidden="true"
              />
              <h2 className="text-2xl font-bold font-expanded text-(--text-main)">
                {isError ? 'Unable to load grades' : 'No Grades Data Found'}
              </h2>
              <p className="max-w-sm text-sm text-(--text-muted)">
                {isError
                  ? 'Something went wrong while fetching your grades. Try again.'
                  : 'Grades for the selected semester are not available yet.'}
              </p>
              <m3e-button variant="filled" onClick={refreshGrades}>
                Retry
              </m3e-button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
              {/* Supporting pane — hero, trend and breakdown stay visible while predicting */}
              <aside className="order-first lg:order-none lg:sticky lg:top-24 flex flex-col gap-4 self-start">
                <div className="rounded-3xl bg-(--bg-surface)">
                  <GradeHero
                    value={heroCgpa}
                    label={heroLabel}
                    subLabel={heroSubLabel}
                  />
                </div>
                <div className="rounded-3xl bg-(--bg-surface) px-4 py-3">
                  <GradeTrendChart
                    network={network}
                    semesters={semesters}
                    selectedSem={selectedSem}
                    onSelectSem={setSelectedSem}
                    officialCgpa={historyData?.cgpa?.cgpa}
                    officialCredits={historyData?.cgpa?.creditsEarned}
                    predictedGpa={predictedGpa}
                    predictedCgpa={predictedCgpa}
                    currentSemGpa={currentSemGpa}
                    isPredictedGpa={isPredictedGpa}
                    onSelectPoint={setSelectedPoint}
                  />
                </div>
                <GradeBreakdown cgpa={historyData?.cgpa ?? null} />
              </aside>

              {/* Main pane */}
              <main className="min-w-0 flex flex-col gap-4">
                <M3eSegmentedButton
                  aria-label="Grade view"
                  onChange={(e: any) =>
                    setView((e.target as any).value as 'history' | 'curriculum')
                  }
                  style={
                    {
                      '--m3e-segmented-button-height': '48px',
                      '--m3e-segmented-button-selected-container-color':
                        'var(--bg-primary-container)',
                      '--m3e-segmented-button-selected-label-text-color':
                        'var(--text-on-primary-container)',
                    } as React.CSSProperties
                  }
                >
                  <M3eButtonSegment
                    value="history"
                    checked={view === 'history'}
                  >
                    History
                  </M3eButtonSegment>
                  <M3eButtonSegment
                    value="curriculum"
                    checked={view === 'curriculum'}
                  >
                    Curriculum
                  </M3eButtonSegment>
                </M3eSegmentedButton>

                {view === 'history' ? (
                  <div className="flex flex-col gap-5">
                    {gradesData && gradesData.courses.length > 0 && (
                      <SemesterSection
                        number={currentSemNumber}
                        term={currentTerm}
                        cgpa={
                          hasPredictions && predictedCgpa
                            ? predictedCgpa
                            : (historyData?.cgpa?.cgpa ?? null)
                        }
                        gpa={currentSemGpa}
                        expanded={expandedSemesters.has(selectedSem)}
                        onToggle={() => toggleSemester(selectedSem)}
                        onHeaderKeyDown={(e) => handleHeaderKeyDown(e, 0)}
                        buttonRef={(el) => {
                          headerRefs.current[0] = el;
                        }}
                        headerId={`grades-sem-header-0`}
                        panelId={`grades-sem-panel-0`}
                        hasPredictions={hasPredictions}
                        onResetPredictions={handleResetPredictions}
                      >
                        <div className="flex flex-col gap-px overflow-hidden">
                          {gradesData.courses.map((course, idx) => {
                            const key = courseKey(course);
                            const isExpanded =
                              expandedCourseId === course.courseId;
                            return (
                              <GradeCourseRow
                                key={key + idx}
                                course={course}
                                currentGrade={currentGradeOf(course)}
                                isPredicted={isPredictedOf(course)}
                                isFirst={idx === 0}
                                isLast={idx === gradesData.courses.length - 1}
                                expanded={isExpanded}
                                onToggle={() => handleToggleDetails(course)}
                                buttonId={`grades-course-${idx}`}
                                panelId={`grades-course-panel-${idx}`}
                              >
                                {isExpanded && renderInlineDetail(course)}
                              </GradeCourseRow>
                            );
                          })}
                        </div>
                      </SemesterSection>
                    )}

                    {historySemesters.map((sem, idx) => {
                      const headerIndex = idx + 1;
                      return (
                        <SemesterSection
                          key={sem.key}
                          number={sem.number + 1}
                          term={sem.term}
                          cgpa={sem.cgpa}
                          gpa={sem.gpa}
                          expanded={expandedSemesters.has(sem.key)}
                          onToggle={() => toggleSemester(sem.key)}
                          onHeaderKeyDown={(e) =>
                            handleHeaderKeyDown(e, headerIndex)
                          }
                          buttonRef={(el) => {
                            headerRefs.current[headerIndex] = el;
                          }}
                          headerId={`grades-sem-header-${headerIndex}`}
                          panelId={`grades-sem-panel-${headerIndex}`}
                        >
                          <div className="flex flex-col gap-px overflow-hidden rounded-2xl">
                            {sem.courses.map((course, cIdx) => (
                              <div
                                key={cIdx}
                                className={`flex min-h-12 items-center gap-3 bg-(--bg-surface) px-4 py-2.5 text-left ${
                                  cIdx === 0 ? 'rounded-t-2xl' : ''
                                } ${cIdx === sem.courses.length - 1 ? 'rounded-b-2xl' : ''}`}
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase text-(--text-muted)">
                                      {course.code}
                                    </span>
                                    <span className="rounded-full bg-(--bg-highlight) px-2 py-0.5 text-[10px] font-bold uppercase text-(--text-muted)">
                                      {course.type}
                                    </span>
                                  </span>
                                  <span className="line-clamp-2 text-sm font-bold leading-tight text-(--text-main)">
                                    {course.title}
                                  </span>
                                </span>
                                <span className="shrink-0 text-xs font-bold tabular-nums text-(--text-muted)">
                                  {parseFloat(course.credits || '0').toString()}{' '}
                                  CR
                                </span>
                                <span
                                  className="shrink-0 text-2xl font-black font-expanded tabular-nums leading-none"
                                  style={{ color: gradeColorVar(course.grade) }}
                                >
                                  {course.grade}
                                </span>
                              </div>
                            ))}
                          </div>
                        </SemesterSection>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {historyData?.curriculum &&
                      historyData.curriculum.length > 0 && (
                        <section className="rounded-3xl bg-(--bg-surface) overflow-hidden">
                          <h2 className="px-4 py-3 text-sm font-bold text-(--text-main)">
                            Curriculum Details
                          </h2>
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-xs">
                              <thead className="bg-(--bg-highlight) text-[10px] font-bold uppercase text-(--text-muted)">
                                <tr>
                                  <th className="p-3 pl-4 text-left">
                                    Distribution
                                  </th>
                                  <th className="p-3 pr-4 text-right">
                                    Earned / Required
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {historyData.curriculum.map((item, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-t border-(--border-dim)/50"
                                  >
                                    <td className="p-3 pl-4 font-bold text-(--text-main)">
                                      {item.title}
                                    </td>
                                    <td className="p-3 pr-4 text-right font-bold tabular-nums">
                                      <span className="text-(--accent-base)">
                                        {item.earned}
                                      </span>
                                      <span className="text-(--text-muted)">
                                        {' '}
                                        /{' '}
                                      </span>
                                      <span className="text-(--text-muted)">
                                        {item.required}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}
                    {historyData?.baskets && historyData.baskets.length > 0 && (
                      <section className="rounded-3xl bg-(--bg-surface) overflow-hidden">
                        <h2 className="px-4 py-3 text-sm font-bold text-(--text-main)">
                          Basket Details
                        </h2>
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-xs">
                            <thead className="bg-(--bg-highlight) text-[10px] font-bold uppercase text-(--text-muted)">
                              <tr>
                                <th className="p-3 pl-4 text-left">Basket</th>
                                <th className="p-3 pr-4 text-right">
                                  Earned / Required
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {historyData.baskets.map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="border-t border-(--border-dim)/50"
                                >
                                  <td className="p-3 pl-4 font-bold text-(--text-main)">
                                    {item.title}
                                  </td>
                                  <td className="p-3 pr-4 text-right font-bold tabular-nums">
                                    <span className="text-(--accent-base)">
                                      {item.earned}
                                    </span>
                                    <span className="text-(--text-muted)">
                                      {' '}
                                      /{' '}
                                    </span>
                                    <span className="text-(--text-muted)">
                                      {item.required}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      </div>

      {/* Compact detail dialog — close button, scrim and Escape handled by M3E */}
      {expandedCourse && dialogOpen && (
        <M3eDialog
          open
          dismissible
          closeLabel="Close course details"
          onClosed={() => handleToggleDetails(expandedCourse)}
          style={
            {
              '--m3e-dialog-container-color': 'var(--bg-surface)',
              '--m3e-dialog-shape': '28px',
            } as React.CSSProperties
          }
        >
          <span slot="header" className="flex flex-col gap-1">
            <span className="text-base font-bold text-(--text-main)">
              {expandedCourse.title}
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase text-(--text-muted)">
              <span>{expandedCourse.code}</span>
              <span>{expandedCourse.type}</span>
              {expandedCourse.notIncludedInGpa && <span>NGCR</span>}
              <span>
                {parseFloat(
                  expandedCourse.c || expandedCourse.credits || '0',
                ).toString()}{' '}
                CR
              </span>
            </span>
          </span>
          <div className="pt-2">
            {fetchingDetails && !expandedCourse.assessments ? (
              <div
                className="flex flex-col gap-3 animate-pulse"
                role="status"
                aria-label="Loading course details"
              >
                <div className="h-16 rounded-2xl bg-(--bg-highlight)" />
                <div className="h-24 rounded-2xl bg-(--bg-highlight)" />
              </div>
            ) : (
              <CourseDetailBody
                course={expandedCourse}
                currentGrade={currentGradeOf(expandedCourse)}
                isPredicted={isPredictedOf(expandedCourse)}
                network={network}
                selectedSem={selectedSem}
                isLatestSem={isLatestSem}
                onGradePredicted={(g) => {
                  const key = courseKey(expandedCourse);
                  setPredictedGrades((prev) => {
                    const next = { ...prev };
                    if (g === null) delete next[key];
                    else next[key] = g;
                    return next;
                  });
                }}
              />
            )}
            <div className="mt-4">{renderGradeSelect(expandedCourse)}</div>
          </div>
        </M3eDialog>
      )}
    </div>
  );
};
