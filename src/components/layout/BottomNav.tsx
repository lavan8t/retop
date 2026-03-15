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
  const lastScrollTop = useRef<Map<EventTarget, number>>(new Map());

  // Guarantee visibility is restored when changing tabs
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

      // Scrolling down hides navbar, scrolling up restores it.
      // Failsafe: only pop open if absolutely at the top (Removed bottom failsafe per request).
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

  const syncSpring: Transition = useMemo(
    () => ({ type: "spring", stiffness: 400, damping: 30, mass: 1 }),
    [],
  );

  const navItems = useMemo(() => {
    const items = [];

    // 1st Item: ALWAYS Home
    items.push({
      id: "dashboard",
      title: "Home",
      icon: Home,
      color: "bg-yellow-400",
      onClick: () => setCurrentView("dashboard"),
      isActive: currentView === "dashboard" && !isOmniboxOpen,
    });

    const colors = ["bg-purple-400", "bg-cyan-400", "bg-lime-400"];

    // Middle 2 Custom Pinned Items (if available)
    pinnedLinks.slice(0, 2).forEach((link, idx) => {
      const dest = getDestinationView(link);
      items.push({
        id: link.url,
        title: link.title.split(" ")[0],
        icon: getCategoryIcon(link.title),
        color: colors[idx],
        onClick: () => onNavigate(link),
        isActive:
          currentView === dest && currentView !== "content" && !isOmniboxOpen,
      });
    });

    // 4th Item: ALWAYS Search (Opens Omnibox)
    items.push({
      id: "search",
      title: "Search",
      icon: Search,
      color: "bg-white",
      onClick: () => setIsOmniboxOpen(true),
      isActive: isOmniboxOpen,
    });

    // 5th Item: Last Custom Pinned Item (if available)
    if (pinnedLinks.length > 2) {
      const link = pinnedLinks[2];
      const dest = getDestinationView(link);
      items.push({
        id: link.url,
        title: link.title.split(" ")[0],
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
      className="xl:hidden fixed bottom-6 left-1/2 bg-zinc-900 border-2 md:border-4 border-black rounded-4xl shadow-[6px_6px_0px_0px_#000] z-9999 flex items-center p-1.5 gap-1.5 pointer-events-auto w-max"
    >
      {navItems.map((link) => {
        return (
          <motion.button
            layout
            transition={syncSpring}
            key={link.id}
            onClick={link.onClick}
            className={`relative flex items-center justify-center rounded-3xl transition-colors overflow-hidden px-3.5 py-2.5 border-2 ${
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
                }`}
              />
            </motion.div>

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
          </motion.button>
        );
      })}
    </motion.nav>
  );
};
