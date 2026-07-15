import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
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

const toTitleCase = (str: string) => {
  return str.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  setCurrentView,
  pinnedLinks,
  onNavigate,
  getDestinationView,
  isOmniboxOpen,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [activeCallout, setActiveCallout] = useState<string | null>(null);

  const lastScrollTop = useRef<Map<EventTarget, number>>(new Map());
  const lastScrollLeft = useRef<Map<EventTarget, number>>(new Map());
  const calloutTimeout = useRef<number | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1280);
  const isDesktop = !isMobile;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1280);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

      if (diffY > 12 || Math.abs(diffX) > 12) {
        setIsVisible(false);
      } else if (diffY < -12) {
        setIsVisible(true);
      }
      if (currentScrollY <= 10 && currentScrollX <= 10) setIsVisible(true);
      
      lastScrollTop.current.set(target, currentScrollY);
      lastScrollLeft.current.set(target, currentScrollX);
    };

    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, []);

  const navItems = useMemo(() => {
    const items = [];
    items.push({
      id: "dashboard",
      title: "Home",
      fullTitle: "Home",
      icon: Home,
      color: "bg-yellow-400",
      onClick: () => setCurrentView("dashboard"),
      isActive: currentView === "dashboard" && !isOmniboxOpen,
    });
    const colors = ["bg-purple-400", "bg-cyan-400", "bg-lime-400", "bg-pink-400"];
    pinnedLinks.slice(0, 4).forEach((link, idx) => {
      const dest = getDestinationView(link);
      items.push({
        id: link.url,
        title: link.title.split(" ")[0],
        fullTitle: link.title,
        icon: getCategoryIcon(link.title, link.url),
        color: colors[idx % colors.length],
        onClick: () => onNavigate(link),
        isActive: currentView === dest && currentView !== "content" && !isOmniboxOpen,
      });
    });
    return items;
  }, [currentView, pinnedLinks, isOmniboxOpen, setCurrentView, onNavigate, getDestinationView]);

  const isCompact = navItems.length > 4;

  const handleItemClick = useCallback(
    (id: string, onClick: () => void, isCompactLayout: boolean) => {
      if (isCompactLayout) {
        if (calloutTimeout.current !== null) window.clearTimeout(calloutTimeout.current);
        setActiveCallout(id);
        calloutTimeout.current = window.setTimeout(() => setActiveCallout(null), 700);
      }
      onClick();
    },
    [],
  );

  const syncSpring = { type: "spring", stiffness: 400, damping: 35, mass: 0.8 };

  if (isDesktop) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 flex justify-center pointer-events-none z-[9999]">
      <motion.nav
        initial={false}
        animate={{ y: !isVisible && !isOmniboxOpen ? 150 : 0 }}
        transition={{ type: "spring", stiffness: 450, damping: 35, mass: 0.8 }}
        className="pointer-events-auto flex items-center gap-1.5 p-1.5 border-2 md:border-4 border-(--border-main) bg-(--bg-surface) rounded-full shadow-[var(--brutal-shadow-lg)] transform-gpu"
      >
        {navItems.map((link, idx) => {
          const title = toTitleCase(link.fullTitle);
          return (
            <motion.button
              layout
              transition={syncSpring as any}
              key={link.id}
              onClick={(e) => {
                e.stopPropagation();
                handleItemClick(link.id, link.onClick, isCompact);
              }}
              style={{ willChange: "transform, width, height" }}
              className={`relative flex items-center justify-center transition-colors border-2 shrink-0 ${
                isCompact
                  ? "flex-col w-13 h-13 sm:w-14 sm:h-14 rounded-full"
                  : "flex-row px-3.5 py-2.5 rounded-full"
              } ${
                link.isActive
                  ? `${link.color} text-black border-(--border-main) shadow-none -translate-y-px`
                  : "text-zinc-400 hover:text-zinc-200 border-transparent bg-transparent hover:bg-zinc-800"
              }`}
              whileTap={{ scale: 0.96 }}
            >
              <motion.div
                layout
                transition={syncSpring as any}
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
                      transition={syncSpring as any}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      <span className="block font-black font-expanded uppercase text-[10px] sm:text-[11px] pl-2 z-10">
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
                      className="absolute bottom-[calc(100%+14px)] bg-(--bg-surface) text-(--text-main) px-3 py-1.5 rounded-lg text-[11px] font-black font-expanded whitespace-nowrap border-2 border-(--border-main) shadow-[4px_4px_0px_0px_var(--border-main)] z-50 pointer-events-none"
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
      </motion.nav>
    </div>
  );
};
