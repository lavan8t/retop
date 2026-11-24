import React, { useState, useEffect, useMemo, useRef } from 'react';
import { VTOPNetwork } from '../../utils/network';
import { parseGrades } from '../../parsers/grades';
import { formatSemesterShorthand } from '../../utils/formatting';
import { useDataStore } from '../../store/dataStore';

export interface GradeTrendPoint {
  semId: string;
  semLabel: string;
  semShort: string;
  gpa: number | null;
  cgpa: number | null;
  credits: number;
  totalCreditsEarned: number;
  courseCount: number;
  isLatest?: boolean;
  isPredicted?: boolean;
  needsCalculation?: boolean;
}

interface GradeTrendChartProps {
  network: VTOPNetwork;
  semesters: { id: string; label: string; isLatest?: boolean }[];
  selectedSem: string;
  onSelectSem: (semId: string) => void;
  officialCgpa?: string | null;
  officialCredits?: string | number | null;
  predictedGpa?: string | null;
  predictedCgpa?: string | null;
  currentSemGpa?: string | null;
  isPredictedGpa?: boolean;
  /** Lifts the selected point so the hero can show its label/value. */
  onSelectPoint?: (point: GradeTrendPoint) => void;
}

const GRADE_POINTS: Record<string, number> = {
  S: 10,
  A: 9,
  B: 8,
  C: 7,
  D: 6,
  E: 5,
  F: 0,
};

function extractYearAndTerm(
  label: string,
  id: string,
): { startYear: number; termWeight: number; shorthand: string } {
  const clean = label || '';
  const match =
    clean.match(/(?:20)?(\d{2})[-/](?:20)?(\d{2})/) ||
    id.match(/20(\d{2})(\d{2})/);
  const startYear = match ? parseInt(match[1], 10) : 0;

  let termWeight = 1;
  if (/winter|win|ws/i.test(clean) || /win/i.test(id)) termWeight = 2;
  else if (/summer|sum|ss/i.test(clean) || /sum/i.test(id)) termWeight = 3;
  else if (/fall|fs/i.test(clean) || /fall/i.test(id)) termWeight = 1;
  else if (/tri/i.test(clean)) termWeight = 4;

  const shorthand = formatSemesterShorthand(label) || label;
  return { startYear, termWeight, shorthand };
}

