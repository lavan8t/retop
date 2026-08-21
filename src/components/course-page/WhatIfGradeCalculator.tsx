import React, { useState, useEffect, useMemo, useRef } from "react";
import { VTOPNetwork } from "../../utils/network";
import { CourseMarks } from "../../types/vtop";
import { parseStudentMarks } from "../../parsers/marks";
import { Calculate, Error, CheckCircle } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

interface WhatIfGradeCalculatorProps {
  network: VTOPNetwork;
  courseCode: string;
  classId?: string;
  selectedSem: string;
  isLatestSem: boolean;
  onGradePredicted?: (grade: string | null) => void;
}

export const WhatIfGradeCalculator: React.FC<WhatIfGradeCalculatorProps> = ({
  network,
  courseCode,
  classId,
  selectedSem,
  isLatestSem,
  onGradePredicted,
}) => {
  const [marksData, setMarksData] = useState<CourseMarks[]>([]);
  const [loading, setLoading] = useState(true);
  const [hypotheticalFAT, setHypotheticalFAT] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLatestSem) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchMarks = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const html = await network.getStudentMarks(selectedSem);
        if (!isMounted) return;
        const parsed = typeof html === "string" ? parseStudentMarks(html) : html;
        setMarksData(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        console.error("Failed to fetch marks for calculator", err);
        if (isMounted) setErrorMsg("Failed to load internal marks.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMarks();
    return () => {
      isMounted = false;
    };
  }, [network, selectedSem, isLatestSem]);

  const courseMarks = useMemo(() => {
    return marksData.find(
      (m) =>
        m.code.toLowerCase() === courseCode.toLowerCase() ||
        (classId && m.classNumber === classId)
    );
  }, [marksData, courseCode, classId]);

  // Check if FAT is already published
  const fatAssessment = courseMarks?.assessments.find((a) =>
    a.title.toLowerCase().includes("fat")
  );
  
  const hasFatScore = fatAssessment && fatAssessment.scoredPercentage !== "-" && parseFloat(fatAssessment.scoredPercentage) > 0;

  // Calculate Internal Marks
  let totalInternalScored = 0;
  let totalInternalWeightage = 0;
  
  if (courseMarks) {
    courseMarks.assessments.forEach((a) => {
      if (!a.title.toLowerCase().includes("fat")) {
        const s = parseFloat(a.scoredPercentage) || 0;
        const w = parseFloat(a.weightage) || 0;
        totalInternalScored += s;
        totalInternalWeightage += w;
      }
    });
  }

  const internalScoreStr = loading 
    ? "..." 
    : courseMarks 
      ? totalInternalScored.toFixed(1) 
      : "0.0";
      
  const fatInput = parseFloat(hypotheticalFAT) || 0;
  // FAT is usually scaled to 40% if max is 100
  const fatScaled = (fatInput / 100) * 40;
  const totalScore = totalInternalScored + fatScaled;

  const isPassingFAT = fatInput >= 40;
  const isPassingTotal = totalScore >= 50;
  const isPass = isPassingFAT && isPassingTotal;

  let gradeStr = "F";
  if (isPass) {
    if (totalScore >= 90) gradeStr = "S";
    else if (totalScore >= 80) gradeStr = "A";
    else if (totalScore >= 70) gradeStr = "B";
    else if (totalScore >= 60) gradeStr = "C";
    else if (totalScore >= 55) gradeStr = "D";
    else if (totalScore >= 50) gradeStr = "E";
  }

  const lastPredicted = useRef<string | null>(undefined as any);

  useEffect(() => {
    if (!isLatestSem || hasFatScore) return;
    
    if (onGradePredicted) {
      const nextGrade = (hypotheticalFAT === "" || totalInternalWeightage < 60) ? null : gradeStr;
      if (lastPredicted.current !== nextGrade) {
        lastPredicted.current = nextGrade;
        onGradePredicted(nextGrade);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hypotheticalFAT, gradeStr, isLatestSem, hasFatScore, totalInternalWeightage]);

  if (!isLatestSem || hasFatScore) return null;

  return (
    <div
      className="bg-(--bg-highlight) rounded-4xl p-6 shadow-none flex flex-col gap-6 shrink-0 mt-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
    >

      {loading ? (
        <div className="h-24 animate-pulse bg-(--bg-main) rounded-2xl"></div>
      ) : errorMsg || (!courseMarks && marksData.length > 0) ? (
        <div className="p-4 rounded-2xl bg-(--att-danger-container) flex items-start gap-3">
          <Error className="w-5 h-5 text-(--att-danger) shrink-0" />
          <p className="text-sm font-bold text-(--att-danger)">
            {errorMsg || "Internal marks not available for this course yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-(--bg-main) p-4 rounded-2xl flex justify-between items-center">
              <span className="text-sm font-bold text-content-muted uppercase">
                Current Internal Marks
              </span>
              <span className="font-black text-cyan-400 text-xl font-mono">
                {internalScoreStr} <span className="text-sm text-content-dim">/ 60</span>
              </span>
            </div>

            {totalInternalWeightage >= 60 ? (
              <div className="bg-(--bg-main) p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-content-muted uppercase">
                    Hypothetical FAT Score
                  </span>
                  <span className="text-xs font-bold text-content-dim bg-surface px-2 py-1 rounded border border-border-default">
                    Out of 100
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Enter FAT Score (e.g. 75)"
                  className="w-full bg-(--bg-surface) rounded-xl px-4 py-3 font-mono text-(--text-main) text-lg focus:outline-none focus:ring-2 focus:ring-(--accent-base) transition-all placeholder:text-zinc-600 placeholder:text-sm"
                  value={hypotheticalFAT}
                  onChange={(e) => setHypotheticalFAT(e.target.value)}
                />
              </div>
            ) : (
              <div className="bg-(--bg-main) p-4 rounded-2xl flex items-center justify-center text-center border-2 border-dashed border-border-dim">
                <span className="text-sm font-bold text-content-dim uppercase tracking-widest">
                  Internals not finalized (Weightage: {totalInternalWeightage}/60)
                </span>
              </div>
            )}
          </div>
          {totalInternalWeightage >= 60 && hypotheticalFAT !== "" && (
            <div className={`w-full lg:w-48 shrink-0 rounded-3xl p-5 flex flex-col items-center justify-center text-center transition-all duration-fast ${isPass ? "bg-card-lime" : "bg-att-danger"} shadow-none border-2 border-(--border-main)`}>
              <div className="mt-4 flex flex-col gap-1 w-full text-left">
                <div className={`text-[10px] font-bold uppercase flex justify-between items-center ${isPassingFAT ? "text-black/70" : "text-black"}`}>
                  <span>FAT &gt;= 40</span>
                  {isPassingFAT ? <CheckCircle className="w-3 h-3" /> : <Error className="w-3 h-3 text-att-danger" />}
                </div>
                <div className={`text-[10px] font-bold uppercase flex justify-between items-center ${isPassingTotal ? "text-black/70" : "text-black"}`}>
                  <span>Total &gt;= 50</span>
                  {isPassingTotal ? <CheckCircle className="w-3 h-3" /> : <Error className="w-3 h-3 text-att-danger" />}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
