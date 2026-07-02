import React, { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  CornerDownRight,
  Pin,
  AlertCircle,
  Home,
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
  pageTitle?: string;
  onBack?: () => void;
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
  pageTitle = "Search",
  onBack,
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

  const isSearchActive = isExpanded && query;

  return (
    <div className="relative flex flex-col z-50">
      {/* Unified Search Bar */}
      <div
        className={`group flex items-center gap-4 transition-all cursor-text md:min-w-[420px] shadow-none pl-6 pr-5 h-14 md:h-16
          ${
            isSearchActive
              ? "bg-(--bg-highlight) rounded-t-[1.5rem] md:rounded-t-[2rem] rounded-b-none border-4 border-b-0 border-(--accent-base)"
              : "bg-transparent border-4 border-transparent"
          }
        `}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onBack) onBack();
          }}
          title="Return to Dashboard"
          className="relative flex items-center justify-center shrink-0 cursor-pointer hover:opacity-75 transition-opacity"
        >
          <div className="flex items-baseline">
            <span className="font-expanded font-black text-2xl md:text-3xl italic lowercase leading-none text-(--text-main) group-focus-within:text-(--accent-hover) transition-colors">
              re
            </span>
            <div className="relative w-1.5 h-1.5 md:w-2 md:h-2 ml-0.5 md:ml-1 mb-1 bg-(--accent-base) rounded-full flex items-center justify-center group-focus-within:scale-[2] transition-transform origin-bottom-left">
              <Search
                className="w-1 h-1 md:w-1.5 md:h-1.5 text-white opacity-0 group-focus-within:opacity-100 transition-opacity absolute"
                strokeWidth={4}
              />
            </div>
          </div>
        </button>

        <input
          ref={inputRef}
          type="text"
          placeholder={pageTitle}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
            if (!isExpanded) setIsOmniboxOpen(true);
          }}
          onFocus={() => setIsOmniboxOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOmniboxOpen(false), 200);
          }}
          className="w-full bg-transparent text-lg md:text-xl font-bold text-(--text-main) pl-2 pt-1 focus:outline-none placeholder-(--text-muted) min-w-0 uppercase"
        />
      </div>

      <AnimatePresence>
        {isSearchActive && (
          <motion.div
            key="search-dropdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute top-14 md:top-16 left-0 w-full bg-(--bg-highlight) border-4 border-t-0 border-(--accent-base) rounded-b-[1.5rem] md:rounded-b-[2rem] overflow-hidden z-[200] shadow-[8px_8px_0px_0px_var(--shadow-main)]"
          >
            <div className="p-3">
              <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto custom-scrollbar">
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
                          className={`flex-1 text-left px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-3 border-4 ${
                            isSelected
                              ? "bg-(--accent-base) text-(--text-inverse) border-(--border-main) shadow-none -translate-y-px"
                              : "bg-transparent border-transparent text-(--text-muted)"
                          }`}
                        >
                          <span className="flex-1 truncate pl-1">
                            {link.title}
                          </span>
                          {isSelected && (
                            <CornerDownRight className="w-5 h-5 shrink-0" />
                          )}
                        </button>
                        <button
                          onClick={() => onTogglePin(link)}
                          className={`p-2 rounded-xl transition-all border-4 shrink-0 ${
                            isPinned
                              ? "bg-(--bg-highlight) text-(--text-main) border-(--border-main) shadow-none"
                              : "bg-transparent border-transparent text-(--text-dim) hover:text-(--text-main)"
                          }`}
                          title={
                            isPinned ? "Unpin from Dock" : "Pin to Dock"
                          }
                        >
                          <Pin
                            className="w-5 h-5"
                            fill={isPinned ? "currentColor" : "none"}
                            style={{
                              transform: isPinned
                                ? "rotate(45deg)"
                                : "none",
                            }}
                          />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
