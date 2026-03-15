import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QuickLink, MenuCategory } from "../types/vtop";
import {
  Search,
  FileText,
  CornerDownRight,
  X,
  ArrowDown,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileSignature,
  Wallet,
  PartyPopper,
  Globe,
  Wrench,
  Building,
  MessageSquare,
  Library,
  Briefcase,
  FlaskConical,
  Bus,
  Layers,
  Pin,
} from "lucide-react";

interface OmniboxProps {
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
  menuCategories: MenuCategory[];
  onNavigate: (link: QuickLink) => void;
  pinnedLinks: QuickLink[];
  onTogglePin: (link: QuickLink) => void;
}

export const getCategoryIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("academic")) return BookOpen;
  if (t.includes("examination")) return FileSignature;
  if (t.includes("finance")) return Wallet;
  if (t.includes("event")) return PartyPopper;
  if (t.includes("sap") || t.includes("international")) return Globe;
  if (t.includes("service")) return Wrench;
  if (t.includes("hostel")) return Building;
  if (t.includes("feedback")) return MessageSquare;
  if (t.includes("library")) return Library;
  if (t.includes("placement")) return Briefcase;
  if (t.includes("research")) return FlaskConical;
  if (t.includes("transport")) return Bus;
  return Layers;
};

const fuzzyMatch = (text: string, query: string) => {
  let tIdx = 0;
  let qIdx = 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  while (tIdx < t.length && qIdx < q.length) {
    if (t[tIdx] === q[qIdx]) qIdx++;
    tIdx++;
  }
  return qIdx === q.length;
};

const staticLinks: QuickLink[] = [
  { title: "Settings & Preferences", url: "#settings", category: "System" },
  {
    title: "Student Profile",
    url: "studentprofileallview",
    category: "System",
  },
];

