import React from "react";
import { VTOPNetwork } from "../utils/network";
import {
  Error,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Analytics,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { EmptyState } from "../components/EmptyState";
import { OfflineNotSynced } from "../components/ui/OfflineNotSynced";
import { WhatIfGradeCalculator } from "../components/course-page/WhatIfGradeCalculator";
import { GradeTicker } from "../components/grades/GradeTicker";
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

  const getGradeColor = (grade: string) => {
    return "text-(--text-main) bg-(--bg-highlight)";
  };

  if (offlineMiss) {
    return (
      <div className="h-full pt-16 md:pt-15 lg:pt-24 pb-32 md:pb-12">
        <OfflineNotSynced pageName="Grades" />
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col bg-transparent font-mono text-(--text-main) overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-20 md:pt-24 lg:pt-28 space-y-12">
        {loading || fetchingGrades ? (
          <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-pulse">
            <div className="h-32 bg-(--bg-surface) rounded-4xl w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-(--bg-surface) rounded-4xl w-full" />
              ))}
            </div>
          </div>
        ) : !gradesData || gradesData.courses.length === 0 ? (
          <EmptyState msg="No Semester Data Found" icon={Error} />
        ) : gradesData ? (
          <div
            className="flex flex-col gap-6 max-w-5xl mx-auto">
            {(gradesData.gpa || predictedGpa) && (
              <div 
                className="flex items-center justify-between bg-(--bg-surface) rounded-4xl p-6 shadow-none border-2 border-(--border-main) overflow-hidden relative">
                <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                  <Analytics className="w-48 h-48 text-(--accent-base)" />
                </div>
                <div className="z-10 w-full flex flex-col md:flex-row gap-6 md:gap-12">
                  <div>
                    <h2 className="text-(--text-muted) font-bold uppercase text-sm mb-1 tracking-widest">
                      Semester GPA
                    </h2>
                    <div className="text-5xl md:text-6xl font-black text-(--text-main) font-expanded shadow-none flex items-end gap-3">
                      {gradesData.gpa && gradesData.gpa !== "0.0" && gradesData.gpa !== "0"
                        ? gradesData.gpa
                        : predictedGpa || "0.00"}
                      {(!gradesData.gpa || gradesData.gpa === "0.0" || gradesData.gpa === "0") && (
                        <span className="text-xl text-(--text-muted) mb-2">(Predicted)</span>
                      )}
                    </div>
                  </div>
                  {predictedCgpa && (
                    <div>
                      <h2 className="text-(--text-muted) font-bold uppercase text-sm mb-1 tracking-widest">
                        Predicted CGPA
                      </h2>
                      <div className="text-5xl md:text-6xl font-black text-(--text-main) font-expanded shadow-none flex items-end gap-3">
                        {predictedCgpa}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gradesData.courses.map((course, idx) => {
                const isExpanded = expandedCourseId === course.courseId;
                const currentGrade = predictedGrades[course.courseId] || course.grade || "-";
                const gradeColorClass = getGradeColor(currentGrade);
                const isLatest = semesters.length> 0 && semesters[0].id === selectedSem;
                const isOfficiallyMarked = Boolean(
                  course.grade && course.grade.trim() !== "" && course.grade !== "-"
                );

                return (
                  <div
                    key={idx} 
                    className={`bg-(--bg-surface) rounded-4xl overflow-hidden border-2 border-(--border-main) transition-all flex flex-col ${
                      isExpanded ? "ring-4 ring-(--accent-base)" : ""
                    } ${course.notIncludedInGpa ? "opacity-70 hover:opacity-100" : ""}`}>
                    <div className="p-5 flex flex-col gap-4 relative">
                      {course.notIncludedInGpa && (
                        <div className="absolute top-0 right-0 bg-(--border-dim) text-(--text-muted) text-[9px] font-bold uppercase px-2 py-1 rounded-bl-xl">
                          Not in GPA
                        </div>
                      )}

                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0 flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-(--bg-highlight) text-(--text-muted) text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                              {course.code}
                            </span>
                            <span className="bg-(--bg-highlight) text-(--text-muted) text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase shrink-0">
                              {course.type}
                            </span>
                          </div>
                          <div className="flex items-start gap-3">
                            <h3 className="font-bold text-(--text-main) text-lg leading-tight font-expanded pr-4">
                              {course.title}
                            </h3>
                          </div>
                        </div>
                        <GradeTicker
                          currentGrade={currentGrade}
                          gradeColorClass={gradeColorClass}
                          readonly={!isLatest || isOfficiallyMarked}
                          onChange={(val: string) =>
                            setPredictedGrades((prev) => ({ ...prev, [course.courseId]: val }))
                          }
                          availableGrades={
                            course.notIncludedInGpa
                              ? ["P", "F"]
                              : ["S", "A", "B", "C", "D", "E", "F", "N"]
                          } />
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex gap-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-(--text-muted) uppercase font-bold">
                              Credits
                            </span>
                            <span className="text-sm font-bold text-(--text-main)">
                              {parseFloat(course.c || "0").toString()}
                            </span>
                          </div>
                          <div className="w-px bg-(--text-main) opacity-10 my-1"></div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-(--text-muted) uppercase font-bold">
                              Total
                            </span>
                            <span className="text-sm font-bold text-(--text-main)">
                              {course.grandTotal}
                            </span>
                          </div>
                          <div className="w-px bg-(--text-main) opacity-10 my-1"></div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-(--text-muted) uppercase font-bold">
                              Type
                            </span>
                            <span className="text-sm font-bold text-(--text-main)">
                              {course.gradingType}
                            </span>
                          </div>
                        </div>

                        {course.courseId && (
                          <button
                            onClick={() => handleToggleDetails(course)}
                            className="bg-(--bg-highlight) hover:bg-(--accent-base) hover:text-white text-(--text-main) w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-none active:scale-95">
                            {isExpanded ? (
                              <KeyboardArrowUp className="w-5 h-5" />
                            ) : (
                              <KeyboardArrowDown className="w-5 h-5" />
                            )}
                          </button>
                        )}
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
                                              className={`py-1.5 px-3 truncate max-w-[120px] ${
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
                                                <td className="py-1.5 px-3 text-center font-mono">
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
                                                <td className="py-1.5 px-3 text-right font-mono">
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
                                    if (g === null) {
                                      const newPreds = { ...prev };
                                      delete newPreds[course.courseId];
                                      return newPreds;
                                    }
                                    return { ...prev, [course.courseId]: g };
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

        {historyData && historyData.courses.length> 0 && (
          <div
            className="flex flex-col gap-10 max-w-5xl mx-auto pt-16">
            {/* CGPA Details Table */}
            {historyData.cgpa && (
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold font-expanded text-(--text-main) mb-2">
                    CGPA Details
                  </h2>
                </div>
                <div className="overflow-x-auto custom-scrollbar rounded-4xl bg-(--bg-surface) shadow-none border-2 border-(--border-main) mb-12">
                  <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="bg-(--bg-highlight) text-[10px] font-bold text-(--text-muted) uppercase">
                      <tr>
                        <th className="p-4 pl-6 whitespace-nowrap">Credits Reg</th>
                        <th className="p-4 whitespace-nowrap">Credits Earned</th>
                        <th className="p-4 pr-6">CGPA</th>
                        {["S", "A", "B", "C", "D", "E", "F", "N"].map((g) => (
                          <th key={g} className="p-4 text-center">
                            {g}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      <tr className="hover:bg-(--bg-highlight) transition-colors">
                        <td className="p-4 pl-6 font-bold text-(--text-main)">
                          {historyData.cgpa.creditsRegistered}
                        </td>
                        <td className="p-4 font-bold text-(--text-main)">
                          {historyData.cgpa.creditsEarned}
                        </td>
                        <td className="p-4 pr-6 font-bold text-(--accent-base) text-base">
                          {historyData.cgpa.cgpa}
                        </td>
                        {["s", "a", "b", "c", "d", "e", "f", "n"].map((g) => {
                          const val = (historyData.cgpa as any)[g];
                          return (
                            <td key={g} className="p-4 text-center font-bold text-(--text-muted)">
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

            {/* Curriculum Details */}
            {historyData.curriculum && historyData.curriculum.length> 0 && (
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold font-expanded text-(--text-main) mb-2">
                    Curriculum Details
                  </h2>
                </div>
                <div className="overflow-x-auto custom-scrollbar rounded-4xl bg-(--bg-surface) shadow-none border-2 border-(--border-main) mb-12">
                  <table className="w-full text-left text-sm min-w-[500px]">
                    <thead className="bg-(--bg-highlight) text-[10px] font-bold text-(--text-muted) uppercase">
                      <tr>
                        <th className="p-4 pl-6">Curriculum Distribution Type</th>
                        <th className="p-4 text-center">Credits Required</th>
                        <th className="p-4 text-center pr-6">Credits Earned</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {historyData.curriculum.map((item, idx) => (
                        <tr key={idx} className="hover:bg-(--bg-highlight) transition-colors group">
                          <td className="p-4 pl-6 font-bold text-(--text-main)">{item.title}</td>
                          <td className="p-4 text-center text-(--text-muted)">{item.required}</td>
                          <td className="p-4 text-center font-bold text-(--text-main) pr-6 group-hover:text-(--accent-base) transition-colors">
                            {item.earned}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Basket Details */}
            {historyData.baskets && historyData.baskets.length> 0 && (
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold font-expanded text-(--text-main) mb-2">
                    Basket Details
                  </h2>
                </div>
                <div className="overflow-x-auto custom-scrollbar rounded-4xl bg-(--bg-surface) shadow-none border-2 border-(--border-main) mb-12">
                  <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="bg-(--bg-highlight) text-[10px] font-bold text-(--text-muted) uppercase">
                      <tr>
                        <th className="p-4 pl-6">Basket Title</th>
                        <th className="p-4 text-center">Type</th>
                        <th className="p-4 text-center">Credits Required</th>
                        <th className="p-4 text-center pr-6">Credits Earned</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {historyData.baskets.map((item, idx) => (
                        <tr key={idx} className="hover:bg-(--bg-highlight) transition-colors group">
                          <td className="p-4 pl-6 font-bold text-(--text-main)">{item.title}</td>
                          <td className="p-4 text-center text-(--text-muted)">
                            <span className="bg-(--bg-highlight) text-(--text-muted) text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              {item.distributionType}
                            </span>
                          </td>
                          <td className="p-4 text-center text-(--text-muted)">{item.required}</td>
                          <td className="p-4 text-center font-bold text-(--text-main) pr-6 group-hover:text-(--accent-base) transition-colors">
                            {item.earned}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Course History List */}
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold font-expanded text-(--text-main) mb-2">
                  Course History
                </h2>
                <p className="text-(--text-muted) text-sm font-bold uppercase">
                  All completed courses
                </p>
              </div>
              <div>
                <div className="overflow-x-auto custom-scrollbar pb-4">
                  <table className="w-full text-left text-sm min-w-[500px] border-separate border-spacing-y-2">
                    <tbody className="font-mono">
                      {[...historyData.courses].reverse().map((course, idx) => {
                        const gradeColorClass = getGradeColor(course.grade);
                        return (
                          <tr
                            key={idx}
                            className="bg-(--bg-surface) hover:bg-(--bg-highlight) transition-colors group">
                            <td className="p-5 pl-6 rounded-l-3xl">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-start gap-3">
                                  <span className="font-bold text-(--text-main) group-hover:text-(--accent-base) transition-colors text-base font-expanded">
                                    {course.title}
                                  </span>
                                  <span className="bg-(--bg-highlight) text-(--text-muted) text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase shrink-0">
                                    {course.type}
                                  </span>
                                </div>
                                <span className="text-xs text-(--text-muted)">{course.code}</span>
                              </div>
                            </td>
                            <td className="p-5 text-center font-bold text-(--text-main)">
                              {parseFloat(course.credits || "0").toString()}{" "}
                              <span className="text-[10px] uppercase font-bold text-(--text-muted) ml-1 hidden sm:inline">
                                CR
                              </span>
                            </td>
                            <td className="p-5 text-center">
                              <span
                                className={`inline-flex w-8 h-8 rounded-lg items-center justify-center font-black text-sm leading-none pt-[2px] shadow-none mx-auto ${gradeColorClass}`}>
                                {course.grade}
                              </span>
                            </td>
                            <td className="p-5 text-(--text-muted) font-bold text-xs uppercase rounded-r-3xl pr-6 whitespace-nowrap">
                              {course.examMonth.replace("-", " ")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
