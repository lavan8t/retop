import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VTOPNetwork } from '../utils/network';
import { Error as ErrorIcon } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { Dropdown } from '../components/ui/Dropdown';
import { OfflineNotSynced } from '../components/ui/OfflineNotSynced';
import { GradeBreakdown } from '../components/grades/GradeBreakdown';
import { CourseDetailBody } from '../components/grades/CourseDetailBody';
import {
  GradeCourseRow,
  GRADE_LIST_STYLE,
} from '../components/grades/GradeCourseRow';
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
import {
  M3eButton,
  M3eButtonGroup,
  M3eList,
  M3eListItem,
} from '../components/attendance/m3eTags';

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

  /** Dropdown selection resets the hero to the overall Cgpa. */
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
    ? `${selectedPoint.semShort} · Cgpa`
    : hasPredictions
      ? 'Predicted cgpa'
      : 'Cgpa';
  const heroSubLabel = selectedPoint
    ? selectedPoint.gpa !== null
      ? `Semester gpa ${selectedPoint.gpa.toFixed(2)}`
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
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-(--md-sys-color-surface-container-high) p-3">
        <span className="flex flex-col">
          <span className="text-[11px] text-(--md-sys-color-on-surface-variant)">
            Predicted grade
          </span>
          <span className="text-[11px] text-(--md-sys-color-on-surface-variant)">
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
      <div className="rounded-b-2xl bg-(--md-sys-color-surface-container-low) px-4 pb-4 pt-3 border-t border-(--md-sys-color-outline-variant)">
        {fetchingDetails && !course.assessments ? (
          <div
            className="flex flex-col gap-3 animate-pulse"
            role="status"
            aria-label="Loading course details"
          >
            <div className="h-16 rounded-2xl bg-(--md-sys-color-surface-container-high)" />
            <div className="h-24 rounded-2xl bg-(--md-sys-color-surface-container-high)" />
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
    <div className="h-full flex flex-col bg-transparent text-(--md-sys-color-on-surface) overflow-hidden text-left">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 lg:px-10 xl:px-12 pb-32 text-left">
        <div className="mx-auto w-full max-w-6xl">
          {/* Compact semester picker; reload lives in the app shell. */}
          <div className="mb-3 w-40 shrink-0 sm:w-48">
            <Dropdown
              options={semesters.map((s) => ({
                id: s.id,
                label: formatSemesterShorthand(s.label) || s.label,
              }))}
              value={selectedSem}
              onChange={handleSelectSem}
              placeholder="Select Semester"
            />
          </div>

          {isLoading ? (
            <div
              className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6"
              role="status"
              aria-busy="true"
              aria-label="Loading grades"
            >
              <div className="flex flex-col gap-3 animate-pulse">
                <div className="h-12 rounded-2xl bg-(--md-sys-color-surface-container-high)" />
                <div className="h-64 rounded-3xl bg-(--md-sys-color-surface-container-high)" />
                <div className="h-20 rounded-2xl bg-(--md-sys-color-surface-container-high)" />
                <div className="h-20 rounded-2xl bg-(--md-sys-color-surface-container-high)" />
              </div>
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-24 rounded-3xl bg-(--md-sys-color-surface-container-high)" />
                <div className="h-40 rounded-3xl bg-(--md-sys-color-surface-container-high)" />
              </div>
            </div>
          ) : isError || isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-(--md-sys-color-surface-container-low) px-6 py-16 text-center">
              <ErrorIcon
                className="h-16 w-16 text-(--md-sys-color-primary)"
                aria-hidden="true"
              />
              <h2 className="text-2xl font-bold font-expanded text-(--md-sys-color-on-surface)">
                {isError ? 'Unable to load grades' : 'No Grades Data Found'}
              </h2>
              <p className="max-w-sm text-sm text-(--md-sys-color-on-surface-variant)">
                {isError
                  ? 'Something went wrong while fetching your grades. Use the reload button in the app bar to try again.'
                  : 'Grades for the selected semester are not available yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
              {/* Supporting pane — hero, trend and breakdown stay visible while predicting */}
              <aside className="order-first lg:order-none lg:sticky lg:top-24 flex flex-col gap-4 self-start">
                <div className="rounded-3xl bg-(--md-sys-color-surface-container-low)">
                  <GradeHero
                    value={heroCgpa}
                    label={heroLabel}
                    subLabel={heroSubLabel}
                  />
                </div>
                <div className="rounded-3xl bg-(--md-sys-color-surface-container-low) px-4 py-3">
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
                <M3eButtonGroup
                  variant="connected"
                  size="medium"
                  aria-label="Grade view"
                >
                  <M3eButton
                    toggle
                    value="history"
                    selected={view === 'history'}
                    onClick={() => setView('history')}
                  >
                    History
                  </M3eButton>
                  <M3eButton
                    toggle
                    value="curriculum"
                    selected={view === 'curriculum'}
                    onClick={() => setView('curriculum')}
                  >
                    Curriculum
                  </M3eButton>
                </M3eButtonGroup>

                {view === 'history' ? (
                  <div className="flex flex-col gap-2">
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
                        <div className="flex flex-col gap-px">
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
                          <M3eList style={GRADE_LIST_STYLE}>
                            {sem.courses.map((course, cIdx) => (
                              <M3eListItem key={cIdx}>
                                <span className="min-w-0 flex-1">
                                  <span className="mb-0.5 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] text-(--md-sys-color-on-surface-variant)">
                                      {course.code}
                                    </span>
                                    <span className="rounded-full bg-(--md-sys-color-surface-container-highest) px-1.5 py-0.5 text-[10px] text-(--md-sys-color-on-surface-variant)">
                                      {course.type}
                                    </span>
                                  </span>
                                  <span className="line-clamp-1 text-sm font-medium leading-tight text-(--md-sys-color-on-surface)">
                                    {course.title}
                                  </span>
                                </span>
                                <span
                                  slot="trailing"
                                  className="flex shrink-0 items-center gap-2"
                                >
                                  <span className="text-xs tabular-nums text-(--md-sys-color-on-surface-variant)">
                                    {parseFloat(
                                      course.credits || '0',
                                    ).toString()}{' '}
                                    Cr
                                  </span>
                                  <span
                                    className="text-xl font-bold tabular-nums leading-none"
                                    style={{
                                      color: gradeColorVar(course.grade),
                                    }}
                                  >
                                    {course.grade}
                                  </span>
                                </span>
                              </M3eListItem>
                            ))}
                          </M3eList>
                        </SemesterSection>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {historyData?.curriculum &&
                      historyData.curriculum.length > 0 && (
                        <section className="rounded-3xl bg-(--md-sys-color-surface-container-low) overflow-hidden">
                          <h2 className="px-4 py-3 text-sm font-bold text-(--md-sys-color-on-surface)">
                            Curriculum Details
                          </h2>
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-xs">
                              <thead className="bg-(--md-sys-color-surface-container) text-xs text-(--md-sys-color-on-surface-variant)">
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
                                    className="border-t border-(--md-sys-color-outline-variant)"
                                  >
                                    <td className="p-3 pl-4 font-bold text-(--md-sys-color-on-surface)">
                                      {item.title}
                                    </td>
                                    <td className="p-3 pr-4 text-right font-bold tabular-nums">
                                      <span className="text-(--md-sys-color-primary)">
                                        {item.earned}
                                      </span>
                                      <span className="text-(--md-sys-color-on-surface-variant)">
                                        {' '}
                                        /{' '}
                                      </span>
                                      <span className="text-(--md-sys-color-on-surface-variant)">
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
                      <section className="rounded-3xl bg-(--md-sys-color-surface-container-low) overflow-hidden">
                        <h2 className="px-4 py-3 text-sm font-bold text-(--md-sys-color-on-surface)">
                          Basket Details
                        </h2>
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-xs">
                            <thead className="bg-(--md-sys-color-surface-container) text-xs text-(--md-sys-color-on-surface-variant)">
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
                                  className="border-t border-(--md-sys-color-outline-variant)"
                                >
                                  <td className="p-3 pl-4 font-bold text-(--md-sys-color-on-surface)">
                                    {item.title}
                                  </td>
                                  <td className="p-3 pr-4 text-right font-bold tabular-nums">
                                    <span className="text-(--md-sys-color-primary)">
                                      {item.earned}
                                    </span>
                                    <span className="text-(--md-sys-color-on-surface-variant)">
                                      {' '}
                                      /{' '}
                                    </span>
                                    <span className="text-(--md-sys-color-on-surface-variant)">
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
              '--m3e-dialog-container-color':
                'var(--md-sys-color-surface-container-low)',
              '--m3e-dialog-shape': '28px',
            } as React.CSSProperties
          }
        >
          <span slot="header" className="flex flex-col gap-1">
            <span className="text-base font-bold text-(--md-sys-color-on-surface)">
              {expandedCourse.title}
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-[10px] text-(--md-sys-color-on-surface-variant)">
              <span>{expandedCourse.code}</span>
              <span>{expandedCourse.type}</span>
              {expandedCourse.notIncludedInGpa && <span>Ngcr</span>}
              <span>
                {parseFloat(
                  expandedCourse.c || expandedCourse.credits || '0',
                ).toString()}{' '}
                Cr
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
                <div className="h-16 rounded-2xl bg-(--md-sys-color-surface-container-high)" />
                <div className="h-24 rounded-2xl bg-(--md-sys-color-surface-container-high)" />
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
