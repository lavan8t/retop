import React, { useState, useEffect, useMemo } from "react";
import { VTOPNetwork } from "../utils/network";
import { parseMarksSemesters, parseStudentMarks } from "../parsers/marks";
import { CourseMarks } from "../types/vtop";
import { ProgressActivity, Error, Person } from '@nine-thirty-five/material-symbols-react/outlined';
import { motion } from "framer-motion";

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

  useEffect(() => {
    const init = async () => {
      if (semesters.length > 0) {
        setLoading(false);
        return;
      }
      try {
        const html = await network.getMarksView();
        const sems = parseMarksSemesters(html);
        const dropdownSems = sems.map((s) => ({
          id: s.id,
          label: s.name,
          isLatest: false,
        }));
        setSemesters(dropdownSems);
        if (sems.length > 0 && !selectedSem) {
          setSelectedSem(sems[0].id);
        }
      } catch (e) {
        console.error(e);
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
      try {
        const html = await network.getStudentMarks(selectedSem);
        setMarksData(parseStudentMarks(html));
      } catch (e) {
        console.error(e);
      } finally {
        setFetchingMarks(false);
      }
    };
    fetchMarks();
  }, [selectedSem, network]);

  const filteredMarks = useMemo(() => {
    if (!searchQuery) return marksData;
    return marksData.filter(
      (c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [marksData, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-transparent font-mono text-(--text-main) overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-20 md:pt-24 lg:pt-28 space-y-6">
        {loading || fetchingMarks ? (
          <div className="flex flex-col items-center justify-center h-full text-(--text-muted) animate-pulse">
            <ProgressActivity className="w-12 h-12 mb-4 animate-spin text-(--accent-base)" />
            <span className="text-sm font-bold  uppercase">
              {loading ? "Initializing..." : "Fetching Marks..."}
            </span>
          </div>
        ) : filteredMarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-(--text-muted) border-4 border-dashed border-(--border-dim) rounded-4xl bg-(--bg-surface)">
            <Error className="w-16 h-16 mb-4 opacity-20" />
            <span className="text-base font-bold uppercase  mb-0">
              No Marks Found
            </span>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 xl:grid-cols-2 gap-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } },
            }}
          >
            {filteredMarks.map((course, idx) => (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
                className="bg-(--bg-surface) border-4 border-(--border-dim) rounded-4xl overflow-hidden shadow-lg hover:border-(--accent-base) transition-colors group flex flex-col"
              >
                <div className="px-6 py-4 border-b-2 border-(--border-dim) bg-(--bg-highlight) flex flex-col gap-1 shrink-0 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-(--bg-surface) text-(--accent-base) border border-(--border-main) text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                          {course.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold border px-2 py-0.5 rounded 
                            ${
                              course.type.includes("Lab")
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                : "bg-(--bg-main) text-(--text-muted) border-(--border-dim)"
                            }`}
                        >
                          {course.type}
                        </span>
                      </div>
                      <h3 className="font-bold text-(--text-main) text-lg truncate leading-tight group-hover:text-(--accent-base) transition-colors font-expanded mb-0">
                        {course.title}
                      </h3>
                    </div>
                    <div className="text-right shrink-0 pt-1">
                      <div
                        className="text-[10px] text-(--text-muted) font-mono flex items-center gap-1 justify-end bg-(--bg-main) px-2 py-1 rounded border border-(--border-dim)"
                        title="Faculty"
                      >
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
                            className="p-8 text-center text-(--text-muted) italic"
                          >
                            No assessments uploaded yet.
                          </td>
                        </tr>
                      ) : (
                        course.assessments.map((asm, i) => {
                          const isAbsent = asm.status !== "Present";

                          return (
                            <tr
                              key={i}
                              className="hover:bg-(--bg-highlight) transition-colors group/row"
                            >
                              <td
                                className="p-3 pl-6 font-bold text-(--text-main) group-hover/row:text-(--accent-base) transition-colors truncate max-w-37.5"
                                title={asm.title}
                              >
                                {asm.title}
                              </td>

                              {isModernView ? (
                                isAbsent ? (
                                  <td
                                    colSpan={2}
                                    className="p-3 text-center border-l border-(--border-dim)"
                                  >
                                    <span className="text-(--att-text-danger) font-black  uppercase text-[10px] bg-red-500/10 px-3 py-1 rounded">
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
                                        }`}
                                      >
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
                                      }`}
                                    >
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
                                      }`}
                                    >
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
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
