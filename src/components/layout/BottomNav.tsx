import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, Transition } from "framer-motion";
import { Home, Search } from "lucide-react";
import { QuickLink } from "../../types/vtop";
import { getCategoryIcon } from "../omnibox";

interface BottomNavProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  pinnedLinks: QuickLink[];
  onNavigate: (link: QuickLink) => void;
  getDestinationView: (link: QuickLink) => string;
  isOmniboxOpen: boolean;
  setIsOmniboxOpen: (val: boolean) => void;
}

const toTitleCase = (str: string) => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  setCurrentView,
  pinnedLinks,
  onNavigate,
  getDestinationView,
  isOmniboxOpen,
  setIsOmniboxOpen,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [activeCallout, setActiveCallout] = useState<string | null>(null);
  const lastScrollTop = useRef<Map<EventTarget, number>>(new Map());

  // FIX: Use number for browser setTimeout instead of NodeJS.Timeout
  const calloutTimeout = useRef<number | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, [currentView]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || typeof target.scrollTop !== "number") return;
      if (target.scrollHeight <= target.clientHeight + 20) return;

      const currentScrollY = target.scrollTop;
      const previousScrollY = lastScrollTop.current.get(target) || 0;
      const diff = currentScrollY - previousScrollY;

      if (diff > 12) {
        setIsVisible(false);
        lastScrollTop.current.set(target, currentScrollY);
      } else if (diff < -12) {
        setIsVisible(true);
        lastScrollTop.current.set(target, currentScrollY);
      }

      if (currentScrollY <= 10) setIsVisible(true);
    };

    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      window.removeEventListener("scroll", handleScroll, { capture: true });
  }, []);

  const handleItemClick = (id: string, onClick: () => void) => {
    if (calloutTimeout.current !== null) {
      window.clearTimeout(calloutTimeout.current);
    }
    setActiveCallout(id);
    calloutTimeout.current = window.setTimeout(() => {
      setActiveCallout(null);
    }, 700);
    onClick();
  };

  const syncSpring: Transition = useMemo(
    () => ({ type: "spring", stiffness: 400, damping: 30, mass: 1 }),
    [],
  );

  const navItems = useMemo(() => {
    const items = [];

    items.push({
      id: "dashboard",
      title: "Home",
      icon: Home,
      color: "bg-yellow-400",
      onClick: () => setCurrentView("dashboard"),
      isActive: currentView === "dashboard" && !isOmniboxOpen,
    });

    const colors = ["bg-purple-400", "bg-cyan-400", "bg-lime-400"];

    pinnedLinks.slice(0, 2).forEach((link, idx) => {
      const dest = getDestinationView(link);
      items.push({
        id: link.title,
        title: link.title.split(" ")[0],
        fullTitle: link.title,
        icon: getCategoryIcon(link.title),
        color: colors[idx],
        onClick: () => onNavigate(link),
        isActive:
          currentView === dest && currentView !== "content" && !isOmniboxOpen,
      });
    });

    items.push({
      id: "search",
      title: "Search",
      icon: Search,
      color: "bg-white",
      onClick: () => setIsOmniboxOpen(true),
      isActive: isOmniboxOpen,
    });

    if (pinnedLinks.length > 2) {
      const link = pinnedLinks[2];
      const dest = getDestinationView(link);
      items.push({
        id: link.title,
        title: link.title.split(" ")[0],
        fullTitle: link.title,
        icon: getCategoryIcon(link.title),
        color: colors[2],
        onClick: () => onNavigate(link),
        isActive:
          currentView === dest && currentView !== "content" && !isOmniboxOpen,
      });
    }

    return items;
  }, [
    currentView,
    pinnedLinks,
    isOmniboxOpen,
    setCurrentView,
    onNavigate,
    getDestinationView,
  ]);

  const shouldShow = isVisible && !isOmniboxOpen;

  return (
    <motion.nav
      layout
      initial={{ y: 0, x: "-50%" }}
      animate={{
        y: shouldShow ? 0 : 100,
        x: "-50%",
        opacity: shouldShow ? 1 : 0,
      }}
      transition={syncSpring}
      className="xl:hidden fixed bottom-6 left-1/2 bg-zinc-900 border-2 md:border-4 border-black rounded-4xl shadow-[6px_6px_0px_0px_#000] z-[9999] flex items-center p-1.5 gap-1.5 pointer-events-auto w-max"
    >
      {navItems.map((link) => {
        const title = toTitleCase(link.fullTitle || link.title);
        const isLong = title.length > 8;

        return (
          <motion.button
            layout
            transition={syncSpring}
            key={link.id}
            onClick={() => handleItemClick(link.id, link.onClick)}
            className={`relative flex flex-col items-center justify-center rounded-2xl transition-colors border-2 w-13 h-13 sm:w-14 sm:h-14 shrink-0 ${
              link.isActive
                ? `${link.color} text-black border-black shadow-[2px_2px_0px_0px_#000] -translate-y-px`
                : "text-zinc-400 hover:text-zinc-200 border-transparent bg-transparent hover:bg-zinc-800"
            }`}
            whileTap={{ scale: 0.92 }}
          >
            <motion.div
              layout
              transition={syncSpring}
              className="relative z-10 flex items-center justify-center shrink-0"
            >
              <link.icon
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-all ${
                  link.isActive ? "stroke-[2.5px]" : "stroke-2"
                } ${!isLong ? "mb-0.5" : ""}`}
              />
            </motion.div>

            {!isLong && (
              <span className="block font-black font-expanded text-[8px] sm:text-[9px] tracking-wide text-center z-10 leading-none">
                {title}
              </span>
            )}

            <AnimatePresence>
              {activeCallout === link.id && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.9 }}
                  className="absolute bottom-[calc(100%+14px)] bg-black text-white px-3 py-1.5 rounded-lg text-[11px] font-black font-expanded tracking-widest whitespace-nowrap border-2 border-zinc-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] z-50 pointer-events-none"
                >
                  {title}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black border-b-2 border-r-2 border-zinc-700 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </motion.nav>
  );
};
