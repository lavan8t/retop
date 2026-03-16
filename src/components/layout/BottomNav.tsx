import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  motion,
  AnimatePresence,
  Transition,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
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

  const lastScrollTop = useRef<Map<EventTarget, number>>(new Map());
  const lastScrollLeft = useRef<Map<EventTarget, number>>(new Map());
  const calloutTimeout = useRef<number | null>(null);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1280);
  const [dims, setDims] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  });
  const isDesktop = !isMobile;

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // =======================================================================
  // --- NATIVE 1:1 SWIPE GESTURE STATE ---
  // =======================================================================
  const dragProgress = useMotionValue(isOmniboxOpen ? 1 : 0);
  const dragStartProgress = useRef(0);
  const innerDockRef = useRef<HTMLDivElement>(null);

  const [measuredDockW, setMeasuredDockW] = useState(() =>
    window.innerWidth < 640 ? 260 : 320,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1280);
      setDims({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!innerDockRef.current) return;
    let rafId: number;
    const ro = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setMeasuredDockW(
          Math.ceil(entry.target.getBoundingClientRect().width) + 20,
        );
      });
    });
    ro.observe(innerDockRef.current);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [pinnedLinks.length]);

  // Unified Spring for the open/close state
  useEffect(() => {
    animate(dragProgress, isOmniboxOpen ? 1 : 0, {
      type: "spring",
      stiffness: 500,
      damping: 22,
      mass: 0.7,
      restDelta: 0.001,
    });
  }, [isOmniboxOpen, dragProgress]);

  const handlePanStart = useCallback(() => {
    dragStartProgress.current = dragProgress.get();
  }, [dragProgress]);

  const handlePan = useCallback(
    (e: any, info: any) => {
      const targetHeight = dims.h * 0.6;
      const dragDistance = targetHeight - 74;

      let newProgress =
        dragStartProgress.current + -info.offset.y / dragDistance;

      // Elastic rubber-banding at edges
      if (newProgress < 0) newProgress *= 0.15;
      if (newProgress > 1) newProgress = 1 + (newProgress - 1) * 0.15;

      dragProgress.set(Math.max(-0.05, Math.min(1.05, newProgress)));
    },
    [dims.h, dragProgress],
  );

  const handlePanEnd = useCallback(
    (e: any, info: any) => {
      const current = dragProgress.get();
      const velocity = info.velocity.y;

      if (isOmniboxOpen && velocity > 300) {
        setIsOmniboxOpen(false);
      } else if (!isOmniboxOpen && (velocity < -300 || current > 0.3)) {
        setIsOmniboxOpen(true);
      } else if (isOmniboxOpen && current < 0.75) {
        setIsOmniboxOpen(false);
      } else {
        // Snap with high-stiffness spring
        animate(dragProgress, isOmniboxOpen ? 1 : 0, {
          type: "spring",
          stiffness: 600,
          damping: 18,
          mass: 0.6,
        });
      }
    },
    [dragProgress, setIsOmniboxOpen, isOmniboxOpen],
  );

  // =======================================================================
  // --- CONTINUOUS MORPH TRANSFORMATIONS ---
  // =======================================================================
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
    const colors = [
      "bg-purple-400",
      "bg-cyan-400",
      "bg-lime-400",
      "bg-pink-400",
    ];
    pinnedLinks.slice(0, 4).forEach((link, idx) => {
      const dest = getDestinationView(link);
      items.push({
        id: link.url,
        title: link.title.split(" ")[0],
        fullTitle: link.title,
        icon: getCategoryIcon(link.title, link.url),
        color: colors[idx % colors.length],
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

  const isCompact = navItems.length > 4;

  const maxSheetHeightNum = dims.h * 0.6;
  const maxSheetWidthNum = dims.w;

  const sheetHeight = useTransform(
    dragProgress,
    [0, 1],
    [70, maxSheetHeightNum],
  );

  const sheetWidth = useTransform(
    dragProgress,
    [0, 1],
    [Math.min(measuredDockW, dims.w - 32), maxSheetWidthNum],
  );

  const sheetBottom = useTransform(dragProgress, [0, 1], [24, 0]);
  const sheetBottomRadius = useTransform(dragProgress, [0, 1], [32, 0]);
  const sheetShadow = useTransform(
    dragProgress,
    [0, 1],
    ["6px 6px 0px 0px rgba(0,0,0,1)", "0px -8px 0px 0px rgba(0,0,0,1)"],
  );

  const backdropOpacity = useTransform(dragProgress, [0, 1], [0, 1]);
  const backdropPointer = useTransform(dragProgress, (p) =>
    p > 0.1 ? "auto" : "none",
  );

  const pillOpacity = useTransform(dragProgress, [0, 0.6], [1, 0]);
  const dockOpacity = useTransform(dragProgress, [0, 0.3], [1, 0]);
  const dockY = useTransform(dragProgress, [0, 0.3], [0, 20]);
  const dockPointerEvents = useTransform(dragProgress, (p) =>
    p < 0.1 ? "auto" : "none",
  );

  const omniOpacity = useTransform(dragProgress, [0.2, 1], [0, 1]);
  const omniY = useTransform(dragProgress, [0.2, 1], [40, 0]);
  const omniPointerEvents = useTransform(dragProgress, (p) =>
    p > 0.9 ? "auto" : "none",
  );

  // =======================================================================
  // --- Standard Effects & Scroll Hide Logic ---
  // =======================================================================
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

      if (diffY > 12 || Math.abs(diffX) > 12) {
        setIsVisible(false);
        lastScrollTop.current.set(target, currentScrollY);
        lastScrollLeft.current.set(target, currentScrollX);
      } else if (diffY < -12) {
        setIsVisible(true);
        lastScrollTop.current.set(target, currentScrollY);
        lastScrollLeft.current.set(target, currentScrollX);
      }
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

  const handleItemClick = useCallback(
    (id: string, onClick: () => void, isCompactLayout: boolean) => {
      if (isCompactLayout) {
        if (calloutTimeout.current !== null)
          window.clearTimeout(calloutTimeout.current);
        setActiveCallout(id);
        calloutTimeout.current = window.setTimeout(
          () => setActiveCallout(null),
          700,
        );
      }
      onClick();
    },
    [],
  );

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

  const syncSpring: Transition = useMemo(
    () => ({ type: "spring", stiffness: 500, damping: 18, mass: 0.6 }),
    [],
  );

  const renderNavItems = (isCompactLayout: boolean, spring: any) => (
    <>
      {navItems.map((link, idx) => {
        const title = toTitleCase(link.fullTitle);
        const mid = (navItems.length - 1) / 2;
        let activeShadowClass =
          "shadow-[0px_2px_0px_0px_var(--shadow-main)] -translate-y-px";
        if (idx < mid)
          activeShadowClass =
            "shadow-[2px_2px_0px_0px_var(--shadow-main)] -translate-y-px";
        if (idx > mid)
          activeShadowClass =
            "shadow-[-2px_2px_0px_0px_var(--shadow-main)] -translate-y-px";

        return (
          <motion.button
            layout
            transition={spring}
            key={link.id}
            onClick={(e) => {
              e.stopPropagation();
              handleItemClick(link.id, link.onClick, isCompactLayout);
            }}
            style={{ willChange: "transform, width, height" }}
            className={`relative flex items-center justify-center transition-colors border-2 shrink-0 ${
              isCompactLayout
                ? "flex-col w-13 h-13 sm:w-14 sm:h-14 rounded-[20px]"
                : "flex-row px-3.5 py-2.5 rounded-3xl"
            } ${
              link.isActive
                ? `${link.color} text-black border-black ${activeShadowClass}`
                : "text-zinc-400 hover:text-zinc-200 border-transparent bg-transparent hover:bg-zinc-800"
            }`}
            whileTap={{ scale: 0.92 }}
          >
            <motion.div
              layout
              transition={spring}
              className="relative z-10 flex items-center justify-center shrink-0"
            >
              <link.icon
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-all ${link.isActive ? "stroke-[2.5px]" : "stroke-2"}`}
              />
            </motion.div>
            {!isCompactLayout && (
              <AnimatePresence initial={false}>
                {link.isActive && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={spring}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <span className="block font-black font-expanded uppercase text-[10px] sm:text-[11px] tracking-widest pl-2 z-10">
                      {link.title}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            {isCompactLayout && (
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
    </>
  );

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
                      ? "bg-blue-500 text-white border-black shadow-[3px_3px_0px_0px_var(--shadow-main)] md:shadow-[4px_4px_0px_0px_var(--shadow-main)] -translate-y-px"
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
                      ? "bg-(--bg-surface) text-(--text-main) border-(--border-main) shadow-[2px_2px_0px_0px_var(--shadow-main)]"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4">
        {menuCategories.map((cat, idx) => {
          const isExpanded = expandedCats.has(cat.title);
          const CatIcon = getCategoryIcon(cat.title);
          return (
            <div key={idx} className="flex flex-col gap-1 break-inside-avoid">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() =>
                  setExpandedCats((prev) => {
                    const n = new Set(prev);
                    isExpanded ? n.delete(cat.title) : n.add(cat.title);
                    return n;
                  })
                }
                className={`flex w-full items-center justify-between p-2 rounded-3xl border-2 transition-all duration-150 group 
                  ${isExpanded ? `bg-blue-400 border-black shadow-[3px_3px_0px_0px_var(--shadow-main)] -translate-y-0.5 text-black` : `border-transparent hover:border-black hover:-translate-y-0.5 text-(--text-main)`}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <CatIcon
                      className={`w-5 h-5 transition-colors ${isExpanded ? "text-black" : "text-(--text-main) group-hover:text-black"}`}
                    />
                  </div>
                  <span
                    className={`font-expanded font-black text-sm sm:text-base uppercase tracking-wider text-left mt-0.5 transition-colors ${isExpanded ? "text-black" : "group-hover:text-black"}`}
                  >
                    {cat.title}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-all ${isExpanded ? "rotate-180 text-black" : "text-(--text-main) group-hover:text-black"}`}
                />
              </motion.button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 space-y-1.5 ml-3 border-l-4 border-(--border-dim) mt-1">
                      {cat.links.map((link, li) => {
                        const linkDest = getDestinationView(link);
                        const isPinned =
                          linkDest !== "content" &&
                          pinnedLinks.some(
                            (p) => getDestinationView(p) === linkDest,
                          );
                        return (
                          <div
                            key={li}
                            className="flex items-center gap-1.5 pl-1"
                          >
                            <button
                              onClick={() => {
                                onNavigate(link);
                                setIsOmniboxOpen(false);
                              }}
                              className="flex-1 text-left px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black font-expanded uppercase tracking-wider border-2 border-transparent transition-all truncate text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight) hover:border-(--border-main) hover:shadow-[3px_3px_0px_0px_var(--shadow-main)] hover:-translate-y-[1px]"
                            >
                              {link.title}
                            </button>
                            <button
                              onClick={() => onTogglePin(link)}
                              className={`p-2.5 rounded-2xl border-2 transition-all shrink-0 ${
                                isPinned
                                  ? "bg-yellow-400 text-black border-black shadow-[3px_3px_0px_0px_var(--shadow-main)] -translate-y-[1px]"
                                  : "bg-transparent border-transparent text-(--text-dim) hover:text-(--text-main) hover:bg-(--bg-highlight) hover:border-(--border-main) hover:shadow-[3px_3px_0px_0px_var(--shadow-main)] hover:-translate-y-[1px]"
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

  return (
    <>
      {/* NATIVE MOBILE BACKDROP */}
      {!isDesktop && (
        <motion.div
          style={{
            opacity: backdropOpacity,
            pointerEvents: backdropPointer as any,
          }}
          onClick={() => setIsOmniboxOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        />
      )}

      <div className="fixed inset-0 pointer-events-none z-[9999]">
        {/* DESKTOP IMPLEMENTATION */}
        {isDesktop && (
          <>
            <AnimatePresence>
              {isOmniboxOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOmniboxOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {isOmniboxOpen && (
                <motion.div
                  key="desktop-omnibox"
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={syncSpring}
                  className="absolute pointer-events-auto top-[20vh] left-1/2 -translate-x-1/2 w-full max-w-3xl h-[60vh] rounded-[32px] border-4 border-black flex flex-col overflow-hidden shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-(--bg-surface) z-[9999]"
                >
                  <div className="border-b-4 border-black p-6 bg-(--bg-surface) flex items-center gap-4 shrink-0 relative z-20">
                    <div className="w-12 h-12 bg-blue-500 text-white flex items-center justify-center border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-3 shrink-0">
                      <Search className="w-6 h-6" />
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      className="flex-1 bg-transparent text-(--text-main) text-3xl font-expanded font-black focus:outline-none placeholder-(--text-dim) tracking-tight uppercase min-w-0"
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
                  <div className="overflow-y-auto custom-scrollbar bg-(--bg-main) flex-1 relative z-10">
                    {renderOmniboxResults()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* MOBILE IMPLEMENTATION */}
        {!isDesktop && (
          <motion.nav
            style={{
              height: sheetHeight,
              width: sheetWidth,
              bottom: sheetBottom,
              borderBottomLeftRadius: sheetBottomRadius,
              borderBottomRightRadius: sheetBottomRadius,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              boxShadow: sheetShadow,
              x: "-50%",
              left: "50%",
              willChange: "transform, height, width, bottom, border-radius",
            }}
            animate={{
              y: !isVisible && !isOmniboxOpen ? 150 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 450,
              damping: 25,
              mass: 0.8,
            }}
            className="fixed pointer-events-auto border-2 md:border-4 border-black bg-(--bg-surface) overflow-hidden transform-gpu"
          >
            {/* --- PILL LAYER --- */}
            <motion.div
              style={{ opacity: pillOpacity }}
              className="absolute top-0 left-0 w-full h-7 flex justify-center items-start pt-1.5 cursor-pointer group touch-none z-40"
              onPanStart={handlePanStart}
              onPan={handlePan}
              onPanEnd={handlePanEnd}
              onClick={() => {
                if (!isOmniboxOpen) {
                  animate(dragProgress, [0, 0.08, 0, 0.08, 0], {
                    duration: 0.4,
                  });
                }
              }}
            >
              <div className="w-10 h-1 bg-zinc-600 rounded-full group-hover:bg-zinc-400 transition-colors" />
            </motion.div>

            {/* --- OMNIBOX LAYER --- */}
            <motion.div
              style={{
                opacity: omniOpacity,
                y: omniY,
                pointerEvents: omniPointerEvents as any,
                willChange: "transform, opacity",
              }}
              className="absolute top-0 left-0 w-full h-full flex flex-col pt-4 transform-gpu"
            >
              <motion.div
                onPanStart={handlePanStart}
                onPan={handlePan}
                onPanEnd={handlePanEnd}
                className="border-b-4 border-black px-4 pb-4 bg-(--bg-surface) flex items-center gap-3 shrink-0 cursor-grab active:cursor-grabbing touch-none z-20"
              >
                <div className="w-10 h-10 bg-blue-500 text-white flex items-center justify-center border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 pointer-events-none">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 bg-transparent text-(--text-main) text-xl font-expanded font-black focus:outline-none placeholder-(--text-dim) tracking-tight uppercase min-w-0"
                  placeholder="WHERE TO?"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                />
                <button
                  onClick={() => setIsOmniboxOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-(--bg-main) border-2 border-(--border-dim) rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
              <div className="overflow-y-auto custom-scrollbar bg-(--bg-main) flex-1 relative z-10 pb-4">
                {renderOmniboxResults()}
              </div>
            </motion.div>

            {/* --- DOCK LAYER --- */}
            <motion.div
              style={{
                opacity: dockOpacity,
                y: dockY,
                pointerEvents: dockPointerEvents as any,
              }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-max flex flex-col items-center justify-end pb-1.5 px-2 z-30"
              onPanStart={handlePanStart}
              onPan={handlePan}
              onPanEnd={handlePanEnd}
            >
              <div className="flex items-center gap-1.5" ref={innerDockRef}>
                {renderNavItems(isCompact, syncSpring)}
              </div>
            </motion.div>
          </motion.nav>
        )}
      </div>
    </>
  );
};