export const GradeTrendChart: React.FC<GradeTrendChartProps> = ({
  network,
  semesters,
  selectedSem,
  onSelectSem,
  officialCgpa,
  officialCredits,
  predictedGpa,
  predictedCgpa,
  currentSemGpa,
  isPredictedGpa,
  onSelectPoint,
}) => {
  const [loading, setLoading] = useState(true);
  const [rawHistoryPoints, setRawHistoryPoints] = useState<GradeTrendPoint[]>(
    [],
  );
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const pointRefs = useRef<(SVGGElement | null)[]>([]);

  const regNo =
    useDataStore((s) => s.user?.regNo) ||
    localStorage.getItem('retop_lastAuthId') ||
    '';
  const joinYear = useMemo(() => {
    const authId = network?.authorizedID || regNo;
    const match = authId.trim().match(/^(\d{2})/);
    return match ? parseInt(match[1], 10) : null;
  }, [network?.authorizedID, regNo]);

  useEffect(() => {
    let isCancelled = false;

    const fetchAllGrades = async () => {
      if (!semesters || semesters.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const candidateSems = semesters.filter((sem) => {
        if (!joinYear) return true;
        const { startYear } = extractYearAndTerm(sem.label, sem.id);
        return startYear >= joinYear;
      });

      const sortedSems = [...candidateSems].sort((a, b) => {
        const pA = extractYearAndTerm(a.label, a.id);
        const pB = extractYearAndTerm(b.label, b.id);
        if (pA.startYear !== pB.startYear) {
          return pA.startYear - pB.startYear;
        }
        return pA.termWeight - pB.termWeight;
      });

      const points: GradeTrendPoint[] = [];
      let cumGpaCredits = 0;
      let cumEarnedCredits = 0;
      let cumPoints = 0;

      try {
        const results = await Promise.all(
          sortedSems.map(async (sem) => {
            try {
              const html = await network.getStudentGrades(sem.id);
              const parsed =
                typeof html === 'string' ? parseGrades(html) : html;
              return { sem, parsed };
            } catch (err) {
              return { sem, parsed: null };
            }
          }),
        );

        if (isCancelled) return;

        for (const { sem, parsed } of results) {
          if (!parsed || !parsed.courses || parsed.courses.length === 0)
            continue;

          let semEarnedCredits = 0;
          let semGpaCredits = 0;
          let semGradePoints = 0;
          let gradedCount = 0;

          parsed.courses.forEach((c) => {
            const creditVal = parseFloat(c.c || c.credits || '0');
            const g = (c.grade || '').trim().toUpperCase();

            if (g && g !== 'F' && g !== 'N' && g !== '-') {
              semEarnedCredits += creditVal;
            }

            if (c.notIncludedInGpa) return;

            if (GRADE_POINTS[g] !== undefined) {
              semGpaCredits += creditVal;
              semGradePoints += creditVal * GRADE_POINTS[g];
              gradedCount++;
            }
          });

          let semGpa = 0;
          if (
            parsed.gpa &&
            parsed.gpa !== '0.0' &&
            parsed.gpa !== '0' &&
            !isNaN(parseFloat(parsed.gpa))
          ) {
            semGpa = parseFloat(parsed.gpa);
          } else if (semGpaCredits > 0) {
            semGpa = semGradePoints / semGpaCredits;
          }

          if (gradedCount === 0 && semGpa === 0 && semEarnedCredits === 0)
            continue;

          cumGpaCredits += semGpaCredits;
          cumPoints += semGradePoints;
          cumEarnedCredits += semEarnedCredits;

          const cumCgpa =
            cumGpaCredits > 0 ? cumPoints / cumGpaCredits : semGpa;

          points.push({
            semId: sem.id,
            semLabel: sem.label,
            semShort: formatSemesterShorthand(sem.label) || sem.label,
            gpa: Number(semGpa.toFixed(2)),
            cgpa: Number(cumCgpa.toFixed(2)),
            credits: semEarnedCredits || semGpaCredits,
            totalCreditsEarned: cumEarnedCredits,
            courseCount: parsed.courses.length,
            isLatest: sem.id === semesters[0]?.id,
          });
        }

        // If official Cgpa exists and we have points, calibrate the latest completed point
        if (officialCgpa && points.length > 0) {
          const numOfficial = parseFloat(officialCgpa);
          if (!isNaN(numOfficial) && numOfficial > 0) {
            points[points.length - 1].cgpa = numOfficial;
          }
        }

        setRawHistoryPoints(points);
      } catch (err) {
        console.error('Failed to generate grade trend data:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchAllGrades();

    return () => {
      isCancelled = true;
    };
  }, [network, semesters, joinYear, officialCgpa]);

  // Merge current ongoing semester or predicted grades onto the graph
  const trendPoints: GradeTrendPoint[] = useMemo(() => {
    const latestSem = semesters && semesters.length > 0 ? semesters[0] : null;
    if (!latestSem) return rawHistoryPoints;

    const exists = rawHistoryPoints.some((p) => p.semId === latestSem.id);
    if (exists) {
      return rawHistoryPoints;
    }

    // Latest semester is ongoing, add it as a current / prediction node
    const lastPoint = rawHistoryPoints[rawHistoryPoints.length - 1];
    const prevCgpa = officialCgpa
      ? parseFloat(officialCgpa)
      : lastPoint
        ? lastPoint.cgpa
        : 0;
    const prevCredits = lastPoint ? lastPoint.totalCreditsEarned : 0;

    const hasPrediction = Boolean(predictedGpa || predictedCgpa);
    const calculatedGpa = predictedGpa ? parseFloat(predictedGpa) : null;
    const calculatedCgpa = predictedCgpa ? parseFloat(predictedCgpa) : prevCgpa;

    const currentSemPoint: GradeTrendPoint = {
      semId: latestSem.id,
      semLabel: latestSem.label,
      semShort: formatSemesterShorthand(latestSem.label) || latestSem.label,
      gpa: calculatedGpa,
      cgpa: calculatedCgpa,
      credits: 0,
      totalCreditsEarned: prevCredits,
      courseCount: 0,
      isLatest: true,
      isPredicted: hasPrediction,
      needsCalculation: !hasPrediction,
    };

    return [...rawHistoryPoints, currentSemPoint];
  }, [rawHistoryPoints, semesters, officialCgpa, predictedGpa, predictedCgpa]);

  // Compute straight SVG plotting coords with dynamic dramatic scale
  const chartData = useMemo(() => {
    if (trendPoints.length === 0) return null;

    const padLeft = 32;
    const padRight = 36;
    const padTop = 40;
    const padBottom = 28;
    const width = 600;
    const height = 170;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    const vals: number[] = [];
    trendPoints.forEach((p) => {
      if (p.gpa !== null && p.gpa > 0) vals.push(p.gpa);
      if (p.cgpa !== null && p.cgpa > 0) vals.push(p.cgpa);
    });

    if (vals.length === 0) return null;

    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const diff = maxVal - minVal;

    const padMargin = Math.max(0.08, diff * 0.18);
    let yMin = Math.max(0, Math.floor((minVal - padMargin) * 10) / 10);
    let yMax = Math.min(10, Math.ceil((maxVal + padMargin) * 10) / 10);

    if (yMax - yMin < 0.4) {
      yMin = Math.max(0, Number((minVal - 0.25).toFixed(2)));
      yMax = Math.min(10, Number((maxVal + 0.25).toFixed(2)));
    }

    const yRange = yMax - yMin || 1;

    const getX = (idx: number) => {
      if (trendPoints.length <= 1) return padLeft + plotWidth / 2;
      return padLeft + (idx / (trendPoints.length - 1)) * plotWidth;
    };

    const getY = (val: number | null) => {
      const v = val !== null ? val : minVal;
      const clamped = Math.max(yMin, Math.min(yMax, v));
      return padTop + plotHeight - ((clamped - yMin) / yRange) * plotHeight;
    };

    const cgpaPoints = trendPoints.map((p, i) => ({
      x: getX(i),
      y: getY(p.cgpa),
      point: p,
    }));

    const gpaMap: Record<
      string,
      { x: number; y: number; point: GradeTrendPoint }
    > = {};
    const gpaPoints: { x: number; y: number; point: GradeTrendPoint }[] = [];

    trendPoints.forEach((p, i) => {
      if (p.gpa !== null) {
        const pt = { x: getX(i), y: getY(p.gpa), point: p };
        gpaPoints.push(pt);
        gpaMap[p.semId] = pt;
      }
    });

    const makeStraightPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return '';
      return pts.reduce(
        (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
        '',
      );
    };

    const cgpaPath = makeStraightPath(cgpaPoints);
    const gpaPath = makeStraightPath(gpaPoints);

    const firstX = cgpaPoints[0].x;
    const lastX = cgpaPoints[cgpaPoints.length - 1].x;
    const bottomY = padTop + plotHeight;
    const cgpaAreaPath = `${cgpaPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    // Three subtle gridlines: top, middle, bottom.
    const gridVals = [yMax, (yMax + yMin) / 2, yMin].map((v) =>
      Number(v.toFixed(2)),
    );

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      yMin,
      yMax,
      gridVals,
      cgpaPoints,
      gpaPoints,
      gpaMap,
      cgpaPath,
      gpaPath,
      cgpaAreaPath,
    };
  }, [trendPoints]);

  if (loading) {
    return (
      <div
        className="w-full bg-transparent p-0 text-left"
        role="status"
        aria-busy="true"
        aria-label="Loading grade trend"
      >
        <div className="h-8 bg-(--md-sys-color-surface-container-high) rounded-2xl w-32 mb-3 animate-pulse" />
        <div className="h-28 bg-(--md-sys-color-surface-container-high) rounded-2xl w-full animate-pulse" />
      </div>
    );
  }

  if (!chartData || trendPoints.length === 0) {
    return null;
  }

  const selectPoint = (idx: number) => {
    const point = trendPoints[idx];
    if (!point) return;
    onSelectSem(point.semId);
    onSelectPoint?.(point);
  };

  const handlePointKeyDown = (
    e: React.KeyboardEvent<SVGGElement>,
    idx: number,
  ) => {
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = Math.min(trendPoints.length - 1, idx + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = Math.max(0, idx - 1);
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = trendPoints.length - 1;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectPoint(idx);
      return;
    } else {
      return;
    }
    e.preventDefault();
    pointRefs.current[next]?.focus();
    selectPoint(next);
  };

  const gridLineY = (gridVal: number) =>
    chartData.padTop +
    chartData.height -
    chartData.padTop -
    chartData.padBottom -
    ((gridVal - chartData.yMin) / (chartData.yMax - chartData.yMin)) *
      (chartData.height - chartData.padTop - chartData.padBottom);

  return (
    <div className="w-full bg-transparent p-0 text-left flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between gap-3 text-[11px] text-(--md-sys-color-on-surface-variant)">
        <span>Grade trend</span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span
              aria-hidden="true"
              className="w-4 h-0.5 bg-(--md-sys-color-primary) inline-block"
            />
            Cgpa
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              aria-hidden="true"
              className="w-4 border-t-2 border-dashed border-(--md-sys-color-success) inline-block"
            />
            Gpa
          </span>
        </span>
      </div>

      <div className="relative w-full overflow-visible text-left">
        <svg
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="w-full h-auto overflow-visible select-none"
          style={{ minHeight: '120px', maxHeight: '160px' }}
          role="group"
          aria-label="Cgpa and gpa by semester. Use arrow keys to select a semester."
        >
          <defs>
            <linearGradient id="cgpaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--md-sys-color-primary)"
                stopOpacity="0.2"
              />
              <stop
                offset="100%"
                stopColor="var(--md-sys-color-primary)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {chartData.gridVals.map((gridVal) => {
            const y = gridLineY(gridVal);
            return (
              <g key={gridVal}>
                <line
                  x1={chartData.padLeft}
                  y1={y}
                  x2={chartData.width - chartData.padRight}
                  y2={y}
                  stroke="var(--md-sys-color-outline-variant)"
                  strokeWidth="1"
                />
                <text
                  x={chartData.padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-(--md-sys-color-on-surface-variant) text-[9px] opacity-60"
                >
                  {gridVal}
                </text>
              </g>
            );
          })}

          <path d={chartData.cgpaAreaPath} fill="url(#cgpaGradient)" />

          {/* Gpa — dashed, success semantic role */}
          <path
            d={chartData.gpaPath}
            fill="none"
            stroke="var(--md-sys-color-success)"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="square"
          />

          {/* Cgpa — solid, primary semantic role */}
          <path
            d={chartData.cgpaPath}
            fill="none"
            stroke="var(--md-sys-color-primary)"
            strokeWidth="2.5"
            strokeLinecap="square"
          />

          {chartData.gpaPoints.map((pt, i) => (
            <circle
              key={`gpa-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === i ? 4.5 : 3}
              fill="var(--md-sys-color-success)"
              stroke="var(--md-sys-color-background)"
              strokeWidth="1.5"
            />
          ))}

          {chartData.cgpaPoints.map((pt, i) => {
            const isSelected = pt.point.semId === selectedSem;
            const isHovered = hoveredIdx === i;
            const isNeedsCalc = pt.point.needsCalculation;
            const gpaPt = chartData.gpaMap[pt.point.semId];
            const topY = gpaPt ? Math.min(pt.y, gpaPt.y) : pt.y;
            const colWidth =
              chartData.cgpaPoints.length > 1
                ? (chartData.width - chartData.padLeft - chartData.padRight) /
                  (chartData.cgpaPoints.length - 1)
                : 100;

            return (
              <g
                key={`cgpa-${i}`}
                ref={(el) => {
                  pointRefs.current[i] = el;
                }}
                tabIndex={0}
                role="button"
                aria-label={`${pt.point.semLabel}: Cgpa ${pt.point.cgpa?.toFixed(2) ?? 'not available'}${pt.point.gpa !== null ? `, gpa ${pt.point.gpa.toFixed(2)}` : ''}${isSelected ? ', selected' : ''}`}
                className="cursor-pointer outline-none focus-visible:opacity-80"
                onFocus={() => setHoveredIdx(i)}
                onBlur={() => setHoveredIdx(null)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => selectPoint(i)}
                onKeyDown={(e) => handlePointKeyDown(e, i)}
              >
                <rect
                  x={pt.x - colWidth / 2}
                  y={0}
                  width={colWidth}
                  height={chartData.height}
                  fill="transparent"
                />

                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={chartData.padTop}
                    x2={pt.x}
                    y2={chartData.height - chartData.padBottom}
                    stroke="var(--md-sys-color-on-surface-variant)"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                    opacity="0.3"
                    className="pointer-events-none"
                  />
                )}

                {isNeedsCalc ? (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered || isSelected ? 6.5 : 4.5}
                    fill="var(--md-sys-color-background)"
                    stroke="var(--md-sys-color-primary)"
                    strokeWidth="2"
                    strokeDasharray="2 2"
                  />
                ) : (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered || isSelected ? 6 : 4}
                    fill="var(--md-sys-color-primary)"
                    stroke="var(--md-sys-color-background)"
                    strokeWidth="2"
                  />
                )}

                {isHovered && (
                  <g className="pointer-events-none select-none">
                    {isNeedsCalc ? (
                      <g>
                        <text
                          x={pt.x}
                          y={topY - 24}
                          textAnchor="middle"
                          className="fill-(--md-sys-color-primary) text-[11px] font-medium"
                        >
                          Calculate cgpa
                        </text>
                        <text
                          x={pt.x}
                          y={topY - 12}
                          textAnchor="middle"
                          className="fill-(--md-sys-color-on-surface-variant) text-[8.5px]"
                        >
                          Pick grades below
                        </text>
                      </g>
                    ) : (
                      <g>
                        <text
                          x={pt.x}
                          y={pt.point.gpa !== null ? topY - 34 : topY - 22}
                          textAnchor="middle"
                          className="fill-(--md-sys-color-primary) text-[14px] font-bold"
                        >
                          {pt.point.cgpa?.toFixed(2)}
                          {pt.point.isPredicted ? '*' : ''}
                        </text>
                        {pt.point.gpa !== null && (
                          <text
                            x={pt.x}
                            y={topY - 22}
                            textAnchor="middle"
                            className="fill-(--md-sys-color-success) text-[10px] font-medium"
                          >
                            {pt.point.gpa.toFixed(2)} gpa
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                )}

                <text
                  x={pt.x}
                  y={chartData.height - 8}
                  textAnchor="middle"
                  className={`text-[9.5px] ${
                    isSelected
                      ? 'fill-(--md-sys-color-primary) font-bold'
                      : isHovered
                        ? 'fill-(--md-sys-color-on-surface)'
                        : 'fill-(--md-sys-color-on-surface-variant) opacity-70'
                  }`}
                >
                  {pt.point.semShort}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {currentSemGpa && (
        <p className="text-[11px] text-(--md-sys-color-on-surface-variant) text-left">
          Current semester gpa {currentSemGpa}
          {isPredictedGpa ? ' (predicted)' : ''}
        </p>
      )}
    </div>
  );
};
