import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, Transition } from "framer-motion";
import {
  Home,
  Search,
  FileText,
  CornerDownRight,
  X,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Pin,
} from "lucide-react";
import { QuickLink, MenuCategory } from "../../types/vtop";
import { getCategoryIcon } from "../../utils/icons";

interface BottomNavProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  pinnedLinks: QuickLink[];
  onNavigate: (link: QuickLink) => void;
  getDestinationView: (link: QuickLink) => string;
  isOmniboxOpen: boolean;
  setIsOmniboxOpen: (val: boolean) => void;
  menuCategories: MenuCategory[];
  initialQuery?: string;
  onTogglePin: (link: QuickLink) => void;
}

type NavItem = {
  id: string;
  title: string;
  fullTitle: string;
  icon: any;
  color: string;
  onClick: () => void;
  isActive: boolean;
};

const toTitleCase = (str: string) => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const fuzzyMatch = (text: string, query: string) => {
  let tIdx = 0,
    qIdx = 0;
  const t = text.toLowerCase(),
    q = query.toLowerCase();
  while (tIdx < t.length && qIdx < q.length) {
    if (t[tIdx] === q[qIdx]) qIdx++;
    tIdx++;
  }
  return qIdx === q.length;
};

const staticLinks: QuickLink[] = [
  { title: "Settings & Preferences", url: "#settings", category: "System" },
  {
    title: "Student Profile",
    url: "studentprofileallview",
    category: "System",
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  setCurrentView,
  pinnedLinks,
  onNavigate,
  getDestinationView,
  isOmniboxOpen,
  setIsOmniboxOpen,
  menuCategories,
  initialQuery = "",
  onTogglePin,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [activeCallout, setActiveCallout] = useState<string | null>(null);

  // Track BOTH scroll axes
  const lastScrollTop = useRef<Map<EventTarget, number>>(new Map());
  const lastScrollLeft = useRef<Map<EventTarget, number>>(new Map());

  const calloutTimeout = useRef<number | null>(null);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1280);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 640);
      setIsDesktop(window.innerWidth >= 1280);
    };
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  useEffect(() => {
    setIsVisible(true);
  }, [currentView]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || typeof target.scrollTop !== "number") return;

      const hasVerticalScroll = target.scrollHeight > target.clientHeight + 20;
      const hasHorizontalScroll = target.scrollWidth > target.clientWidth + 20;

      if (!hasVerticalScroll && !hasHorizontalScroll) return;

      const currentScrollY = target.scrollTop;
      const currentScrollX = target.scrollLeft;
      const previousScrollY = lastScrollTop.current.get(target) || 0;
      const previousScrollX = lastScrollLeft.current.get(target) || 0;

      const diffY = currentScrollY - previousScrollY;
      const diffX = currentScrollX - previousScrollX;

      // Hide on down scroll OR horizontal scroll
      if (diffY > 12 || Math.abs(diffX) > 12) {
        setIsVisible(false);
        lastScrollTop.current.set(target, currentScrollY);
        lastScrollLeft.current.set(target, currentScrollX);
      } else if (diffY < -12) {
        // Reveal on upward scroll
        setIsVisible(true);
        lastScrollTop.current.set(target, currentScrollY);
        lastScrollLeft.current.set(target, currentScrollX);
      }

      // Safety catch: always reveal at absolute top/left boundary
      if (currentScrollY <= 10 && currentScrollX <= 10) setIsVisible(true);
    };

    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      window.removeEventListener("scroll", handleScroll, { capture: true });
  }, []);

  useEffect(() => {
    if (isOmniboxOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setExpandedCats(new Set());
      setTimeout(() => {
        if (inputRef.current && (!isMobile || initialQuery !== ""))
          inputRef.current.focus();
      }, 50);
    } else {
      setQuery("");
    }
  }, [isOmniboxOpen, initialQuery, isMobile]);

  const handleItemClick = (
    id: string,
    onClick: () => void,
    isCompact: boolean,
  ) => {
    if (isCompact) {
      if (calloutTimeout.current !== null)
        window.clearTimeout(calloutTimeout.current);
      setActiveCallout(id);
      calloutTimeout.current = window.setTimeout(
        () => setActiveCallout(null),
        700,
      );
    }
    onClick();
  };

  const flattenedLinks = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQ = query.toLowerCase().trim();
    const matches: { link: QuickLink; score: number }[] = [];

    [...staticLinks, ...menuCategories.flatMap((c) => c.links)].forEach(
      (link) => {
        const titleLower = link.title.toLowerCase();
        let score = 0;
        if (titleLower === lowerQ) score = 100;
        else if (titleLower.startsWith(lowerQ)) score = 80;
        else if (titleLower.includes(lowerQ)) score = 50;
        else if (fuzzyMatch(titleLower, lowerQ)) score = 10;
        if (score > 0) matches.push({ link, score });
      },
    );

    return matches
      .sort((a, b) => b.score - a.score)
      .map((m) => m.link)
      .slice(0, 15);
  }, [query, menuCategories]);

  useEffect(() => {
    if (!query || !isOmniboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flattenedLinks.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + flattenedLinks.length) % flattenedLinks.length,
        );
      }
      if (e.key === "Enter" && flattenedLinks[selectedIndex]) {
        e.preventDefault();
        onNavigate(flattenedLinks[selectedIndex]);
        setIsOmniboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    query,
    flattenedLinks,
    selectedIndex,
    isOmniboxOpen,
    onNavigate,
    setIsOmniboxOpen,
  ]);

  const navItems = useMemo(() => {
    const items: NavItem[] = [];

    items.push({
      id: "dashboard",
      title: "Home",
      fullTitle: "Home",
      icon: Home,
      color: "bg-yellow-400",
      onClick: () => setCurrentView("dashboard"),
      isActive: currentView === "dashboard" && !isOmniboxOpen,
    });

    const colors = ["bg-purple-400", "bg-cyan-400", "bg-lime-400"];
    pinnedLinks.slice(0, 3).forEach((link, idx) => {
      const dest = getDestinationView(link);
      items.push({
        id: link.url,
        title: link.title.split(" ")[0],
        fullTitle: link.title,
        icon: getCategoryIcon(link.title, link.url),
        color: colors[idx],
        onClick: () => onNavigate(link),
        isActive:
          currentView === dest && currentView !== "content" && !isOmniboxOpen,
      });
    });

    return items;
  }, [
    currentView,
    pinnedLinks,
    isOmniboxOpen,
    setCurrentView,
    onNavigate,
    getDestinationView,
  ]);

  const renderOmniboxResults = () => {
    if (query) {
      if (flattenedLinks.length === 0)
        return (
          <div className="flex flex-col items-center justify-center p-12 text-(--text-dim) border-4 border-dashed border-(--border-dim) m-4 rounded-4xl bg-(--bg-main)">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <span className="font-expanded text-lg uppercase tracking-widest">
              No matches
            </span>
          </div>
        );
      return (
        <div className="p-3 space-y-2">
          {flattenedLinks.map((link, i) => {
            const isSelected = i === selectedIndex;
            const linkDest = getDestinationView(link);
            const isPinned =
              linkDest !== "content" &&
              pinnedLinks.some((p) => getDestinationView(p) === linkDest);

            return (
              <div
                key={i}
                id={`omnibox-item-${i}`}
                className="flex items-center gap-2 w-full"
              >
                <button
                  onClick={() => {
                    onNavigate(link);
                    setIsOmniboxOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex-1 text-left px-4 py-3 md:px-5 md:py-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-3 md:gap-4 border-2 ${
                    isSelected
                      ? "bg-blue-500 text-white border-black shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] -translate-y-px"
                      : "bg-(--bg-surface) border-transparent text-(--text-muted) hover:border-(--border-dim)"
                  }`}
                >
                  <FileText
                    className={`w-4 h-4 md:w-5 md:h-5 shrink-0 ${isSelected ? "opacity-100" : "opacity-50"}`}
                  />
                  <span className="flex-1 truncate text-sm md:text-base">
                    {link.title}
                  </span>
                  <span
                    className={`text-[9px] md:text-[10px] uppercase font-bold px-2 py-1.5 rounded-lg border-2 shrink-0 leading-none hidden sm:block ${isSelected ? "border-white/30 bg-white/20 text-white" : "border-(--border-dim) bg-(--bg-highlight) text-(--text-muted)"}`}
                  >
                    {link.category}
                  </span>
                  {isSelected && (
                    <CornerDownRight className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  )}
                </button>
                <button
                  onClick={() => onTogglePin(link)}
                  className={`p-3 md:p-4 rounded-xl transition-all border-2 shrink-0 mr-0.5 mb-0.5 ${
                    isPinned
                      ? "bg-(--bg-surface) text-(--text-main) border-(--border-main) shadow-[2px_2px_0px_0px_var(--border-main)]"
                      : "bg-transparent border-transparent hover:border-(--border-dim) text-(--text-muted) hover:text-(--text-main)"
                  }`}
                  title={isPinned ? "Unpin from Dock" : "Pin to Dock"}
                >
                  <Pin
                    className="w-4 h-4 md:w-5 md:h-5"
                    fill={isPinned ? "currentColor" : "none"}
                    style={{ transform: isPinned ? "rotate(45deg)" : "none" }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="columns-1 sm:columns-2 gap-4 p-4">
        {menuCategories.map((cat, idx) => {
          const isExpanded = expandedCats.has(cat.title);
          const CatIcon = getCategoryIcon(cat.title);
          return (
            <div
              key={idx}
              className={`break-inside-avoid mb-4 bg-(--bg-surface) border-2 md:border-4 rounded-2xl overflow-hidden transition-all ${isExpanded ? "border-(--border-main) shadow-[4px_4px_0px_0px_var(--border-main)] md:shadow-[6px_6px_0px_0px_var(--border-main)] -translate-y-1" : "border-(--border-dim)"}`}
            >
              <button
                onClick={() =>
                  setExpandedCats((prev) => {
                    const n = new Set(prev);
                    isExpanded ? n.delete(cat.title) : n.add(cat.title);
                    return n;
                  })
                }
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${isExpanded ? "bg-(--bg-main) text-(--text-main) border-(--border-main) shadow-[2px_2px_0px_0px_var(--border-main)]" : "bg-(--bg-main) border-(--border-dim) text-(--text-muted)"}`}
                  >
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <h3
                    className={`text-sm font-black font-expanded uppercase ${isExpanded ? "text-(--text-main)" : "text-(--text-muted)"}`}
                  >
                    {cat.title}
                  </h3>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-(--text-main)" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-(--text-dim)" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t-2 md:border-t-4 border-(--border-main) bg-(--bg-main) p-2 space-y-1">
                      {cat.links.map((link, li) => {
                        const linkDest = getDestinationView(link);
                        const isPinned =
                          linkDest !== "content" &&
                          pinnedLinks.some(
                            (p) => getDestinationView(p) === linkDest,
                          );
                        return (
                          <div key={li} className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onNavigate(link);
                                setIsOmniboxOpen(false);
                              }}
                              className="flex-1 text-left px-4 py-3 rounded-xl text-xs font-bold text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-surface) transition-colors truncate"
                            >
                              {link.title}
                            </button>
                            <button
                              onClick={() => onTogglePin(link)}
                              className={`p-2 rounded-lg border-2 transition-all mr-0.5 mb-0.5 ${
                                isPinned
                                  ? "bg-(--bg-surface) text-(--text-main) border-(--border-main) shadow-[2px_2px_0px_0px_var(--border-main)]"
                                  : "bg-transparent border-transparent text-(--text-muted) hover:text-(--text-main)"
                              }`}
                            >
                              <Pin
                                className="w-4 h-4"
                                fill={isPinned ? "currentColor" : "none"}
                                style={{
                                  transform: isPinned
                                    ? "rotate(45deg)"
                                    : "none",
                                }}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  };

  const syncSpring: Transition = useMemo(
    () => ({ type: "spring", stiffness: 600, damping: 25, mass: 0.5 }),
    [],
  );

  const shouldShowDock = isVisible && !isOmniboxOpen;
  const isCompact = navItems.length > 4;

  const omniboxMobileClasses =
    "absolute bottom-0 left-0 w-full h-[85vh] rounded-t-[32px] border-t-4 border-black flex flex-col overflow-hidden shadow-[0px_-8px_0px_0px_#000] z-[9999]";
  const omniboxDesktopClasses =
    "absolute top-[10vh] left-1/2 -translate-x-1/2 w-full max-w-3xl h-[80vh] rounded-[32px] border-4 border-black flex flex-col overflow-hidden shadow-[16px_16px_0px_0px_#000] z-[9999]";
  const dockClasses =
    "absolute bottom-6 left-1/2 -translate-x-1/2 border-2 md:border-4 border-black rounded-[32px] shadow-[6px_6px_0px_0px_#000] flex flex-col items-center p-1.5 px-2 w-max h-max xl:hidden z-[9999]";
  const containerClasses = isOmniboxOpen
    ? isMobile
      ? omniboxMobileClasses
      : omniboxDesktopClasses
    : isDesktop
      ? omniboxDesktopClasses
      : dockClasses;

  return (
    <>
      <AnimatePresence>
        {isOmniboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-9998 backdrop-blur-sm"
            onClick={() => setIsOmniboxOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none z-9999">
        <motion.nav
          layout
          initial={false}
          animate={{
            y: isOmniboxOpen ? 0 : isDesktop ? -40 : shouldShowDock ? 0 : 100,
            opacity: isOmniboxOpen ? 1 : isDesktop ? 0 : shouldShowDock ? 1 : 0,
            scale: isOmniboxOpen ? 1 : isDesktop ? 0.95 : 1,
          }}
          transition={syncSpring}
          onPanEnd={(e, info) => {
            if (!isOmniboxOpen && info.offset.y < -30) setIsOmniboxOpen(true);
          }}
          style={{
            pointerEvents:
              isOmniboxOpen || (!isDesktop && shouldShowDock) ? "auto" : "none",
            willChange: "transform, opacity, border-radius, width, height",
          }}
          className={`bg-(--bg-surface) origin-bottom ${containerClasses}`}
        >
          <AnimatePresence mode="popLayout">
            {isOmniboxOpen ? (
              <motion.div
                key="omnibox-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.1 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                style={{ willChange: "opacity" }}
                className="flex flex-col w-full h-full"
              >
                <div className="border-b-2 md:border-b-4 border-(--border-main) p-4 md:p-6 bg-(--bg-surface) flex items-center gap-4 shrink-0 relative z-20">
                  <div className="w-12 h-12 bg-blue-500 text-white flex items-center justify-center border-2 md:border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] transform -rotate-3 shrink-0">
                    <Search className="w-6 h-6" />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 bg-transparent text-(--text-main) text-2xl md:text-3xl font-expanded font-black focus:outline-none placeholder-(--text-dim) tracking-tight uppercase min-w-0"
                    placeholder="WHERE TO?"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedIndex(0);
                    }}
                  />
                  <button
                    onClick={() => setIsOmniboxOpen(false)}
                    className="w-10 h-10 flex items-center justify-center bg-(--bg-main) border-2 border-(--border-dim) rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div
                  ref={scrollRef}
                  className="overflow-y-auto custom-scrollbar bg-(--bg-main) flex-1 relative z-10"
                >
                  {renderOmniboxResults()}
                </div>
              </motion.div>
            ) : !isDesktop ? (
              <motion.div
                key="dock-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.1 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                style={{ willChange: "opacity" }}
                className="flex flex-col items-center w-full"
              >
                <div
                  onClick={() => setIsOmniboxOpen(true)}
                  className="w-full flex justify-center pb-1.5 cursor-pointer group touch-none"
                  title="Swipe up or click to search"
                >
                  <div className="w-8 h-1 bg-zinc-600 rounded-full group-hover:bg-zinc-400 transition-colors" />
                </div>

                <div className="flex items-center gap-1.5">
                  {navItems.map((link, idx) => {
                    const title = toTitleCase(link.fullTitle);

                    // MAGIC: Anchor neo-brutalist shadows towards the center!
                    // Left items shadow right, right items shadow left, middle items shadow straight down.
                    const mid = (navItems.length - 1) / 2;
                    let activeShadowClass =
                      "shadow-[0px_2px_0px_0px_#000] -translate-y-px";
                    if (idx < mid)
                      activeShadowClass =
                        "shadow-[2px_2px_0px_0px_#000] -translate-y-px";
                    if (idx > mid)
                      activeShadowClass =
                        "shadow-[-2px_2px_0px_0px_#000] -translate-y-px";

                    return (
                      <motion.button
                        layout
                        transition={syncSpring}
                        key={link.id}
                        onClick={() =>
                          handleItemClick(link.id, link.onClick, isCompact)
                        }
                        style={{ willChange: "transform, width, height" }}
                        className={`relative flex items-center justify-center transition-colors border-2 shrink-0 ${
                          isCompact
                            ? "flex-col w-13 h-13 sm:w-14 sm:h-14 rounded-[20px]"
                            : "flex-row px-3.5 py-2.5 rounded-3xl"
                        } ${link.isActive ? `${link.color} text-black border-black ${activeShadowClass}` : "text-zinc-400 hover:text-zinc-200 border-transparent bg-transparent hover:bg-zinc-800"}`}
                        whileTap={{ scale: 0.92 }}
                      >
                        <motion.div
                          layout
                          transition={syncSpring}
                          className="relative z-10 flex items-center justify-center shrink-0"
                        >
                          <link.icon
                            className={`w-5 h-5 sm:w-6 sm:h-6 transition-all ${link.isActive ? "stroke-[2.5px]" : "stroke-2"}`}
                          />
                        </motion.div>
                        {!isCompact && (
                          <AnimatePresence initial={false}>
                            {link.isActive && (
                              <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: "auto", opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={syncSpring}
                                className="overflow-hidden whitespace-nowrap"
                              >
                                <span className="block font-black font-expanded uppercase text-[10px] sm:text-[11px] tracking-widest pl-2 z-10">
                                  {link.title}
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}
                        {isCompact && (
                          <AnimatePresence>
                            {activeCallout === link.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 5, scale: 0.9 }}
                                className="absolute bottom-[calc(100%+14px)] bg-(--bg-surface) text-(--text-main) px-3 py-1.5 rounded-lg text-[11px] font-black font-expanded tracking-widest whitespace-nowrap border-2 border-(--border-main) shadow-[4px_4px_0px_0px_var(--border-main)] z-50 pointer-events-none"
                              >
                                {title}
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-(--bg-surface) border-b-2 border-r-2 border-(--border-main) rotate-45" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.nav>
      </div>
    </>
  );
};
