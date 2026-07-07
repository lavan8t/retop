import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
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
}

export const WhatIfGradeCalculator: React.FC<WhatIfGradeCalculatorProps> = ({
  network,
  courseCode,
  classId,
  selectedSem,
  isLatestSem,
}) => {
  const [marksData, setMarksData] = useState<CourseMarks[]>([]);
  const [loading, setLoading] = useState(true);
  const [hypotheticalFAT, setHypotheticalFAT] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check if current semester
  if (!isLatestSem) return null;

  useEffect(() => {

    let isMounted = true;
    const fetchMarks = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const html = await network.getStudentMarks(selectedSem);
        if (!isMounted) return;
        const parsed = parseStudentMarks(html);
        setMarksData(parsed);
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
  }, [network, selectedSem]);

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
  
  // If FAT is published with a valid score, do not show calculator
  if (fatAssessment && fatAssessment.scoredPercentage !== "-" && parseFloat(fatAssessment.scoredPercentage) > 0) {
    return null;
  }

  // Calculate Internal Marks
  let totalInternalScored = 0;
  
  if (courseMarks) {
    courseMarks.assessments.forEach((a) => {
      if (!a.title.toLowerCase().includes("fat")) {
        const s = parseFloat(a.scoredPercentage) || 0;
        totalInternalScored += s;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border-4 border-zinc-800 rounded-4xl p-6 shadow-none flex flex-col gap-6 shrink-0"
    >
      <div className="flex items-center gap-3 border-b-4 border-zinc-800 pb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border-2 border-purple-500/20 flex items-center justify-center text-purple-400">
          <Calculate className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-black text-zinc-200 text-lg uppercase font-expanded tracking-tight">
            &quot;What-If&quot; Grade Calculator
          </h3>
          <p className="text-xs font-bold text-zinc-500 uppercase">
            Project your final grade based on hypothetical FAT score
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse bg-zinc-950 rounded-2xl border-2 border-zinc-800"></div>
      ) : errorMsg || (!courseMarks && marksData.length > 0) ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/20 flex items-start gap-3">
          <Error className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm font-bold text-red-400/80">
            {errorMsg || "Internal marks not available for this course yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-zinc-950 p-4 rounded-2xl border-2 border-zinc-800 flex justify-between items-center">
              <span className="text-sm font-bold text-zinc-400 uppercase">
                Current Internal Marks
              </span>
              <span className="font-black text-cyan-400 text-xl font-mono">
                {internalScoreStr} <span className="text-sm text-zinc-600">/ 60</span>
              </span>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border-2 border-zinc-800 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-400 uppercase">
                  Hypothetical FAT Score
                </span>
                <span className="text-xs font-bold text-zinc-600 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                  Out of 100
                </span>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Enter FAT Score (e.g. 75)"
                className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-xl px-4 py-3 font-mono text-zinc-200 text-lg focus:outline-none focus:border-purple-400 focus:shadow-[4px_4px_0px_0px_var(--card-purple)] transition-all placeholder:text-zinc-600 placeholder:text-sm"
                value={hypotheticalFAT}
                onChange={(e) => setHypotheticalFAT(e.target.value)}
              />
            </div>
          </div>

          <div className={`w-full lg:w-48 shrink-0 rounded-3xl border-4 p-5 flex flex-col items-center justify-center text-center transition-all duration-300 ${hypotheticalFAT === "" ? "bg-zinc-950 border-zinc-800" : isPass ? "bg-lime-400 border-lime-500 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]" : "bg-red-400 border-red-500 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]"}`}>
            <span className={`text-xs font-black uppercase mb-1 ${hypotheticalFAT === "" ? "text-zinc-500" : "text-black/60"}`}>
              Projected Grade
            </span>
            <span className={`text-5xl font-black font-expanded ${hypotheticalFAT === "" ? "text-zinc-700" : "text-black"}`}>
              {hypotheticalFAT === "" ? "-" : gradeStr}
            </span>
            
            {hypotheticalFAT !== "" && (
              <div className="mt-4 flex flex-col gap-1 w-full text-left">
                <div className={`text-[10px] font-bold uppercase flex justify-between items-center ${isPassingFAT ? "text-black/70" : "text-black"}`}>
                  <span>FAT &gt;= 40</span>
                  {isPassingFAT ? <CheckCircle className="w-3 h-3" /> : <Error className="w-3 h-3 text-red-900" />}
                </div>
                <div className={`text-[10px] font-bold uppercase flex justify-between items-center ${isPassingTotal ? "text-black/70" : "text-black"}`}>
                  <span>Total &gt;= 50</span>
                  {isPassingTotal ? <CheckCircle className="w-3 h-3" /> : <Error className="w-3 h-3 text-red-900" />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
