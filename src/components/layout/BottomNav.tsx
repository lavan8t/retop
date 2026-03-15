import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, Transition } from "framer-motion";
import { Home, Calendar, Layers, GraduationCap } from "lucide-react";

interface BottomNavProps {
  currentView: string;
  setCurrentView: (view: any) => void;
}

const mobileNavLinks = [
  { id: "dashboard", title: "Home", icon: Home, color: "bg-yellow-400" },
  {
    id: "timetable",
    title: "Schedule",
    icon: Calendar,
    color: "bg-purple-400",
  },
  { id: "coursePage", title: "Subjects", icon: Layers, color: "bg-cyan-400" },
  { id: "marks", title: "Marks", icon: GraduationCap, color: "bg-lime-400" },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  setCurrentView,
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

      // Ensure we are tracking a valid scrollable HTML element
      if (!target || typeof target.scrollTop !== "number") return;

      // Ignore predominantly horizontal scrolling containers or non-scrollable areas
      if (target.scrollHeight <= target.clientHeight + 20) return;

      const currentScrollY = target.scrollTop;
      const previousScrollY = lastScrollTop.current.get(target) || 0;

      const diff = currentScrollY - previousScrollY;

      // Scrolling down -> Hide navbar
      if (diff > 12) {
        setIsVisible(false);
        lastScrollTop.current.set(target, currentScrollY);
      }
      // Scrolling up -> Show navbar
      else if (diff < -12) {
        setIsVisible(true);
        lastScrollTop.current.set(target, currentScrollY);
      }

      // Failsafe: Always show if user is at the absolute top, or hits the absolute bottom
      if (
        currentScrollY <= 10 ||
        currentScrollY + target.clientHeight >= target.scrollHeight - 10
      ) {
        setIsVisible(true);
      }
    };

    // Use capture phase to intercept scrolls coming from any nested scrollable container globally
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

  return (
    <motion.nav
      layout
      initial={{ y: 0, x: "-50%" }}
      animate={{
        y: isVisible ? 0 : 100,
        x: "-50%",
        opacity: isVisible ? 1 : 0,
      }}
      transition={syncSpring}
      className="xl:hidden fixed bottom-6 left-1/2 bg-zinc-900 border-2 md:border-4 border-black rounded-4xl shadow-[6px_6px_0px_0px_#000] z-9999 flex items-center p-1.5 gap-1.5 pointer-events-auto w-max"
    >
      {mobileNavLinks.map((link) => {
        const isActive = currentView === link.id;
        return (
          <motion.button
            layout
            transition={syncSpring}
            key={link.id}
            onClick={() => setCurrentView(link.id)}
            className={`relative flex items-center justify-center rounded-3xl transition-colors overflow-hidden px-3.5 py-2.5 border-2 ${
              isActive
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
                  isActive ? "stroke-[2.5px]" : "stroke-2"
                }`}
              />
            </motion.div>

            <AnimatePresence initial={false}>
              {isActive && (
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
