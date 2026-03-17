import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, Transition } from "framer-motion";
import { LayoutGrid, List, Calendar } from "lucide-react";

interface FloatingViewToggleProps {
  viewMode: "grid" | "list" | "week";
  setViewMode: (mode: "grid" | "list" | "week") => void;
}

export const FloatingViewToggle: React.FC<FloatingViewToggleProps> = ({
  viewMode,
  setViewMode,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollTop = useRef<Map<EventTarget, number>>(new Map());
  const lastScrollLeft = useRef<Map<EventTarget, number>>(new Map());

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

      // Hide if scrolling down OR scrolling left/right significantly
      if (diffY > 12 || Math.abs(diffX) > 12) {
        setIsVisible(false);
        lastScrollTop.current.set(target, currentScrollY);
        lastScrollLeft.current.set(target, currentScrollX);
      } else if (diffY < -12) {
        // Show when scrolling back up
        setIsVisible(true);
        lastScrollTop.current.set(target, currentScrollY);
        lastScrollLeft.current.set(target, currentScrollX);
      }

      // Always show if snapped back to the absolute top-left origin
      if (currentScrollY <= 10 && currentScrollX <= 10) setIsVisible(true);
    };

    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      window.removeEventListener("scroll", handleScroll, { capture: true });
  }, []);

  const syncSpring: Transition = useMemo(
    () => ({ type: "spring", stiffness: 600, damping: 25, mass: 0.5 }),
    [],
  );

  const cycleView = () => {
    if (viewMode === "grid") setViewMode("list");
    else if (viewMode === "list") setViewMode("week");
    else setViewMode("grid");
  };

  const Icon =
    viewMode === "grid" ? LayoutGrid : viewMode === "list" ? List : Calendar;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={syncSpring}
          style={{ willChange: "transform, opacity" }}
          className="fixed bottom-32 right-4 sm:hidden z-9990 flex"
        >
          <button
            onClick={cycleView}
            className="p-3 bg-cyan-400 text-black border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] active:translate-y-px active:shadow-[2px_2px_0px_0px_#000] transition-all"
            title={`Current View: ${viewMode}`}
          >
            <Icon className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
