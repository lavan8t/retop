import { useState, useEffect, useMemo } from "react";
import { VTOPNetwork } from "../utils/network";
import { parseGradesSemesters, parseGrades, parseGradeDetails, parseGradeHistory } from "../parsers/grades";
import { parseTimetable } from "../parsers/timetable";
import { GradesData, GradeCourse, GradeHistoryData } from "../types/vtop";
import { useDataStore } from "../store/dataStore";

export function useGradesData(
  network: VTOPNetwork,
  semesters: { id: string; label: string }[],
  setSemesters: (sems: { id: string; label: string }[]) => void,
  selectedSem: string,
  setSelectedSem: (sem: string) => void
) {
  const [loading, setLoading] = useState(true);
  const [gradesData, setGradesData] = useState<GradesData | null>(null);
  const [historyData, setHistoryData] = useState<GradeHistoryData | null>(null);
  const [fetchingGrades, setFetchingGrades] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [predictedGrades, setPredictedGrades] = useState<Record<string, string>>({});
  const [offlineMiss, setOfflineMiss] = useState(false);

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
           cgpa: { creditsRegistered: "160", creditsEarned: "160", cgpa: "9.85", s: "120", a: "30", b: "10", c: "0", d: "0", e: "0", f: "0", n: "0" },
           courses: [{ code: "CSE1001", title: "Problem Solving and Programming", type: "TH", credits: "3", grade: "S", examMonth: "Dec-2025", resultDeclared: "Jan-2026", courseDistribution: "Programme Core", slNo: "1" }],
           curriculum: [],
           baskets: []
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
      } catch (e: any) {
        if (e && e.message === "OFFLINE_CACHE_MISS") {
          setOfflineMiss(true);
        } else {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    };
    
    const fetchHistory = async () => {
      if (useDataStore.getState().status === "Demo Mode Active") return;
      try {
        const html = await network.getStudentGradeHistory();
        setHistoryData(parsedHistory => parsedHistory || parseGradeHistory(html));
      } catch (e: any) {
        if (e && e.message === "OFFLINE_CACHE_MISS") {
          setOfflineMiss(true);
        } else {
          console.error(e);
        }
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
          courses: [{ courseId: "123", code: "CSE1001", title: "Problem Solving and Programming", type: "TH", credits: "3", l: "3", p: "0", j: "0", c: "3", gradingType: "Programme Core", grandTotal: "95", grade: "S", notIncludedInGpa: false }]
        });
        setFetchingGrades(false);
        return;
      }

      try {
        const isPastSemester = semesters.length > 0 && semesters[0].id !== selectedSem;
        const html = await network.getStudentGrades(selectedSem, false, isPastSemester);
        const parsedGrades = parseGrades(html);

        const isLatest = !isPastSemester;
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
                  "X-Requested-With": "XMLHttpRequest",
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
        setOfflineMiss(false);
      } catch (e: any) {
        if (e && e.message === "OFFLINE_CACHE_MISS") {
          setOfflineMiss(true);
        } else {
          console.error(e);
        }
      } finally {
        setFetchingGrades(false);
      }
    };
    fetchGrades();

    const handleRefresh = () => {
      fetchGrades();
    };
    window.addEventListener("retop-refresh-grades", handleRefresh);
    return () => window.removeEventListener("retop-refresh-grades", handleRefresh);
  }, [selectedSem, network, semesters]);

  const handleToggleDetails = async (course: GradeCourse) => {
    if (expandedCourseId === course.courseId) {
      setExpandedCourseId(null);
      return;
    }

    if (!course.courseId) return;

    if (course.assessments) {
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

  const predictedGpa = useMemo(() => {
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
  }, [gradesData, predictedGrades]);

  const predictedCgpa = useMemo(() => {
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
    const newTotalCredits = totalCreditsEarned + semCredits;
    const newTotalPoints = totalPoints + semPoints;
    return (newTotalPoints / newTotalCredits).toFixed(2);
  }, [historyData, gradesData, predictedGrades]);

  return {
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
  };
}
