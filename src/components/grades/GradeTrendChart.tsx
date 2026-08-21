import React, { useState, useEffect, useMemo } from "react";
import { VTOPNetwork } from "../../utils/network";
import { parseGrades } from "../../parsers/grades";
import { formatSemesterShorthand } from "../../utils/formatting";
import { useDataStore } from "../../store/dataStore";

interface GradeTrendPoint {
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
  hasPredictions?: boolean;
  onResetPredictions?: () => void;
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

function extractYearAndTerm(label: string, id: string): { startYear: number; termWeight: number; shorthand: string } {
  const clean = label || "";
  const match = clean.match(/(?:20)?(\d{2})[-/](?:20)?(\d{2})/) || id.match(/20(\d{2})(\d{2})/);
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
  hasPredictions,
  onResetPredictions,
}) => {
  const [loading, setLoading] = useState(true);
  const [rawHistoryPoints, setRawHistoryPoints] = useState<GradeTrendPoint[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const regNo = useDataStore((s) => s.user?.regNo) || localStorage.getItem("retop_lastAuthId") || "";
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
              const parsed = typeof html === "string" ? parseGrades(html) : html;
              return { sem, parsed };
            } catch (err) {
              return { sem, parsed: null };
            }
          })
        );

        if (isCancelled) return;

        for (const { sem, parsed } of results) {
          if (!parsed || !parsed.courses || parsed.courses.length === 0) continue;

          let semEarnedCredits = 0;
          let semGpaCredits = 0;
          let semGradePoints = 0;
          let gradedCount = 0;

          parsed.courses.forEach((c) => {
            const creditVal = parseFloat(c.c || c.credits || "0");
            const g = (c.grade || "").trim().toUpperCase();

            if (g && g !== "F" && g !== "N" && g !== "-") {
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
          if (parsed.gpa && parsed.gpa !== "0.0" && parsed.gpa !== "0" && !isNaN(parseFloat(parsed.gpa))) {
            semGpa = parseFloat(parsed.gpa);
          } else if (semGpaCredits > 0) {
            semGpa = semGradePoints / semGpaCredits;
          }

          if (gradedCount === 0 && semGpa === 0 && semEarnedCredits === 0) continue;

          cumGpaCredits += semGpaCredits;
          cumPoints += semGradePoints;
          cumEarnedCredits += semEarnedCredits;

          const cumCgpa = cumGpaCredits > 0 ? cumPoints / cumGpaCredits : semGpa;

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

        // If official CGPA exists and we have points, calibrate the latest completed point
        if (officialCgpa && points.length > 0) {
          const numOfficial = parseFloat(officialCgpa);
          if (!isNaN(numOfficial) && numOfficial > 0) {
            points[points.length - 1].cgpa = numOfficial;
          }
        }

        setRawHistoryPoints(points);
      } catch (err) {
        console.error("Failed to generate grade trend data:", err);
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
    const prevCgpa = officialCgpa ? parseFloat(officialCgpa) : lastPoint ? lastPoint.cgpa : 0;
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
    const padTop = 64; // Generous headroom for elevated floating tooltip text
    const padBottom = 28;
    const width = 600;
    const height = 185;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    // Collect all valid values to find tight bounds for dramatic scaling
    const vals: number[] = [];
    trendPoints.forEach((p) => {
      if (p.gpa !== null && p.gpa > 0) vals.push(p.gpa);
      if (p.cgpa !== null && p.cgpa > 0) vals.push(p.cgpa);
    });

    if (vals.length === 0) return null;

    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const diff = maxVal - minVal;

    // Dynamic dramatic range calculation
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

    const gpaMap: Record<string, { x: number; y: number; point: GradeTrendPoint }> = {};
    const gpaPoints: { x: number; y: number; point: GradeTrendPoint }[] = [];

    trendPoints.forEach((p, i) => {
      if (p.gpa !== null) {
        const pt = { x: getX(i), y: getY(p.gpa), point: p };
        gpaPoints.push(pt);
        gpaMap[p.semId] = pt;
      }
    });

    // Generate straight SVG paths (no curves)
    const makeStraightPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return "";
      return pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");
    };

    const cgpaPath = makeStraightPath(cgpaPoints);
    const gpaPath = makeStraightPath(gpaPoints);

    // Closed area for CGPA area gradient with straight lines
    const firstX = cgpaPoints[0].x;
    const lastX = cgpaPoints[cgpaPoints.length - 1].x;
    const bottomY = padTop + plotHeight;
    const cgpaAreaPath = `${cgpaPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    const step = yRange / 3;
    const gridVals = [yMax, yMax - step, yMin + step, yMin].map((v) => Number(v.toFixed(1)));
    const uniqueGridVals = Array.from(new Set(gridVals));

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      yMin,
      yMax,
      uniqueGridVals,
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
      <div className="w-full bg-transparent p-0 text-left">
        <div className="h-12 bg-(--bg-highlight) rounded-2xl w-48 mb-3" />
        <div className="h-28 bg-(--bg-highlight) rounded-2xl w-full" />
      </div>
    );
  }

  if (!chartData || trendPoints.length === 0) {
    return null;
  }

  const rawCompleted = rawHistoryPoints.filter((p) => !p.isPredicted);
  const latestCompleted = rawCompleted[rawCompleted.length - 1];
  const displayCgpa = officialCgpa || (latestCompleted ? latestCompleted.cgpa?.toFixed(2) : "0.00");

  const totalCredits =
    officialCredits !== undefined && officialCredits !== null && !isNaN(parseFloat(String(officialCredits)))
      ? parseFloat(String(officialCredits))
      : latestCompleted
      ? latestCompleted.totalCreditsEarned
      : 0;

  return (
    <div className="w-full bg-transparent p-0 text-left flex flex-col gap-3 shadow-none select-none">
      {/* Header: Merged CGPA, Semester GPA, and Credits in unified area */}
      <div className="flex flex-wrap items-baseline justify-between gap-6 sm:gap-8 w-full text-left">
        {/* Left: CGPA & Semester GPA */}
        <div className="flex flex-wrap items-baseline gap-6 sm:gap-8 text-left">
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-black font-expanded uppercase tracking-wider text-(--text-muted) text-left">
              CGPA
            </span>
            <div className="flex items-baseline gap-3 text-left">
              <span className="text-5xl sm:text-6xl font-black font-expanded text-(--text-main) tracking-tight leading-none text-left">
                {displayCgpa}
              </span>
              {predictedCgpa && (
                <span className="text-2xl sm:text-3xl font-black font-expanded text-(--accent-base) flex items-center gap-1">
                  <span className="text-sm text-(--text-muted)">→</span>
                  {predictedCgpa}
                  <sup className="text-sm font-black text-(--accent-base)">*</sup>
                </span>
              )}
            </div>
          </div>

          {/* Semester GPA */}
          {currentSemGpa && (
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-black font-expanded uppercase tracking-wider text-(--text-muted) text-left flex items-center gap-1">
                Semester GPA
                {isPredictedGpa && <span className="text-emerald-500 font-black">*</span>}
              </span>
              <span className="text-3xl sm:text-4xl font-black font-expanded text-emerald-500 tracking-tight leading-none text-left">
                {currentSemGpa}
                {isPredictedGpa && <sup className="text-sm font-black text-emerald-500 ml-0.5">*</sup>}
              </span>
            </div>
          )}
        </div>

        {/* Right: Credits Earned pushed to right side */}
        {totalCredits > 0 && (
          <div className="flex flex-col items-end text-right ml-auto">
            <span className="text-[11px] font-black font-expanded uppercase tracking-wider text-(--text-muted) text-right">
              Credits Earned
            </span>
            <span className="text-3xl sm:text-4xl font-black font-expanded text-(--text-main) tracking-tight leading-none text-right">
              {totalCredits}
            </span>
          </div>
        )}
      </div>

      {/* Responsive SVG Chart with Original Clean Aspect Ratio & Full Interactivity */}
      <div className="relative w-full overflow-visible my-1 text-left">
        <svg
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="w-full h-auto overflow-visible select-none"
          style={{ minHeight: "140px", maxHeight: "175px" }}
        >
          <defs>
            <linearGradient id="cgpaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-base)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--accent-base)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Dynamic Dramatic Grid lines */}
          {chartData.uniqueGridVals.map((gridVal) => {
            const y =
              chartData.padTop +
              chartData.height -
              chartData.padTop -
              chartData.padBottom -
              ((gridVal - chartData.yMin) / (chartData.yMax - chartData.yMin)) *
                (chartData.height - chartData.padTop - chartData.padBottom);
            return (
              <g key={gridVal}>
                <line
                  x1={chartData.padLeft}
                  y1={y}
                  x2={chartData.width - chartData.padRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-(--border-dim)/30"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={chartData.padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-(--text-muted) text-[9px] font-bold opacity-50"
                >
                  {gridVal}
                </text>
              </g>
            );
          })}

          {/* CGPA Area Gradient */}
          <path d={chartData.cgpaAreaPath} fill="url(#cgpaGradient)" />

          {/* GPA Line (Straight, Dashed Emerald) */}
          <path
            d={chartData.gpaPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />

          {/* CGPA Line (Straight, Solid Accent) */}
          <path
            d={chartData.cgpaPath}
            fill="none"
            stroke="var(--accent-base)"
            strokeWidth="2.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />

          {/* GPA Data Points */}
          {chartData.gpaPoints.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <circle
                key={`gpa-${i}`}
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 4.5 : 3}
                fill="#10b981"
                stroke="var(--bg-main)"
                strokeWidth="1.5"
              />
            );
          })}

          {/* CGPA Data Points, SVG-Locked Tooltip Text & Interactive Hit Targets */}
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
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectSem(pt.point.semId)}
              >
                {/* Generous Column Hitbox (Full vertical height strip) */}
                <rect
                  x={pt.x - colWidth / 2}
                  y={0}
                  width={colWidth}
                  height={chartData.height}
                  fill="transparent"
                />

                {/* Subtle vertical hover guide */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={chartData.padTop}
                    x2={pt.x}
                    y2={chartData.height - chartData.padBottom}
                    stroke="var(--text-muted)"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                    opacity="0.3"
                    className="pointer-events-none"
                  />
                )}

                {isNeedsCalc ? (
                  // Distinct dashed prediction node
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered || isSelected ? 6.5 : 4.5}
                    fill="var(--bg-main)"
                    stroke="var(--accent-base)"
                    strokeWidth="2"
                    strokeDasharray="2 2"
                  />
                ) : (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered || isSelected ? 6 : 4}
                    fill="var(--accent-base)"
                    stroke="var(--bg-main)"
                    strokeWidth="2"
                  />
                )}

                {/* SVG-Locked Exact Tooltip Float with Animation and Increased Vertical Gap */}
                {isHovered && (
                  <g className="animate-retop-tooltip pointer-events-none select-none">
                    {isNeedsCalc ? (
                      <g>
                        <text
                          x={pt.x}
                          y={topY - 32}
                          textAnchor="middle"
                          className="fill-(--accent-base) text-[11px] font-expanded font-black drop-shadow-sm"
                        >
                          Calculate CGPA
                        </text>
                        <text
                          x={pt.x}
                          y={topY - 18}
                          textAnchor="middle"
                          className="fill-(--text-muted) text-[8.5px] font-bold"
                        >
                          Tap to pick grades
                        </text>
                      </g>
                    ) : (
                      <g>
                        {/* 1. Big CGPA */}
                        <text
                          x={pt.x}
                          y={pt.point.gpa !== null ? topY - 46 : topY - 30}
                          textAnchor="middle"
                          className="fill-(--accent-base) text-[15px] font-expanded font-black tracking-tight"
                        >
                          {pt.point.cgpa?.toFixed(2)}
                          {pt.point.isPredicted ? "*" : ""}
                        </text>

                        {/* 2. SGPA */}
                        {pt.point.gpa !== null && (
                          <text
                            x={pt.x}
                            y={topY - 31}
                            textAnchor="middle"
                            className="fill-emerald-500 text-[10px] font-bold"
                          >
                            {pt.point.gpa.toFixed(2)} SGPA
                          </text>
                        )}

                        {/* 3. Credits */}
                        {pt.point.credits > 0 && (
                          <text
                            x={pt.x}
                            y={topY - 17}
                            textAnchor="middle"
                            className="fill-(--text-muted) text-[8.5px] font-bold opacity-80"
                          >
                            {pt.point.credits} Cr
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                )}

                {/* X-axis label */}
                <text
                  x={pt.x}
                  y={chartData.height - 8}
                  textAnchor="middle"
                  className={`text-[9.5px] font-bold ${
                    isSelected
                      ? "fill-(--accent-base) font-black"
                      : isHovered
                      ? "fill-(--text-main)"
                      : "fill-(--text-muted) opacity-80"
                  }`}
                >
                  {pt.point.semShort}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Reset Predictions Button (Bottom Right Corner After Graph) */}
      {hasPredictions && onResetPredictions && (
        <div className="flex justify-end w-full -mt-1">
          <button
            type="button"
            onClick={onResetPredictions}
            className="px-3.5 py-2 rounded-full bg-(--bg-highlight) text-(--text-main) font-bold text-xs uppercase shadow-sm hover:bg-(--accent-base) hover:text-(--text-inverse) active:scale-95 transition-all duration-75 cursor-pointer inline-flex items-center justify-center border-none outline-none select-none leading-none"
            title="Reset all predicted grades"
          >
            <span className="leading-none pt-px">Reset Predictions</span>
          </button>
        </div>
      )}
    </div>
  );
};
