import React, { useState, useEffect } from "react";
import { VTOPNetwork } from "../utils/network";
import { parseGradesSemesters, parseGrades, parseGradeDetails, parseGradeHistory } from "../parsers/grades";
import { parseTimetable } from "../parsers/timetable";
import { GradesData, GradeCourse, GradeHistoryData } from "../types/vtop";
import {
  ProgressActivity,
  Error,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Analytics,
  School
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { EmptyState } from "../components/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { WhatIfGradeCalculator } from "../components/course-page/WhatIfGradeCalculator";
import { useDataStore } from "../store/dataStore";

const GradeTicker = ({ currentGrade, gradeColorClass, onChange, availableGrades, readonly }: any) => {
  const currentIndex = availableGrades.indexOf(currentGrade === "-" ? availableGrades[availableGrades.length-1] : currentGrade);
  
  const handleUp = () => {
    if (readonly || !availableGrades.length) return;
    const newIdx = currentIndex > 0 ? currentIndex - 1 : availableGrades.length - 1;
    onChange(availableGrades[newIdx]);
  };
  
  const handleDown = () => {
    if (readonly || !availableGrades.length) return;
    const newIdx = currentIndex < availableGrades.length - 1 ? currentIndex + 1 : 0;
    onChange(availableGrades[newIdx]);
  };

  return (
    <div className={`relative flex flex-col items-center justify-center gap-1 ${readonly ? '' : 'group/grade'}`}>
      {!readonly && (
        <button onClick={handleUp} className="text-(--text-muted) hover:text-(--text-main) transition-colors p-0.5 rounded-full hover:bg-(--bg-highlight) -mt-3 absolute -top-4 opacity-0 group-hover/grade:opacity-100 z-10">
          <KeyboardArrowUp className="w-5 h-5" />
        </button>
      )}
      <div className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center font-black text-4xl leading-none pt-1.5 ${gradeColorClass} shadow-none border-2 border-transparent transition-all`}>
        {currentGrade}
      </div>
      {!readonly && (
        <button onClick={handleDown} className="text-(--text-muted) hover:text-(--text-main) transition-colors p-0.5 rounded-full hover:bg-(--bg-highlight) -mb-3 absolute -bottom-4 opacity-0 group-hover/grade:opacity-100 z-10">
          <KeyboardArrowDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

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
  const [loading, setLoading] = useState(true);
  const [gradesData, setGradesData] = useState<GradesData | null>(null);
  const [historyData, setHistoryData] = useState<GradeHistoryData | null>(null);
  const [fetchingGrades, setFetchingGrades] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [predictedGrades, setPredictedGrades] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      if (semesters.length > 0) {
        setLoading(false);
        return;
      }
      
      if (useDataStore.getState().status === "Demo Mode Active") {
        setSemesters([{ id: "demo", label: "Fall Semester 2026-27" }]);
        setSelectedSem("demo");
        setLoading(false);
        setHistoryData({
           summary: { creditsRegistered: "160", creditsEarned: "160", cgpa: "9.85", sValues: "120", aValues: "30", bValues: "10", cValues: "0", dValues: "0", eValues: "0", fValues: "0", nValues: "0" },
           courses: [{ code: "CSE1001", title: "Problem Solving and Programming", type: "TH", credit: "3", grade: "S", examMonth: "Dec-2025", resultDate: "Jan-2026", courseClass: "Programme Core" }]
        });
        return;
      }

      try {
        const html = await network.getGradesView();
        const sems = parseGradesSemesters(html);
        const dropdownSems = sems.map((s) => ({
          id: s.id,
          label: s.label,
          isLatest: s.isLatest,
        }));
        setSemesters(dropdownSems);
        if (dropdownSems.length > 0 && !selectedSem) {
          setSelectedSem(dropdownSems[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchHistory = async () => {
      if (useDataStore.getState().status === "Demo Mode Active") return;
      try {
        const html = await network.getStudentGradeHistory();
        const parsedHistory = parseGradeHistory(html);
        console.log(`[DATA_CAPTURE] Grade History:`, parsedHistory);
        setHistoryData(parsedHistory);
      } catch (e) {
        console.error(e);
      }
    };

    init();
    fetchHistory();
  }, [network, semesters.length]);

  useEffect(() => {
    if (!selectedSem) return;
    const fetchGrades = async () => {
      setFetchingGrades(true);
      setGradesData(null);
      setExpandedCourseId(null);
      setPredictedGrades({});
      
      if (useDataStore.getState().status === "Demo Mode Active") {
        setGradesData({
          gpa: "9.50",
          courses: [{ classId: "123", code: "CSE1001", title: "Problem Solving and Programming", type: "TH", credits: "3", faculty: "Dr. Demo", grade: "S", isPBL: false, ltpj: "3 0 0 0" }]
        });
        setFetchingGrades(false);
        return;
      }

      try {
        const html = await network.getStudentGrades(selectedSem);
        const parsedGrades = parseGrades(html);
        console.log(`[DATA_CAPTURE] Grades (${selectedSem}):`, parsedGrades);

        const isLatest = semesters.length > 0 && semesters[0].id === selectedSem;
        if (isLatest) {
          try {
            const ttHtml = await network.fetchWithCache(`tt_${selectedSem}`, async () => {
              const url = "/vtop/processViewTimeTable";
              const body = new URLSearchParams();
              body.append("_csrf", network.csrf);
              body.append("authorizedID", network.authorizedID);
              body.append("semesterSubId", selectedSem);
              body.append("x", new Date().toUTCString());

              const res = await fetch(url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                  "Close-Requested-With": "XMLHttpRequest",
                },
                body: body,
              });
              return await res.text();
            });
            const ttCourses = parseTimetable(ttHtml).filter(
              (c) =>
                !c.status.toLowerCase().includes("drop") &&
                !c.status.toLowerCase().includes("withdrawn")
            );
            
            const existingCodes = new Set(parsedGrades.courses.map(c => c.code));
            
            for (const tc of ttCourses) {
              if (!existingCodes.has(tc.code)) {
                parsedGrades.courses.push({
                  code: tc.code,
                  title: tc.title,
                  type: tc.type,
                  credits: tc.credits,
                  l: "-", p: "-", j: "-", c: tc.credits,
                  gradingType: tc.category || "Ongoing",
                  grandTotal: "-",
                  grade: "-",
                  courseId: tc.classId,
                  notIncludedInGpa: tc.category?.toLowerCase().includes("non-graded") || tc.category?.toLowerCase().includes("ngcr"),
                  assessments: []
                });
                existingCodes.add(tc.code);
              }
            }
          } catch (e) {
            console.error("Failed to augment with timetable courses", e);
          }
        }

        setGradesData(parsedGrades);
      } catch (e) {
        console.error(e);
      } finally {
        setFetchingGrades(false);
      }
    };
    fetchGrades();
  }, [selectedSem, network]);

  const handleToggleDetails = async (course: GradeCourse) => {
    if (expandedCourseId === course.courseId) {
      setExpandedCourseId(null);
      return;
    }

    if (!course.courseId) return;

    if (course.assessments) {
      // already fetched
      setExpandedCourseId(course.courseId);
      return;
    }

    setFetchingDetails(true);
    try {
      const html = await network.getGradeDetails(selectedSem, course.courseId);
      const details = parseGradeDetails(html);
      
      setGradesData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          courses: prev.courses.map(c => 
            c.courseId === course.courseId ? { ...c, ...details } : c
          )
        };
      });
      setExpandedCourseId(course.courseId);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingDetails(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch(grade) {
      case 'S': return 'text-white bg-purple-500';
      case 'A': return 'text-white bg-emerald-500';
      case 'B': return 'text-white bg-blue-500';
      case 'C': return 'text-white bg-cyan-500';
      case 'D': return 'text-white bg-amber-500';
      case 'E': return 'text-white bg-orange-500';
      case 'F':
      case 'N': return 'text-white bg-red-500';
      default: return 'text-(--text-muted) bg-(--bg-highlight)';
    }
  };

  const getPredictedGpa = () => {
    if (!gradesData) return null;
    let totalCredits = 0;
    let totalPoints = 0;
    const points: Record<string, number> = { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0, N: 0 };
    gradesData.courses.forEach(c => {
      if (c.notIncludedInGpa) return;
      const credit = parseFloat(c.c || "0");
      const g = predictedGrades[c.courseId] || c.grade;
      if (points[g] !== undefined) {
        totalCredits += credit;
        totalPoints += credit * points[g];
      }
    });
    if (totalCredits === 0) return null;
    return (totalPoints / totalCredits).toFixed(2);
  };
  const getPredictedCgpa = () => {
    if (!historyData || !historyData.cgpa || !gradesData) return null;
    const isCompletedSem = gradesData.gpa && gradesData.gpa !== "0.0" && gradesData.gpa !== "0";
    if (isCompletedSem) return null;

    let totalCreditsEarned = parseFloat(historyData.cgpa.creditsEarned || "0");
    let currentCgpa = parseFloat(historyData.cgpa.cgpa || "0");
    let totalPoints = totalCreditsEarned * currentCgpa;

    const points: Record<string, number> = { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0, N: 0 };
    let semCredits = 0;
    let semPoints = 0;

    gradesData.courses.forEach(c => {
      if (c.notIncludedInGpa) return;
      const credit = parseFloat(c.c || "0");
      const g = predictedGrades[c.courseId] || c.grade;
      if (points[g] !== undefined) {
        semCredits += credit;
        semPoints += credit * points[g];
      }
    });

    if (semCredits === 0) return null;
    return ((totalPoints + semPoints) / (totalCreditsEarned + semCredits)).toFixed(2);
  };
  
  const predictedGpa = getPredictedGpa();
  const predictedCgpa = getPredictedCgpa();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-transparent font-mono text-(--text-main) overflow-hidden"
    >
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
          <motion.div
            className="flex flex-col gap-6 max-w-5xl mx-auto"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } },
            }}
          >
            {(gradesData.gpa || predictedGpa) && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: -20 },
                  show: { opacity: 1, y: 0 },
                }}
                className="flex items-center justify-between bg-(--bg-surface) rounded-4xl p-6 shadow-none border-2 border-(--border-main) overflow-hidden relative"
              >
                <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                  <Analytics className="w-48 h-48 text-(--accent-base)" />
                </div>
                <div className="z-10 w-full flex flex-col md:flex-row gap-6 md:gap-12">
                  <div>
                    <h2 className="text-(--text-muted) font-bold uppercase text-sm mb-1 tracking-widest">Semester GPA</h2>
                    <div className="text-5xl md:text-6xl font-black text-(--text-main) font-expanded shadow-none flex items-end gap-3">
                      {gradesData.gpa && gradesData.gpa !== "0.0" && gradesData.gpa !== "0" ? gradesData.gpa : (predictedGpa || "0.00")}
                      {(!gradesData.gpa || gradesData.gpa === "0.0" || gradesData.gpa === "0") && (
                        <span className="text-xl text-(--text-muted) mb-2">(Predicted)</span>
                      )}
                    </div>
                  </div>
                  {predictedCgpa && (
                    <div>
                      <h2 className="text-(--text-muted) font-bold uppercase text-sm mb-1 tracking-widest">Predicted CGPA</h2>
                      <div className="text-5xl md:text-6xl font-black text-(--text-main) font-expanded shadow-none flex items-end gap-3">
                        {predictedCgpa}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gradesData.courses.map((course, idx) => {
                const isExpanded = expandedCourseId === course.courseId;
                const currentGrade = predictedGrades[course.courseId] || course.grade || '-';
                const gradeColorClass = getGradeColor(currentGrade);
                const isLatest = semesters.length > 0 && semesters[0].id === selectedSem;
                const isOfficiallyMarked = Boolean(course.grade && course.grade.trim() !== "" && course.grade !== "-");

                return (
                  <motion.div
                    key={idx}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 },
                    }}
                    className={`bg-(--bg-surface) rounded-4xl overflow-hidden border-2 border-(--border-main) transition-all flex flex-col ${
                      isExpanded ? "ring-4 ring-(--accent-base)" : ""
                    } ${course.notIncludedInGpa ? 'opacity-70 hover:opacity-100' : ''}`}
                  >
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
                          onChange={(val: string) => setPredictedGrades(prev => ({...prev, [course.courseId]: val}))}
                          availableGrades={course.notIncludedInGpa ? ['P', 'F'] : ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'N']}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex gap-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-(--text-muted) uppercase font-bold">Credits</span>
                            <span className="text-sm font-bold text-(--text-main)">{parseFloat(course.c || "0").toString()}</span>
                          </div>
                          <div className="w-px bg-(--border-dim) my-1"></div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-(--text-muted) uppercase font-bold">Total</span>
                            <span className="text-sm font-bold text-(--text-main)">{course.grandTotal}</span>
                          </div>
                          <div className="w-px bg-(--border-dim) my-1"></div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-(--text-muted) uppercase font-bold">Type</span>
                            <span className="text-sm font-bold text-(--text-main)">{course.gradingType}</span>
                          </div>
                        </div>

                        {course.courseId && (
                          <button
                            onClick={() => handleToggleDetails(course)}
                            className="bg-(--bg-highlight) hover:bg-(--accent-base) hover:text-white text-(--text-main) w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-none active:scale-95"
                          >
                            {isExpanded ? <KeyboardArrowUp className="w-5 h-5" /> : <KeyboardArrowDown className="w-5 h-5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-(--bg-highlight)"
                        >
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
                                    <span className="text-[9px] text-(--text-muted) uppercase font-bold">Class Str</span>
                                    <span className="text-xs font-bold text-(--text-main)">{course.classStrength}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-(--text-muted) uppercase font-bold">Grade Str</span>
                                    <span className="text-xs font-bold text-(--text-main)">{course.gradingStrength}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-(--text-muted) uppercase font-bold">Mean</span>
                                    <span className="text-xs font-bold text-(--text-main)">{course.mean}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-(--text-muted) uppercase font-bold">SD</span>
                                    <span className="text-xs font-bold text-(--text-main)">{course.sd}</span>
                                  </div>
                                </div>
                              )}

                              {course.gradesRange && (
                                <div className="bg-(--bg-main) rounded-2xl overflow-x-auto custom-scrollbar">
                                  <table className="w-full text-center text-[10px]">
                                    <thead className="text-(--text-muted)">
                                      <tr>
                                        {Object.keys(course.gradesRange).map(k => <th key={k} className="p-2 font-bold">{k}</th>)}
                                      </tr>
                                    </thead>
                                    <tbody className="text-(--text-main) font-bold">
                                      <tr>
                                        {Object.values(course.gradesRange).map((v, i) => <td key={i} className="p-2 whitespace-nowrap">{v.replace('#', '')}</td>)}
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {course.assessments && course.assessments.length > 0 && (
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
                                          <tr key={i} className={`hover:bg-(--bg-highlight) transition-colors ${isTotal ? 'bg-(--bg-surface) border-t-2 border-(--border-main)' : ''}`}>
                                            <td className={`py-1.5 px-3 truncate max-w-[120px] ${isTotal ? 'font-black uppercase text-xs text-(--text-main)' : 'font-bold text-(--text-main)'}`} title={asm.title}>
                                              {asm.title}
                                            </td>
                                            {asm.status !== "Present" && !isTotal ? (
                                              <td colSpan={2} className="py-1.5 px-3 text-center text-(--att-text-danger) text-[9px] uppercase font-bold">
                                                {asm.status}
                                              </td>
                                            ) : (
                                              <>
                                                <td className="py-1.5 px-3 text-center font-mono">
                                                  <span className={`text-(--text-main) ${isTotal ? 'font-black text-sm' : 'font-bold'}`}>{asm.scoredMark}</span>
                                                  <span className="text-(--text-muted) text-[9px] ml-0.5">/{asm.maxMark}</span>
                                                </td>
                                                <td className="py-1.5 px-3 text-right font-mono">
                                                  <span className={`text-(--accent-base) ${isTotal ? 'font-black text-sm' : 'font-bold'}`}>{asm.weightageMark}</span>
                                                  <span className="text-(--text-muted) text-[9px] ml-0.5">/{asm.weightage}</span>
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
                                isLatestSem={semesters.length > 0 && semesters[0].id === selectedSem}
                                onGradePredicted={(g) => {
                                  setPredictedGrades(prev => {
                                    if (g === null) {
                                      const newPreds = { ...prev };
                                      delete newPreds[course.courseId];
                                      return newPreds;
                                    }
                                    return { ...prev, [course.courseId]: g };
                                  });
                                }}
                              />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : null}

        {historyData && historyData.courses.length > 0 && (
          <motion.div
            className="flex flex-col gap-10 max-w-5xl mx-auto pt-16"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } },
            }}
          >
            {/* CGPA Details Table */}
            {historyData.cgpa && (
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
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
                        {['S', 'A', 'B', 'C', 'D', 'E', 'F', 'N'].map(g => (
                          <th key={g} className="p-4 text-center">{g}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      <tr className="hover:bg-(--bg-highlight) transition-colors">
                        <td className="p-4 pl-6 font-bold text-(--text-main)">{historyData.cgpa.creditsRegistered}</td>
                        <td className="p-4 font-bold text-(--text-main)">{historyData.cgpa.creditsEarned}</td>
                        <td className="p-4 pr-6 font-bold text-(--accent-base) text-base">{historyData.cgpa.cgpa}</td>
                        {['s', 'a', 'b', 'c', 'd', 'e', 'f', 'n'].map(g => {
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
              </motion.div>
            )}

            {/* Curriculum Details */}
            {historyData.curriculum && historyData.curriculum.length > 0 && (
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
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
                          <td className="p-4 text-center font-bold text-(--text-main) pr-6 group-hover:text-(--accent-base) transition-colors">{item.earned}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Basket Details */}
            {historyData.baskets && historyData.baskets.length > 0 && (
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
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
                          <td className="p-4 text-center font-bold text-(--text-main) pr-6 group-hover:text-(--accent-base) transition-colors">{item.earned}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Course History List */}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
              <div className="mb-8">
                <h2 className="text-2xl font-bold font-expanded text-(--text-main) mb-2">
                  Course History
                </h2>
                <p className="text-(--text-muted) text-sm font-bold uppercase">All completed courses</p>
              </div>
              <div className="">
                <div className="overflow-x-auto custom-scrollbar pb-4">
                  <table className="w-full text-left text-sm min-w-[500px] border-separate border-spacing-y-2">
                    <tbody className="font-mono">
                      {[...historyData.courses].reverse().map((course, idx) => {
                        const gradeColorClass = getGradeColor(course.grade);
                        return (
                          <tr key={idx} className="bg-(--bg-surface) hover:bg-(--bg-highlight) transition-colors group">
                            <td className="p-5 pl-6 rounded-l-3xl">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-start gap-3">
                                  <span className="font-bold text-(--text-main) group-hover:text-(--accent-base) transition-colors text-base font-expanded">{course.title}</span>
                                  <span className="bg-(--bg-highlight) text-(--text-muted) text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase shrink-0">
                                    {course.type}
                                  </span>
                                </div>
                                <span className="text-xs text-(--text-muted)">{course.code}</span>
                              </div>
                            </td>
                            <td className="p-5 text-center font-bold text-(--text-main)">
                              {parseFloat(course.credits || "0").toString()} <span className="text-[10px] uppercase font-bold text-(--text-muted) ml-1 hidden sm:inline">CR</span>
                            </td>
                            <td className="p-5 text-center">
                              <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center font-black text-sm leading-none pt-[2px] shadow-none mx-auto ${gradeColorClass}`}>
                                {course.grade}
                              </span>
                            </td>
                            <td className="p-5 text-(--text-muted) font-bold text-xs uppercase rounded-r-3xl pr-6 whitespace-nowrap">
                              {course.examMonth.replace('-', ' ')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
