import React, { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  CornerDownRight,
  Pin,
  AlertCircle,
} from "lucide-react";
import { QuickLink, MenuCategory } from "../../types/vtop";

interface TopBarSearchProps {
  currentView: string;
  isOmniboxOpen: boolean;
  setIsOmniboxOpen: (val: boolean) => void;
  menuCategories: MenuCategory[];
  pinnedLinks: QuickLink[];
  onNavigate: (link: QuickLink) => void;
  onTogglePin: (link: QuickLink) => void;
  initialQuery?: string;
}

const getDestinationView = (link: QuickLink) => {
  return link.url.startsWith("/")
    ? link.url.slice(1) || "dashboard"
    : "content";
};

const fuzzyMatch = (str: string, pattern: string) => {
  pattern = pattern.split("").reduce((a, b) => a + ".*" + b);
  return new RegExp(pattern).test(str);
};

export const TopBarSearch: React.FC<TopBarSearchProps> = ({
  currentView,
  isOmniboxOpen,
  setIsOmniboxOpen,
  menuCategories,
  pinnedLinks,
  onNavigate,
  onTogglePin,
  initialQuery = "",
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExpanded = isOmniboxOpen;

  useEffect(() => {
    if (isOmniboxOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOmniboxOpen]);

  useEffect(() => {
    if (!isExpanded) {
      setQuery("");
    }
  }, [isExpanded]);

  const flattenedLinks = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQ = query.toLowerCase().trim();
    const matches: { link: QuickLink; score: number }[] = [];

    const staticLinks: QuickLink[] = [
      { id: "dashboard", title: "Dashboard", url: "/", category: "Navigation" },
      {
        id: "timetable",
        title: "Timetable",
        url: "/timetable",
        category: "Navigation",
      },
      { id: "marks", title: "Marks", url: "/marks", category: "Navigation" },
      {
        id: "calendar",
        title: "Calendar",
        url: "/calendar",
        category: "Navigation",
      },
    ];

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
    if (!isExpanded || !query) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flattenedLinks.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + flattenedLinks.length) % flattenedLinks.length,
        );
      } else if (e.key === "Enter" && flattenedLinks[selectedIndex]) {
        e.preventDefault();
        onNavigate(flattenedLinks[selectedIndex]);
        setIsOmniboxOpen(false);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOmniboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    query,
    flattenedLinks,
    selectedIndex,
    isExpanded,
    onNavigate,
    setIsOmniboxOpen,
  ]);

  return (
    <div className="relative flex items-center h-12 z-50">
      {/* The logo is always visible */}
      <div
        className={`group relative flex items-baseline select-none cursor-pointer flex`}
        onClick={() => setIsOmniboxOpen(true)}
        title="Search ( / )"
      >
        <span className="font-expanded font-black text-[2rem] md:text-[2.5rem] italic lowercase leading-none text-(--text-main) group-hover:text-(--accent-hover) transition-colors z-20">
          re
        </span>
        <div className="relative w-2 h-2 md:w-3 md:h-3 ml-0.5 mb-1 md:mb-1.5 bg-(--accent-base) rounded-full flex items-center justify-center group-hover:scale-[2] transition-transform origin-bottom-left z-20">
          <Search
            className="w-1.5 h-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity absolute"
            strokeWidth={4}
          />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="search-box"
            initial={{ opacity: 0, width: 0, marginLeft: 0 }}
            animate={{ opacity: 1, width: "min(400px, 60vw)", marginLeft: 16 }}
            exit={{ opacity: 0, width: 0, marginLeft: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative flex items-center h-full"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="WHERE TO?"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onBlur={() => {
                setTimeout(() => setIsOmniboxOpen(false), 200);
              }}
              className="w-full bg-(--bg-surface) text-base md:text-lg font-expanded font-black text-(--text-main) border-4 border-(--border-main) rounded-2xl px-4 py-1.5 md:py-2 focus:outline-none placeholder-(--text-muted) uppercase shadow-[4px_4px_0px_0px_var(--shadow-main)] absolute left-0 origin-left"
            />

            {query && (
              <div className="absolute top-[calc(100%+12px)] left-0 w-full bg-(--bg-surface) border-4 border-(--border-main) rounded-2xl shadow-[6px_6px_0px_0px_var(--shadow-main)] max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col p-2 z-[999]">
                {flattenedLinks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-(--text-dim)">
                    <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                    <span className="font-expanded text-sm uppercase text-(--text-muted)">
                      No Matches
                    </span>
                  </div>
                ) : (
                  flattenedLinks.map((link, i) => {
                    const isSelected = i === selectedIndex;
                    const linkDest = getDestinationView(link);
                    const isPinned =
                      linkDest !== "content" &&
                      pinnedLinks.some(
                        (p) => getDestinationView(p) === linkDest,
                      );

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 w-full mb-1"
                      >
                        <button
                          onClick={() => {
                            onNavigate(link);
                            setIsOmniboxOpen(false);
                            setQuery("");
                          }}
                          onMouseEnter={() => setSelectedIndex(i)}
                          className={`flex-1 text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-3 border-4 ${
                            isSelected
                              ? "bg-(--accent-base) text-white border-(--border-main) shadow-none -translate-y-px"
                              : "bg-transparent border-transparent text-(--text-muted)"
                          }`}
                        >
                          <FileText
                            className={`w-4 h-4 shrink-0 ${isSelected ? "opacity-100" : "opacity-50"}`}
                          />
                          <span className="flex-1 truncate">{link.title}</span>
                          {isSelected && (
                            <CornerDownRight className="w-4 h-4 shrink-0" />
                          )}
                        </button>
                        <button
                          onClick={() => onTogglePin(link)}
                          className={`p-2 rounded-xl transition-all border-4 shrink-0 ${
                            isPinned
                              ? "bg-(--bg-highlight) text-(--text-main) border-(--border-main) shadow-none"
                              : "bg-transparent border-transparent text-(--text-dim) hover:text-(--text-main)"
                          }`}
                          title={isPinned ? "Unpin from Dock" : "Pin to Dock"}
                        >
                          <Pin
                            className="w-4 h-4"
                            fill={isPinned ? "currentColor" : "none"}
                            style={{
                              transform: isPinned ? "rotate(45deg)" : "none",
                            }}
                          />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
