import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useDeferredValue,
} from "react";
import {
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
import { toTitleCase } from "../../utils/formatting";
import { getDestinationView, hasRetopPage } from "../../utils/routes";

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
            fontVariationSettings:
              "'wdth' 125, 'wght' 900, 'ROND' 100, 'slnt' -10",
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
  const { isModernUI, setIsModernUI } = useAppStore();
  const isOffline =
    typeof window !== "undefined" &&
    (!!(window as any).__RETOP_OFFLINE__ ||
      window.location.pathname.includes("offline") ||
      window.location.hostname.includes("web.app") ||
      window.location.protocol === "file:");
  const isHome =
    currentView === "dashboard" || currentView === "home" || !currentView;
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
    const retopNativeLinks: QuickLink[] = [
      {
        title: "Time Table",
        url: "academics/common/StudentTimeTable",
        category: "Made for retop",
      },
      {
        title: "Class Attendance",
        url: "academics/common/StudentAttendance",
        category: "Made for retop",
      },
      {
        title: "Assignments",
        url: "examinations/StudentDA",
        category: "Made for retop",
      },
      {
        title: "Course Page Consolidated",
        url: "academics/common/StudentCoursePage",
        category: "Made for retop",
      },
      {
        title: "Marks View",
        url: "examinations/StudentMarkView",
        category: "Made for retop",
      },
      {
        title: "Grades View",
        url: "examinations/StudentGradeView",
        category: "Made for retop",
      },
      {
        title: "Academic Calendar",
        url: "academics/common/CalendarPreview",
        category: "Made for retop",
      },
      {
        title: "Student Profile",
        url: "studentsRecord/StudentProfileAllView",
        category: "Made for retop",
      },
      {
        title: "Curriculum",
        url: "academics/common/CurriculumSyllabus",
        category: "Made for retop",
      },
      {
        title: "Exam Schedule",
        url: "examinations/StudExamSchedule",
        category: "Made for retop",
      },
      {
        title: "Late Hour Request",
        url: "hostels/late/hour/student/request/1",
        category: "Made for retop",
      },
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
  }, [menuCategories, isOffline]);

  const flattenedLinks = useMemo(() => {
    const allLinks = allCategories.flatMap((c) => c.links);
    const lowerQ = deferredQuery.toLowerCase().trim();

    if (!lowerQ) {
      const seen = new Set<string>();
      const retopLinks: QuickLink[] = [];
      const otherLinks: QuickLink[] = [];

      for (const link of allLinks) {
        const key = `${link.title.toLowerCase()}:${link.url.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          if (hasRetopPage(link)) retopLinks.push(link);
          else otherLinks.push(link);
        }
      }
      return [...retopLinks, ...otherLinks];
    }

    const itemAliases: Record<string, string[]> = {
      "time table": [
        "timetable",
        "time table",
        "schedule",
        "class schedule",
        "slots",
        "weekly timetable",
      ],
      "class attendance": [
        "attendance",
        "class attendance",
        "attendance view",
        "my attendance",
      ],
      assignments: [
        "digital assignments",
        "digital assignment",
        "da",
        "da upload",
        "assignment",
        "assignments",
        "digital assignment upload",
      ],
      "marks view": [
        "marks",
        "marks view",
        "cat marks",
        "assessment marks",
        "test marks",
        "exam marks",
      ],
      "grades view": [
        "grades",
        "grades view",
        "grade history",
        "cgpa",
        "gpa",
        "history",
        "gpa calculator",
        "grade calculator",
      ],
      "academic calendar": [
        "academic calendar",
        "calendar",
        "events",
        "academics calendar",
        "calendar preview",
      ],
      "student profile": [
        "profile",
        "student profile",
        "digital id",
        "id card",
        "my profile",
      ],
      curriculum: [
        "curriculum",
        "syllabus",
        "curriculum syllabus",
        "course syllabus",
      ],
      "exam schedule": [
        "exam schedule",
        "exams",
        "fat",
        "cat",
        "exam",
        "fat schedule",
        "cat schedule",
        "exam timetable",
      ],
      "course page consolidated": [
        "course page",
        "course page consolidated",
        "consolidated course page",
        "course",
        "courses",
        "course material",
        "materials",
        "class material",
        "subject material",
        "course page (consolidated)",
      ],
    };

    const scored: { link: QuickLink; score: number }[] = [];
    const seen = new Set<string>();

    for (const link of allLinks) {
      const key = `${link.title.toLowerCase().trim()}:${link.url.toLowerCase().trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const titleLower = link.title.toLowerCase().trim();
      const urlLower = link.url.toLowerCase().trim();
      const aliases = itemAliases[titleLower] || [];

      let score = 0;
      if (titleLower === lowerQ || aliases.includes(lowerQ)) score = 100;
      else if (
        titleLower.startsWith(lowerQ) ||
        aliases.some((a) => a.startsWith(lowerQ))
      )
        score = 85;
      else if (
        titleLower.includes(lowerQ) ||
        aliases.some((a) => a.includes(lowerQ)) ||
        urlLower.includes(lowerQ)
      )
        score = 65;

      if (score > 0) {
        if (hasRetopPage(link)) score += 10;
        scored.push({ link, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .map((s) => s.link)
      .slice(0, 15);
  }, [deferredQuery, allCategories]);

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Query mode OR offline/single-category flat list mode
      if (query.trim() || isOffline || allCategories.length <= 1) {
        if (flattenedLinks.length === 0) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % flattenedLinks.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(
            (prev) =>
              (prev - 1 + flattenedLinks.length) % flattenedLinks.length,
          );
        } else if (e.key === "Enter" && flattenedLinks[selectedIndex]) {
          e.preventDefault();
          const selLink = flattenedLinks[selectedIndex];
          const forceLegacy = isOffline
            ? false
            : e.shiftKey
              ? isModernUI
              : !isModernUI;
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
          const nextIdx = (categoryIndex + 1) % allCategories.length;
          setCategoryIndex(nextIdx);
          if (activeMenu) {
            const nextCat = allCategories[nextIdx];
            const catEl = document.getElementById(`topbar-cat-item-${nextIdx}`);
            const rect =
              catEl?.getBoundingClientRect() ||
              dropdownRef.current?.getBoundingClientRect() ||
              new DOMRect();
            setActiveMenu({ cat: nextCat, rect });
            setSelectedIndex(0);
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prevIdx =
            (categoryIndex - 1 + allCategories.length) % allCategories.length;
          setCategoryIndex(prevIdx);
          if (activeMenu) {
            const prevCat = allCategories[prevIdx];
            const catEl = document.getElementById(`topbar-cat-item-${prevIdx}`);
            const rect =
              catEl?.getBoundingClientRect() ||
              dropdownRef.current?.getBoundingClientRect() ||
              new DOMRect();
            setActiveMenu({ cat: prevCat, rect });
            setSelectedIndex(0);
          }
        } else if (e.key === "ArrowRight" || e.key === "Enter") {
          e.preventDefault();
          const targetCat = allCategories[categoryIndex];
          if (targetCat) {
            const catEl = document.getElementById(
              `topbar-cat-item-${categoryIndex}`,
            );
            const rect =
              catEl?.getBoundingClientRect() ||
              dropdownRef.current?.getBoundingClientRect() ||
              new DOMRect();
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
  const [isMobileSearchClosing, setIsMobileSearchClosing] = useState(false);

  const closeMobileSearch = () => {
    setIsMobileSearchClosing(true);
    setTimeout(() => {
      setIsOmniboxOpen(false);
      setIsMobileSearchClosing(false);
      setQuery("");
    }, 150);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const path = event.composedPath
        ? event.composedPath()
        : [event.target as Node];
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
        className={`group flex items-center gap-2 md:gap-2.5 transition-all duration-fast ease-out cursor-text min-w-60 md:min-w-72 pl-0.5 sm:pl-1 pr-3 h-12 md:h-14 rounded-4xl relative z-10000 bg-transparent border-2 border-transparent shadow-none`}
      >
        <div className="relative flex items-center shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              (e.currentTarget as HTMLElement).blur();
              if (isHome) {
                if (!isOffline) {
                  setIsModernUI(false);
                }
              } else {
                if (onBack) onBack();
              }
            }}
            title={
              isOffline
                ? isHome
                  ? "retop"
                  : "Return to Dashboard"
                : isHome
                  ? "Go to VTOP"
                  : "Return to Dashboard"
            }
            aria-label={
              isOffline
                ? isHome
                  ? "retop"
                  : "Return to Dashboard"
                : isHome
                  ? "Go to VTOP"
                  : "Return to Dashboard"
            }
            onMouseEnter={() => {
              if (!isOffline) setIsLogoHovered(true);
            }}
            onMouseLeave={() => {
              if (!isOffline) setIsLogoHovered(false);
            }}
            className="relative flex items-center justify-end shrink-0 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none w-[58px] md:w-[66px] h-9 pr-0.5 select-none overflow-visible"
          >
            <div className="relative flex items-center justify-end h-full w-full">
              {/* 1. "re." Branding (re text + dot) */}
              <div
                className={`absolute right-0 inset-y-0 flex items-end justify-end pb-1 transition-all duration-200 ${
                  !isOffline && isHome && isLogoHovered
                    ? "opacity-0 -translate-y-1 scale-90 pointer-events-none"
                    : "opacity-100 translate-y-0 scale-100"
                }`}
              >
                <span className="font-expanded font-black text-2xl md:text-3xl italic lowercase leading-none text-(--text-main) hover:text-(--accent-hover)">
                  re
                </span>
                <div
                  className={`relative ml-[-1.5px] md:ml-[-2.5px] mb-0.5 md:mb-0.75 flex items-center justify-center transition-all duration-300 origin-bottom-left rounded-full bg-(--accent-base) shrink-0 ${
                    isSearchActive
                      ? "w-4.5 h-4.5 md:w-5 md:h-5"
                      : "w-2.5 h-2.5 md:w-3 md:h-3"
                  }`}
                >
                  <Search
                    className={`text-(--text-inverse) transition-all duration-200 absolute ${
                      isSearchActive
                        ? "opacity-100 scale-100 w-2.5 h-2.5 md:w-3 md:h-3"
                        : "opacity-0 scale-0 w-1.5 h-1.5 pointer-events-none"
                    }`}
                    strokeWidth={3.5}
                  />
                </div>
              </div>

              {/* 2. "VTOP" Hover State (Home only, online only) */}
              {!isOffline && isHome && (
                <div
                  className={`absolute right-0 inset-y-0 flex items-center justify-end transition-all duration-200 ${
                    isLogoHovered
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-1 scale-90 pointer-events-none"
                  }`}
                >
                  <span className="font-['Times_New_Roman',Times,serif]! font-bold text-xl md:text-2xl leading-none text-(--text-main) hover:text-(--accent-hover)">
                    VTOP
                  </span>
                </div>
              )}
            </div>
          </button>
        </div>

        <div className="relative flex-1 w-full min-w-0 flex items-center">
          {query &&
            flattenedLinks.length > 0 &&
            toTitleCase(flattenedLinks[0].title)
              .toLowerCase()
              .startsWith(query.toLowerCase()) && (
              <div className="absolute left-0 top-0 bottom-0 flex items-center pointer-events-none w-full overflow-hidden">
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
            className="w-full bg-transparent text-lg md:text-xl font-bold text-(--text-main) focus:outline-none placeholder:text-(--text-main) placeholder:opacity-100 min-w-0 text-left pl-0 relative z-10 normal-case"
          />
        </div>
      </div>

      {/* Mobile Full-Screen Overlay (< lg): 150ms slide up/down animation */}
      {isSearchActive && (
        <div
          className={`fixed inset-0 z-999999 bg-(--bg-main) flex flex-col p-0 lg:hidden overflow-hidden w-screen h-screen ${
            isMobileSearchClosing ? "animate-sheet-down" : "animate-sheet-up"
          }`}
        >
          {/* Mobile Overlay Header: matches compact main topbar dimensions (h-14 px-2.5) */}
          <div className="h-14 px-2.5 sm:px-4 flex items-center gap-2 border-b border-(--border-dim) shrink-0 bg-(--bg-main)">
            <button
              onClick={closeMobileSearch}
              className="relative flex items-center justify-center shrink-0 cursor-pointer hover:opacity-75 transition-opacity focus:outline-none pr-1"
              aria-label="Close search"
            >
              <div className="flex items-end pb-1 pr-1 pl-1">
                <span className="font-expanded font-black text-2xl italic lowercase leading-none text-(--text-main) hover:text-(--accent-hover) transition-colors">
                  re
                </span>
                <div className="relative ml-[-1px] mb-0.5 flex items-center justify-center transition-all duration-300 origin-bottom-left w-2.5 h-2.5 bg-(--accent-base) rounded-full">
                  <Search
                    className="w-1.5 h-1.5 text-(--text-inverse) transition-opacity absolute opacity-100"
                    strokeWidth={4}
                  />
                </div>
              </div>
            </button>
            <div className="flex-1 relative flex items-center bg-(--bg-surface) rounded-full px-4 py-1.5 border border-(--border-dim) focus-within:border-(--accent-base)">
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
          <div className="flex-1 overflow-y-auto py-3 px-4 search-scrollbar flex flex-col gap-1">
            {!query.trim() ? (
              <>
                {/* Starred Items / Quick Links */}
                {pinnedLinks.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    {pinnedLinks.map((link, idx) => (
                      <div
                        key={idx}
                        onClick={(e) => {
                          const forceLegacy = e.shiftKey
                            ? isModernUI
                            : !isModernUI;
                          onNavigate(link, forceLegacy);
                          setIsOmniboxOpen(false);
                          setQuery("");
                        }}
                        className="flex items-center justify-between px-4 py-3 rounded-full bg-(--bg-surface) border border-(--border-dim)/40 active:scale-[0.98] transition-all cursor-pointer text-left"
                      >
                        <span className="text-xs font-bold text-(--text-main) truncate pr-1">
                          {toTitleCase(link.title)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(link);
                          }}
                          className="p-1.5 text-(--accent-base) hover:text-(--text-muted) shrink-0 cursor-pointer"
                          title="Unpin"
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Categories & Links (No section titles, no category bg cards, gap-1, fully rounded items with increased py) */}
                <div className="flex flex-col gap-1">
                  {allCategories.map((cat, catIdx) => {
                    const CatIcon = getCategoryIcon(cat.title);
                    return (
                      <div key={catIdx} className="flex flex-col gap-1 py-1">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 opacity-70">
                          <CatIcon className="w-3.5 h-3.5 text-(--accent-base)" />
                          <span className="font-expanded font-bold text-[11px] text-(--text-muted)">
                            {renderCategoryTitle(cat.title)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {cat.links.map((link, lIdx) => {
                            const linkDest = getDestinationView(link);
                            const isPinned = pinnedLinks.some(
                              (p) =>
                                p.url === link.url ||
                                (linkDest !== "content" &&
                                  getDestinationView(p) === linkDest),
                            );
                            return (
                              <div
                                key={lIdx}
                                className="flex items-center justify-between px-4 py-3 rounded-full bg-(--bg-surface) hover:bg-(--bg-highlight) active:bg-(--bg-highlight) border border-(--border-dim)/30 transition-colors group/mitem"
                              >
                                <button
                                  onClick={(e) => {
                                    const forceLegacy = e.shiftKey
                                      ? isModernUI
                                      : !isModernUI;
                                    onNavigate(link, forceLegacy);
                                    setIsOmniboxOpen(false);
                                    setQuery("");
                                  }}
                                  className="flex items-center gap-2 flex-1 min-w-0 text-left text-xs font-bold text-(--text-main) cursor-pointer border-0 bg-transparent"
                                >
                                  <span className="truncate flex-1 pr-1">
                                    {toTitleCase(link.title)}
                                  </span>
                                  {hasRetopPage(link) && (
                                    <span
                                      className="re-badge inline-block text-[9px] font-black px-1 py-0.5 rounded leading-none shrink-0 bg-transparent text-(--accent-base)"
                                      style={{
                                        fontFamily: "var(--font-expanded)",
                                        fontVariationSettings:
                                          "'wdth' 151, 'wght' 700, 'ROND' 100, 'slnt' -10",
                                      }}
                                    >
                                      re.
                                    </span>
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTogglePin(link);
                                  }}
                                  className="p-1.5 text-(--text-muted) hover:text-(--accent-base) shrink-0 cursor-pointer"
                                  title={
                                    isPinned ? "Unpin from Dock" : "Pin to Dock"
                                  }
                                >
                                  <Star
                                    className={`w-4 h-4 transition-all ${
                                      isPinned
                                        ? "text-(--accent-base) fill-current"
                                        : "opacity-50 hover:opacity-100"
                                    }`}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Mobile Search Results */
              <div className="flex flex-col gap-1">
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
                    const isPinned = pinnedLinks.some(
                      (p) =>
                        p.url === link.url ||
                        (linkDest !== "content" &&
                          getDestinationView(p) === linkDest),
                    );
                    return (
                      <div
                        key={i}
                        onClick={(e) => {
                          const forceLegacy = e.shiftKey
                            ? isModernUI
                            : !isModernUI;
                          onNavigate(link, forceLegacy);
                          setIsOmniboxOpen(false);
                          setQuery("");
                        }}
                        className="flex items-center justify-between px-4 py-3.5 rounded-full bg-(--bg-surface) border border-(--border-dim)/40 active:scale-[0.99] transition-all cursor-pointer"
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
                                fontVariationSettings:
                                  "'wdth' 151, 'wght' 700, 'ROND' 100, 'slnt' -10",
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
                            className={`w-4 h-4 transition-all ${
                              isPinned
                                ? "text-(--accent-base) fill-current"
                                : "opacity-50 hover:opacity-100"
                            }`}
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
          ref={dropdownRef}
          key="search-dropdown"
          className="hidden lg:flex absolute top-full mt-2 left-0 w-64 md:w-72 bg-(--bg-surface) border-0 rounded-3xl z-999999 origin-top-left flex-col overflow-hidden popup-shadow px-2 transition-all duration-200 animate-popup-open"
        >
          <div className="p-1">
            <div
              className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto search-scrollbar pr-1.5 py-1.5"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 14px, black calc(100% - 14px), transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 14px, black calc(100% - 14px), transparent 100%)",
              }}
            >
              {!query && !isOffline && allCategories.length > 1 ? (
                <div
                  className="space-y-1"
                  onMouseLeave={handleMenuLeave}
                  onMouseEnter={handleMenuEnter}
                >
                  {allCategories.map((cat, catIdx) => {
                    const CatIcon = getCategoryIcon(cat.title);
                    const isActive =
                      activeMenu?.cat.title === cat.title ||
                      (!activeMenu && catIdx === categoryIndex);
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
                        className={`flex w-full items-center justify-start p-2 md:p-2.5 rounded-xl transition-all duration-fast ease-out group cursor-pointer ${isActive ? "bg-(--accent-base) text-(--text-inverse)" : "bg-transparent text-(--text-main) hover:bg-(--bg-highlight)"}`}
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
                    const isSelected = i === selectedIndex;
                    const linkDest = getDestinationView(link);
                    const isPinned = pinnedLinks.some(
                      (p) =>
                        p.url === link.url ||
                        (linkDest !== "content" &&
                          getDestinationView(p) === linkDest),
                    );
                    const category = hasRetopPage(link)
                      ? "Made for retop"
                      : link.category || "Other";
                    const isNewCategory =
                      !isOffline &&
                      allCategories.length > 1 &&
                      category !== currentCategory;
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
                              const forceLegacy = isOffline
                                ? false
                                : e.shiftKey
                                  ? isModernUI
                                  : !isModernUI;
                              onNavigate(link, forceLegacy);
                              setIsOmniboxOpen(false);
                              setQuery("");
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              const forceLegacy = isOffline
                                ? false
                                : e.shiftKey
                                  ? isModernUI
                                  : !isModernUI;
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
                              <span className="truncate">
                                {toTitleCase(link.title)}
                              </span>
                              {hasRetopPage(link) && (
                                <span
                                  className={`re-badge inline-block text-[9px] font-black px-1 py-0.5 rounded leading-none shrink-0 bg-transparent ${isSelected ? "text-white" : "text-(--accent-base)"}`}
                                  style={{
                                    fontFamily: "var(--font-expanded)",
                                    fontVariationSettings:
                                      "'wdth' 151, 'wght' 700, 'ROND' 100, 'slnt' -10",
                                    transform: "skewX(-10deg)",
                                  }}
                                >
                                  re.
                                </span>
                              )}
                            </div>
                          </button>
                          <div className="absolute right-1 top-1 bottom-1 w-12 pr-1 flex items-center justify-end rounded-r-xl transition-all pointer-events-none z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePin(link);
                              }}
                              className="pointer-events-auto p-1.5 rounded-xl transition-all border-2 border-transparent hover:bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) cursor-pointer"
                              title={
                                isPinned ? "Unpin from Dock" : "Pin to Dock"
                              }
                            >
                              <Star
                                className={`w-4.5 h-4.5 transition-transform ${
                                  isPinned
                                    ? "text-(--accent-base) fill-current scale-110"
                                    : "opacity-50 group-hover:opacity-100 hover:text-(--text-main)"
                                }`}
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
              {isOffline ? (
                <span>
                  <span className="font-mono font-bold text-(--accent-base)">
                    Enter
                  </span>{" "}
                  to open &nbsp;•&nbsp;{" "}
                  <span className="font-mono font-bold text-(--text-muted)">
                    Esc
                  </span>{" "}
                  to close
                </span>
              ) : (
                <span>
                  <span className="font-mono font-bold text-(--accent-base)">
                    Shift + Enter
                  </span>{" "}
                  for{" "}
                  {isModernUI ? (
                    <span className="font-vtop font-bold">VTOP</span>
                  ) : (
                    "retop"
                  )}{" "}
                  &nbsp;•&nbsp;{" "}
                  <span className="font-mono font-bold text-(--text-muted)">
                    Enter
                  </span>{" "}
                  for{" "}
                  {isModernUI ? (
                    "retop"
                  ) : (
                    <span className="font-vtop font-bold">VTOP</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Category Submenu Popup */}
      {isExpanded &&
        !query.trim() &&
        !isOffline &&
        allCategories.length > 1 &&
        activeMenu &&
        (() => {
          const itemCount = activeMenu.cat.links.length;
          const cols = Math.max(1, Math.min(5, Math.ceil(itemCount / 10)));
          const colWidth = 220;
          const popupWidth = cols * colWidth;

          const dropdownRect = dropdownRef.current?.getBoundingClientRect();
          let itemRect = activeMenu.rect;
          if (!itemRect || itemRect.right === 0 || itemRect.width === 0) {
            const catEl = document.getElementById(
              `topbar-cat-item-${categoryIndex}`,
            );
            if (catEl) {
              itemRect = catEl.getBoundingClientRect();
            }
          }

          const fallbackRight = dropdownRect ? dropdownRect.right : 320;
          const fallbackTop = dropdownRect ? dropdownRect.top : 64;

          const baseRight =
            itemRect && itemRect.right > 0 ? itemRect.right : fallbackRight;
          const baseTop =
            itemRect && itemRect.top > 0 ? itemRect.top : fallbackTop;

          const targetLeft = baseRight + 8;
          const maxLeft =
            typeof window !== "undefined"
              ? window.innerWidth - popupWidth - 16
              : targetLeft;
          const leftPos = Math.max(16, Math.min(targetLeft, maxLeft));

          const targetTop = baseTop;
          const estimatedHeight = Math.ceil(itemCount / cols) * 38 + 24;
          const maxTop =
            typeof window !== "undefined"
              ? window.innerHeight - estimatedHeight - 16
              : targetTop;
          const topPos = Math.max(16, Math.min(targetTop, maxTop));

          return (
            <div
              onMouseEnter={handleChildEnter}
              onMouseLeave={handleChildLeave}
              className="hidden lg:flex fixed z-[999999] bg-(--bg-surface) border-2 border-(--border-main) rounded-2xl popup-shadow shadow-2xl p-2 flex-col transition-all duration-150 overflow-visible"
              style={{
                transformOrigin: "left center",
                left: leftPos,
                top: topPos,
                width: `${popupWidth}px`,
                maxWidth: "calc(100vw - 32px)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hidden hover bridge (triangle): keeps the submenu open while the
                  cursor travels between the category item and the submenu. */}
              <div
                onMouseEnter={handleChildEnter}
                onMouseLeave={handleChildLeave}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: -16,
                  top: 0,
                  width: 16,
                  height: estimatedHeight,
                  clipPath: "polygon(100% 0%, 100% 100%, 0% 50%)",
                  background: "transparent",
                }}
              />
              <div
                className="grid gap-1 p-0.5 overflow-hidden rounded-2xl"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                }}
              >
                {activeMenu.cat.links.map((link, i) => {
                  const linkDest = getDestinationView(link);
                  const isPinned = pinnedLinks.some(
                    (p) =>
                      p.url === link.url ||
                      (linkDest !== "content" &&
                        getDestinationView(p) === linkDest),
                  );
                  return (
                    <div
                      key={i}
                      className={`relative w-full flex items-center rounded-xl transition-all group/item ${
                        i === selectedIndex && !query
                          ? "bg-(--accent-base) text-(--text-inverse)"
                          : "bg-transparent text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main)"
                      }`}
                    >
                      <button
                        id={`home-popup-item-${i}`}
                        onMouseEnter={() => setSelectedIndex(i)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          isChildHoveredRef.current = false;
                          const forceLegacy = e.shiftKey
                            ? isModernUI
                            : !isModernUI;
                          onNavigate(link, forceLegacy);
                          setActiveMenu(null);
                          setIsOmniboxOpen(false);
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          isChildHoveredRef.current = false;
                          const forceLegacy = e.shiftKey
                            ? isModernUI
                            : !isModernUI;
                          onNavigate(link, forceLegacy);
                          setActiveMenu(null);
                          setIsOmniboxOpen(false);
                        }}
                        className="flex-1 text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 border-0 bg-transparent text-inherit cursor-pointer min-w-0 pr-7"
                      >
                        <span className="truncate">{link.title}</span>
                        {hasRetopPage(link) && (
                          <span
                            className={`re-badge inline-block text-[9px] font-black px-1 py-0.5 rounded leading-none shrink-0 bg-transparent ${i === selectedIndex && !query ? "text-white" : "text-(--accent-base)"}`}
                            style={{
                              fontFamily: "var(--font-expanded)",
                              fontVariationSettings:
                                "'wdth' 151, 'wght' 700, 'ROND' 100, 'slnt' -10",
                              transform: "skewX(-10deg)",
                            }}
                          >
                            re.
                          </span>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(link);
                        }}
                        className={`absolute right-1.5 p-1 rounded-lg transition-all cursor-pointer shrink-0 z-20 ${
                          isPinned
                            ? "text-(--accent-base) opacity-100"
                            : "text-(--text-muted) opacity-0 group-hover/item:opacity-100 hover:text-(--text-main)"
                        }`}
                        title={isPinned ? "Unpin from Dock" : "Pin to Dock"}
                      >
                        <Star
                          className={`w-4 h-4 transition-transform ${
                            isPinned
                              ? "fill-current scale-110"
                              : "opacity-60 hover:opacity-100"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
    </div>
  );
};
