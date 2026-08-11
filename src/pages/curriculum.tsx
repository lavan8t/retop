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
  Download,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { EmptyState } from "../components/EmptyState";

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
  const [basketMaxCreditsMap, setBasketMaxCreditsMap] = useState<Record<string, Record<string, string>>>({});
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
    const handleRefresh = () => {
      loadDashboard();
    };
    window.addEventListener("retop-refresh-curriculum", handleRefresh);
    return () => window.removeEventListener("retop-refresh-curriculum", handleRefresh);
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
      if (data.categories.length> 0) setSelectedId(data.categories[0].id);
      setLoading(false);

      setLoadingCourses(true);
      const categoryPromises = data.categories.map(cat => 
        network.getCurriculumCategory(cat.id).then(catHtml => {
          const parsed = parseCurriculumCategoryTable(catHtml);
          return {
            id: cat.id,
            courses: parsed.courses,
            basketMaxCredits: parsed.basketMaxCredits
          };
        }).catch(() => ({ id: cat.id, courses: [] as CurriculumCourse[], basketMaxCredits: {} as Record<string, string> }))
      );
      const catResults = await Promise.all(categoryPromises);
      const coursesMap: Record<string, CurriculumCourse[]> = {};
      const maxCreditsMap: Record<string, Record<string, string>> = {};
      catResults.forEach(res => {
        coursesMap[res.id] = res.courses;
        maxCreditsMap[res.id] = res.basketMaxCredits;
      });
      setAllCourses(coursesMap);
      setBasketMaxCreditsMap(maxCreditsMap);
      setLoadingCourses(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setLoadingCourses(false);
    }
  };

  const [selectedBasket, setSelectedBasket] = useState<string | null>(null);

  const handleSelectCategory = async (cat: CurriculumCategory) => {
    if (selectedId === cat.id) return;
    setSelectedId(cat.id);
    setSelectedBasket(null);
  };

  const availableBaskets = useMemo(() => {
    if (!selectedId || !allCourses[selectedId]) return [];
    const baskets = new Set<string>();
    allCourses[selectedId].forEach(c => baskets.add(c.basket || "Core"));
    return Array.from(baskets);
  }, [selectedId, allCourses]);

  const activeBasket = selectedBasket && availableBaskets.includes(selectedBasket) 
    ? selectedBasket 
    : availableBaskets[0];

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
      if (activeBasket && availableBaskets.length> 1) {
        result = result.filter(c => (c.basket || "Core") === activeBasket);
      }
    }

    result = result.map(c => ({
      ...c,
      isCompleted: c.isCompleted || completedCourseCodes.has(c.code)
    }));
    
    if (hideCompleted) {
      result = result.filter((c) => !c.isCompleted);
    }
    
    return result;
  }, [allCourses, selectedId, searchQuery, hideCompleted, completedCourseCodes, activeBasket, availableBaskets]);

  const basketStatus = useMemo(() => {
    if (!selectedId || !activeBasket || searchQuery) return null;
    const maxCreditStr = basketMaxCreditsMap[selectedId]?.[activeBasket];
    if (!maxCreditStr) return null;
    const maxCredits = parseFloat(maxCreditStr);
    
    const coursesInBasket = allCourses[selectedId]?.filter(c => (c.basket || "Core") === activeBasket) || [];
    let completedCredits = 0;
    coursesInBasket.forEach(c => {
      if (c.isCompleted || completedCourseCodes.has(c.code)) {
        completedCredits += parseFloat(c.credits) || 0;
      }
    });

    const isFinished = completedCredits>= maxCredits;

    return {
      completed: completedCredits,
      max: maxCredits,
      isFinished
    };
  }, [selectedId, activeBasket, basketMaxCreditsMap, allCourses, completedCourseCodes, searchQuery]);

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar bg-(--bg-main) relative">
      <div className="fixed top-3.5 md:top-4 right-18 md:right-22 z-101 pointer-events-auto flex items-center gap-3">
        <div className="flex items-center gap-2 px-2 hidden sm:flex">
          <span className="text-[10px] md:text-xs font-black text-(--text-muted) uppercase tracking-wider">
            Hide Done
          </span>
          <MaterialSwitch 
            selected={hideCompleted} 
            onChange={(checked) => setHideCompleted(checked)} />
        </div>
        <div className="relative group hidden sm:block">
          <input
            type="text"
            placeholder="Search all courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-(--bg-surface) border border-(--border-dim) text-(--text-main) text-xs md:text-sm rounded-2xl pl-10 pr-4 py-2 w-48 md:w-64 focus:outline-none focus:border-(--accent-base) focus:ring-4 focus:ring-(--accent-base)/10 transition-all duration-fast placeholder:text-(--text-muted) shadow-sm" />
          <Search className="w-4 h-4 text-(--text-muted) absolute left-3.5 top-2.5 group-focus-within:text-(--accent-base) transition-colors" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-6 md:gap-8 pt-20 md:pt-24 px-4 md:px-8 z-20 pointer-events-auto relative items-start">
        {/* LEFT SIDEBAR: Total Credits + Vertical Category Column */}
        <div className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col gap-2.5">
          {!loading && (
            <div className="w-full p-4 bg-(--bg-surface)/60 border border-(--border-dim)/40 rounded-3xl flex flex-col items-start justify-center shadow-xs">
              <span className="text-[10px] font-mono font-bold text-(--text-muted) uppercase tracking-wider leading-none">
                Total Credits
              </span>
              <span className="text-4xl font-black font-expanded text-(--text-main) mt-1 leading-none">
                {totalCredits}
              </span>
            </div>
          )}
          {loading ? (
            <div className="animate-pulse flex flex-col gap-2 w-full">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-(--bg-highlight) rounded-3xl" />
              ))}
            </div>
          ) : (
            categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat)}
                className={`w-full p-4 rounded-3xl flex items-center justify-between gap-3 transition-all cursor-pointer border ${
                  selectedId === cat.id
                    ? "bg-(--text-main) text-(--bg-main) border-(--text-main) shadow-md"
                    : "bg-(--bg-surface)/60 text-(--text-main) border-(--border-dim)/40 hover:bg-(--bg-surface)"
                }`}>
                <div className="flex flex-col text-left min-w-0 flex-1">
                  <span className="text-xs md:text-sm font-black font-expanded uppercase tracking-wide truncate">
                    {cat.title}
                  </span>
                </div>
                <div className="text-xs md:text-sm font-black font-mono shrink-0 pl-3 border-l border-current/20">
                  {cat.maxCredits && parseFloat(cat.maxCredits) > 0 ? (
                    <>
                      <span>{cat.credits}</span>
                      <span className="opacity-50"> / {cat.maxCredits}</span>
                    </>
                  ) : (
                    <span>{cat.credits}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* RIGHT AREA: Sub-Tabs (Baskets) on top, Basket Status, and Course List */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
          {/* Sub-Tabs (Baskets) at top of right area */}
          {!searchQuery && availableBaskets.length > 1 && (
            <div className="w-full flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-(--text-muted) shrink-0 mr-1">
                Baskets:
              </span>
              {availableBaskets.map((basket) => (
                <button
                  key={basket}
                  onClick={() => setSelectedBasket(basket)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border ${
                    activeBasket === basket
                      ? "bg-(--accent-base) text-(--text-inverse) border-(--accent-base) shadow-sm"
                      : "bg-(--bg-surface) text-(--text-muted) border-(--border-dim)/40 hover:bg-(--bg-highlight) hover:text-(--text-main)"
                  }`}>
                  {basket}
                </button>
              ))}
            </div>
          )}

          {basketStatus && (
            <div className="w-full z-20 relative pointer-events-auto">
              <div
                className={`flex items-center justify-between p-4 rounded-3xl transition-colors ${
                  basketStatus.isFinished
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-(--bg-surface) border border-(--border-dim)/40"
                }`}>
                <div className="flex flex-col">
                  <span
                    className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${
                      basketStatus.isFinished ? "text-green-500/80" : "text-(--text-muted)"
                    }`}>
                    Basket Credits
                  </span>
                  <span
                    className={`text-sm md:text-base font-bold ${
                      basketStatus.isFinished ? "text-att-safe" : "text-(--text-main)"
                    }`}>
                    {basketStatus.completed} <span className="opacity-50">/ {basketStatus.max}</span>
                  </span>
                </div>
                {basketStatus.isFinished && (
                  <div className="flex items-center gap-1.5 text-att-safe text-[10px] md:text-xs font-black uppercase tracking-widest">
                    <CheckCircle className="w-4 h-4" /> Finished
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="w-full pb-24">
            {loadingCourses ? (
              <div className="flex flex-col gap-3">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 w-full bg-(--bg-surface) animate-pulse rounded-3xl" />
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
                  icon={Search} />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredCourses.map((c, i) => (
                  <div
                    key={c.code}
                    onClick={() => network.downloadSyllabus(c.code)}
                    className="group flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 md:p-5 bg-(--bg-surface) rounded-3xl hover:bg-(--bg-highlight) transition-colors cursor-pointer">
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                        <span className="font-black text-xs md:text-sm text-(--text-muted) font-mono group-hover:text-(--accent-base) transition-colors">
                          {c.code}
                        </span>
                        <span className="font-expanded font-bold text-sm md:text-base lg:text-lg text-(--text-main) group-hover:text-(--accent-base) transition-colors flex items-center gap-2 flex-wrap">
                          {c.title}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider ${
                              c.type.includes("L") || c.type.includes("P")
                                ? "bg-purple-500/10 text-purple-500"
                                : "bg-blue-500/10 text-accent"
                            }`}>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
