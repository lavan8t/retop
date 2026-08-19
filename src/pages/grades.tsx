import React from "react";
import { VTOPNetwork } from "../utils/network";
import {
  Error,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { EmptyState } from "../components/EmptyState";
import { OfflineNotSynced } from "../components/ui/OfflineNotSynced";
import { WhatIfGradeCalculator } from "../components/course-page/WhatIfGradeCalculator";
import { GradeTicker } from "../components/grades/GradeTicker";
import { GradeTrendChart } from "../components/grades/GradeTrendChart";
import { useGradesData } from "../hooks/useGradesData";

interface GradesPageProps {
  network: VTOPNetwork;
  semesters: { id: string; label: string }[];
  setSemesters: (sems: { id: string; label: string }[]) => void;
  selectedSem: string;
  setSelectedSem: (sem: string) => void;
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
  } = useGradesData(network, semesters, setSemesters, selectedSem, setSelectedSem);

  if (offlineMiss) {
    return (
      <div className="h-full pt-16 md:pt-15 lg:pt-24 pb-32 md:pb-12 text-left">
        <OfflineNotSynced pageName="Grades" />
      </div>
    );
  }

  const isLatestSem = Boolean(semesters && semesters.length > 0 && semesters[0].id === selectedSem);

  const currentSemGpa =
    gradesData?.gpa && gradesData.gpa !== "0.0" && gradesData.gpa !== "0"
      ? gradesData.gpa
      : isLatestSem
      ? predictedGpa
      : null;

  const isPredictedGpa = isLatestSem && (!gradesData?.gpa || gradesData.gpa === "0.0" || gradesData.gpa === "0");
  const hasPredictions = isLatestSem && Object.keys(predictedGrades).length > 0;

  const handleResetPredictions = () => {
    setPredictedGrades({});
    try {
      if (selectedSem) {
        localStorage.removeItem(`retop_pred_grades_${selectedSem}`);
      }
    } catch {}
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-(--text-main) overflow-hidden text-left">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 lg:px-14 xl:px-16 pt-20 md:pt-24 lg:pt-28 pb-32 space-y-8 text-left">
        {/* Trend Chart */}
        {semesters && semesters.length > 0 && (
          <div className="w-full max-w-5xl text-left">
            <GradeTrendChart
              network={network}
              semesters={semesters}
              selectedSem={selectedSem}
              onSelectSem={(id) => setSelectedSem(id)}
              officialCgpa={historyData?.cgpa?.cgpa}
              officialCredits={historyData?.cgpa?.creditsEarned}
              predictedGpa={predictedGpa}
              predictedCgpa={predictedCgpa}
              currentSemGpa={currentSemGpa}
              isPredictedGpa={isPredictedGpa}
              hasPredictions={hasPredictions}
              onResetPredictions={handleResetPredictions}
            />
          </div>
        )}

        {loading || fetchingGrades ? (
          <div className="flex flex-col gap-4 w-full max-w-5xl animate-pulse text-left">
            <div className="h-24 bg-(--bg-surface) rounded-3xl w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-(--bg-surface) rounded-3xl w-full" />
                ))}
              </div>
            </div>
          ) : !gradesData || gradesData.courses.length === 0 ? (
            <EmptyState msg="No Semester Data Found" icon={Error} />
          ) : gradesData ? (
            <div className="flex flex-col gap-4 w-full max-w-5xl text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-left">
              {gradesData.courses.map((course, idx) => {
                const courseKey = course.courseId || course.code;
                const isExpanded = expandedCourseId === courseKey || expandedCourseId === course.courseId;
                const currentGrade = predictedGrades[courseKey] || predictedGrades[course.courseId] || predictedGrades[course.code] || course.grade || "-";
                const isLatest = semesters.length> 0 && semesters[0].id === selectedSem;
                const isOfficiallyMarked = Boolean(
                  course.grade && course.grade.trim() !== "" && course.grade !== "-"
                );

                const isPredicted = Boolean(
                  (predictedGrades[courseKey] || predictedGrades[course.courseId] || predictedGrades[course.code]) &&
                  (predictedGrades[courseKey] || predictedGrades[course.courseId] || predictedGrades[course.code]) !== course.grade
                );

                return (
                  <div
                    key={idx} 
                    className={`bg-(--bg-surface) rounded-3xl overflow-hidden border-2 border-(--border-main) transition-all flex flex-col relative ${
                      isExpanded ? "ring-2 ring-(--accent-base)" : ""
                    } ${course.notIncludedInGpa ? "opacity-70 hover:opacity-100" : ""}`}>
                    <div className="p-4 flex flex-col gap-3 relative text-left">
                      {isPredicted && (
                        <span className="absolute top-3 right-3 text-(--accent-base) font-black text-base select-none pointer-events-none leading-none">
                          *
                        </span>
                      )}

                      <div className="flex justify-between items-start gap-3 text-left">
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap text-left">
                            <span className="bg-(--bg-highlight) text-(--text-muted) text-[10px] font-bold px-2.5 py-1 rounded-full uppercase inline-flex items-center justify-center leading-none">
                              <span className="leading-none pt-px">{course.code}</span>
                            </span>
                            <span className="bg-(--bg-highlight) text-(--text-muted) text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0 inline-flex items-center justify-center leading-none">
                              <span className="leading-none pt-px">{course.type}</span>
                            </span>
                            {course.notIncludedInGpa && (
                              <span className="bg-(--bg-highlight) text-(--text-muted) text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0 inline-flex items-center justify-center leading-none">
                                <span className="leading-none pt-px">Not in GPA</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-start gap-2 text-left">
                            <h3 className="font-bold text-(--text-main) text-base leading-tight font-expanded pr-2 text-left">
                              {course.title}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-bold text-(--text-muted) leading-none select-none">
                            {parseFloat(course.c || course.credits || "0").toString()} CR
                          </span>
                          <GradeTicker
                            currentGrade={currentGrade}
                            gradeColorClass="text-(--text-main) bg-(--bg-highlight)"
                            readonly={!isLatest || isOfficiallyMarked}
                            onChange={(val: string) =>
                              setPredictedGrades((prev) => ({ ...prev, [courseKey]: val }))
                            }
                            availableGrades={
                              course.notIncludedInGpa
                                ? ["P", "F"]
                                : ["S", "A", "B", "C", "D", "E", "F", "N"]
                            } />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-1 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap text-left">
                          {course.gradingType && (
                            <span className="bg-(--bg-highlight) text-(--text-muted) text-[10px] font-bold px-2.5 py-1 rounded-full uppercase inline-flex items-center justify-center leading-none">
                              <span className="leading-none pt-px">{course.gradingType}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          {course.grandTotal && course.grandTotal !== "-" && (
                            <span className="font-black text-xl text-(--text-main) leading-none select-none">
                              {course.grandTotal}
                            </span>
                          )}

                          {course.courseId && (
                            <button
                              type="button"
                              onClick={() => handleToggleDetails(course)}
                              className="bg-(--bg-highlight) hover:bg-(--accent-base) hover:text-(--text-inverse) text-(--text-main) w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-none active:scale-95 border-none outline-none"
                              title={isExpanded ? "Collapse course details" : "Expand course details"}>
                              {isExpanded ? (
                                <KeyboardArrowUp className="w-4.5 h-4.5" />
                              ) : (
                                <KeyboardArrowDown className="w-4.5 h-4.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    
                      {isExpanded && (
                        <div 
                          className="overflow-hidden bg-(--bg-highlight)">
                          {fetchingDetails && !course.assessments ? (
                            <div className="p-6 flex flex-col gap-4 animate-pulse">
                              <div className="h-16 bg-(--bg-main) rounded-2xl" />
                              <div className="h-24 bg-(--bg-main) rounded-2xl" />
                            </div>
                          ) : (
                            <div className="p-4 flex flex-col gap-4">
                              {course.classStrength && (
                                <div className="grid grid-cols-4 gap-2 text-center bg-(--bg-main) p-3 rounded-2xl">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-(--text-muted) uppercase font-bold">
                                      Class Str
                                    </span>
                                    <span className="text-xs font-bold text-(--text-main)">
                                      {course.classStrength}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-(--text-muted) uppercase font-bold">
                                      Grade Str
                                    </span>
                                    <span className="text-xs font-bold text-(--text-main)">
                                      {course.gradingStrength}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-(--text-muted) uppercase font-bold">
                                      Mean
                                    </span>
                                    <span className="text-xs font-bold text-(--text-main)">
                                      {course.mean}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-(--text-muted) uppercase font-bold">
                                      SD
                                    </span>
                                    <span className="text-xs font-bold text-(--text-main)">
                                      {course.sd}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {course.gradesRange && (
                                <div className="bg-(--bg-main) rounded-2xl overflow-x-auto custom-scrollbar">
                                  <table className="w-full text-center text-[10px]">
                                    <thead className="text-(--text-muted)">
                                      <tr>
                                        {Object.keys(course.gradesRange).map((k) => (
                                          <th key={k} className="p-2 font-bold">
                                            {k}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="text-(--text-main) font-bold">
                                      <tr>
                                        {Object.values(course.gradesRange).map((v, i) => (
                                          <td key={i} className="p-2 whitespace-nowrap">
                                            {v.replace("#", "")}
                                          </td>
                                        ))}
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {course.assessments && course.assessments.length> 0 && (
                                <div className="bg-(--bg-main) rounded-xl overflow-hidden mt-2">
                                  <table className="w-full text-left text-[11px]">
                                    <thead className="bg-(--bg-highlight) text-[9px] text-(--text-muted) uppercase">
                                      <tr>
                                        <th className="py-1.5 px-3">Assessment</th>
                                        <th className="py-1.5 px-3 text-center">Marks</th>
                                        <th className="py-1.5 px-3 text-right">Weightage</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-(--border-dim)">
                                      {course.assessments.map((asm, i) => {
                                        const isTotal = asm.title.toLowerCase().includes("total");
                                        return (
                                          <tr
                                            key={i}
                                            className={`hover:bg-(--bg-highlight) transition-colors ${
                                              isTotal
                                                ? "bg-(--bg-surface) border-t-2 border-(--border-main)"
                                                : ""
                                            }`}>
                                            <td
                                              className={`py-1.5 px-3 truncate max-w-30 ${
                                                isTotal
                                                  ? "font-black uppercase text-xs text-(--text-main)"
                                                  : "font-bold text-(--text-main)"
                                              }`}
                                              title={asm.title}>
                                              {asm.title}
                                            </td>
                                            {asm.status !== "Present" && !isTotal ? (
                                              <td
                                                colSpan={2}
                                                className="py-1.5 px-3 text-center text-(--att-text-danger) text-[9px] uppercase font-bold">
                                                {asm.status}
                                              </td>
                                            ) : (
                                              <>
                                                <td className="py-1.5 px-3 text-center">
                                                  <span
                                                    className={`text-(--text-main) ${
                                                      isTotal ? "font-black text-sm" : "font-bold"
                                                    }`}>
                                                    {asm.scoredMark}
                                                  </span>
                                                  <span className="text-(--text-muted) text-[9px] ml-0.5">
                                                    /{asm.maxMark}
                                                  </span>
                                                </td>
                                                <td className="py-1.5 px-3 text-right">
                                                  <span
                                                    className={`text-(--accent-base) ${
                                                      isTotal ? "font-black text-sm" : "font-bold"
                                                    }`}>
                                                    {asm.weightageMark}
                                                  </span>
                                                  <span className="text-(--text-muted) text-[9px] ml-0.5">
                                                    /{asm.weightage}
                                                  </span>
                                                </td>
                                              </>
                                            )}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                                <WhatIfGradeCalculator
                                 network={network}
                                 courseCode={course.code}
                                 classId={course.courseId}
                                 selectedSem={selectedSem}
                                 isLatestSem={
                                   semesters.length> 0 && semesters[0].id === selectedSem
                                 }
                                 onGradePredicted={(g) => {
                                   setPredictedGrades((prev) => {
                                     const next = { ...prev };
                                     if (g === null) {
                                       delete next[courseKey];
                                       delete next[course.courseId];
                                       delete next[course.code];
                                     } else {
                                       next[courseKey] = g;
                                     }
                                     return next;
                                   });
                                 }} />
                            </div>
                          )}
                        </div>
                      )}
                    
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {historyData && historyData.courses.length > 0 && (
          <div className="flex flex-col gap-6 w-full max-w-5xl pt-6 text-left">
            {/* CGPA Details Table */}
            {historyData.cgpa && (
              <div className="text-left">
                <div className="mb-2 text-left">
                  <h2 className="text-lg font-bold font-expanded text-(--text-main) text-left">
                    CGPA Summary
                  </h2>
                </div>
                <div className="overflow-x-auto custom-scrollbar rounded-3xl bg-(--bg-surface) shadow-none border-2 border-(--border-main) text-left">
                  <table className="w-full text-left text-xs min-w-140">
                    <thead className="bg-(--bg-highlight) text-[10px] font-bold text-(--text-muted) uppercase text-left">
                      <tr>
                        <th className="p-3 pl-5 whitespace-nowrap text-left">Credits Reg</th>
                        <th className="p-3 whitespace-nowrap text-left">Credits Earned</th>
                        <th className="p-3 pr-5 text-left">CGPA</th>
                        {["S", "A", "B", "C", "D", "E", "F", "N"].map((g) => (
                          <th key={g} className="p-3 text-center">
                            {g}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-left">
                      <tr className="hover:bg-(--bg-highlight) transition-colors">
                        <td className="p-3 pl-5 font-bold text-(--text-main) text-left">
                          {historyData.cgpa.creditsRegistered}
                        </td>
                        <td className="p-3 font-bold text-(--text-main) text-left">
                          {historyData.cgpa.creditsEarned}
                        </td>
                        <td className="p-3 pr-5 font-bold text-(--accent-base) text-sm text-left">
                          {historyData.cgpa.cgpa}
                        </td>
                        {["s", "a", "b", "c", "d", "e", "f", "n"].map((g) => {
                          const val = (historyData.cgpa as any)[g];
                          return (
                            <td key={g} className="p-3 text-center font-bold text-(--text-muted)">
                              {val === "0" ? <span className="opacity-30">-</span> : val}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Curriculum & Basket Details in Same Row */}
            {((historyData.curriculum && historyData.curriculum.length > 0) || (historyData.baskets && historyData.baskets.length > 0)) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start text-left">
                {/* Curriculum Details */}
                {historyData.curriculum && historyData.curriculum.length > 0 && (
                  <div className="flex flex-col gap-2 text-left">
                    <div className="text-left">
                      <h2 className="text-lg font-bold font-expanded text-(--text-main) text-left">
                        Curriculum Details
                      </h2>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar rounded-3xl bg-(--bg-surface) shadow-none border-2 border-(--border-main) text-left">
                      <table className="w-full text-left text-xs min-w-80">
                        <thead className="bg-(--bg-highlight) text-[10px] font-bold text-(--text-muted) uppercase text-left">
                          <tr>
                            <th className="p-3 pl-5 text-left">Curriculum Distribution</th>
                            <th className="p-3 pr-5 text-right">Credits (Earned / Required)</th>
                          </tr>
                        </thead>
                        <tbody className="text-left">
                          {historyData.curriculum.map((item, idx) => {
                            const isTotal = item.title.toLowerCase().includes("total");
                            return (
                              <tr
                                key={idx}
                                className={`hover:bg-(--bg-highlight) transition-colors group ${
                                  isTotal ? "font-bold bg-(--bg-highlight)/40" : ""
                                }`}
                              >
                                <td className="p-3.5 pl-5 text-left align-middle">
                                  <span className={`text-(--text-main) text-left ${isTotal ? "font-black" : "font-bold"}`}>
                                    {item.title}
                                  </span>
                                </td>
                                <td className="p-3.5 pr-5 text-right font-bold align-middle whitespace-nowrap">
                                  <span className="text-(--text-main) group-hover:text-(--accent-base) transition-colors">
                                    {item.earned}
                                  </span>
                                  <span className="text-(--text-muted) font-normal mx-1">/</span>
                                  <span className="text-(--text-muted)">{item.required}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Basket Details */}
                {historyData.baskets && historyData.baskets.length > 0 && (
                  <div className="flex flex-col gap-2 text-left">
                    <div className="text-left">
                      <h2 className="text-lg font-bold font-expanded text-(--text-main) text-left">
                        Basket Details
                      </h2>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar rounded-3xl bg-(--bg-surface) shadow-none border-2 border-(--border-main) text-left">
                      <table className="w-full text-left text-xs min-w-80">
                        <thead className="bg-(--bg-highlight) text-[10px] font-bold text-(--text-muted) uppercase text-left">
                          <tr>
                            <th className="p-3 pl-5 text-left">Basket Title</th>
                            <th className="p-3 pr-5 text-right">Credits (Earned / Required)</th>
                          </tr>
                        </thead>
                        <tbody className="text-left">
                          {historyData.baskets.map((item, idx) => (
                            <tr key={idx} className="hover:bg-(--bg-highlight) transition-colors group">
                              <td className="p-3.5 pl-5 text-left align-middle">
                                <div className="flex items-center gap-2 flex-wrap text-left">
                                  <span className="font-bold text-(--text-main) text-left">{item.title}</span>
                                  {item.distributionType && (
                                    <span className="bg-(--bg-highlight) text-(--text-muted) text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0 inline-flex items-center justify-center leading-none">
                                      <span className="leading-none pt-px">{item.distributionType}</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3.5 pr-5 text-right font-bold align-middle whitespace-nowrap">
                                <span className="text-(--text-main) group-hover:text-(--accent-base) transition-colors">
                                  {item.earned}
                                </span>
                                <span className="text-(--text-muted) font-normal mx-1">/</span>
                                <span className="text-(--text-muted)">{item.required}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Course History List */}
            <div className="text-left">
              <div className="mb-3 text-left">
                <h2 className="text-lg font-bold font-expanded text-(--text-main) text-left">
                  Course History
                </h2>
              </div>
              <div className="overflow-x-auto custom-scrollbar pb-2 text-left">
                <table className="w-full text-left text-xs min-w-120 border-separate border-spacing-y-1">
                  <tbody className="text-left">
                    {(() => {
                      const coursesList = [...historyData.courses].reverse();
                      const count = coursesList.length;

                      return coursesList.map((course, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === count - 1;

                        const leftRounding =
                          isFirst && isLast
                            ? "rounded-l-2xl"
                            : isFirst
                            ? "rounded-tl-2xl rounded-bl-md"
                            : isLast
                            ? "rounded-tl-md rounded-bl-2xl"
                            : "rounded-l-md";

                        const rightRounding =
                          isFirst && isLast
                            ? "rounded-r-2xl"
                            : isFirst
                            ? "rounded-tr-2xl rounded-br-md"
                            : isLast
                            ? "rounded-tr-md rounded-br-2xl"
                            : "rounded-r-md";

                        return (
                          <tr
                            key={idx}
                            className="bg-(--bg-surface) hover:bg-(--bg-highlight) transition-colors group text-left">
                            {/* 1. Exam Date on left area */}
                            <td className={`p-3.5 pl-4 ${leftRounding} text-left whitespace-nowrap align-middle`}>
                              <span className="text-[11px] font-bold text-(--text-muted) uppercase">
                                {course.examMonth.replace("-", " ")}
                              </span>
                            </td>

                            {/* 2. Course details */}
                            <td className="p-3.5 text-left align-middle">
                              <div className="flex flex-col gap-0.5 text-left">
                                <div className="flex items-start gap-2 text-left">
                                  <span className="font-bold text-(--text-main) group-hover:text-(--accent-base) transition-colors text-sm font-expanded text-left">
                                    {course.title}
                                  </span>
                                  <span className="bg-(--bg-highlight) text-(--text-muted) text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0 inline-flex items-center justify-center leading-none">
                                    <span className="leading-none pt-px">{course.type}</span>
                                  </span>
                                </div>
                                <span className="text-[11px] text-(--text-muted) text-left">{course.code}</span>
                              </div>
                            </td>

                            {/* 3. Credits */}
                            <td className="p-3.5 text-center font-bold text-(--text-main) align-middle whitespace-nowrap">
                              <span className="text-sm font-bold">
                                {parseFloat(course.credits || "0").toString()}
                              </span>{" "}
                              <span className="text-[10px] uppercase font-bold text-(--text-muted) ml-0.5">
                                CR
                              </span>
                            </td>

                            {/* 4. Large Grade Letter with NO background */}
                            <td className={`p-3.5 pr-5 text-right ${rightRounding} align-middle whitespace-nowrap`}>
                              <span className="font-black text-2xl sm:text-3xl font-expanded bg-transparent text-(--text-main) group-hover:text-(--accent-base) leading-none select-none">
                                {course.grade}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
