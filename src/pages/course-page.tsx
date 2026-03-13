import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Download,
  BookOpen,
  List,
  Layers,
  FileText,
  User,
  Filter,
  ChevronDown,
} from "lucide-react";

// Import our Mock Data instead of Network/Parsers
import {
  MOCK_COURSE_OPTIONS,
  MOCK_COURSE_OUTCOMES,
  MOCK_COURSE_SYLLABUS,
  MOCK_COURSE_MATERIALS,
} from "../utils/mock-data";
import {
  CoursePageData,
  CoursePageOption,
  Semester,
  MenuCategory,
} from "../types/vtop";

interface CoursePageProps {
  network?: any; // Made optional to prevent errors in ContentRouter
  menu: MenuCategory[];
  cpOptions: CoursePageOption[];
  setCpOptions: (opts: CoursePageOption[]) => void;
  cpSemesters: Semester[];
  setCpSemesters: (sems: Semester[]) => void;
  selectedSem: string;
  setSelectedSem: (sem: string) => void;
  selectedOptionId: string;
  setSelectedOptionId: (id: string) => void;
}

const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

const NeoCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-zinc-900 border-4 border-zinc-800 rounded-4xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${className}`}
  >
    {children}
  </div>
);

// Normalizes semester strings to handle variations in topbar vs course options
const isSameSem = (sem1: string, sem2: string) => {
  if (!sem1 || !sem2) return false;
  const normalize = (s: string) => s.replace(/0+([1-9])$/, "$1").toLowerCase();
  return normalize(sem1) === normalize(sem2);
};

export const CoursePage = ({
  cpOptions,
  setCpOptions,
  selectedSem,
  selectedOptionId,
  setSelectedOptionId,
}: CoursePageProps) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CoursePageData | null>(null);
  const [view, setView] = useState<"materials" | "outcomes" | "syllabus">(
    "materials",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isCourseListOpen, setIsCourseListOpen] = useState(false);

  useEffect(() => {
    if (!selectedOptionId) {
      setData(null);
      setIsCourseListOpen(true);
    }
  }, [selectedOptionId]);

  useEffect(() => {
    setIsCourseListOpen(false);
  }, [selectedSem]);

  // 1. Initial Mock Fetch for Course Options
  useEffect(() => {
    if (cpOptions.length > 0) return;

    // Simulate network latency
    const timer = setTimeout(() => {
      setCpOptions(MOCK_COURSE_OPTIONS);
    }, 300);

    return () => clearTimeout(timer);
  }, [cpOptions.length, setCpOptions]);

  // 2. Fetch specific mock course details
  useEffect(() => {
    if (!selectedOptionId || !selectedSem || cpOptions.length === 0) return;

    const opt = cpOptions.find(
      (o) =>
        o.classId === selectedOptionId && isSameSem(o.semester, selectedSem),
    );
    if (!opt) return;

    setLoading(true);

    // Simulate network latency for loading specific course data
    const timer = setTimeout(() => {
      setData({
        options: cpOptions,
        selectedCourseId: selectedOptionId,
        outcomes: MOCK_COURSE_OUTCOMES,
        syllabus: MOCK_COURSE_SYLLABUS,
        materials: MOCK_COURSE_MATERIALS,
      });
      setLoading(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [selectedOptionId, selectedSem, cpOptions]);

  const handleDownload = (fileId: string) => {
    alert(
      `Mock Download Triggered for Document ID: ${fileId}\n\n(Downloads are disabled in the frontend-only environment.)`,
    );
  };

  const currentOption = cpOptions.find((o) => o.classId === selectedOptionId);
  const currentSemOptions = cpOptions.filter((o) =>
    isSameSem(o.semester, selectedSem),
  );

  const filteredMaterials =
    data?.materials.filter((m) => {
      const term = searchTerm.toLowerCase();
      return (
        m.title.toLowerCase().includes(term) ||
        m.faculty.toLowerCase().includes(term) ||
        m.category.toLowerCase().includes(term)
      );
    }) || [];

  return (
    <div className="p-6 h-full flex flex-col bg-zinc-950 font-mono transition-colors text-zinc-200 overflow-hidden min-h-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* === STATIC LEFT PANEL === */}
        <div className="lg:col-span-4 xl:col-span-3 h-full flex flex-col overflow-hidden min-h-0">
          <div className="h-full flex flex-col pr-2 min-h-0 pb-4 overflow-y-auto custom-scrollbar">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="shrink-0 mb-6"
            >
              <NeoCard className="p-0 overflow-hidden flex flex-col">
                <button
                  onClick={() => setIsCourseListOpen(!isCourseListOpen)}
                  className={`flex items-center justify-between p-5 w-full transition-all text-left group ${
                    isCourseListOpen
                      ? "bg-cyan-400 text-black border-b-4 border-black"
                      : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-4">
                    <span
                      className={`text-[10px] font-black tracking-widest uppercase mb-1 ${isCourseListOpen ? "text-black/60" : "text-zinc-500 group-hover:text-zinc-400"}`}
                    >
                      Selected Subject
                    </span>
                    <span className="font-bold text-sm truncate uppercase tracking-wide">
                      {currentOption ? currentOption.code : "CHOOSE A SUBJECT"}
                    </span>
                    {currentOption && !isCourseListOpen && (
                      <span className="text-[10px] font-bold text-zinc-400 truncate mt-1">
                        {currentOption.title}
                      </span>
                    )}
                  </div>
                  <div
                    className={`p-2 rounded-xl transition-transform duration-300 border-2 ${isCourseListOpen ? "border-black/20 bg-black/10 rotate-180" : "border-zinc-800 bg-zinc-950 group-hover:border-zinc-700"}`}
                  >
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  </div>
                </button>

                <AnimatePresence>
                  {isCourseListOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-zinc-950"
                    >
                      <div className="max-h-[40vh] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1 border-b-4 border-black">
                        {currentSemOptions.map((opt) => (
                          <button
                            key={opt.classId}
                            onClick={() => {
                              setSelectedOptionId(opt.classId);
                              setIsCourseListOpen(false);
                            }}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex flex-col gap-1 ${
                              opt.classId === selectedOptionId
                                ? "bg-zinc-800 border-zinc-700 text-zinc-200 shadow-sm"
                                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 hover:border-zinc-800"
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-bold text-sm leading-none">
                                {opt.code}
                              </span>
                              <span className="text-[9px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                                {opt.type}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold opacity-70 truncate w-full">
                              {opt.title}
                            </span>
                          </button>
                        ))}
                        {currentSemOptions.length === 0 && (
                          <div className="p-6 text-center text-xs font-bold text-zinc-600 uppercase">
                            No subjects found
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {!isCourseListOpen && currentOption && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-5 bg-zinc-900"
                    >
                      <div className="flex flex-col gap-4 font-bold text-zinc-300 border-t-2 border-zinc-800 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500 tracking-widest uppercase">
                            Credits
                          </span>
                          <span className="bg-cyan-400 text-black border-2 border-black px-2 py-0.5 rounded-lg text-xs shadow-sm">
                            {currentOption.credits}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500 tracking-widest uppercase">
                            Class Type
                          </span>
                          <span className="bg-purple-400 text-black border-2 border-black px-2 py-0.5 rounded-lg text-xs shadow-sm">
                            {currentOption.type}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </NeoCard>
            </motion.div>

            {selectedOptionId && view === "materials" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full shrink-0"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter materials..."
                  className="w-full pl-10 pr-4 py-4 border-4 border-zinc-800 rounded-4xl bg-zinc-900 text-sm font-bold text-zinc-200 focus:outline-none focus:border-cyan-400 focus:shadow-[4px_4px_0px_0px_var(--card-cyan)] transition-all placeholder:text-zinc-600 uppercase"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* === DYNAMIC RIGHT PANEL === */}
        <div className="lg:col-span-8 xl:col-span-9 h-full flex flex-col min-w-0 min-h-0 overflow-hidden">
          {!selectedOptionId ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-8 min-h-0"
            >
              <div className="bg-zinc-900 p-12 rounded-4xl border-4 border-dashed border-zinc-800 text-center max-w-lg opacity-80 shadow-xl">
                <Layers className="w-20 h-20 mx-auto mb-6 text-zinc-700" />
                <h2 className="text-2xl font-black font-expanded mb-2 uppercase text-zinc-500">
                  Subject Needed
                </h2>
                <p className="font-bold text-zinc-600 text-sm">
                  Please select a subject from the left panel to view its
                  details.
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* HORIZONTAL TABS */}
              <div className="flex flex-wrap gap-3 mb-4 pb-4 pt-2">
                {[
                  {
                    id: "materials",
                    label: "MATERIALS",
                    icon: Download,
                    color: "bg-cyan-400",
                  },
                  {
                    id: "outcomes",
                    label: "OUTCOMES",
                    icon: List,
                    color: "bg-purple-400",
                  },
                  {
                    id: "syllabus",
                    label: "SYLLABUS",
                    icon: BookOpen,
                    color: "bg-orange-400",
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setView(tab.id as any)}
                    className={`px-5 py-3 rounded-[1.25rem] font-black flex items-center gap-3 transition-all border-4 ${
                      view === tab.id
                        ? `${tab.color} text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1`
                        : "bg-zinc-900 text-zinc-500 border-transparent hover:border-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    <tab.icon
                      className={`w-5 h-5 ${view === tab.id ? "text-black" : "text-zinc-500"}`}
                    />
                    <span className="text-sm tracking-wide">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center border-4 border-dashed border-zinc-800 rounded-4xl bg-(--bg-main)">
                    <Layers className="w-12 h-12 text-cyan-400 animate-bounce mb-4" />
                    <span className="text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
                      Fetching Data...
                    </span>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {view === "materials" && data && (
                      <motion.div
                        key="materials"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={spring}
                        className="h-full flex flex-col overflow-hidden min-h-0"
                      >
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-900 border-4 border-zinc-800 rounded-4xl p-4 shadow-inner min-h-0 pr-4">
                          <div className="space-y-3 pb-2">
                            {filteredMaterials.map((mat) => (
                              <motion.div
                                layout
                                key={mat.id}
                                whileHover={{ scale: 1.005, x: 2 }}
                                onClick={() => handleDownload(mat.downloadId)}
                                className="group flex items-center justify-between p-4 rounded-xl cursor-pointer bg-zinc-950 border-2 border-zinc-800 hover:border-cyan-400 hover:bg-zinc-900 hover:shadow-md transition-all"
                              >
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 border-2 border-zinc-800 rounded-xl text-zinc-500 group-hover:text-cyan-400 group-hover:border-cyan-400 transition-colors shrink-0">
                                    <FileText className="w-6 h-6" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-zinc-200 text-base group-hover:text-cyan-400 transition-colors truncate">
                                      {mat.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                        <User className="w-3 h-3" />{" "}
                                        {mat.faculty}
                                      </span>
                                      <span className="text-[10px] font-mono text-zinc-600">
                                        {mat.uploadDate}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 pl-4">
                                  <span className="hidden sm:block px-2 py-1 bg-yellow-400 text-yellow-900 rounded-lg text-[10px] font-black uppercase tracking-wider border border-yellow-500 shadow-sm">
                                    {mat.category}
                                  </span>
                                  <button className="p-2.5 rounded-lg bg-zinc-900 border-2 border-zinc-800 text-zinc-400 group-hover:bg-black group-hover:text-white group-hover:border-black transition-all shadow-sm">
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                            {filteredMaterials.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                                <Filter className="w-12 h-12 mb-4 opacity-20" />
                                <span className="font-bold uppercase tracking-widest text-xs">
                                  No matching files
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {view === "outcomes" && data && (
                      <motion.div
                        key="outcomes"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={spring}
                        className="h-full overflow-y-auto custom-scrollbar space-y-4 pr-4 pb-4 min-h-0"
                      >
                        {data.outcomes.map((oc, i) => (
                          <div
                            key={i}
                            className="flex gap-4 p-6 bg-zinc-900 border-4 border-zinc-800 rounded-4xl hover:border-purple-400 transition-colors shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shrink-0"
                          >
                            <span className="font-black text-3xl text-purple-400 select-none font-expanded">
                              #{oc.number || i + 1}
                            </span>
                            <p className="font-bold text-sm text-zinc-300 leading-relaxed pt-1 font-mono">
                              {oc.description}
                            </p>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {view === "syllabus" && data && (
                      <motion.div
                        key="syllabus"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={spring}
                        className="h-full overflow-y-auto custom-scrollbar space-y-6 pr-4 pb-4 min-h-0"
                      >
                        {data.syllabus.map((mod, i) => (
                          <div
                            key={i}
                            className="bg-zinc-900 border-4 border-zinc-800 rounded-4xl overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shrink-0"
                          >
                            <div className="bg-zinc-950 p-4 border-b-4 border-zinc-800 flex justify-between items-center">
                              <span className="font-black text-orange-400 uppercase text-xs tracking-widest font-expanded">
                                Module {mod.number}
                              </span>
                              <span className="font-bold text-[10px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded border-2 border-zinc-800 uppercase">
                                {mod.title}
                              </span>
                            </div>
                            <div className="p-6 text-sm font-medium text-zinc-400 leading-7 whitespace-pre-wrap font-mono">
                              {mod.topics}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
