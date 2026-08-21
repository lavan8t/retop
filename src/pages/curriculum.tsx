import React, { useState, useEffect, useMemo } from "react";
import { useDataStore } from "../store/dataStore";
import { useAppStore } from "../store/appStore";
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
import { Pill } from "../components/ui/Pill";

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
  const { curriculumHideCompleted: hideCompleted } = useAppStore();
  const [completedCourseCodes, setCompletedCourseCodes] = useState<Set<string>>(new Set());
  const [gradeHistoryEarnedCredits, setGradeHistoryEarnedCredits] = useState<string>("");

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
      const data = typeof html === "string" ? parseCurriculumDashboard(html) : html;
      
      const completedCodes = new Set<string>();
      if (historyHtml) {
        try {
          const historyData = typeof historyHtml === "string" ? parseGradeHistory(historyHtml) : historyHtml;
          if (historyData?.cgpa?.creditsEarned) {
            setGradeHistoryEarnedCredits(historyData.cgpa.creditsEarned);
          }
          if (historyData?.courses) {
            historyData.courses.forEach((c: any) => {
              if (c.grade !== "F" && c.grade !== "N" && c.grade !== "W" && c.grade !== "U") {
                completedCodes.add(c.code);
              }
            });
          }
        } catch (e) {
          console.error("Failed to parse grade history", e);
        }
      }
      setCompletedCourseCodes(completedCodes);

      setTotalCredits(data?.totalCredits || "0");
      setCategories(data?.categories || []);
      if (data?.categories?.length > 0) setSelectedId(data.categories[0].id);
      setLoading(false);

      setLoadingCourses(true);
      const categoryPromises = (data?.categories || []).map((cat: CurriculumCategory) => 
        network.getCurriculumCategory(cat.id).then(catHtml => {
          const parsed = typeof catHtml === "string" ? parseCurriculumCategoryTable(catHtml) : catHtml;
          return {
            id: cat.id,
            courses: parsed?.courses || [],
            basketMaxCredits: parsed?.basketMaxCredits || {}
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

  const totalEarnedCredits = useMemo(() => {
    return categories.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);
  }, [categories]);

  const categoryCourseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const lowerQ = searchQuery.toLowerCase();

    categories.forEach((cat) => {
      let catCourses = allCourses[cat.id] || [];
      if (hideCompleted) {
        catCourses = catCourses.filter((c) => !c.isCompleted && !completedCourseCodes.has(c.code));
      }
      if (searchQuery) {
        catCourses = catCourses.filter(
          (c) => c.title.toLowerCase().includes(lowerQ) || c.code.toLowerCase().includes(lowerQ),
        );
      }
      counts[cat.id] = catCourses.length;
    });
    return counts;
  }, [categories, allCourses, searchQuery, hideCompleted, completedCourseCodes]);

  useEffect(() => {
    if (categories.length > 0 && (!selectedId || !categories.some((c) => c.id === selectedId))) {
      setSelectedId(categories[0].id);
    }
  }, [categories, selectedId]);

  const { stats } = useDataStore();
  const doneCreditsDisplay = gradeHistoryEarnedCredits
    || (stats.credits && stats.credits !== "..." ? stats.credits : "")
    || totalEarnedCredits;

  return (
    <div className="h-full w-full flex flex-col gap-0 py-0 px-4 md:px-6 lg:px-8 overflow-y-auto lg:overflow-hidden bg-(--bg-main) text-(--text-main) max-w-425 mx-auto relative">
      {/* Top Search Bar centered with increased height */}
      <div className="w-full pt-20 md:pt-23 lg:pt-25 pb-3 px-2 md:px-4 shrink-0 flex justify-center">
        <div className="relative group w-full max-w-4xl mx-auto">
          <input
            type="text"
            placeholder="Search all categories & courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-(--bg-surface) border border-(--border-dim)/60 text-(--text-main) text-sm md:text-base rounded-full pl-12 pr-5 py-3.5 focus:outline-none focus:border-(--accent-base) focus:ring-4 focus:ring-(--accent-base)/10 transition-all duration-fast placeholder:text-(--text-muted)"
          />
          <Search className="w-5 h-5 text-(--text-muted) absolute left-4 top-3.5 group-focus-within:text-(--accent-base) transition-colors" />
        </div>
      </div>

      {/* Body Layout: Left Sidebar + Right Course List */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 min-h-0 overflow-hidden">
        {/* LEFT SIDEBAR: Total Credits + Vertical Category Column */}
        <div className="w-full lg:w-[27%] xl:w-[24%] flex flex-col shrink-0 h-auto lg:h-full overflow-y-auto custom-scrollbar relative z-40 pb-4 md:pb-6 lg:pb-8 pl-4 lg:pl-6 pr-2 lg:pr-3 gap-1">
          {!loading && (
            <div className="w-full p-4 bg-(--bg-surface)/60 border border-(--border-dim)/40 rounded-3xl flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono font-bold text-(--text-muted) uppercase tracking-wider leading-none">
                Total Credits
              </span>
              <div className="text-4xl font-black font-expanded text-(--text-main) mt-1 leading-none flex items-baseline justify-center gap-1">
                <span>{doneCreditsDisplay}</span>
                {totalCredits && parseFloat(totalCredits) > 0 && (
                  <span className="text-xl font-bold opacity-50">/ {totalCredits}</span>
                )}
              </div>
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
                    ? "bg-(--text-main) text-(--bg-main) border-(--text-main)"
                    : "bg-(--bg-surface)/60 text-(--text-main) border-(--border-dim)/40 hover:bg-(--bg-surface)"
                }`}>
                <div className="flex flex-col text-left min-w-0 flex-1">
                  <span className="text-xs md:text-sm font-black font-expanded uppercase tracking-wide wrap-break-word whitespace-normal leading-[2.4]">
                    {cat.title}
                  </span>
                </div>
                <div className="text-xs md:text-sm font-black font-mono shrink-0 pl-3 border-l border-current/20 flex flex-col items-end">
                  {cat.maxCredits && parseFloat(cat.maxCredits) > 0 ? (
                    <>
                      <span>{cat.credits} <span className="opacity-50">/ {cat.maxCredits}</span></span>
                    </>
                  ) : (
                    <span>{cat.credits}</span>
                  )}
                  <span className="text-[10px] opacity-70 font-bold mt-0.5">
                    {categoryCourseCounts[cat.id] ?? 0} {categoryCourseCounts[cat.id] === 1 ? "course" : "courses"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* RIGHT AREA: Sub-Tabs (Baskets), Basket Status, and Course List */}
        <div className="flex-1 flex flex-col min-w-0 h-auto lg:h-full px-2 md:px-4 lg:px-6">
          <div
            style={{
              maskImage: "linear-gradient(to bottom, black 0%, black 90%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 90%, transparent 100%)",
            }}
            className="w-full max-w-4xl h-full overflow-y-auto custom-scrollbar pb-20 pr-4 border-r border-(--border-dim)/30 flex flex-col gap-4"
          >
          {/* Sub-Tabs (Baskets) sticky at top of right area */}
          {availableBaskets.length > 1 && (
            <div className="sticky top-0 z-30 bg-(--bg-main) py-2 w-full flex items-center gap-2.5 overflow-x-auto custom-scrollbar shrink-0">
              {availableBaskets.map((basket) => (
                <button
                  key={basket}
                  onClick={() => setSelectedBasket(basket)}
                  className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold uppercase whitespace-nowrap transition-all cursor-pointer border ${
                    activeBasket === basket
                      ? "bg-(--accent-base) text-(--text-inverse) border-(--accent-base)"
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
              <div className="flex flex-col gap-1">
                {filteredCourses.map((c, i) => (
                  <div
                    key={c.code}
                    onClick={() => network.downloadSyllabus(c.code)}
                    className="group flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 md:p-5 bg-(--bg-surface) rounded-3xl hover:bg-(--bg-highlight) transition-colors cursor-pointer">
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Pill variant="accent">{c.code}</Pill>
                        <Pill variant="main">{c.type}</Pill>
                        {c.isCompleted && (
                          <Pill variant="success">
                            <CheckCircle className="w-3 h-3 text-white" /> Completed
                          </Pill>
                        )}
                      </div>
                      <h3 className="text-base md:text-lg font-bold text-(--text-main) leading-snug group-hover:text-(--accent-base) transition-colors">
                        {c.title}
                      </h3>
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
  </div>
  );
};
