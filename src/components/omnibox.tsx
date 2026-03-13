import React, { useEffect, useRef, useState, useMemo } from "react";
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
} from "lucide-react";

interface OmniboxProps {
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
  menuCategories: MenuCategory[];
  onNavigate: (link: QuickLink) => void;
}

const getCategoryIcon = (title: string) => {
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

// Helper function for sequential fuzzy matching
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

export const Omnibox: React.FC<OmniboxProps> = ({
  isOpen,
  initialQuery = "",
  onClose,
  menuCategories,
  onNavigate,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

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
      setIsVisible(true);
      setQuery(initialQuery);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsAnimating(true)),
      );

      // Focus quicker than 50ms so user doesn't miss strokes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
        }
      }, 10);

      setSelectedIndex(0);
      setExpandedCats(new Set());
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
    if (query && isVisible && scrollRef.current) {
      const container = scrollRef.current;
      const el = document.getElementById(`omnibox-item-${selectedIndex}`);

      if (el && container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        // Check if top of element is above top of container (add 8px buffer)
        if (elRect.top < containerRect.top) {
          container.scrollTop -= containerRect.top - elRect.top + 8;
        }
        // Check if bottom of element is below bottom of container (add 8px buffer)
        else if (elRect.bottom > containerRect.bottom) {
          container.scrollTop += elRect.bottom - containerRect.bottom + 8;
        }
      }
    }
  }, [selectedIndex, query, isVisible]);

  const renderResults = () => {
    if (query) {
      if (flattenedLinks.length === 0)
        return (
          <div className="flex flex-col items-center justify-center p-12 text-(--text-dim) text-sm border-4 border-dashed border-(--border-dim) m-4 rounded-4xl bg-(--bg-main)">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <span className="font-expanded text-lg uppercase tracking-widest">
              No matches found
            </span>
          </div>
        );
      return (
        <div className="p-3 space-y-2 relative">
          {flattenedLinks.map((link, i) => {
            const isSelected = i === selectedIndex;
            return (
              <button
                key={i}
                id={`omnibox-item-${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(link);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`
                  w-full text-left px-5 py-4 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-4 border-2
                  ${
                    isSelected
                      ? "bg-blue-500 text-white border-black shadow-[4px_4px_0px_0px_#000] -translate-y-px"
                      : "bg-(--bg-surface) border-transparent text-(--text-muted) hover:border-(--border-dim)"
                  }
                `}
              >
                <FileText
                  className={`w-5 h-5 shrink-0 ${isSelected ? "opacity-100" : "opacity-50"}`}
                />
                <span className="flex-1 truncate text-base">{link.title}</span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-1.5 rounded-lg border-2 shrink-0 leading-none ${
                    isSelected
                      ? "border-white/30 bg-white/20 text-white"
                      : "border-(--border-dim) bg-(--bg-highlight) text-(--text-muted)"
                  }`}
                >
                  {link.category}
                </span>
                {isSelected && <CornerDownRight className="w-5 h-5 shrink-0" />}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="columns-1 md:columns-2 gap-4 p-4">
        {menuCategories.map((cat, catIdx) => {
          const isExpanded = expandedCats.has(cat.title);
          const CatIcon = getCategoryIcon(cat.title);

          return (
            <div
              key={catIdx}
              className={`
                break-inside-avoid mb-4 bg-(--bg-surface) border-4 rounded-2xl overflow-hidden transition-all duration-200
                ${isExpanded ? "border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] -translate-y-1" : "border-(--border-dim) hover:border-(--border-main)"}
              `}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(cat.title);
                }}
                className="w-full bg-transparent p-4 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${isExpanded ? "bg-blue-500 border-black text-white shadow-[2px_2px_0px_0px_#000]" : "bg-(--bg-main) border-(--border-dim) text-(--text-muted) group-hover:text-(--text-main) group-hover:border-(--border-main)"}`}
                  >
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <h3
                    className={`text-sm font-black tracking-wide mb-0 font-expanded uppercase ${
                      isExpanded
                        ? "text-(--text-main)"
                        : "text-(--text-muted) group-hover:text-(--text-main)"
                    }`}
                  >
                    {cat.title}
                  </h3>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-blue-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-(--text-dim) group-hover:text-(--text-muted)" />
                )}
              </button>

              <div
                className={`transition-all duration-300 ease-in-out bg-(--bg-main) ${
                  isExpanded
                    ? "max-h-[60vh] border-t-4 border-black"
                    : "max-h-0 border-t-0 border-black"
                }`}
              >
                <div className="overflow-y-auto max-h-[60vh] custom-scrollbar p-2 space-y-1">
                  {cat.links.map((link, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(link);
                        onClose();
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl text-xs font-bold text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-surface) transition-all flex items-center gap-3 group border-2 border-transparent hover:border-(--border-dim)"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-(--border-dim) group-hover:bg-blue-500 transition-colors shrink-0"></div>
                      <span className="flex-1 leading-tight truncate">
                        {link.title}
                      </span>
                    </button>
                  ))}
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
        setSelectedIndex((prev) => {
          const next = (prev + 1) % flattenedLinks.length;
          return next;
        });
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

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-200 flex items-start justify-center pt-[5vh] md:pt-[10vh] transition-all duration-300 ${
        isAnimating
          ? "bg-black/60 backdrop-blur-sm opacity-100"
          : "bg-transparent backdrop-blur-none opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className={`
            w-full max-w-3xl flex flex-col max-h-[80vh] overflow-hidden transform transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            bg-(--bg-surface) border-4 border-black rounded-4xl shadow-[16px_16px_0px_0px_#000]
            ${isAnimating ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-8 opacity-0"}
        `}
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.focus();
        }}
      >
        <div className="border-b-4 border-black p-6 bg-(--bg-surface) flex items-center gap-5 shrink-0 relative overflow-hidden z-20">
          <div className="w-14 h-14 bg-blue-500 text-white flex items-center justify-center font-bold text-xl border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] z-10 shrink-0 transform -rotate-3">
            <Search className="w-7 h-7" />
          </div>
          <div className="flex-1 z-10 min-w-0">
            <input
              id="omnibox-input"
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-(--text-main) text-3xl font-expanded font-black focus:outline-none placeholder-(--text-dim) tracking-tight uppercase"
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
            className="w-12 h-12 flex items-center justify-center bg-(--bg-main) border-2 border-(--border-dim) rounded-2xl text-(--text-muted) hover:text-white hover:border-red-500 hover:bg-red-500 transition-all z-10 shadow-sm hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="overflow-y-auto custom-scrollbar bg-(--bg-main) flex-1 relative z-10"
        >
          {renderResults()}
        </div>

        <div className="bg-(--bg-surface) px-8 py-4 flex justify-between items-center border-t-4 border-black shrink-0 z-20">
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
      </div>
    </div>
  );
};
