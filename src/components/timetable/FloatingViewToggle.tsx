import React, { useState, useEffect, useRef } from "react";
import {
  GridView,
  List,
  CalendarMonth,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

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

  const cycleView = () => {
    if (viewMode === "grid") setViewMode("list");
    else if (viewMode === "list") setViewMode("week");
    else setViewMode("grid");
  };

  const Icon =
    viewMode === "grid" ? GridView : viewMode === "list" ? List : CalendarMonth;

  return (
    <>
      {isVisible && (
        <div
          style={{ willChange: "transform, opacity" }}
          className="fixed bottom-32 right-4 sm:hidden z-9990 flex transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          <button
            onClick={cycleView}
            className="p-3 bg-(--md-sys-color-primary-container) text-(--md-sys-color-on-primary-container) border-2 border-(--md-sys-color-outline) rounded-2xl shadow-none active:translate-y-px active:shadow-(--brutal-shadow-hover) transition-all"
            title={`Current View: ${viewMode}`}
          >
            <Icon className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
};
