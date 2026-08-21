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
        const sems = typeof html === "string" ? parseGradesSemesters(html) : html;
        const dropdownSems = (Array.isArray(sems) ? sems : []).map((s) => ({
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
        setHistoryData((parsedHistory) => parsedHistory || (typeof html === "string" ? parseGradeHistory(html) : html));
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
      
      try {
        const saved = localStorage.getItem(`retop_pred_grades_${selectedSem}`);
        if (saved) {
          setPredictedGrades(JSON.parse(saved));
        } else {
          setPredictedGrades({});
        }
      } catch {
        setPredictedGrades({});
      }
      
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
        let parsedGrades: GradesData = { gpa: "", courses: [] };

        try {
          const html = await network.getStudentGrades(selectedSem, false, isPastSemester);
          parsedGrades = typeof html === "string" ? parseGrades(html) : html;
        } catch (err) {
          console.warn("Failed to fetch student grades directly", err);
        }

        const isLatest = !isPastSemester;
        // If it is the latest/ongoing semester or if grades table returned 0 courses, augment from timetable
        if (isLatest || parsedGrades.courses.length === 0) {
          try {
            // 1. Try store ttCourses if already cached or loaded
            let ttCourses = useDataStore.getState().ttCourses;
            if (!ttCourses || ttCourses.length === 0) {
              const ttHtml = await network.fetchWithCache(`tt_${selectedSem}`, async () => {
                return await network.fetchVtopApi("processViewTimeTable", {
                  semesterSubId: selectedSem,
                });
              });
              ttCourses = typeof ttHtml === "string" ? parseTimetable(ttHtml) : ttHtml;
            }

            const validTtCourses = (ttCourses || []).filter(
              (c) =>
                !c.status.toLowerCase().includes("drop") &&
                !c.status.toLowerCase().includes("withdrawn")
            );

            const existingCodes = new Set(parsedGrades.courses.map((c) => c.code));

            for (const tc of validTtCourses) {
              if (!existingCodes.has(tc.code)) {
                parsedGrades.courses.push({
                  code: tc.code,
                  title: tc.title,
                  type: tc.type,
                  credits: tc.credits || "0",
                  l: "-",
                  p: "-",
                  j: "-",
                  c: tc.credits || "0",
                  gradingType: tc.category || "Ongoing",
                  grandTotal: "-",
                  grade: "-",
                  courseId: tc.classId || tc.code,
                  notIncludedInGpa:
                    tc.category?.toLowerCase().includes("non-graded") ||
                    tc.category?.toLowerCase().includes("ngcr") ||
                    tc.type?.toLowerCase().includes("non-graded"),
                  assessments: [],
                });
                existingCodes.add(tc.code);
              } else {
                // If existing entry has 0 credits (e.g. lab), update if timetable has higher credits
                const existing = parsedGrades.courses.find((c) => c.code === tc.code);
                if (existing && parseFloat(existing.credits || "0") === 0 && parseFloat(tc.credits || "0") > 0) {
                  existing.credits = tc.credits;
                  existing.c = tc.credits;
                }
              }
            }
          } catch (e) {
            console.error("Failed to augment with timetable courses", e);
          }
        }

        setGradesData(parsedGrades);
        setOfflineMiss(false);

        // Slowly pre-fetch all internal assessments in the background
        if (parsedGrades.courses.length > 0) {
          const semToFetch = selectedSem;
          (async () => {
            for (const c of parsedGrades.courses) {
              if (!c.courseId || (c.assessments && c.assessments.length > 0)) continue;
              try {
                const detailsHtml = await network.getGradeDetails(semToFetch, c.courseId);
                const details = typeof detailsHtml === "string" ? parseGradeDetails(detailsHtml) : detailsHtml;
                setGradesData((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    courses: prev.courses.map((item) =>
                      item.courseId === c.courseId ? { ...item, ...details } : item
                    ),
                  };
                });
                // Polite delay between background requests
                await new Promise((r) => setTimeout(r, 250));
              } catch (err) {
                // Ignore silent background prefetch errors
              }
            }
          })();
        }
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
      const details = typeof html === "string" ? parseGradeDetails(html) : html;
      
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

  const isLatestSem = Boolean(semesters && semesters.length > 0 && semesters[0].id === selectedSem);

  const predictedGpa = useMemo(() => {
    if (!isLatestSem || !gradesData) return null;
    let totalCredits = 0;
    let totalPoints = 0;
    const points: Record<string, number> = { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0 };
    gradesData.courses.forEach(c => {
      if (c.notIncludedInGpa) return;
      const credit = parseFloat(c.c || c.credits || "0");
      const g = (predictedGrades[c.courseId] || predictedGrades[c.code] || c.grade || "").trim().toUpperCase();
      if (points[g] !== undefined) {
        totalCredits += credit;
        totalPoints += credit * points[g];
      }
    });
    if (totalCredits === 0) return null;
    return (totalPoints / totalCredits).toFixed(2);
  }, [isLatestSem, gradesData, predictedGrades]);

  const predictedCgpa = useMemo(() => {
    if (!isLatestSem || !gradesData) return null;

    let totalCreditsEarned = parseFloat(historyData?.cgpa?.creditsEarned || "0");
    let currentCgpa = parseFloat(historyData?.cgpa?.cgpa || "0");

    // If historyData.cgpa is missing or 0, compute from historyData.courses
    if ((totalCreditsEarned === 0 || isNaN(totalCreditsEarned)) && historyData?.courses && historyData.courses.length > 0) {
      let earned = 0;
      let pointsSum = 0;
      const points: Record<string, number> = { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0 };
      historyData.courses.forEach(c => {
        const cr = parseFloat(c.credits || "0");
        const g = (c.grade || "").trim().toUpperCase();
        if (points[g] !== undefined) {
          earned += cr;
          pointsSum += cr * points[g];
        }
      });
      if (earned > 0) {
        totalCreditsEarned = earned;
        currentCgpa = pointsSum / earned;
      }
    }

    const points: Record<string, number> = { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0 };
    let semCredits = 0;
    let semPoints = 0;

    gradesData.courses.forEach(c => {
      if (c.notIncludedInGpa) return;
      const credit = parseFloat(c.c || c.credits || "0");
      const g = (predictedGrades[c.courseId] || predictedGrades[c.code] || c.grade || "").trim().toUpperCase();
      if (points[g] !== undefined) {
        semCredits += credit;
        semPoints += credit * points[g];
      }
    });

    if (semCredits === 0) return null;

    if (totalCreditsEarned === 0 || currentCgpa === 0 || isNaN(currentCgpa)) {
      return (semPoints / semCredits).toFixed(2);
    }

    const totalPoints = totalCreditsEarned * currentCgpa;
    const newTotalCredits = totalCreditsEarned + semCredits;
    const newTotalPoints = totalPoints + semPoints;
    return (newTotalPoints / newTotalCredits).toFixed(2);
  }, [isLatestSem, historyData, gradesData, predictedGrades]);

  const handleSetPredictedGrades: React.Dispatch<React.SetStateAction<Record<string, string>>> = (
    updater
  ) => {
    setPredictedGrades((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      try {
        if (selectedSem) {
          localStorage.setItem(`retop_pred_grades_${selectedSem}`, JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  return {
    loading,
    gradesData,
    historyData,
    fetchingGrades,
    expandedCourseId,
    fetchingDetails,
    predictedGrades,
    setPredictedGrades: handleSetPredictedGrades,
    offlineMiss,
    handleToggleDetails,
    predictedGpa,
    predictedCgpa,
  };
}
