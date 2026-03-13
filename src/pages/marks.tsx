import React, { useState, useEffect, useMemo } from "react";
import { MarksSemester, CourseMarks } from "../types/vtop";
import { Loader2, AlertCircle, Search, User } from "lucide-react";
import { motion } from "framer-motion";
import { SemesterDropdown } from "../components/timetable/SemesterDropdown";

// Import Mock Data
import { MOCK_MARKS_SEMESTERS, MOCK_COURSE_MARKS } from "../utils/mock-data";

interface MarksPageProps {
  onBack?: () => void;
  network?: any; // Made optional for the dummy environment
}

export const MarksPage: React.FC<MarksPageProps> = () => {
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<MarksSemester[]>([]);
  const [selectedSem, setSelectedSem] = useState<string>("");
  const [marksData, setMarksData] = useState<CourseMarks[]>([]);
  const [fetchingMarks, setFetchingMarks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const init = async () => {
      // Simulate network request for semesters
      setTimeout(() => {
        setSemesters(MOCK_MARKS_SEMESTERS);
        if (MOCK_MARKS_SEMESTERS.length > 0) {
          const defaultSemId = MOCK_MARKS_SEMESTERS[0].id;
          setSelectedSem(defaultSemId);
          fetchMarks(defaultSemId);
        }
        setLoading(false);
      }, 300);
    };
    init();
  }, []);

  const fetchMarks = async (semId: string) => {
    setFetchingMarks(true);
    setMarksData([]);

    // Simulate network request for specific semester marks
    setTimeout(() => {
      // In a real app we would fetch based on semId.
      // For mock, we just load the static MOCK_COURSE_MARKS.
      setMarksData(MOCK_COURSE_MARKS);
      setFetchingMarks(false);
    }, 450);
  };

  const filteredMarks = useMemo(() => {
    if (!searchQuery) return marksData;
    return marksData.filter(
      (c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [marksData, searchQuery]);

  const dropdownSemesters = useMemo(
    () =>
      semesters.map((s) => ({
        id: s.id,
        label: s.name,
        isLatest: false,
      })),
    [semesters],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-zinc-950 font-mono text-slate-200 overflow-hidden"
    >
      <div className="h-20 border-b-4 border-zinc-800 bg-zinc-900 shrink-0 px-6 flex items-center justify-between shadow-xl z-20">
        <div className="flex flex-col">
          <h2 className="font-expanded font-black text-2xl text-zinc-200 uppercase tracking-tight mb-0">
            Exam Results
          </h2>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
            {fetchingMarks
              ? "SYNCING..."
              : `${filteredMarks.length} COURSES FOUND`}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group hidden sm:block">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950 border-2 border-zinc-700 text-zinc-300 text-sm rounded-xl pl-9 pr-4 py-2 w-48 focus:outline-none focus:border-blue-500 focus:text-zinc-200 transition-all placeholder:text-zinc-600"
            />
            <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-2.5 group-focus-within:text-blue-500 transition-colors" />
          </div>

          <SemesterDropdown
            semesters={dropdownSemesters}
            selectedId={selectedSem}
            onChange={(id: string) => {
              setSelectedSem(id);
              fetchMarks(id);
            }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 animate-pulse">
            <Loader2 className="w-12 h-12 mb-4 animate-spin text-blue-500" />
            <span className="text-sm font-bold tracking-widest uppercase">
              Initializing...
            </span>
          </div>
        ) : fetchingMarks ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 animate-pulse">
            <Loader2 className="w-12 h-12 mb-4 animate-spin text-blue-500" />
            <span className="text-sm font-bold tracking-widest uppercase">
              Fetching Marks...
            </span>
          </div>
        ) : filteredMarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 border-4 border-dashed border-zinc-900 rounded-4xl bg-zinc-900/30">
            <AlertCircle className="w-16 h-16 mb-4 opacity-20" />
            <span className="text-base font-bold uppercase tracking-widest mb-0">
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
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 },
              },
            }}
          >
            {filteredMarks.map((course, idx) => (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
                className="bg-white dark:bg-zinc-900 border-4 border-zinc-200 dark:border-zinc-800 rounded-4xl overflow-hidden shadow-lg hover:border-blue-400 dark:hover:border-blue-500/30 transition-colors group flex flex-col"
              >
                <div className="px-6 py-4 border-b-2 border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/50 flex flex-col gap-1 shrink-0 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                          {course.code}
                        </span>

                        <span
                          className={`text-[10px] font-bold border px-2 py-0.5 rounded 
                            ${
                              course.type.includes("Lab")
                                ? "bg-purple-50 text-purple-900 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50"
                                : "bg-zinc-50 text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800"
                            }`}
                        >
                          {course.type}
                        </span>
                      </div>
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-200 text-lg truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-expanded mb-0">
                        {course.title}
                      </h3>
                    </div>
                    <div className="text-right shrink-0 pt-1">
                      <div
                        className="text-[10px] text-zinc-600 dark:text-zinc-500 font-mono flex items-center gap-1 justify-end bg-white dark:bg-zinc-950 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800"
                        title="Faculty"
                      >
                        <User className="w-3 h-3" /> {course.faculty || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-100">
                    <thead className="bg-zinc-200 dark:bg-zinc-950/80 text-[10px] font-bold text-black dark:text-zinc-500 uppercase font-expanded tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="p-3 pl-6 w-5/12">Assessment</th>
                        <th className="p-3 text-center border-l border-zinc-300 dark:border-zinc-800/50">
                          Max
                        </th>
                        <th className="p-3 text-center border-l border-zinc-300 dark:border-zinc-800/50">
                          Weight
                        </th>
                        <th className="p-3 text-center border-l border-zinc-300 dark:border-zinc-800/50">
                          Status
                        </th>
                        <th className="p-3 text-center border-l border-zinc-300 dark:border-zinc-800/50">
                          Scored
                        </th>
                        <th className="p-3 text-right pr-6 border-l border-zinc-300 dark:border-zinc-800/50">
                          W.Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50 font-mono text-zinc-900 dark:text-zinc-300">
                      {course.assessments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-8 text-center text-zinc-500 dark:text-zinc-600 italic"
                          >
                            No assessments uploaded yet.
                          </td>
                        </tr>
                      ) : (
                        course.assessments.map((asm, i) => (
                          <tr
                            key={i}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group/row"
                          >
                            <td
                              className="p-3 pl-6 font-bold text-zinc-700 dark:text-zinc-400 group-hover/row:text-black dark:group-hover/row:text-zinc-200 transition-colors truncate max-w-37.5"
                              title={asm.title}
                            >
                              {asm.title}
                            </td>
                            <td className="p-3 text-center text-zinc-600 dark:text-zinc-500 border-l border-zinc-200 dark:border-zinc-800/50">
                              {asm.maxMark}
                            </td>
                            <td className="p-3 text-center text-zinc-600 dark:text-zinc-500 border-l border-zinc-200 dark:border-zinc-800/50">
                              {asm.weightage}
                            </td>
                            <td className="p-3 text-center border-l border-zinc-200 dark:border-zinc-800/50">
                              <span
                                className={`text-[10px] font-bold uppercase ${
                                  asm.status === "Present"
                                    ? "text-emerald-700 dark:text-emerald-500"
                                    : "text-red-700 dark:text-red-500"
                                }`}
                              >
                                {asm.status}
                              </span>
                            </td>
                            <td className="p-3 text-center border-l border-zinc-200 dark:border-zinc-800/50 font-bold text-black dark:text-zinc-200 text-sm">
                              {asm.scoredMark}
                            </td>
                            <td className="p-3 text-right pr-6 border-l border-zinc-200 dark:border-zinc-800/50 bg-transparent dark:bg-zinc-950/30">
                              <span
                                className={`font-bold text-sm ${
                                  asm.scoredPercentage === "-" ||
                                  parseFloat(asm.scoredPercentage) === 0
                                    ? "text-zinc-400 dark:text-zinc-600"
                                    : "text-black dark:text-zinc-200"
                                }`}
                              >
                                {asm.scoredPercentage}
                              </span>
                            </td>
                          </tr>
                        ))
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
