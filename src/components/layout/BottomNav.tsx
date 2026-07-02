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
  Description,
  SubdirectoryArrowRight,
  Close,
  Error,
  KeyboardArrowDown,
  Pin,
} from '@nine-thirty-five/material-symbols-react/rounded';
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

  // Unified Spring for the open/close state (Critically damped to remove overshoot)
  useEffect(() => {
    animate(dragProgress, isOmniboxOpen ? 1 : 0, {
      type: "spring",
      stiffness: 400,
      damping: 35,
      mass: 0.8,
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

      // Strict clamping removes elastic "overshoot-like" behavior during drag
      dragProgress.set(Math.max(0, Math.min(1, newProgress)));
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
        // Snap with critically damped spring
        animate(dragProgress, isOmniboxOpen ? 1 : 0, {
          type: "spring",
          stiffness: 400,
          damping: 35,
          mass: 0.8,
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

  // Sync Spring critically damped for smoother, predictable motion
  const syncSpring: any = useMemo(
    () => ({ type: "spring", stiffness: 400, damping: 35, mass: 0.8 }),
    [],
  );

  const flattenedLinks = [];

  const renderNavItems = (isCompactLayout: boolean, spring: any) => (
    <>
      {navItems.map((link, idx) => {
        const title = toTitleCase(link.fullTitle);
        const mid = (navItems.length - 1) / 2;
        let activeShadowClass = "shadow-none -translate-y-px";
        if (idx < mid) activeShadowClass = "shadow-none -translate-y-px";
        if (idx > mid) activeShadowClass = "shadow-none -translate-y-px";

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
                ? `${link.color} text-black border-(--border-main) ${activeShadowClass}`
                : "text-zinc-400 hover:text-zinc-200 border-transparent bg-transparent hover:bg-zinc-800"
            }`}
            whileTap={{ scale: 0.96 }}
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
                    <span className="block font-black font-expanded uppercase text-[10px] sm:text-[11px]  pl-2 z-10">
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
                    className="absolute bottom-[calc(100%+14px)] bg-(--bg-surface) text-(--text-main) px-3 py-1.5 rounded-lg text-[11px] font-black font-expanded  whitespace-nowrap border-2 border-(--border-main) shadow-[4px_4px_0px_0px_var(--border-main)] z-50 pointer-events-none"
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

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-9999">


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
              damping: 35,
              mass: 0.8,
            }}
            className="fixed pointer-events-auto border-2 md:border-4 border-(--border-main) bg-(--bg-surface) overflow-hidden transform-gpu"
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
