import React, { useState, useEffect, useMemo } from "react";
import { CurriculumCategory, CurriculumCourse } from "../types/vtop";
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  FileDown,
} from "lucide-react";
import { motion } from "framer-motion";

// Import Mock Data
import {
  MOCK_CURRICULUM_CATEGORIES,
  MOCK_CURRICULUM_COURSES,
} from "../utils/mock-data";

interface CurriculumPageProps {
  onBack?: () => void;
  network?: any; // Made optional for the dummy environment
}

export const CurriculumPage: React.FC<CurriculumPageProps> = () => {
  const [loading, setLoading] = useState(true);
  const [totalCredits, setTotalCredits] = useState("0");
  const [categories, setCategories] = useState<CurriculumCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [courses, setCourses] = useState<CurriculumCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    // Simulate network latency
    setTimeout(() => {
      // Mocking total credits sum
      const calculatedTotal = MOCK_CURRICULUM_CATEGORIES.reduce(
        (acc, cat) => acc + parseInt(cat.credits || "0"),
        0,
      );
      setTotalCredits(calculatedTotal.toString());

      setCategories(MOCK_CURRICULUM_CATEGORIES);
      if (MOCK_CURRICULUM_CATEGORIES.length > 0) {
        handleSelectCategory(MOCK_CURRICULUM_CATEGORIES[0]);
      }
      setLoading(false);
    }, 300);
  };

  const handleSelectCategory = async (cat: CurriculumCategory) => {
    if (selectedId === cat.id) return;
    setSelectedId(cat.id);
    setLoadingCourses(true);
    setCourses([]);
    setSearchQuery("");
    setCurrentPage(1);

    // Simulate network latency for category specific courses
    setTimeout(() => {
      setCourses(MOCK_CURRICULUM_COURSES[cat.id] || []);
      setLoadingCourses(false);
    }, 400);
  };

  const selectedCategory = categories.find((c) => c.id === selectedId);

  const filteredCourses = useMemo(() => {
    if (!searchQuery) return courses;
    const lowerQ = searchQuery.toLowerCase();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(lowerQ) ||
        c.code.toLowerCase().includes(lowerQ),
    );
  }, [courses, searchQuery]);

  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCourses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCourses, currentPage]);

  const handleDownload = (code: string) => {
    alert(
      `Mock Download Triggered for Syllabus: ${code}\n\n(Downloads are disabled in the frontend-only environment.)`,
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-row overflow-hidden bg-zinc-950 font-mono text-slate-200"
    >
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-80 flex flex-col border-r-4 border-zinc-800 bg-zinc-900 shrink-0"
      >
        <div className="p-6 border-b-4 border-zinc-800 bg-zinc-950/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-zinc-400 font-bold uppercase tracking-widest text-sm">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <span>Baskets</span>
          </div>
          <div className="text-xs bg-zinc-950 px-3 py-1 rounded-lg text-zinc-200 font-bold border-2 border-zinc-800">
            {totalCredits} Cr
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {loading ? (
            <div className="p-8 text-center text-zinc-600 animate-pulse text-xs font-bold uppercase tracking-widest">
              Syncing...
            </div>
          ) : (
            categories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelectCategory(cat)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group relative overflow-hidden ${selectedId === cat.id ? "bg-zinc-950 border-blue-500 text-zinc-200 shadow-[inset_6px_0px_0px_0px_#3b82f6]" : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-700"}`}
              >
                <div className="min-w-0 z-10">
                  <div className="text-sm font-bold truncate pr-2 font-expanded uppercase tracking-tight">
                    {cat.title}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-1">
                    {cat.credits} / {cat.maxCredits} Cr
                  </div>
                </div>
                {cat.isCompleted && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 z-10" />
                )}
                {selectedId === cat.id && (
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-blue-500/50 transition-all duration-500"
                    style={{
                      width: `${(parseFloat(cat.credits) / parseFloat(cat.maxCredits)) * 100}%`,
                    }}
                  />
                )}
              </motion.button>
            ))
          )}
        </div>
      </motion.div>
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
        <div className="h-20 border-b-4 border-zinc-800 flex items-center justify-between px-8 bg-zinc-900 shrink-0 gap-6 shadow-xl z-20">
          <div className="flex flex-col min-w-0">
            <h2 className="font-expanded font-black text-2xl text-zinc-200 uppercase tracking-tight truncate">
              {selectedCategory?.title || "Curriculum"}
            </h2>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
              {filteredCourses.length} COURSES FOUND
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group hidden sm:block">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-zinc-950 border-2 border-zinc-700 text-zinc-300 text-sm rounded-xl pl-9 pr-4 py-2 w-56 focus:outline-none focus:border-blue-500 focus:text-zinc-200 transition-all placeholder:text-zinc-600"
              />
              <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-2.5 group-focus-within:text-blue-500 transition-colors" />
            </div>
            {courses.length > 0 && (
              <div className="flex items-center gap-2 bg-zinc-950 rounded-xl p-1.5 border-2 border-zinc-700">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-400 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-zinc-200 px-2 min-w-12 text-center">
                  {currentPage} / {totalPages || 1}
                </span>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-400 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loadingCourses ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 animate-pulse">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
              <span className="text-sm font-bold tracking-widest uppercase">
                Fetching Courses...
              </span>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 border-4 border-dashed border-zinc-900 rounded-4xl bg-zinc-900/30">
              <Search className="w-16 h-16 mb-4 opacity-20" />
              <span className="font-bold uppercase tracking-widest">
                No matching courses
              </span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-4 border-zinc-800 rounded-4xl overflow-hidden bg-zinc-900 shadow-lg"
            >
              <table className="w-full text-left border-collapse table-fixed min-w-200">
                <thead className="sticky top-0 bg-zinc-950 z-10 shadow-md">
                  <tr className="text-blue-400 font-expanded font-bold text-sm uppercase tracking-wider border-b-2 border-zinc-800">
                    <th className="py-4 px-6 w-[15%]">Code</th>
                    <th className="py-4 px-4 w-[50%]">Course Title</th>
                    <th className="py-4 px-4 w-[20%] text-center">Type</th>
                    <th className="py-4 px-4 w-[15%] text-center pr-6">
                      Credits
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm font-mono text-zinc-300 divide-y divide-zinc-800/50">
                  {paginatedCourses.map((c, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="group hover:bg-zinc-800 transition-colors"
                    >
                      <td className="py-3 px-6 font-black text-zinc-200 group-hover:text-blue-400 truncate transition-colors">
                        {c.code}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDownload(c.code)}
                          className="text-left flex items-center gap-2 group/link w-full max-w-full"
                        >
                          <span className="font-bold truncate text-zinc-200 group-hover/link:text-zinc-100 group-hover/link:underline decoration-blue-500/50 underline-offset-4 decoration-2 transition-all">
                            {c.title}
                          </span>
                          <FileDown className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity text-blue-500 shrink-0" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${c.type.includes("L") ? "bg-purple-950/30 text-purple-400 border-purple-900/50" : "bg-blue-950/30 text-blue-400 border-blue-900/50"}`}
                        >
                          {c.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-200 text-center pr-6">
                        {c.credits}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
