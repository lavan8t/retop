import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Description,
  Error,
  ChevronRight,
  SwapVert,
  Keep,
  Autorenew,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { motion, AnimatePresence } from "framer-motion";

import {
  QuickLink,
  MenuCategory,
  CourseSummary,
  TimetableCourse,
} from "../../types/vtop";
import { Card } from "../ui/Card";
import { MarqueeText } from "../common/MarqueeText";
import { ListCard } from "./ListCard";
import { AttendanceRow } from "./HomeRows";
import { EmptyState } from "../EmptyState";
import { getCategoryIcon } from "../../utils/icons";
import { useDataStore } from "../../store/dataStore";

interface QuickLinksMenuProps {
  menuCategories: MenuCategory[];
  onNavigate: (link: QuickLink) => void;
  pinnedLinks?: QuickLink[];
  handleTogglePin?: (link: QuickLink) => void;
  attendance: CourseSummary[];
  ttCourses: TimetableCourse[];
}

export const QuickLinksMenu: React.FC<QuickLinksMenuProps> = ({
  menuCategories,
  onNavigate,
  pinnedLinks = [],
  handleTogglePin,
  attendance,
  ttCourses,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [attSort, setAttSort] = useState<"asc" | "desc">("asc");

  const { status, ttLoading, calLoadingGrid, calLoadingMonths, attRecordsLoading } = useDataStore();
  const isLoading = status === "Syncing..." || status === "Initializing..." || ttLoading || calLoadingGrid || calLoadingMonths || attRecordsLoading;

  // Recent Links State & Handler
  const [recentLinks, setRecentLinks] = useState<QuickLink[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("retop-recent-links") || "[]");
    } catch {
      return [];
    }
  });

  const handleNavigate = (link: QuickLink) => {
    setRecentLinks((prev) => {
      const filtered = prev.filter((l) => l.url !== link.url);
      const updated = [link, ...filtered].slice(0, 4); // Keep top 4
      localStorage.setItem("retop-recent-links", JSON.stringify(updated));
      return updated;
    });
    onNavigate(link);
  };

  const [activeMenu, setActiveMenu] = useState<{
    cat: MenuCategory;
    rect: DOMRect;
  } | null>(null);

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMenuEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };

  const handleMenuLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 300);
  };

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setActiveMenu(null);
    const handleClick = () => setActiveMenu(null);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // If typing an alphanumeric character and not already focused on an input field
      if (
        !isInput &&
        e.key.length === 1 &&
        /[a-zA-Z0-9]/.test(e.key) &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        inputRef.current?.focus();
        // Intentionally do not preventDefault here so the character gets typed into the input
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const flattenedLinks = useMemo(() => {
    if (!query) return [];
    const lowerQ = query.toLowerCase();
    const links: QuickLink[] = [];
    menuCategories.forEach((cat) => links.push(...cat.links));

    const matches = links.filter(
      (l) =>
        l.title.toLowerCase().includes(lowerQ) ||
        (l.category && l.category.toLowerCase().includes(lowerQ)),
    );

    const grouped = new Map<string, QuickLink[]>();
    matches.forEach((link) => {
      const cat = link.category || "Other";
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(link);
    });

    const finalLinks: QuickLink[] = [];
    grouped.forEach((groupLinks) => finalLinks.push(...groupLinks));
    return finalLinks;
  }, [query, menuCategories]);

  const sortedAttendance = useMemo(() => {
    const activeCourses = attendance.filter((a) => {
      if (!ttCourses || ttCourses.length === 0) return true;
      return ttCourses.some((tc) => tc.code === a.code);
    });
    return activeCourses.sort((a, b) => {
      const valA = parseFloat(a.attendance) || 0;
      const valB = parseFloat(b.attendance) || 0;
      return attSort === "asc" ? valA - valB : valB - valA;
    });
  }, [attendance, attSort, ttCourses]);

  // Handle auto-scroll for keyboard nav
  useEffect(() => {
    if (query) {
      const el = document.getElementById(`home-search-item-${selectedIndex}`);
      if (el) el.scrollIntoView({ block: "nearest" });
    } else if (activeMenu) {
      const el = document.getElementById(`home-popup-item-${selectedIndex}`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, query, activeMenu]);

  useEffect(() => {
    if (!query && !activeMenu) return;
    const currentList = activeMenu ? activeMenu.cat.links : flattenedLinks;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((p) => (p + 1) % currentList.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (p) => (p - 1 + currentList.length) % currentList.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (currentList[selectedIndex]) {
          handleNavigate(currentList[selectedIndex]);
          setActiveMenu(null);
          setQuery("");
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setActiveMenu(null);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [query, flattenedLinks, selectedIndex, activeMenu]); // Removed onNavigate since we use handleNavigate

  return (
    <>
      <div className="hidden lg:flex w-full lg:w-[26%] xl:w-[22%] flex-col shrink-0 h-auto lg:h-full relative z-40 pt-20 md:pt-24 lg:pt-28 pb-4 md:pb-6 lg:pb-8 gap-4">


        {/* Attendance Compact Box */}
        <div className="flex-1 overflow-visible flex flex-col min-h-0 pb-2">
          <ListCard
            title="Attendance"
            onClickTitle={() =>
              onNavigate({
                title: "Class Attendance",
                url: "studentattendance",
                category: "Academics",
              })
            }
            bgClass="bg-(--bg-surface)"
            borderClass="border-(--border-main)"
            headerAction={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAttSort((prev) => (prev === "asc" ? "desc" : "asc"));
                }}
                className="flex items-center justify-center p-1.5 bg-transparent hover:bg-black/10 rounded-lg transition-colors text-(--text-main) active:scale-95"
                title="Toggle Sort Order"
              >
                <SwapVert
                  className={`w-4 h-4 transition-transform ${attSort === "asc" ? "rotate-180" : ""}`}
                />
              </button>
            }
          >
            {sortedAttendance.length === 0 ? (
              <EmptyState msg="No Registered Courses" size="sm" />
            ) : (
              sortedAttendance.map((c, i) => (
                <AttendanceRow key={i} course={c} />
              ))
            )}
          </ListCard>
        </div>
      </div>

      {/* Floating Menu Portal - Minimal Material Brutalism */}
      <AnimatePresence>
        {activeMenu && (
          <motion.div
            onMouseEnter={handleMenuEnter}
            onMouseLeave={handleMenuLeave}
            initial={{ opacity: 0, scaleX: 0.3, scaleY: 0.8, x: -20 }}
            animate={{ opacity: 1, scaleX: 1, scaleY: 1, x: 0 }}
            exit={{ opacity: 0, scaleX: 0.3, scaleY: 0.8, x: -20 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`fixed z-200 bg-(--bg-surface) border-4 border-(--border-main) rounded-2xl shadow-(--brutal-shadow-hover) p-3 flex flex-col`}
            style={{
              transformOrigin: "left center",
              left: Math.min(
                activeMenu.rect.right + 12,
                window.innerWidth - 220,
              ),
              top: Math.max(
                20,
                Math.min(
                  activeMenu.rect.top,
                  window.innerHeight -
                    Math.ceil(
                      activeMenu.cat.links.length /
                        (activeMenu.cat.links.length > 20
                          ? 3
                          : activeMenu.cat.links.length > 10
                            ? 2
                            : 1),
                    ) *
                      36 -
                    60, // extra height for title
                ),
              ),
              maxHeight: "calc(100vh - 40px)",
              width:
                activeMenu.cat.links.length > 20
                  ? "600px"
                  : activeMenu.cat.links.length > 10
                    ? "400px"
                    : "220px",
              maxWidth: "calc(100vw - 40px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`grid ${activeMenu.cat.links.length > 20 ? "grid-cols-3" : activeMenu.cat.links.length > 10 ? "grid-cols-2" : "grid-cols-1"} gap-1 overflow-y-auto custom-scrollbar pt-2`}
            >
              {activeMenu.cat.links.map((link, i) => (
                <button
                  key={i}
                  id={`home-popup-item-${i}`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => {
                    handleNavigate(link);
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 group ${
                    i === selectedIndex
                      ? "bg-(--accent-base) text-(--text-inverse)"
                      : "bg-transparent text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main)"
                  }`}
                >
                  <span className="flex-1 truncate">{link.title}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
