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
  const [hideCompleted, setHideCompleted] = useState(() => {
    return localStorage.getItem('curriculum_hide_completed') === 'true';
  });
  const [completedCourseCodes, setCompletedCourseCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('curriculum_hide_completed', hideCompleted.toString());
  }, [hideCompleted]);

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
      <div className="fixed top-3.5 md:top-4 right-18 md:right-22 z-101 pointer-events-auto flex items-center gap-3">
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
            className="bg-(--bg-surface) border border-(--border-dim) text-(--text-main) text-xs md:text-sm rounded-2xl pl-10 pr-4 py-2 w-48 md:w-64 focus:outline-none focus:border-(--accent-base) focus:ring-4 focus:ring-(--accent-base)/10 transition-all duration-fast placeholder:text-(--text-muted) shadow-sm"
          />
          <Search className="w-4 h-4 text-(--text-muted) absolute left-3.5 top-2.5 group-focus-within:text-(--accent-base) transition-colors" />
        </div>
      </div>

      <div className="w-full flex flex-col pt-20 md:pt-24 px-6 md:px-12 shrink-0 z-20 pointer-events-auto relative">
        <div className="w-full pt-2 pb-8 flex items-stretch gap-2 lg:gap-4 px-2 md:px-4">
          {!loading && (
            <div className="flex-[0.8] md:flex-[1.2] flex flex-col justify-center px-6 py-4 bg-(--bg-surface) rounded-3xl items-start cursor-default transition-all duration-fast">
              <span className="text-[11px] font-black text-(--text-muted) uppercase tracking-normal leading-tight">Total<br/>Credits</span>
              <span className="text-5xl md:text-6xl font-black font-expanded text-(--text-main) mt-1 mix-blend-luminosity opacity-90">{totalCredits}</span>
            </div>
          )}
          {loading ? (
            <div className="animate-pulse flex gap-2 w-full">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-24 bg-(--bg-highlight) rounded-3xl mx-1"
                />
              ))}
            </div>
          ) : (
            categories.filter(cat => !(cat.maxCredits && parseFloat(cat.credits) >= parseFloat(cat.maxCredits))).map((cat, i) => (
              <motion.button
                layout
                key={cat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={() => handleSelectCategory(cat)}
                className={`transition-colors duration-fast overflow-hidden cursor-pointer flex group rounded-3xl mx-1 ${
                  selectedId === cat.id
                    ? "flex-[2.5] bg-(--text-main) items-center justify-between px-6 py-4 shadow-xl"
                    : "flex-1 bg-(--bg-surface) hover:bg-(--accent-base) flex-col items-center justify-center px-3 py-4 hover:shadow-lg"
                }`}
              >
                {selectedId === cat.id ? (
                  <>
                    <motion.div layout transition={{ type: "spring", stiffness: 400, damping: 30 }} className="text-sm md:text-base lg:text-lg font-black font-expanded uppercase leading-tight text-(--bg-main) text-left w-1/2 relative z-10">
                      {cat.title}
                    </motion.div>
                    <div className="flex flex-col items-end shrink-0 relative z-10">
                      <motion.div layout transition={{ type: "spring", stiffness: 400, damping: 30 }} className="text-5xl md:text-6xl font-black font-expanded text-(--bg-main) mix-blend-overlay opacity-90 leading-none">
                        {cat.credits}
                      </motion.div>
                      <span className="text-[10px] md:text-[11px] font-black uppercase text-(--bg-main) mix-blend-overlay opacity-70 mt-1 tracking-widest">Credits</span>
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div layout transition={{ type: "spring", stiffness: 400, damping: 30 }} className="text-xs md:text-sm font-black font-expanded uppercase leading-tight text-center text-(--text-main) group-hover:text-(--bg-main) relative z-10">
                      {cat.title}
                    </motion.div>
                    <motion.div layout transition={{ type: "spring", stiffness: 400, damping: 30 }} className="text-2xl md:text-3xl font-black font-expanded mt-2 text-(--text-muted) group-hover:text-(--bg-main) mix-blend-luminosity opacity-80 group-hover:mix-blend-overlay relative z-10">
                      {cat.credits}
                    </motion.div>
                  </>
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
                  className="h-20 w-full bg-(--bg-surface) animate-pulse rounded-3xl"
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
                                : "bg-blue-500/10 text-accent"
                            }`}
                          >
                            {c.type}
                          </span>
                        </span>
                      </div>
                      {c.isCompleted && (
                        <div className="text-[10px] font-bold text-att-safe flex items-center gap-1 mt-1.5 uppercase">
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
