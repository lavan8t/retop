import React, { useState, useRef, useEffect } from "react";
import { Semester } from "../../types/vtop";
import {
  CalendarMonth,
  KeyboardArrowDown,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { motion, AnimatePresence } from "framer-motion";

// SMART PARSER: Converts "Winter Semester 2025-26" -> "W'26"
export const formatShortSemesterName = (label: string) => {
  if (!label) return "";

  // Extract the last two digits of the year string (e.g., "2023-24" -> "24")
  const yearMatch = label.match(/\d{4}-(\d{2})/);
  const yearSuffix = yearMatch ? `'${yearMatch[1]}` : "";

  const lowerLabel = label.toLowerCase();
  let prefix = "";

  if (lowerLabel.includes("winter")) prefix = "W";
  else if (lowerLabel.includes("fall")) prefix = "F";
  else if (lowerLabel.includes("summer")) prefix = "S";
  else if (lowerLabel.includes("tri semester")) {
    // Handles Tri Semesters and potential OCR typos ("Ill" instead of "III")
    if (lowerLabel.includes("i & iv")) prefix = "T14";
    else if (lowerLabel.includes("ii & v")) prefix = "T25";
    else if (lowerLabel.includes("iii & vi") || lowerLabel.includes("ill & vi"))
      prefix = "T36";
    else prefix = "T";
  }

  // If we successfully parsed both parts, return the short code, otherwise fallback to the original string
  return prefix && yearSuffix ? `${prefix}${yearSuffix}` : label;
};

export const SemesterDropdown = ({ semesters, selectedId, onChange, align = "auto" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuAlign, setMenuAlign] = useState<"left" | "right">("right");
  const [menuVAlign, setMenuVAlign] = useState<"top" | "bottom">("bottom");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected =
    semesters.find((s: Semester) => s.id === selectedId) || semesters[0];

  const updateAlignment = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      
      // Horizontal check
      if (align === "left" || align === "right") {
        setMenuAlign(align);
      } else if (rect.left > window.innerWidth / 2 || rect.right > window.innerWidth - 120) {
        setMenuAlign("right");
      } else {
        setMenuAlign("left");
      }

      // Vertical check (space below vs above)
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 220 && spaceAbove > spaceBelow) {
        setMenuVAlign("top");
      } else {
        setMenuVAlign("bottom");
      }
    }
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    updateAlignment();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const toggleOpen = () => {
    if (!isOpen) updateAlignment();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const isTop = menuVAlign === "top";
  const isRight = menuAlign === "right";

  const originClass = isTop
    ? isRight ? "origin-bottom-right" : "origin-bottom-left"
    : isRight ? "origin-top-right" : "origin-top-left";

  const positionClass = isTop
    ? "bottom-full pb-1.5"
    : "top-full pt-1.5";

  const alignmentClass = isRight ? "right-0" : "left-0";

  return (
    <div 
      ref={containerRef}
      className="relative z-50"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className="flex items-center gap-1.5 md:gap-2 bg-(--md-sys-color-secondary-container) px-2 md:px-3 py-1.5 rounded-lg md:rounded-xl text-(--md-sys-color-on-secondary-container) font-bold transition-all text-[9px] sm:text-[10px] md:text-xs group"
      >
        <CalendarMonth className="w-3 h-3 md:w-3.5 md:h-3.5 text-(--accent-base) group-hover:text-(--accent-hover) transition-colors shrink-0" />
        <span className="uppercase truncate max-w-12.5 sm:max-w-20 md:max-w-30 font-expanded">
          {selected ? formatShortSemesterName(selected.label) : "Select Sem"}
        </span>
        <KeyboardArrowDown
          className={`w-3 h-3 md:w-3.5 md:h-3.5 transition-transform duration-fast shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: isTop ? 6 : -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isTop ? 6 : -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-[60vw] min-w-50 max-w-72 md:w-72 ${positionClass} ${alignmentClass} ${originClass}`}
          >
            <div className="w-full bg-(--bg-surface) border-2 border-(--border-main) rounded-xl overflow-hidden popup-shadow">
              <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5 md:p-2 space-y-1">
                {semesters.map((sem: Semester) => (
                  <button
                    key={sem.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(sem.id);
                      setIsOpen(false);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(sem.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 md:px-3 md:py-2.5 text-[10px] md:text-xs font-bold uppercase transition-all rounded-lg border-2 ${
                      sem.id === selectedId
                        ? "bg-(--accent-base) text-(--text-inverse) border-(--border-main)"
                        : "bg-transparent border-transparent text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main) hover:border-(--border-dim)"
                    }`}
                  >
                    {sem.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
