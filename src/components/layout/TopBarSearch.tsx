import React, { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Keep,
  Error,
  Search,
  Autorenew,
  ChevronRight,
  Home,
  Sync,
  Star,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { QuickLink, MenuCategory } from "../../types/vtop";
import { MarqueeText } from "../common/MarqueeText";
import { SPRING_SNAPPY, SPRING_QUICK, TRANSITION_DROPDOWN_EXIT } from "../../utils/motion";
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

  // 1. Primary check: Request URL matching
  const hasUrlMatch =
    url.includes("studenttimetable") ||
    url.includes("studentattendance") ||
    url.includes("studentda") ||
    url.includes("studentmark") ||
    url.includes("studentgradeview") ||
    url.includes("studexamschedule") ||
    url.includes("studentprofileallview") ||
    url.includes("curriculum") ||
    url.includes("coursepage") ||
    url.includes("calendarpreview") ||
    url.includes("calendar");

  if (hasUrlMatch) return true;

  // 2. Secondary check: Strict EXACT full title match only
  const exactFullTitles = [
    "timetable",
    "time table",
    "class attendance",
    "attendance",
    "digital assignments",
    "digital assignment upload",
    "assignments",
    "marks",
    "marks view",
    "grades view",
    "grades & history",
    "exam schedule",
    "profile",
    "curriculum",
    "course page",
    "academic calendar",
    "academics calendar",
    "calendar",
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [showLogoMenu, setShowLogoMenu] = useState(false);
  const logoMenuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeMenu, setActiveMenu] = useState<{
    cat: MenuCategory;
    rect: DOMRect;
  } | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMenuEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };
  const handleMenuLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  const isExpanded = isOmniboxOpen;

  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
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
    const retopNativeLinks: QuickLink[] = [
      { title: "Time Table", url: "academics/common/StudentTimeTable", category: "Made for retop" },
      { title: "Class Attendance", url: "academics/common/StudentAttendance", category: "Made for retop" },
      { title: "Assignments", url: "examinations/StudentDA", category: "Made for retop" },
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

    const filtered = menuCategories
      .filter((c) => c.title !== "Made for retop")
      .map((c) => ({
        ...c,
        links: c.links.filter((l) => !hasRetopPage(l)),
      }))
      .filter((c) => c.links.length > 0);

    return [madeForRetopCat, ...filtered];
  }, [menuCategories]);

  const flattenedLinks = useMemo(() => {
    const allLinks = allCategories.flatMap((c) => c.links);

    let sortedMatches = allLinks;

    if (query.trim()) {
      const lowerQ = query.toLowerCase().trim();
      const matches: { link: QuickLink; score: number }[] = [];

      allLinks.forEach((link) => {
        const titleLower = link.title.toLowerCase();
        const urlLower = link.url.toLowerCase();
        let score = 0;

        const isAssignmentPage =
          titleLower === "assignments" ||
          titleLower === "digital assignments" ||
          titleLower === "digital assignment upload" ||
          urlLower.includes("studentda");

        const searchMatchesAssignment =
          lowerQ.includes("digital") ||
          lowerQ.includes("assignment") ||
          lowerQ.includes("upload") ||
          lowerQ === "da";

        if (isAssignmentPage && searchMatchesAssignment) {
          score = 90;
        } else if (titleLower === lowerQ) score = 100;
        else if (titleLower.startsWith(lowerQ)) score = 80;
        else if (titleLower.includes(lowerQ)) score = 50;
        else if (fuzzyMatch(titleLower, lowerQ)) score = 10;
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
  }, [query, allCategories]);

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (query && e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flattenedLinks.length);
      } else if (query && e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + flattenedLinks.length) % flattenedLinks.length,
        );
      } else if (query && e.key === "Enter" && flattenedLinks[selectedIndex]) {
        e.preventDefault();
        const selLink = flattenedLinks[selectedIndex];
        const forceLegacy = e.shiftKey ? isModernUI : !isModernUI;
        onNavigate(selLink, forceLegacy);
        setIsOmniboxOpen(false);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (activeMenu) {
          setActiveMenu(null);
        } else {
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
    isExpanded,
    onNavigate,
    setIsOmniboxOpen,
    activeMenu,
    isModernUI,
  ]);

  const isSearchActive = isExpanded;

  const menuVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: -8 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: SPRING_SNAPPY,
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -8,
      transition: TRANSITION_DROPDOWN_EXIT,
    },
  };

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOmniboxOpen(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
                if (onBack) onBack();
              }}
              className="relative flex items-center justify-center shrink-0 cursor-pointer hover:opacity-75 transition-opacity"
            >
              <div className="flex items-end pb-1 pr-1 pl-1 md:pl-2">
                <span className="font-expanded font-black text-2xl md:text-3xl italic lowercase leading-none text-(--text-main) group-focus-within:text-(--accent-hover) transition-colors">
                  re
                </span>
                <motion.div
                  animate={status === "loading" ? { scale: [1, 2, 1] } : {}}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={`relative ml-[-1px] md:ml-[-3px] mb-0.5 md:mb-0.75 flex items-center justify-center transition-all origin-bottom-left w-1 h-1 md:w-1.5 md:h-1.5 bg-(--accent-base) rounded-full ${status === "loading" ? "" : isExpanded ? "scale-[2]" : ""}`}
                >
                  <Search
                    className={`w-0.5 h-0.5 md:w-1 md:h-1 text-(--text-inverse) transition-opacity absolute ${status === "loading" ? "opacity-0" : isExpanded ? "opacity-100" : "opacity-0"}`}
                    strokeWidth={4}
                  />
                </motion.div>
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

      <AnimatePresence>
        {isSearchActive && (
          <motion.div
            key="search-dropdown"
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-full mt-2 left-0 w-full max-w-[calc(100vw-24px)] bg-(--bg-surface) border-0 rounded-3xl z-10001 origin-top-left flex flex-col will-change-transform transform-gpu overflow-hidden popup-shadow p-2"
          >
            <div className="p-1">
              <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1.5">
                {!query ? (
                  <div
                    className="space-y-1"
                    onMouseLeave={handleMenuLeave}
                    onMouseEnter={handleMenuEnter}
                  >
                    {allCategories.map((cat, catIdx) => {
                      const CatIcon = getCategoryIcon(cat.title);
                      const isActive = activeMenu?.cat.title === cat.title;
                      return (
                        <div
                          key={catIdx}
                          onMouseEnter={(e) => {
                            if (!isExpanded || query.trim() !== "") return;
                            setSelectedIndex(0);
                            setActiveMenu({
                              cat,
                              rect: e.currentTarget.getBoundingClientRect(),
                            });
                          }}
                          className={`flex w-full items-center justify-between p-2 md:p-2.5 rounded-xl transition-all duration-fast ease-out group ${isActive ? "bg-(--accent-base) text-(--text-inverse)" : "bg-transparent text-(--text-main) hover:bg-(--bg-highlight)"}`}
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
                              onClick={(e) => {
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
                                <MarqueeText text={toTitleCase(link.title)} />
                                {hasRetopPage(link) && (
                                  <span
                                    className={`re-badge inline-block text-[9px] font-black px-1.5 py-0.5 rounded leading-none shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-(--accent-base)/20 text-(--accent-base)"}`}
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && !query.trim() && activeMenu && (
          <motion.div
            onMouseEnter={handleMenuEnter}
            onMouseLeave={handleMenuLeave}
            initial={{ opacity: 0, scaleX: 0.3, scaleY: 0.8, x: 20 }}
            animate={{ opacity: 1, scaleX: 1, scaleY: 1, x: 0 }}
            exit={{ opacity: 0, scaleX: 0.3, scaleY: 0.8, x: 20 }}
            transition={SPRING_QUICK}
            className="absolute z-[10001] bg-(--bg-surface) border-4 border-(--border-main) rounded-2xl popup-shadow shadow-2xl shadow-black/50 p-2 flex flex-col"
            style={{
              transformOrigin: "left center",
              left: activeMenu.rect.right ? activeMenu.rect.right + 12 : 0,
              top: activeMenu.rect.top ? activeMenu.rect.top : 0,
              maxHeight: "calc(100vh - 40px)",
              width:
                activeMenu.cat.links.length > 20
                  ? "600px"
                  : activeMenu.cat.links.length > 10
                    ? "400px"
                    : "220px",
              maxWidth: "calc(100vw - 40px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`grid ${activeMenu.cat.links.length > 20 ? "grid-cols-3" : activeMenu.cat.links.length > 10 ? "grid-cols-2" : "grid-cols-1"} gap-1 overflow-y-auto custom-scrollbar pt-1`}
            >
              {activeMenu.cat.links.map((link, i) => (
                <button
                  key={i}
                  id={`home-popup-item-${i}`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={(e) => {
                    onNavigate(link, e.altKey && hasRetopPage(link) ? false : e.shiftKey);
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
                      className={`re-badge inline-block text-[9px] font-black px-1.5 py-0.5 rounded leading-none shrink-0 ${i === selectedIndex && !query ? "bg-white/20 text-white" : "bg-(--accent-base)/20 text-(--accent-base)"}`}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
