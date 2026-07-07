import React, { useState, useEffect, useMemo } from "react";
import { MaterialSwitch } from "../components/MaterialSwitch";
import { VTOPNetwork } from "../utils/network";
import {
  parseCurriculumDashboard,
  parseCurriculumCategoryTable,
} from "../parsers/curriculum";
import { parseGradeHistory } from "../parsers/grades";
import { CurriculumCategory, CurriculumCourse } from "../types/vtop";
import {
  CheckCircle,
  Search,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { EmptyState } from "../components/EmptyState";
import { motion, AnimatePresence } from "framer-motion";

interface CurriculumPageProps {
  onBack: () => void;
  network: VTOPNetwork;
}

export const CurriculumPage: React.FC<CurriculumPageProps> = ({ network }) => {
  const [loading, setLoading] = useState(true);
  const [totalCredits, setTotalCredits] = useState("0");
  const [categories, setCategories] = useState<CurriculumCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allCourses, setAllCourses] = useState<Record<string, CurriculumCourse[]>>({});
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [completedCourseCodes, setCompletedCourseCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [html, historyHtml] = await Promise.all([
        network.getCurriculumDashboard(),
        network.getStudentGradeHistory().catch(() => ""),
      ]);
      const data = parseCurriculumDashboard(html);
      
      const completedCodes = new Set<string>();
      if (historyHtml) {
        try {
          const historyData = parseGradeHistory(historyHtml);
          historyData.courses.forEach(c => {
            if (c.grade !== "F" && c.grade !== "N" && c.grade !== "W" && c.grade !== "U") {
              completedCodes.add(c.code);
            }
          });
        } catch (e) {
          console.error("Failed to parse grade history", e);
        }
      }
      setCompletedCourseCodes(completedCodes);

      setTotalCredits(data.totalCredits);
      setCategories(data.categories);
      if (data.categories.length > 0) setSelectedId(data.categories[0].id);
      setLoading(false);

      setLoadingCourses(true);
      const categoryPromises = data.categories.map(cat => 
        network.getCurriculumCategory(cat.id).then(catHtml => ({
          id: cat.id,
          courses: parseCurriculumCategoryTable(catHtml)
        })).catch(() => ({ id: cat.id, courses: [] as CurriculumCourse[] }))
      );
      const catResults = await Promise.all(categoryPromises);
      const coursesMap: Record<string, CurriculumCourse[]> = {};
      catResults.forEach(res => coursesMap[res.id] = res.courses);
      setAllCourses(coursesMap);
      setLoadingCourses(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setLoadingCourses(false);
    }
  };

  const handleSelectCategory = async (cat: CurriculumCategory) => {
    if (selectedId === cat.id) return;
    setSelectedId(cat.id);
  };

  const filteredCourses = useMemo(() => {
    let result: CurriculumCourse[] = [];
    
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      const uniqueCodes = new Set<string>();
      Object.values(allCourses).forEach(catCourses => {
        catCourses.forEach(c => {
          if (!uniqueCodes.has(c.code) && (c.title.toLowerCase().includes(lowerQ) || c.code.toLowerCase().includes(lowerQ))) {
            uniqueCodes.add(c.code);
            result.push(c);
          }
        });
      });
    } else {
      result = selectedId && allCourses[selectedId] ? allCourses[selectedId] : [];
    }

    result = result.map(c => ({
      ...c,
      isCompleted: c.isCompleted || completedCourseCodes.has(c.code)
    }));
    
    if (hideCompleted) {
      result = result.filter((c) => !c.isCompleted);
    }
    
    return result;
  }, [allCourses, selectedId, searchQuery, hideCompleted, completedCourseCodes]);

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar bg-(--bg-main) relative">
      <div className="fixed top-3.5 md:top-4 right-[4.5rem] md:right-[5.5rem] z-[101] pointer-events-auto flex items-center gap-3">
        <div className="flex items-center gap-2 px-2 hidden sm:flex">
          <span className="text-[10px] md:text-xs font-black text-(--text-muted) uppercase tracking-wider">
            Hide Done
          </span>
          <MaterialSwitch 
            selected={hideCompleted} 
            onChange={(checked) => setHideCompleted(checked)}
          />
        </div>
        <div className="relative group hidden sm:block">
          <input
            type="text"
            placeholder="Search all courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-(--bg-surface) border border-(--border-dim) text-(--text-main) text-xs md:text-sm rounded-2xl pl-10 pr-4 py-2 w-48 md:w-64 focus:outline-none focus:border-(--accent-base) focus:ring-4 focus:ring-(--accent-base)/10 transition-all duration-300 placeholder:text-(--text-muted) shadow-sm"
          />
          <Search className="w-4 h-4 text-(--text-muted) absolute left-3.5 top-2.5 group-focus-within:text-(--accent-base) transition-colors" />
        </div>
      </div>

      <div className="w-full flex flex-col pt-20 md:pt-24 px-6 md:px-12 shrink-0 z-20 pointer-events-auto relative">
        <div className="w-full overflow-x-auto custom-scrollbar pt-2 pb-8 flex items-center gap-3 snap-x snap-mandatory scroll-px-6 md:scroll-px-12">
          {!loading && (
            <div className="snap-start shrink-0 flex flex-col justify-center px-6 py-3 bg-(--bg-surface) rounded-2xl border-2 border-(--border-dim) border-dashed items-center group hover:border-(--accent-base) transition-colors cursor-default">
              <span className="text-[10px] font-black text-(--text-muted) uppercase tracking-wider group-hover:text-(--accent-base) transition-colors">Total Credits</span>
              <span className="text-xl font-black font-expanded text-(--text-main) mt-0.5">{totalCredits}</span>
            </div>
          )}
          {loading ? (
            <div className="animate-pulse flex gap-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-40 h-16 bg-(--bg-highlight) rounded-2xl"
                />
              ))}
            </div>
          ) : (
            categories.map((cat, i) => (
              <motion.button
                layout
                key={cat.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                onClick={() => handleSelectCategory(cat)}
                className={`snap-start shrink-0 text-left px-5 py-3 rounded-2xl transition-colors duration-300 flex flex-col group relative overflow-hidden cursor-pointer border ${
                  selectedId === cat.id
                    ? "bg-(--text-main) border-(--text-main) shadow-[4px_4px_0px_0px_var(--shadow-main)] -translate-y-1"
                    : "bg-(--bg-surface) border-(--border-dim) hover:border-(--border-main) hover:shadow-[2px_2px_0px_0px_var(--shadow-main)] hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <motion.div 
                    layout
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className={`text-sm md:text-base font-black font-expanded uppercase ${selectedId === cat.id ? "text-(--bg-main) whitespace-normal min-w-[140px] max-w-[280px]" : "text-(--text-main) truncate max-w-[140px]"}`}
                  >
                    {cat.title}
                  </motion.div>
                  {cat.isCompleted && (
                    <CheckCircle
                      className={`w-4 h-4 ${selectedId === cat.id ? "text-(--bg-main)" : "text-emerald-500"}`}
                    />
                  )}
                </div>
                <div
                  className={`text-[10px] md:text-xs font-mono mt-1 relative z-10 font-bold ${selectedId === cat.id ? "text-(--bg-main) opacity-80" : "text-(--text-muted)"}`}
                >
                  {cat.credits} / {cat.maxCredits} Cr
                </div>

                {selectedId === cat.id && (
                  <div
                    className="absolute bottom-0 left-0 h-1.5 bg-(--accent-base) transition-all duration-500"
                    style={{
                      width: `${(parseFloat(cat.credits) / parseFloat(cat.maxCredits)) * 100}%`,
                    }}
                  />
                )}
              </motion.button>
            ))
          )}
        </div>

        <div className="w-full pb-10">
          {loadingCourses ? (
            <div className="flex flex-col gap-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 w-full bg-(--bg-surface) rounded-3xl animate-pulse"
                />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="mt-10">
              <EmptyState
                msg={
                  hideCompleted
                    ? "No uncompleted courses found in this basket"
                    : "No matching courses"
                }
                icon={Search}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-24">
              <AnimatePresence>
                {filteredCourses.map((c, i) => (
                  <motion.div
                    key={c.code}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    className="group flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 md:p-5 bg-(--bg-surface) rounded-3xl hover:bg-(--bg-highlight) transition-colors"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                        <span className="font-black text-xs md:text-sm text-(--text-muted) font-mono">
                          {c.code}
                        </span>
                        <span className="font-expanded font-bold text-sm md:text-base lg:text-lg text-(--text-main) group-hover:text-(--accent-base) transition-colors flex items-center gap-2 flex-wrap">
                          {c.title}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider ${
                              c.type.includes("L") || c.type.includes("P")
                                ? "bg-purple-500/10 text-purple-500"
                                : "bg-blue-500/10 text-blue-500"
                            }`}
                          >
                            {c.type}
                          </span>
                        </span>
                      </div>
                      {c.isCompleted && (
                        <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-1.5 uppercase">
                          <CheckCircle className="w-3 h-3" /> Completed
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 mt-2 md:mt-0">
                      <div className="flex items-center gap-4 text-xs md:text-sm font-mono font-bold text-(--text-muted)">
                        <div className="flex flex-col items-center">
                          <span className="text-(--text-dim) text-[9px]">L</span>
                          <span>{c.l}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-(--text-dim) text-[9px]">T</span>
                          <span>{c.t}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-(--text-dim) text-[9px]">P</span>
                          <span>{c.p}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-(--text-dim) text-[9px]">J</span>
                          <span>{c.j}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] md:text-[10px] font-bold text-(--text-dim) uppercase">
                          Credits
                        </span>
                        <span className="font-black text-lg md:text-xl text-(--text-main) font-expanded leading-none">
                          {c.credits}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
