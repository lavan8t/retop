import React, { useState, useRef, useMemo, useEffect, useDeferredValue } from "react";
import {
  Keep,
  Error,
  Search,
  Autorenew,
  ChevronRight,
  Home,
  Sync,
  Star,
  ArrowBack,
  Close,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { QuickLink, MenuCategory } from "../../types/vtop";
import { useDataStore } from "../../store/dataStore";
import { useAppStore } from "../../store/appStore";
import { getCategoryIcon } from "../../utils/icons";
import { Tooltip } from "../ui/Tooltip";
import { toTitleCase } from "../../utils/formatting";

interface TopBarSearchProps {
  currentView: string;
  isOmniboxOpen: boolean;
  setIsOmniboxOpen: (val: boolean) => void;
  menuCategories: MenuCategory[];
  pinnedLinks: QuickLink[];
  onNavigate: (link: QuickLink, forceLegacy?: boolean) => void;
  onTogglePin: (link: QuickLink) => void;
  initialQuery?: string;
  pageTitle?: string;
  onBack?: () => void;
  status?: string;
  onSync?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: number;
}

const getDestinationView = (link: QuickLink) => {
  return link.url.startsWith("/")
    ? link.url.slice(1) || "dashboard"
    : "content";
};

export const hasRetopPage = (link: QuickLink | string): boolean => {
  const url = (typeof link === "string" ? link : link.url).toLowerCase().trim();
  const title = (typeof link === "string" ? "" : link.title).toLowerCase().trim();

  // 1. Primary check: Specific native URL matching
  const hasUrlMatch =
    url.includes("studenttimetable") ||
    url.includes("processviewtimetable") ||
    url.includes("studentattendance") ||
    url.includes("processviewstudentattendance") ||
    url.includes("studentda") ||
    url.includes("processviewstudentda") ||
    url.includes("studentmarkview") ||
    url.includes("processviewstudentmark") ||
    url.includes("studentgradeview") ||
    url.includes("processviewstudentgrade") ||
    url.includes("studexamschedule") ||
    url.includes("processviewexamschedule") ||
    url.includes("studentprofileallview") ||
    url.includes("curriculumsyllabus") ||
    url.includes("studentcoursepage") ||
    url.includes("calendarpreview");

  if (hasUrlMatch) return true;

  // 2. Secondary check: Exact native titles only
  const exactFullTitles = [
    "timetable",
    "time table",
    "class timetable",
    "class attendance",
    "student attendance",
    "digital assignments",
    "digital assignment upload",
    "marks view",
    "student marks",
    "grades view",
    "grades & history",
    "grade history",
    "exam schedule",
    "student profile",
    "curriculum",
    "programme curriculum",
    "curriculum & syllabus",
    "course page consolidated",
    "course page (consolidated)",
    "academic calendar",
    "academics calendar",
    "academic calendar preview",
  ];

  return exactFullTitles.includes(title);
};

const fuzzyMatch = (str: string, pattern: string) => {
  pattern = pattern.split("").reduce((a, b) => a + ".*" + b);
  return new RegExp(pattern).test(str);
};

const renderCategoryTitle = (catTitle: string) => {
  const titleStr = toTitleCase(catTitle);
  if (titleStr.toLowerCase().includes("retop")) {
    const parts = titleStr.split(/retop/i);
    return (
      <span>
        {parts[0]}
        <span
          className="font-logo retop-logo inline-block lowercase text-inherit"
          style={{
            fontFamily: "var(--font-expanded)",
            fontVariationSettings: "'wdth' 125, 'wght' 900, 'ROND' 100, 'slnt' -10",
          }}
        >
          retop
        </span>
        {parts[1] || ""}
      </span>
    );
  }
  return titleStr;
};

export const TopBarSearch: React.FC<TopBarSearchProps> = ({
  currentView,
  isOmniboxOpen,
  setIsOmniboxOpen,
  menuCategories,
  pinnedLinks,
  onNavigate,
  onTogglePin,
  initialQuery = "",
  pageTitle = "Search",
  onBack,
  status,
  onSync,
  isSyncing = false,
  lastSyncTime = 0,
}) => {
  const { isModernUI } = useAppStore();
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [showLogoMenu, setShowLogoMenu] = useState(false);
  const logoMenuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeMenu, setActiveMenu] = useState<{
    cat: MenuCategory;
    rect: DOMRect;
  } | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (logoMenuTimeout.current) clearTimeout(logoMenuTimeout.current);
    };
  }, []);

  const isChildHoveredRef = useRef(false);

  const handleMenuEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleChildEnter = () => {
    handleMenuEnter();
    isChildHoveredRef.current = true;
  };

  const handleChildLeave = () => {
    isChildHoveredRef.current = false;
    closeTimeoutRef.current = setTimeout(() => {
      if (!isChildHoveredRef.current) {
        setActiveMenu(null);
      }
    }, 300);
  };

  const handleMenuLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      if (!isChildHoveredRef.current) {
        setActiveMenu(null);
      }
    }, 450);
  };

  const isExpanded = isOmniboxOpen;

  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        if (mobileInputRef.current) mobileInputRef.current.focus();
        else if (inputRef.current) inputRef.current.focus();
      }, 50);
    } else {
      setQuery("");
      setActiveMenu(null);
    }
  }, [isExpanded]);

  // STRICT HIERARCHY RULE ENFORCEMENT:
  // 1 = Search Bar (isExpanded)
  // 2 = Categories Menu (isExpanded && !query)
  // 3 = Right List of Pages Submenu (activeMenu)
  // Rule 1: If 1 is closed, 2 & 3 can NEVER be open.
  // Rule 2: If 2 is closed (!isExpanded || query), 3 can NEVER be open (3 is NEVER a zombie).
  useEffect(() => {
    if (!isExpanded || query.trim() !== "") {
      if (activeMenu !== null) {
        setActiveMenu(null);
      }
    }
  }, [isExpanded, query, activeMenu]);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setIsOmniboxOpen(true);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (query) {
      setActiveMenu(null);
    }
  }, [query]);

  useEffect(() => {
    const handleOmniboxType = (e: any) => {
      setQuery((q) => q + (e.detail || ""));
      if (inputRef.current) inputRef.current.focus();
    };
    window.addEventListener("vtop-omnibox-type", handleOmniboxType);
    return () =>
      window.removeEventListener("vtop-omnibox-type", handleOmniboxType);
  }, []);

  const allCategories = useMemo(() => {
    const isOffline = typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__;

    const retopNativeLinks: QuickLink[] = [
      { title: "Time Table", url: "academics/common/StudentTimeTable", category: "Made for retop" },
      { title: "Class Attendance", url: "academics/common/StudentAttendance", category: "Made for retop" },
      { title: "Assignments", url: "examinations/StudentDA", category: "Made for retop" },
      { title: "Course Page Consolidated", url: "academics/common/StudentCoursePage", category: "Made for retop" },
      { title: "Marks View", url: "examinations/StudentMarkView", category: "Made for retop" },
      { title: "Grades View", url: "examinations/StudentGradeView", category: "Made for retop" },
      { title: "Academic Calendar", url: "academics/common/CalendarPreview", category: "Made for retop" },
      { title: "Student Profile", url: "studentsRecord/StudentProfileAllView", category: "Made for retop" },
      { title: "Curriculum", url: "academics/common/CurriculumSyllabus", category: "Made for retop" },
      { title: "Exam Schedule", url: "examinations/StudExamSchedule", category: "Made for retop" },
    ];

    const madeForRetopCat: MenuCategory = {
      id: "made-for-retop",
      title: "Made for retop",
      links: retopNativeLinks,
    };

    if (isOffline) {
      return [madeForRetopCat];
    }

    const otherCats = menuCategories
      .filter((c) => c.title !== "Made for retop")
      .filter((c) => c.links && c.links.length > 0);

    return [madeForRetopCat, ...otherCats];
  }, [menuCategories]);

  const flattenedLinks = useMemo(() => {
    const allLinks = allCategories.flatMap((c) => c.links);

    let sortedMatches = allLinks;

    if (deferredQuery.trim()) {
      const lowerQ = deferredQuery.toLowerCase().trim();
      const matches: { link: QuickLink; score: number }[] = [];

      const itemAliases: Record<string, string[]> = {
        "time table": ["timetable", "time table", "schedule", "class schedule", "slots", "weekly timetable"],
        "class attendance": ["attendance", "class attendance", "attendance view", "my attendance"],
        "assignments": ["digital assignments", "digital assignment", "da", "da upload", "assignment", "assignments", "digital assignment upload"],
        "marks view": ["marks", "marks view", "cat marks", "assessment marks", "test marks", "exam marks"],
        "grades view": ["grades", "grades view", "grade history", "cgpa", "gpa", "history", "gpa calculator", "grade calculator"],
        "academic calendar": ["academic calendar", "calendar", "events", "academics calendar", "calendar preview"],
        "student profile": ["profile", "student profile", "digital id", "id card", "my profile"],
        "curriculum": ["curriculum", "syllabus", "curriculum syllabus", "course syllabus"],
        "exam schedule": ["exam schedule", "exams", "fat", "cat", "exam", "fat schedule", "cat schedule", "exam timetable"],
        "course page consolidated": ["course page", "course page consolidated", "consolidated course page", "course", "courses", "course material", "materials", "class material", "subject material", "course page (consolidated)"],
      };

      allLinks.forEach((link) => {
        const titleLower = link.title.toLowerCase().trim();
        const urlLower = link.url.toLowerCase().trim();
        let score = 0;

        const aliases = itemAliases[titleLower] || [];

        if (titleLower === lowerQ || aliases.some((a) => a === lowerQ)) {
          score = 100;
        } else if (titleLower.startsWith(lowerQ) || aliases.some((a) => a.startsWith(lowerQ))) {
          score = 85;
        } else if (
          titleLower.includes(lowerQ) ||
          aliases.some((a) => a.includes(lowerQ)) ||
          urlLower.includes(lowerQ)
        ) {
          score = 65;
        } else if (fuzzyMatch(titleLower, lowerQ)) {
          score = 20;
        }

        if (score > 0) matches.push({ link, score });
      });

      sortedMatches = matches
        .sort((a, b) => b.score - a.score)
        .map((m) => m.link)
        .slice(0, 15);
    }

    const seen = new Set<string>();
    const deduplicatedMatches: QuickLink[] = [];

    sortedMatches.forEach((link) => {
      const key = `${link.title.toLowerCase().trim()}:${link.url.toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicatedMatches.push(link);
      }
    });

    const grouped = new Map<string, QuickLink[]>();
    deduplicatedMatches.forEach((link) => {
      const cat = hasRetopPage(link) ? "Made for retop" : (link.category || "Other");
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(link);
    });

    const finalLinks: QuickLink[] = [];
    if (grouped.has("Made for retop")) {
      finalLinks.push(...grouped.get("Made for retop")!);
    }
    grouped.forEach((links, catKey) => {
      if (catKey !== "Made for retop") {
        finalLinks.push(...links);
      }
    });

    return finalLinks;
  }, [deferredQuery, allCategories]);

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Query mode (filtering links)
      if (query.trim()) {
        if (flattenedLinks.length === 0) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % flattenedLinks.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + flattenedLinks.length) % flattenedLinks.length,
          );
        } else if (e.key === "Enter" && flattenedLinks[selectedIndex]) {
          e.preventDefault();
          const selLink = flattenedLinks[selectedIndex];
          const forceLegacy = e.shiftKey ? isModernUI : !isModernUI;
          onNavigate(selLink, forceLegacy);
          setIsOmniboxOpen(false);
          setQuery("");
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsOmniboxOpen(false);
        }
        return;
      }

      // 2. Browse mode (categories / submenus)
      if (activeMenu) {
        const links = activeMenu.cat.links;
        if (links.length === 0) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % links.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + links.length) % links.length);
        } else if (e.key === "ArrowLeft" || e.key === "Escape") {
          e.preventDefault();
          setActiveMenu(null);
        } else if (e.key === "Enter" && links[selectedIndex]) {
          e.preventDefault();
          const selLink = links[selectedIndex];
          const forceLegacy = e.shiftKey ? isModernUI : !isModernUI;
          onNavigate(selLink, forceLegacy);
          setActiveMenu(null);
          setIsOmniboxOpen(false);
        }
      } else {
        if (allCategories.length === 0) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setCategoryIndex((prev) => (prev + 1) % allCategories.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setCategoryIndex((prev) => (prev - 1 + allCategories.length) % allCategories.length);
        } else if (e.key === "ArrowRight" || e.key === "Enter") {
          e.preventDefault();
          const targetCat = allCategories[categoryIndex];
          if (targetCat) {
            const catEl = document.getElementById(`topbar-cat-item-${categoryIndex}`);
            const rect = catEl ? catEl.getBoundingClientRect() : new DOMRect();
            setSelectedIndex(0);
            setActiveMenu({ cat: targetCat, rect });
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsOmniboxOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    query,
    flattenedLinks,
    selectedIndex,
    categoryIndex,
    allCategories,
    isExpanded,
    onNavigate,
    setIsOmniboxOpen,
    activeMenu,
    isModernUI,
  ]);

  // Auto-scroll active item into view
  useEffect(() => {
    if (!isExpanded) return;
    if (query.trim()) {
      const el = document.getElementById(`search-result-item-${selectedIndex}`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else if (activeMenu) {
      const el = document.getElementById(`home-popup-item-${selectedIndex}`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      const el = document.getElementById(`topbar-cat-item-${categoryIndex}`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isExpanded, query, activeMenu, selectedIndex, categoryIndex]);

  const isSearchActive = isExpanded;

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const path = event.composedPath ? event.composedPath() : [event.target as Node];
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        !path.includes(wrapperRef.current)
      ) {
        setIsOmniboxOpen(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isExpanded, setIsOmniboxOpen]);

  return (
    <div ref={wrapperRef} className="relative flex flex-col z-50">
      {/* Unified Search Bar */}
      <div
        className={`group flex items-center gap-3 transition-all duration-fast ease-out cursor-text md:min-w-90 pl-4 pr-3 h-12 md:h-14 rounded-[32px] relative z-10000 bg-transparent border-2 border-transparent shadow-none`}
      >
        <div className="relative flex items-center shrink-0">
          <Tooltip text="Return to Dashboard">
            <button
              onClick={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement).blur();
                if (onBack) onBack();
              }}
              className="relative flex items-center justify-center shrink-0 cursor-pointer hover:opacity-75 transition-opacity focus:outline-none"
            >
              <div className="flex items-end pb-1 pr-1 pl-1 md:pl-2">
                <span className="font-expanded font-black text-2xl md:text-3xl italic lowercase leading-none text-(--text-main) hover:text-(--accent-hover) transition-colors">
                  re
                </span>
                <div
                  className={`relative ml-[-1px] md:ml-[-3px] mb-0.5 md:mb-0.75 flex items-center justify-center transition-all duration-300 origin-bottom-left w-1 h-1 md:w-1.5 md:h-1.5 bg-(--accent-base) rounded-full ${status === "loading" ? "animate-pulse scale-150" : isExpanded ? "scale-[2]" : ""}`}
                >
                  <Search
                    className={`w-0.5 h-0.5 md:w-1 md:h-1 text-(--text-inverse) transition-opacity absolute ${status === "loading" ? "opacity-0" : isExpanded ? "opacity-100" : "opacity-0"}`}
                    strokeWidth={4}
                  />
                </div>
              </div>
            </button>
          </Tooltip>
        </div>

        <div className="relative flex-1 w-full min-w-0 flex items-center">
          {query &&
            flattenedLinks.length > 0 &&
            toTitleCase(flattenedLinks[0].title)
              .toLowerCase()
              .startsWith(query.toLowerCase()) && (
              <div className="absolute left-2 top-0 bottom-0 flex items-center pointer-events-none w-full overflow-hidden">
                <span className="text-lg md:text-xl font-bold text-transparent whitespace-pre">
                  {query}
                </span>
                <span className="text-lg md:text-xl font-bold text-(--text-muted) opacity-50 whitespace-pre truncate">
                  {toTitleCase(flattenedLinks[0].title).slice(query.length)}
                </span>
              </div>
            )}
          <input
            ref={inputRef}
            type="text"
            placeholder={toTitleCase(pageTitle)}
            value={query}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/[^a-zA-Z\s]/g, "");
              if (sanitized.toLowerCase() === "demo") {
                useDataStore.getState().enableDemoMode();
                setQuery("");
                setIsOmniboxOpen(false);
                return;
              }
              setQuery(sanitized);
              setSelectedIndex(0);
              if (!isExpanded) setIsOmniboxOpen(true);
            }}
            onFocus={() => setIsOmniboxOpen(true)}
            className="w-full bg-transparent text-lg md:text-xl font-bold text-(--text-main) focus:outline-none placeholder:text-(--text-main) placeholder:opacity-100 min-w-0 text-left pl-2 relative z-10 normal-case"
          />
        </div>
      </div>

      {/* Mobile Full-Screen Overlay (< lg) */}
      {isSearchActive && (
        <div className="fixed inset-0 z-100 bg-(--bg-main) flex flex-col p-4 sm:p-6 lg:hidden overflow-hidden">
          {/* Mobile Overlay Header */}
          <div className="flex items-center gap-2 pb-3 border-b border-(--border-dim) shrink-0">
            <button
              onClick={() => setIsOmniboxOpen(false)}
              className="p-2 -ml-1 rounded-full hover:bg-(--bg-highlight) text-(--text-main) transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Close search"
            >
              <ArrowBack className="w-6 h-6 text-(--text-main)" />
            </button>
            <div className="flex-1 relative flex items-center bg-(--bg-surface) rounded-full px-3.5 py-2 border border-(--border-dim) focus-within:border-(--accent-base)">
              <Search className="w-5 h-5 text-(--text-muted) mr-2 shrink-0" />
              <input
                ref={mobileInputRef}
                type="text"
                placeholder={toTitleCase(pageTitle)}
                value={query}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  if (sanitized.toLowerCase() === "demo") {
                    useDataStore.getState().enableDemoMode();
                    setQuery("");
                    setIsOmniboxOpen(false);
                    return;
                  }
                  setQuery(sanitized);
                  setSelectedIndex(0);
                }}
                className="w-full bg-transparent text-base font-bold text-(--text-main) focus:outline-none placeholder:text-(--text-muted)"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 rounded-full hover:bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) shrink-0 cursor-pointer"
                >
                  <Close className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Overlay Content */}
          <div className="flex-1 overflow-y-auto py-4 search-scrollbar space-y-5">
            {!query.trim() ? (
              <>
                {/* Starred Items / Quick Links */}
                {pinnedLinks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-expanded font-bold text-(--accent-base) uppercase tracking-wider px-1">
                      <Star className="w-4 h-4 text-(--accent-base)" />
                      <span>Starred Items / Quick Links</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {pinnedLinks.map((link, idx) => (
                        <div
                          key={idx}
                          onClick={(e) => {
                            const forceLegacy = e.shiftKey ? isModernUI : !isModernUI;
                            onNavigate(link, forceLegacy);
                            setIsOmniboxOpen(false);
                            setQuery("");
                          }}
                          className="flex items-center justify-between p-3 rounded-2xl bg-(--bg-surface) border border-(--border-dim) active:scale-[0.98] transition-all cursor-pointer text-left"
                        >
                          <span className="text-xs font-bold text-(--text-main) truncate pr-1">
                            {toTitleCase(link.title)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePin(link);
                            }}
                            className="p-1 text-(--accent-base) hover:text-(--text-muted) shrink-0"
                            title="Unpin"
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spotlight Categories & Quick Links */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-expanded font-bold text-(--text-muted) uppercase tracking-wider px-1">
                    <Keep className="w-4 h-4 text-(--text-muted)" />
                    <span>Spotlight Categories</span>
                  </div>
                  <div className="space-y-3">
                    {allCategories.map((cat, catIdx) => {
                      const CatIcon = getCategoryIcon(cat.title);
                      return (
                        <div
                          key={catIdx}
                          className="bg-(--bg-surface) p-3.5 rounded-2xl border border-(--border-dim) space-y-2"
                        >
                          <div className="flex items-center gap-2 pb-2 border-b border-(--border-dim)">
                            <CatIcon className="w-4.5 h-4.5 text-(--accent-base)" />
                            <span className="font-expanded font-bold text-xs text-(--text-main)">
                              {renderCategoryTitle(cat.title)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {cat.links.map((link, lIdx) => (
                              <button
                                key={lIdx}
                                onClick={(e) => {
                                  const forceLegacy = e.shiftKey ? isModernUI : !isModernUI;
                                  onNavigate(link, forceLegacy);
                                  setIsOmniboxOpen(false);
                                  setQuery("");
                                }}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-(--bg-main)/60 active:bg-(--bg-highlight) text-left text-xs font-bold text-(--text-muted) active:text-(--text-main) transition-colors cursor-pointer"
                              >
                                <span className="truncate flex-1 pr-2">
                                  {toTitleCase(link.title)}
                                </span>
                                {hasRetopPage(link) && (
                                  <span
                                    className="re-badge inline-block text-[9px] font-black px-1 py-0.5 rounded leading-none shrink-0 bg-transparent text-(--accent-base)"
                                    style={{
                                      fontFamily: "var(--font-expanded)",
                                      fontVariationSettings: "'wdth' 151, 'wght' 700, 'ROND' 100, 'slnt' -10",
                                    }}
                                  >
                                    re.
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              /* Mobile Search Results */
              <div className="space-y-2">
                {flattenedLinks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-(--text-dim) space-y-2">
                    <Error className="w-10 h-10 opacity-50 text-(--accent-base)" />
                    <span className="font-expanded text-sm font-bold text-(--text-muted)">
                      No Matches
                    </span>
                  </div>
                ) : (
                  flattenedLinks.map((link, i) => {
                    const linkDest = getDestinationView(link);
                    const isPinned =
                      linkDest !== "content" &&
                      pinnedLinks.some((p) => getDestinationView(p) === linkDest);
                    return (
                      <div
                        key={i}
                        onClick={(e) => {
                          const forceLegacy = e.shiftKey ? isModernUI : !isModernUI;
                          onNavigate(link, forceLegacy);
                          setIsOmniboxOpen(false);
                          setQuery("");
                        }}
                        className="flex items-center justify-between p-3 rounded-2xl bg-(--bg-surface) border border-(--border-dim) active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          <span className="text-xs font-bold text-(--text-main) truncate">
                            {toTitleCase(link.title)}
                          </span>
                          {hasRetopPage(link) && (
                            <span
                              className="re-badge inline-block text-[9px] font-black px-1 py-0.5 rounded leading-none shrink-0 bg-transparent text-(--accent-base)"
                              style={{
                                fontFamily: "var(--font-expanded)",
                                fontVariationSettings: "'wdth' 151, 'wght' 700, 'ROND' 100, 'slnt' -10",
                              }}
                            >
                              re.
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(link);
                          }}
                          className="p-1.5 text-(--text-muted) hover:text-(--accent-base) shrink-0 cursor-pointer"
                          title={isPinned ? "Unpin from Dock" : "Pin to Dock"}
                        >
                          <Star
                            className={`w-4 h-4 ${isPinned ? "text-(--accent-base) fill-current" : "opacity-50"}`}
                          />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Search Dropdown (lg:flex) */}
      {isSearchActive && (
        <div
          key="search-dropdown"
          className="hidden lg:flex absolute top-full mt-2 left-0 w-full max-w-[calc(100vw-24px)] bg-(--bg-surface) border-0 rounded-3xl z-[999999] origin-top-left flex-col overflow-hidden popup-shadow p-2 transition-all duration-200 animate-popup-open"
        >
          <div className="p-1">
            <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto search-scrollbar pr-1.5">
              {!query ? (
                <div
                  className="space-y-1"
                  onMouseLeave={handleMenuLeave}
                  onMouseEnter={handleMenuEnter}
                >
                  {allCategories.map((cat, catIdx) => {
                    const CatIcon = getCategoryIcon(cat.title);
                    const isActive = activeMenu?.cat.title === cat.title || (!activeMenu && catIdx === categoryIndex);
                    return (
                      <div
                        key={catIdx}
                        id={`topbar-cat-item-${catIdx}`}
                        onMouseEnter={(e) => {
                          handleMenuEnter();
                          if (!isExpanded || query.trim() !== "") return;
                          setCategoryIndex(catIdx);
                          setSelectedIndex(0);
                          setActiveMenu({
                            cat,
                            rect: e.currentTarget.getBoundingClientRect(),
                          });
                        }}
                        onMouseLeave={handleMenuLeave}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isExpanded || query.trim() !== "") return;
                          setCategoryIndex(catIdx);
                          setSelectedIndex(0);
                          setActiveMenu({
                            cat,
                            rect: e.currentTarget.getBoundingClientRect(),
                          });
                        }}
                        className={`flex w-full items-center justify-between p-2 md:p-2.5 rounded-xl transition-all duration-fast ease-out group cursor-pointer ${isActive ? "bg-(--accent-base) text-(--text-inverse)" : "bg-transparent text-(--text-main) hover:bg-(--bg-highlight)"}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <CatIcon
                            className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${isActive ? "text-(--text-inverse)" : "text-(--text-muted) group-hover:text-(--accent-base)"}`}
                          />
                          <span
                            className={`font-expanded font-bold text-xs text-left transition-colors ${isActive ? "text-(--text-inverse)" : "text-(--text-main) group-hover:text-(--accent-base)"}`}
                          >
                            {renderCategoryTitle(cat.title)}
                          </span>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 transition-all ${isActive ? "opacity-100 text-(--text-inverse)" : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-(--text-muted) group-hover:text-(--accent-base)"}`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : flattenedLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-(--text-dim)">
                  <Error className="w-8 h-8 mb-2 opacity-50" />
                  <span className="font-expanded text-sm font-bold text-(--text-muted)">
                    No Matches
                  </span>
                </div>
              ) : (
                (() => {
                  let currentCategory = "";
                  return flattenedLinks.map((link, i) => {
                    const isSelected = i === selectedIndex && query;
                    const linkDest = getDestinationView(link);
                    const isPinned =
                      linkDest !== "content" &&
                      pinnedLinks.some(
                        (p) => getDestinationView(p) === linkDest,
                      );
                    const category = hasRetopPage(link) ? "Made for retop" : (link.category || "Other");
                    const isNewCategory = category !== currentCategory;
                    if (isNewCategory) currentCategory = category;

                    return (
                      <React.Fragment key={i}>
                        {isNewCategory && (
                          <div className="px-2.5 pt-3 pb-1.5 text-[11px] font-expanded font-bold text-(--text-main) tracking-wider border-b border-(--border-dim) mb-1.5">
                            {renderCategoryTitle(currentCategory)}
                          </div>
                        )}
                        <div className="relative w-full mb-1 group">
                          <button
                            id={`search-result-item-${i}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const forceLegacy = e.shiftKey ? isModernUI : !isModernUI;
                              onNavigate(link, forceLegacy);
                              setIsOmniboxOpen(false);
                              setQuery("");
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              const forceLegacy = e.shiftKey ? isModernUI : !isModernUI;
                              onNavigate(link, forceLegacy);
                              setIsOmniboxOpen(false);
                              setQuery("");
                            }}
                            onMouseEnter={() => setSelectedIndex(i)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border-2 ${
                              isSelected
                                ? "bg-(--accent-base) text-(--text-inverse) border-(--border-main) shadow-none -translate-y-px"
                                : "bg-transparent border-transparent text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main)"
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-8 flex items-center justify-between gap-2 h-5">
                              <span className="truncate">{toTitleCase(link.title)}</span>
                              {hasRetopPage(link) && (
                                <span
                                  className={`re-badge inline-block text-[9px] font-black px-1 py-0.5 rounded leading-none shrink-0 bg-transparent ${isSelected ? "text-white" : "text-(--accent-base)"}`}
                                  style={{
                                    fontFamily: "var(--font-expanded)",
                                    fontVariationSettings: "'wdth' 151, 'wght' 700, 'ROND' 100, 'slnt' -10",
                                    transform: "skewX(-10deg)",
                                  }}
                                >
                                  re.
                                </span>
                              )}
                            </div>
                          </button>
                          <div
                            className={`absolute right-1 top-1 bottom-1 w-12 pr-1 flex items-center justify-end rounded-r-xl transition-all pointer-events-none z-20 ${!isPinned ? "opacity-50 group-hover:opacity-100" : "opacity-100"}`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePin(link);
                              }}
                              className={`pointer-events-auto p-1.5 rounded-xl transition-all border-2 shadow-none hover:bg-(--bg-highlight) ${
                                isPinned
                                  ? "bg-transparent text-(--accent-base) border-transparent"
                                  : "bg-transparent border-transparent text-(--text-muted) hover:text-(--text-main)"
                              }`}
                              title={
                                isPinned ? "Unpin from Dock" : "Pin to Dock"
                              }
                            >
                              <Star
                                className={`w-4 h-4 transition-transform ${isPinned ? "scale-110" : "scale-100 opacity-50 group-hover:opacity-100"}`}
                              />
                            </button>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </div>
            <div className="w-full text-center py-2 px-3 text-[10px] font-bold text-(--text-muted) border-t-2 border-(--border-dim) bg-(--bg-surface) shrink-0 mt-1">
              {isShiftPressed ? (
                <>
                  Press Shift + Enter to open in{" "}
                  {isModernUI ? (
                    <span className="!font-['Times_New_Roman',Times,serif] font-bold text-(--text-main) !text-[12px]">
                      VTOP
                    </span>
                  ) : (
                    <span
                      className="font-logo retop-logo inline-block lowercase text-(--accent-base)"
                      style={{
                        fontFamily: "var(--font-expanded)",
                        fontVariationSettings: "'wdth' 125, 'wght' 900, 'ROND' 100, 'slnt' -10",
                      }}
                    >
                      retop
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-mono font-bold text-(--accent-base)">Shift + Enter</span> for {isModernUI ? "VTOP" : "retop"} &nbsp;•&nbsp; <span className="font-mono font-bold text-(--text-muted)">Enter</span> for {isModernUI ? "retop" : "VTOP"}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Category Submenu Popup */}
      {isExpanded && !query.trim() && activeMenu && (() => {
        const itemCount = activeMenu.cat.links.length;
        const cols = Math.max(1, Math.min(5, Math.ceil(itemCount / 10)));
        const colWidth = 220;
        const popupWidth = cols * colWidth;
        const targetLeft = activeMenu.rect.right ? activeMenu.rect.right + 6 : 0;
        const maxLeft = typeof window !== "undefined" ? window.innerWidth - popupWidth - 16 : targetLeft;
        const leftPos = Math.min(targetLeft, maxLeft);

        const targetTop = activeMenu.rect.top ? activeMenu.rect.top : 0;
        const estimatedHeight = Math.ceil(itemCount / cols) * 38 + 24;
        const maxTop = typeof window !== "undefined" ? window.innerHeight - estimatedHeight - 16 : targetTop;
        const topPos = Math.max(16, Math.min(targetTop, maxTop));

        return (
          <div
            onMouseEnter={handleChildEnter}
            onMouseLeave={handleChildLeave}
            className="hidden lg:flex fixed z-[999999] bg-(--bg-surface) border-2 border-(--border-main) rounded-2xl popup-shadow shadow-2xl p-2 flex-col transition-all duration-150"
            style={{
              transformOrigin: "left center",
              left: leftPos,
              top: topPos,
              width: `${popupWidth}px`,
              maxWidth: "calc(100vw - 32px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="grid gap-1 p-0.5"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {activeMenu.cat.links.map((link, i) => (
                <button
                  key={i}
                  id={`home-popup-item-${i}`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    isChildHoveredRef.current = false;
                    const forceLegacy = e.shiftKey ? isModernUI : !isModernUI;
                    onNavigate(link, forceLegacy);
                    setActiveMenu(null);
                    setIsOmniboxOpen(false);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    isChildHoveredRef.current = false;
                    const forceLegacy = e.shiftKey ? isModernUI : !isModernUI;
                    onNavigate(link, forceLegacy);
                    setActiveMenu(null);
                    setIsOmniboxOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 group ${
                    i === selectedIndex && !query
                      ? "bg-(--accent-base) text-(--text-inverse)"
                      : "bg-transparent text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main)"
                  }`}
                >
                  <span className="flex-1 truncate">{link.title}</span>
                  {hasRetopPage(link) && (
                    <span
                      className={`re-badge inline-block text-[9px] font-black px-1 py-0.5 rounded leading-none shrink-0 bg-transparent ${i === selectedIndex && !query ? "text-white" : "text-(--accent-base)"}`}
                      style={{
                        fontFamily: "var(--font-expanded)",
                        fontVariationSettings: "'wdth' 151, 'wght' 700, 'ROND' 100, 'slnt' -10",
                        transform: "skewX(-10deg)",
                      }}
                    >
                      re.
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
