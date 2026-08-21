import React, { useState, useEffect, useMemo } from "react";
import { VTOPNetwork } from "../utils/network";
import { parseMarksSemesters, parseStudentMarks } from "../parsers/marks";
import { CourseMarks } from "../types/vtop";
import {
  ProgressActivity,
  Error,
  Person,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { EmptyState } from "../components/EmptyState";

import { useDataStore } from "../store/dataStore";
import { OfflineNotSynced } from "../components/ui/OfflineNotSynced";

interface MarksPageProps {
  network: VTOPNetwork;
  semesters: { id: string; label: string }[];
  setSemesters: (sems: { id: string; label: string }[]) => void;
  selectedSem: string;
  setSelectedSem: (sem: string) => void;
  searchQuery: string;
  isModernView: boolean;
}

export const MarksPage: React.FC<MarksPageProps> = ({
  network,
  semesters,
  setSemesters,
  selectedSem,
  setSelectedSem,
  searchQuery,
  isModernView,
}) => {
  const [loading, setLoading] = useState(true);
  const [marksData, setMarksData] = useState<CourseMarks[]>([]);
  const [fetchingMarks, setFetchingMarks] = useState(false);
  const [offlineMiss, setOfflineMiss] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (semesters.length > 0) {
        if (!selectedSem) setSelectedSem(semesters[0].id);
        setLoading(false);
        return;
      }
      if (useDataStore.getState().status === "Demo Mode Active") {
        setSemesters([{ id: "demo", label: "Fall Semester 2026-27" }]);
        setSelectedSem("demo");
        setLoading(false);
        return;
      }
      try {
        const html = await network.getMarksView();
        const sems = typeof html === "string" ? parseMarksSemesters(html) : html;
        let dropdownSems = (Array.isArray(sems) ? sems : []).map((s: any) => ({
          id: s.id,
          label: s.label,
          isLatest: s.isLatest,
        }));

        // Fallback: If marks page select is empty or pending, fallback to timetable semesters
        if (dropdownSems.length === 0) {
          const ttSems = useDataStore.getState().ttSemesters;
          if (ttSems && ttSems.length > 0) {
            dropdownSems = ttSems;
          }
        }

        setSemesters(dropdownSems);
        if (dropdownSems.length > 0 && !selectedSem) {
          setSelectedSem(dropdownSems[0].id);
        }
      } catch (e) {
        if (e instanceof globalThis.Error && e.message === "OFFLINE_CACHE_MISS") {
          setOfflineMiss(true);
        } else {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [network, semesters.length]);

  useEffect(() => {
    if (!selectedSem) return;
    const fetchMarks = async () => {
      setFetchingMarks(true);
      setMarksData([]);
      
      if (useDataStore.getState().status === "Demo Mode Active") {
        setMarksData([
          {
            classNumber: "123",
            code: "CSE1001",
            title: "Problem Solving and Programming",
            type: "TH",
            credits: "3",
            faculty: "Dr. Demo",
            slot: "A1",
            assessments: [{ title: "CAT 1", maxMark: "50", weightage: "15", status: "Attended", scoredMark: "45", scoredPercentage: "13.5" }]
          }
        ]);
        setFetchingMarks(false);
        return;
      }

      try {
        const isPastSemester = semesters.length > 0 && selectedSem !== semesters[0].id;
        const html = await network.getStudentMarks(selectedSem, false, isPastSemester);
        const parsedMarks = typeof html === "string" ? parseStudentMarks(html) : html;
        setMarksData(parsedMarks);
        setOfflineMiss(false);
      } catch (e) {
        if (e instanceof globalThis.Error && e.message === "OFFLINE_CACHE_MISS") {
          setOfflineMiss(true);
        } else {
          console.error(e);
        }
      } finally {
        setFetchingMarks(false);
      }
    };
    fetchMarks();

    const handleRefresh = () => {
      fetchMarks();
    };
    window.addEventListener("retop-refresh-marks", handleRefresh);
    return () => window.removeEventListener("retop-refresh-marks", handleRefresh);
  }, [selectedSem, network, semesters]);

  const filteredMarks = useMemo(() => {
    let result = marksData;
    if (searchQuery) {
      result = marksData.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    
    return [...result].sort((a, b) => {
      const getBase = (code: string) => {
         const lastChar = code.slice(-1);
         if (lastChar === 'L' || lastChar === 'P') return code.slice(0, -1);
         return code;
      };
      const baseA = getBase(a.code);
      const baseB = getBase(b.code);
      
      if (baseA < baseB) return -1;
      if (baseA> baseB) return 1;
      
      const lastA = a.code.slice(-1);
      const lastB = b.code.slice(-1);
      if (lastA === 'L' && lastB === 'P') return -1;
      if (lastA === 'P' && lastB === 'L') return 1;
      
      return 0;
    });
  }, [marksData, searchQuery]);

  if (offlineMiss) {
    return (
      <div className="h-full pt-16 md:pt-20 lg:pt-24 pb-32 md:pb-12">
        <OfflineNotSynced pageName="Marks" />
      </div>
    );
  }

  return (
    <div
 
 
      className="h-full flex flex-col bg-transparent font-mono text-(--text-main) overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-4 pt-16 md:pt-20 lg:pt-24 pb-32 md:pb-12">
        <div className="max-w-345 mx-auto space-y-6">
        {loading || fetchingMarks ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-(--bg-surface) border-4 border-(--border-dim) rounded-4xl h-64 w-full" />
            ))}
          </div>
        ) : filteredMarks.length === 0 ? (
          <EmptyState msg="No Marks Found" icon={Error} />
        ) : (
          <div
            className="columns-1 xl:columns-2 gap-6">
            {filteredMarks.map((course, idx) => (
              <div
                key={idx}
 
                className="bg-(--bg-surface) rounded-4xl overflow-hidden group flex flex-col break-inside-avoid mb-6">
                <div className="px-6 py-4 bg-(--bg-highlight) flex flex-col gap-1 shrink-0 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-(--text-main) text-(--bg-main) text-[10px] font-bold px-3 py-1 rounded-full font-mono uppercase">
                          {course.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-3 py-1 rounded-full 
                            ${
                              course.type.includes("Lab")
                                ? "bg-purple-500 text-(--bg-main)"
                                : "bg-(--text-main) text-(--bg-main)"
                            }`}>
                          {course.type}
                        </span>
                      </div>
                      <h3 className="font-bold text-(--text-main) text-lg truncate leading-tight group-hover:text-(--accent-base) transition-colors font-expanded mb-0">
                        {course.title}
                      </h3>
                    </div>
                    <div className="text-right shrink-0 pt-1">
                      <div
                        className="text-[10px] text-(--text-muted) font-mono flex items-center gap-1 justify-end bg-(--bg-main) px-3 py-1 rounded-full"
                        title="Faculty">
                        <Person className="w-3 h-3" /> {course.faculty || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-100">
                    <thead className="bg-(--bg-highlight) text-[10px] font-bold text-(--text-muted) uppercase font-expanded  border-b border-(--border-main)">
                      <tr>
                        <th className="p-3 pl-6 w-5/12">Assessment</th>
                        {isModernView ? (
                          <>
                            <th className="p-3 text-center border-l border-(--border-main)">
                              Marks
                            </th>
                            <th className="p-3 text-right pr-6 border-l border-(--border-main)">
                              Weightage
                            </th>
                          </>
                        ) : (
                          <>
                            <th className="p-3 text-center border-l border-(--border-main)">
                              Max
                            </th>
                            <th className="p-3 text-center border-l border-(--border-main)">
                              Weight
                            </th>
                            <th className="p-3 text-center border-l border-(--border-main)">
                              Status
                            </th>
                            <th className="p-3 text-center border-l border-(--border-main)">
                              Scored
                            </th>
                            <th className="p-3 text-right pr-6 border-l border-(--border-main)">
                              W.Score
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--border-dim) font-mono text-(--text-main)">
                      {course.assessments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isModernView ? 3 : 6}
                            className="p-8 text-center text-(--text-muted) italic">
                            No assessments uploaded yet.
                          </td>
                        </tr>
                      ) : (
                        course.assessments.map((asm, i) => {
                          const isAbsent = asm.status !== "Present";

                          return (
                            <tr
                              key={i}
                              className="hover:bg-(--bg-highlight) transition-colors group/row">
                              <td
                                className="p-3 pl-6 font-bold text-(--text-main) group-hover/row:text-(--accent-base) transition-colors truncate max-w-37.5"
                                title={asm.title}>
                                {asm.title}
                              </td>

                              {isModernView ? (
                                isAbsent ? (
                                  <td
                                    colSpan={2}
                                    className="p-3 text-center border-l border-(--border-dim)">
                                    <span className="bg-att-danger text-(--bg-main) font-black uppercase text-[10px] px-3 py-1 rounded-full">
                                      Absent
                                    </span>
                                  </td>
                                ) : (
                                  <>
                                    <td className="p-3 text-center border-l border-(--border-dim)">
                                      <span className="font-bold text-(--text-main) text-sm">
                                        {asm.scoredMark}
                                      </span>
                                      <span className="text-(--text-muted) font-normal text-xs ml-1">
                                        / {asm.maxMark}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right pr-6 border-l border-(--border-dim) bg-transparent">
                                      <span
                                        className={`font-bold text-sm ${
                                          asm.scoredPercentage === "-" ||
                                          parseFloat(asm.scoredPercentage) === 0
                                            ? "text-(--text-muted)"
                                            : "text-(--text-main)"
                                        }`}>
                                        {asm.scoredPercentage}
                                      </span>
                                      <span className="text-(--text-muted) font-normal text-xs ml-1">
                                        / {asm.weightage}
                                      </span>
                                    </td>
                                  </>
                                )
                              ) : (
                                <>
                                  <td className="p-3 text-center text-(--text-muted) border-l border-(--border-dim)">
                                    {asm.maxMark}
                                  </td>
                                  <td className="p-3 text-center text-(--text-muted) border-l border-(--border-dim)">
                                    {asm.weightage}
                                  </td>
                                  <td className="p-3 text-center border-l border-(--border-dim)">
                                    <span
                                      className={`text-[10px] font-bold uppercase ${
                                        asm.status === "Present"
                                          ? "text-(--att-text-safe)"
                                          : "text-(--att-text-danger)"
                                      }`}>
                                      {asm.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center border-l border-(--border-dim) font-bold text-(--text-main) text-sm">
                                    {asm.scoredMark}
                                  </td>
                                  <td className="p-3 text-right pr-6 border-l border-(--border-dim) bg-transparent">
                                    <span
                                      className={`font-bold text-sm ${
                                        asm.scoredPercentage === "-" ||
                                        parseFloat(asm.scoredPercentage) === 0
                                          ? "text-(--text-muted)"
                                          : "text-(--text-main)"
                                      }`}>
                                      {asm.scoredPercentage}
                                    </span>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