export const Omnibox: React.FC<OmniboxProps> = ({
  isOpen,
  initialQuery = "",
  onClose,
  menuCategories,
  onNavigate,
  pinnedLinks,
  onTogglePin,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleCategory = (title: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setExpandedCats(new Set());
      setTimeout(() => {
        if (inputRef.current) {
          if (!isMobile || initialQuery !== "") {
            inputRef.current.focus();
            const length = inputRef.current.value.length;
            inputRef.current.setSelectionRange(length, length);
          }
        }
      }, 50);
    }
  }, [isOpen, initialQuery, isMobile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  const flattenedLinks = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQ = query.toLowerCase().trim();
    const matches: { link: QuickLink; score: number }[] = [];

    staticLinks.forEach((link) => {
      const titleLower = link.title.toLowerCase();
      const catLower = link.category.toLowerCase();
      let score = 0;
      if (titleLower === lowerQ) score = 100;
      else if (titleLower.startsWith(lowerQ)) score = 80;
      else if (titleLower.includes(lowerQ)) score = 50;
      else if (catLower.includes(lowerQ)) score = 30;
      else if (fuzzyMatch(titleLower, lowerQ)) score = 10;

      if (score > 0) matches.push({ link, score });
    });

    menuCategories.forEach((cat) => {
      cat.links.forEach((link) => {
        const titleLower = link.title.toLowerCase();
        const catLower = cat.title.toLowerCase();
        let score = 0;
        if (titleLower === lowerQ) score = 100;
        else if (titleLower.startsWith(lowerQ)) score = 80;
        else if (titleLower.includes(lowerQ)) score = 50;
        else if (catLower.includes(lowerQ)) score = 30;
        else if (fuzzyMatch(titleLower, lowerQ)) score = 10;
        else if (fuzzyMatch(catLower, lowerQ)) score = 5;

        if (score > 0) {
          matches.push({ link, score });
        }
      });
    });

    return matches
      .sort((a, b) => b.score - a.score)
      .map((m) => m.link)
      .slice(0, 15);
  }, [query, menuCategories]);

  useEffect(() => {
    if (query && isOpen && scrollRef.current) {
      const container = scrollRef.current;
      const el = document.getElementById(`omnibox-item-${selectedIndex}`);

      if (el && container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        if (elRect.top < containerRect.top) {
          container.scrollTop -= containerRect.top - elRect.top + 8;
        } else if (elRect.bottom > containerRect.bottom) {
          container.scrollTop += elRect.bottom - containerRect.bottom + 8;
        }
      }
    }
  }, [selectedIndex, query, isOpen]);

  const renderResults = () => {
    if (query) {
      if (flattenedLinks.length === 0)
        return (
          <div className="flex flex-col items-center justify-center p-8 md:p-12 text-(--text-dim) text-sm border-2 md:border-4 border-dashed border-(--border-dim) m-3 md:m-4 rounded-3xl md:rounded-4xl bg-(--bg-main)">
            <AlertCircle className="w-10 h-10 md:w-12 md:h-12 mb-3 md:mb-4 opacity-50" />
            <span className="font-expanded text-base md:text-lg uppercase tracking-widest text-center">
              No matches found
            </span>
          </div>
        );
      return (
        <div className="p-2 md:p-3 space-y-2 relative">
          {flattenedLinks.map((link, i) => {
            const isSelected = i === selectedIndex;
            const isPinned = pinnedLinks.some((p) => p.url === link.url);
            return (
              <div
                key={i}
                id={`omnibox-item-${i}`}
                className="flex items-center gap-2 w-full"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(link);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`
                    flex-1 text-left px-4 py-3 md:px-5 md:py-4 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 flex items-center gap-3 md:gap-4 border-2
                    ${
                      isSelected
                        ? "bg-blue-500 text-white border-black shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] -translate-y-px"
                        : "bg-(--bg-surface) border-transparent text-(--text-muted) hover:border-(--border-dim)"
                    }
                  `}
                >
                  <FileText
                    className={`w-4 h-4 md:w-5 md:h-5 shrink-0 ${isSelected ? "opacity-100" : "opacity-50"}`}
                  />
                  <span className="flex-1 truncate text-sm md:text-base">
                    {link.title}
                  </span>
                  <span
                    className={`text-[9px] md:text-[10px] uppercase font-bold px-2 py-1.5 rounded-lg border-2 shrink-0 leading-none hidden sm:block ${
                      isSelected
                        ? "border-white/30 bg-white/20 text-white"
                        : "border-(--border-dim) bg-(--bg-highlight) text-(--text-muted)"
                    }`}
                  >
                    {link.category}
                  </span>
                  {isSelected && (
                    <CornerDownRight className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(link);
                  }}
                  className={`p-3 md:p-4 rounded-xl transition-colors border-2 shrink-0 ${
                    isPinned
                      ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_#000]"
                      : "bg-(--bg-surface) border-transparent hover:border-(--border-dim) text-(--text-muted) hover:text-(--text-main)"
                  }`}
                  title={isPinned ? "Unpin from Dock" : "Pin to Dock"}
                >
                  <Pin
                    className="w-4 h-4 md:w-5 md:h-5"
                    fill={isPinned ? "currentColor" : "none"}
                  />
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="columns-1 sm:columns-2 gap-3 md:gap-4 p-3 md:p-4">
        {menuCategories.map((cat, catIdx) => {
          const isExpanded = expandedCats.has(cat.title);
          const CatIcon = getCategoryIcon(cat.title);

          return (
            <div
              key={catIdx}
              className={`
                break-inside-avoid mb-3 md:mb-4 bg-(--bg-surface) border-2 md:border-4 rounded-2xl overflow-hidden transition-all duration-200
                ${isExpanded ? "border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] -translate-y-1" : "border-(--border-dim) hover:border-(--border-main)"}
              `}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(cat.title);
                }}
                className="w-full bg-transparent p-3 md:p-4 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center border-2 transition-all ${isExpanded ? "bg-blue-500 border-black text-white shadow-[2px_2px_0px_0px_#000]" : "bg-(--bg-main) border-(--border-dim) text-(--text-muted) group-hover:text-(--text-main) group-hover:border-(--border-main)"}`}
                  >
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <h3
                    className={`text-xs md:text-sm font-black tracking-wide mb-0 font-expanded uppercase ${
                      isExpanded
                        ? "text-(--text-main)"
                        : "text-(--text-muted) group-hover:text-(--text-main)"
                    }`}
                  >
                    {cat.title}
                  </h3>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-(--text-dim) group-hover:text-(--text-muted)" />
                )}
              </button>

              <div
                className={`transition-all duration-300 ease-in-out bg-(--bg-main) ${
                  isExpanded
                    ? "max-h-[60vh] border-t-2 md:border-t-4 border-black"
                    : "max-h-0 border-t-0 border-black"
                }`}
              >
                <div className="overflow-y-auto max-h-[50vh] custom-scrollbar p-1.5 md:p-2 space-y-1">
                  {cat.links.map((link, i) => {
                    const isPinned = pinnedLinks.some(
                      (p) => p.url === link.url,
                    );
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 w-full group/link"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(link);
                            onClose();
                          }}
                          className="flex-1 text-left px-3 py-2.5 md:px-4 md:py-3 rounded-lg md:rounded-xl text-xs font-bold text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-surface) transition-all flex items-center gap-3 border-2 border-transparent hover:border-(--border-dim)"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-(--border-dim) group-hover/link:bg-blue-500 transition-colors shrink-0"></div>
                          <span className="flex-1 leading-tight truncate">
                            {link.title}
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(link);
                          }}
                          className={`p-2 rounded-lg transition-colors border-2 shrink-0 ${
                            isPinned
                              ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_#000]"
                              : "bg-transparent border-transparent hover:border-(--border-dim) text-(--text-muted) hover:text-(--text-main)"
                          }`}
                          title={isPinned ? "Unpin from Dock" : "Pin to Dock"}
                        >
                          <Pin
                            className="w-4 h-4"
                            fill={isPinned ? "currentColor" : "none"}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (!query) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flattenedLinks.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + flattenedLinks.length) % flattenedLinks.length,
        );
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (flattenedLinks[selectedIndex]) {
          onNavigate(flattenedLinks[selectedIndex]);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [query, flattenedLinks, selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 z-200 flex bg-black/60 ${isMobile ? "items-end" : "items-start justify-center pt-[10vh] px-2"}`}
          onClick={onClose}
        >
          <motion.div
            initial={
              isMobile ? { y: "100%" } : { scale: 0.95, y: -20, opacity: 0 }
            }
            animate={isMobile ? { y: 0 } : { scale: 1, y: 0, opacity: 1 }}
            exit={
              isMobile ? { y: "100%" } : { scale: 0.95, y: -20, opacity: 0 }
            }
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`w-full flex flex-col overflow-hidden bg-(--bg-surface) shadow-[0px_-8px_0px_0px_#000] sm:shadow-[16px_16px_0px_0px_#000] ${
              isMobile
                ? "max-h-[90vh] rounded-t-3xl border-t-4 border-black pb-6"
                : "max-w-3xl max-h-[80vh] rounded-4xl border-4 border-black"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isMobile && inputRef.current) {
                inputRef.current.focus();
              }
            }}
          >
            <div className="border-b-2 md:border-b-4 border-black p-4 md:p-6 bg-(--bg-surface) flex items-center gap-3 md:gap-5 shrink-0 relative overflow-hidden z-20">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-500 text-white flex items-center justify-center font-bold text-xl border-2 md:border-4 border-black rounded-xl md:rounded-2xl shadow-[2px_2px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] z-10 shrink-0 transform -rotate-3">
                <Search className="w-5 h-5 md:w-7 md:h-7" />
              </div>
              <div className="flex-1 z-10 min-w-0">
                <input
                  id="omnibox-input"
                  ref={inputRef}
                  type="text"
                  className="w-full bg-transparent text-(--text-main) text-xl md:text-3xl font-expanded font-black focus:outline-none placeholder-(--text-dim) tracking-tight uppercase"
                  placeholder="WHERE TO?"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                />
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-(--bg-main) border-2 border-(--border-dim) rounded-xl md:rounded-2xl text-(--text-muted) hover:text-white hover:border-red-500 hover:bg-red-500 transition-all z-10 shadow-sm hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none shrink-0"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="overflow-y-auto custom-scrollbar bg-(--bg-main) flex-1 relative z-10"
            >
              {renderResults()}
            </div>

            <div className="hidden md:flex bg-(--bg-surface) px-8 py-4 justify-between items-center border-t-4 border-black shrink-0 z-20">
              <div className="flex gap-6 text-[10px] text-(--text-muted) font-bold tracking-widest uppercase">
                <span className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-(--bg-highlight) rounded-lg border border-(--border-dim) shadow-sm text-(--text-main)">
                    <ArrowDown className="w-3 h-3" />
                  </span>{" "}
                  Navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-(--bg-highlight) rounded-lg border border-(--border-dim) shadow-sm text-(--text-main)">
                    <CornerDownRight className="w-3 h-3" />
                  </span>{" "}
                  Select
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-(--bg-highlight) rounded-lg border border-(--border-dim) shadow-sm text-(--text-main)">
                    ESC
                  </span>{" "}
                  Dismiss
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
