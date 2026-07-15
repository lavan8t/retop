import React, { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Keep,
  Error,
  Search,
  Autorenew,
  ChevronRight,
  Home,
  Sync,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { QuickLink, MenuCategory } from "../../types/vtop";
import { MarqueeText } from "../common/MarqueeText";
import { useDataStore } from "../../store/dataStore";
import { getCategoryIcon } from "../../utils/icons";

interface TopBarSearchProps {
  currentView: string;
  isOmniboxOpen: boolean;
  setIsOmniboxOpen: (val: boolean) => void;
  menuCategories: MenuCategory[];
  pinnedLinks: QuickLink[];
  onNavigate: (link: QuickLink) => void;
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

const fuzzyMatch = (str: string, pattern: string) => {
  pattern = pattern.split("").reduce((a, b) => a + ".*" + b);
  return new RegExp(pattern).test(str);
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
  const [query, setQuery] = useState(initialQuery);
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
    }, 300);
  };

  const isExpanded = isOmniboxOpen;

  useEffect(() => {
    if (isOmniboxOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOmniboxOpen]);

  useEffect(() => {
    if (isExpanded && initialQuery) {
      setQuery(initialQuery);
    }
  }, [isExpanded, initialQuery]);

  useEffect(() => {
    if (!isExpanded) {
      setQuery("");
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleOmniboxType = (e: any) => {
      setQuery((q) => q + (e.detail || ""));
      if (inputRef.current) inputRef.current.focus();
    };
    window.addEventListener("vtop-omnibox-type", handleOmniboxType);
    return () => window.removeEventListener("vtop-omnibox-type", handleOmniboxType);
  }, []);

  const flattenedLinks = useMemo(() => {
    const staticLinks: QuickLink[] = [];

    if ((window as any).__RETOP_OFFLINE__) {
      staticLinks.push(
        {
          title: "Time Table",
          url: "academics/common/StudentTimeTable",
          category: "Academics",
        },
        {
          title: "Academic Calendar",
          url: "academics/common/CalendarPreview",
          category: "Academics",
        },
        {
          title: "Profile",
          url: "studentsRecord/StudentProfileAllView",
          category: "Profile",
        },
        {
          title: "Marks View",
          url: "examinations/StudentMarkView",
          category: "Examinations",
        },
        {
          title: "Grades View",
          url: "examinations/StudentGradeView",
          category: "Examinations",
        },
        {
          title: "Attendance",
          url: "academics/common/StudentAttendance",
          category: "Academics",
        },
      );
    }

    const allLinks = [
      ...staticLinks,
      ...menuCategories.flatMap((c) => c.links),
    ];

    let sortedMatches = allLinks;

    if (query.trim()) {
      const lowerQ = query.toLowerCase().trim();
      const matches: { link: QuickLink; score: number }[] = [];

      allLinks.forEach((link) => {
        const titleLower = link.title.toLowerCase();
        let score = 0;
        if (titleLower === lowerQ) score = 100;
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

    const grouped = new Map<string, QuickLink[]>();
    sortedMatches.forEach((link) => {
      const cat = link.category || "Other";
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(link);
    });

    const finalLinks: QuickLink[] = [];
    grouped.forEach((links) => finalLinks.push(...links));
    return finalLinks;
  }, [query, menuCategories]);

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
        onNavigate(flattenedLinks[selectedIndex]);
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
  ]);

  const isSearchActive = isExpanded;

  const menuVariants = {
    hidden: { opacity: 0, scale: 0.4, y: -20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 1200, damping: 40 },
    },
    exit: {
      opacity: 0,
      scale: 0.4,
      y: -20,
      transition: { type: "spring", stiffness: 1200, damping: 40 },
    },
  };

  return (
    <div className="relative flex flex-col z-50">
      {/* Unified Search Bar */}
      <div
        className={`group flex items-center gap-3 transition-all duration-fast ease-out cursor-text md:min-w-[360px] pl-4 pr-3 h-12 md:h-14 rounded-[32px] relative z-10000
          ${
            isExpanded
              ? `bg-(--bg-surface) border-2 border-(--border-main) shadow-(--brutal-shadow-hover) ${isSearchActive ? "rounded-b-none border-b-transparent" : ""}`
              : "bg-transparent border-2 border-transparent shadow-none"
          }
        `}
      >
        <div
          className="relative"
          onMouseEnter={() => {
            if (logoMenuTimeout.current) clearTimeout(logoMenuTimeout.current);
            setShowLogoMenu(true);
          }}
          onMouseLeave={() => {
            logoMenuTimeout.current = setTimeout(
              () => setShowLogoMenu(false),
              200,
            );
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onBack) onBack();
            }}
            title="Return to Dashboard"
            className="relative flex items-center justify-center shrink-0 cursor-pointer hover:opacity-75 transition-opacity"
          >
            <div className="flex items-end pb-1">
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
                className={`relative ml-0.5 md:ml-1 mb-0.5 md:mb-0.75 flex items-center justify-center transition-all origin-bottom-left w-1 h-1 md:w-1.5 md:h-1.5 bg-(--accent-base) rounded-full ${status === "loading" ? "" : "group-focus-within:scale-[2]"}`}
              >
                <Search
                  className={`w-0.5 h-0.5 md:w-1 md:h-1 text-(--text-inverse) transition-opacity absolute ${status === "loading" ? "opacity-0" : "opacity-0 group-focus-within:opacity-100"}`}
                  strokeWidth={4}
                />
              </motion.div>
            </div>
          </button>

          {/* Logo hover dropdown */}
          <AnimatePresence>
            {showLogoMenu && !isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute top-full left-1 mt-1 z-10001 flex flex-col gap-1"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSync && !isSyncing) onSync();
                  }}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-(--bg-hover) transition-colors cursor-pointer text-left disabled:opacity-50"
                >
                  <motion.div
                    animate={isSyncing ? { rotate: 360 } : {}}
                    transition={
                      isSyncing
                        ? { duration: 1, repeat: Infinity, ease: "linear" }
                        : {}
                    }
                    className="shrink-0 flex items-center justify-center"
                  >
                    <Autorenew className="w-3.5 h-3.5 text-(--text-muted)" />
                  </motion.div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-(--text-main) leading-none mt-0.5">
                      {isSyncing ? "Syncing" : "Sync"}
                    </span>
                    {lastSyncTime > 0 && (
                      <span className="text-[8px] text-(--text-muted) leading-none mt-0.5">
                        {(() => {
                          const ago = Math.floor(
                            (Date.now() - lastSyncTime) / 1000,
                          );
                          if (ago < 60) return "now";
                          if (ago < 3600) return `${Math.floor(ago / 60)}m`;
                          return `${Math.floor(ago / 3600)}h`;
                        })()}
                      </span>
                    )}
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative flex-1 w-full min-w-0 flex items-center">
          {query &&
            flattenedLinks.length > 0 &&
            flattenedLinks[0].title
              .toLowerCase()
              .startsWith(query.toLowerCase()) && (
              <div className="absolute left-2 top-0 bottom-0 flex items-center pointer-events-none w-full overflow-hidden">
                <span className="text-lg md:text-xl font-bold text-transparent whitespace-pre uppercase">
                  {query}
                </span>
                <span className="text-lg md:text-xl font-bold text-(--text-muted) opacity-50 whitespace-pre uppercase truncate">
                  {flattenedLinks[0].title.slice(query.length)}
                </span>
              </div>
            )}
          <input
            ref={inputRef}
            type="text"
            placeholder={pageTitle}
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
            onBlur={() => {
              setTimeout(() => setIsOmniboxOpen(false), 200);
            }}
            className={`w-full bg-transparent text-lg md:text-xl font-bold text-(--text-main) focus:outline-none placeholder-(--text-muted) min-w-0 uppercase text-left pl-2 relative z-10`}
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
            className="absolute top-full left-0 w-full max-w-[calc(100vw-24px)] bg-(--bg-surface) border-2 border-t-0 border-(--border-main) rounded-[32px] rounded-t-none z-10001 origin-top-left flex flex-col will-change-transform transform-gpu overflow-hidden popup-shadow"
          >
            <div className="p-2">
              <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1.5">
                {!query ? (
                  <div
                    className="space-y-1"
                    onMouseLeave={handleMenuLeave}
                    onMouseEnter={handleMenuEnter}
                  >
                    {menuCategories.map((cat, catIdx) => {
                      const CatIcon = getCategoryIcon(cat.title);
                      const isActive = activeMenu?.cat.title === cat.title;
                      return (
                        <motion.button
                          key={catIdx}
                          whileTap={{ scale: 0.96 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIndex(0);
                            setActiveMenu({
                              cat,
                              rect: e.currentTarget.getBoundingClientRect(),
                            });
                          }}
                          onMouseEnter={(e) => {
                            setSelectedIndex(0);
                            setActiveMenu({
                              cat,
                              rect: e.currentTarget.getBoundingClientRect(),
                            });
                          }}
                          className={`flex w-full items-center justify-between p-3 rounded-2xl transition-all duration-fast ease-out group ${isActive ? "bg-(--accent-base) text-(--text-inverse)" : "bg-transparent text-(--text-main) hover:bg-(--bg-highlight)"}`}
                        >
                          <div className="flex items-center gap-3">
                            <CatIcon
                              className={`w-5 h-5 transition-colors ${isActive ? "text-(--text-inverse)" : "text-(--text-muted) group-hover:text-(--accent-base)"}`}
                            />
                            <span
                              className={`font-expanded font-black text-xs uppercase text-left transition-colors ${isActive ? "text-(--text-inverse)" : "text-(--text-main) group-hover:text-(--accent-base)"}`}
                            >
                              {cat.title}
                            </span>
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 transition-all ${isActive ? "opacity-100 text-(--text-inverse)" : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-(--text-muted) group-hover:text-(--accent-base)"}`}
                          />
                        </motion.button>
                      );
                    })}
                  </div>
                ) : flattenedLinks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-(--text-dim)">
                    <Error className="w-8 h-8 mb-2 opacity-50" />
                    <span className="font-expanded text-sm uppercase text-(--text-muted)">
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
                      const category = link.category || "Other";
                      const isNewCategory = category !== currentCategory;
                      if (isNewCategory) currentCategory = category;

                      return (
                        <React.Fragment key={i}>
                          {isNewCategory && (
                            <div className="px-3 pt-4 pb-2 text-[11px] font-expanded font-black text-(--text-main) uppercase tracking-wider border-b border-(--border-dim) mb-2">
                              {currentCategory}
                            </div>
                          )}
                          <div className="relative w-full mb-1 group">
                            <button
                              onClick={() => {
                                onNavigate(link);
                                setIsOmniboxOpen(false);
                                setQuery("");
                              }}
                              onMouseEnter={() => setSelectedIndex(i)}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-3 border-4 ${
                                isSelected
                                  ? "bg-(--accent-base) text-(--text-inverse) border-(--border-main) shadow-none -translate-y-px"
                                  : "bg-transparent border-transparent text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main)"
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-8 flex items-center h-5">
                                <MarqueeText text={link.title} />
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
                                className={`pointer-events-auto p-1.5 rounded-xl transition-all border-2 shadow-none ${
                                  isPinned
                                    ? "bg-transparent text-(--text-main) border-transparent"
                                    : "bg-transparent border-transparent text-(--text-dim) hover:bg-(--text-main) hover:text-(--bg-main)"
                                }`}
                                title={
                                  isPinned ? "Unpin from Dock" : "Pin to Dock"
                                }
                              >
                                <Keep
                                  className={`w-3.5 h-3.5 transition-opacity ${!isPinned ? "opacity-50 group-hover:opacity-100" : "opacity-100"} ${isPinned ? "text-(--accent-base)" : ""}`}
                                  style={{
                                    transform: isPinned
                                      ? "rotate(45deg)"
                                      : "none",
                                  }}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeMenu && (
          <motion.div
            onMouseEnter={handleMenuEnter}
            onMouseLeave={handleMenuLeave}
            initial={{ opacity: 0, scaleX: 0.3, scaleY: 0.8, x: -20 }}
            animate={{ opacity: 1, scaleX: 1, scaleY: 1, x: 0 }}
            exit={{ opacity: 0, scaleX: 0.3, scaleY: 0.8, x: -20 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute z-10001 bg-(--bg-surface) border-4 border-(--border-main) rounded-2xl shadow-(--brutal-shadow-hover) p-2 flex flex-col"
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
                  onClick={() => {
                    onNavigate(link);
                    setActiveMenu(null);
                    setIsOmniboxOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 group ${
                    i === selectedIndex && !query
                      ? "bg-(--accent-base) text-(--text-inverse)"
                      : "bg-transparent text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main)"
                  }`}
                >
                  <span className="flex-1 truncate">{link.title}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
