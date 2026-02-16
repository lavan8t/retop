import React, { useEffect, useRef, useState, useMemo } from "react";
import { QuickLink, MenuCategory } from "../types/vtop";
import {
  Search,
  Folder,
  FileText,
  CornerDownRight,
  X,
  ArrowDown,
  AlertCircle,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface OmniboxProps {
  isOpen: boolean;
  onClose: () => void;
  menuCategories: MenuCategory[];
  onNavigate: (link: QuickLink) => void;
}

export const Omnibox: React.FC<OmniboxProps> = ({
  isOpen,
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
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsAnimating(true)),
      );
      setTimeout(() => inputRef.current?.focus(), 50);
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
    if (!query) return [];
    const lowerQ = query.toLowerCase();
    const links: QuickLink[] = [];
    menuCategories.forEach((cat) => {
      links.push(
        ...cat.links.filter(
          (l) =>
            l.title.toLowerCase().includes(lowerQ) ||
            cat.title.toLowerCase().includes(lowerQ),
        ),
      );
    });
    return links;
  }, [query, menuCategories]);

  const renderResults = () => {
    if (query) {
      if (flattenedLinks.length === 0)
        return (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-500 text-sm border-4 border-dashed border-zinc-800 m-4 rounded-[2rem] bg-zinc-950/50">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <span className="font-expanded text-lg uppercase tracking-widest">
              No matches found
            </span>
          </div>
        );
      return (
        <div className="p-3 space-y-2">
          {flattenedLinks.map((link, i) => {
            const isSelected = i === selectedIndex;
            return (
              <button
                key={i}
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
                      ? "bg-blue-500 text-white border-black shadow-[4px_4px_0px_0px_#000] -translate-y-1"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }
                `}
              >
                <FileText
                  className={`w-5 h-5 ${isSelected ? "opacity-100" : "opacity-50"}`}
                />
                <span className="flex-1 truncate text-base">{link.title}</span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-1 rounded border-2 ${
                    isSelected
                      ? "border-white/30 bg-white/20 text-white"
                      : "border-zinc-700 bg-zinc-950 text-zinc-500"
                  }`}
                >
                  {link.category}
                </span>
                {isSelected && <CornerDownRight className="w-5 h-5" />}
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
          return (
            <div
              key={catIdx}
              className={`
                break-inside-avoid mb-4 bg-zinc-900 border-4 border-zinc-800 rounded-2xl overflow-hidden transition-all duration-200
                ${isExpanded ? "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] -translate-y-1" : "hover:border-zinc-600"}
              `}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(cat.title);
                }}
                className="w-full bg-zinc-900 p-4 flex items-center justify-between group hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg border-2 ${isExpanded ? "bg-blue-500 border-black text-white" : "bg-zinc-950 border-zinc-700 text-zinc-500"}`}
                  >
                    <Folder className="w-4 h-4" />
                  </div>
                  <h3
                    className={`text-sm font-black tracking-wide mb-0 font-expanded uppercase ${
                      isExpanded
                        ? "text-zinc-200"
                        : "text-zinc-500 group-hover:text-zinc-300"
                    }`}
                  >
                    {cat.title}
                  </h3>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-blue-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                )}
              </button>

              <div
                className={`transition-all duration-300 ease-in-out bg-zinc-900 ${
                  isExpanded
                    ? "max-h-[60vh] border-t-4 border-zinc-800"
                    : "max-h-0"
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
                      className="w-full text-left px-4 py-3 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition-all flex items-center gap-3 group border-2 border-transparent hover:border-zinc-400"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-blue-500 transition-colors"></div>
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
      className={`fixed inset-0 z-[200] flex items-start justify-center pt-[5vh] md:pt-[10vh] transition-all duration-300 ${
        isAnimating
          ? "bg-zinc-950/90 backdrop-blur-md opacity-100"
          : "bg-transparent backdrop-blur-none opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className={`
            w-full max-w-3xl flex flex-col max-h-[80vh] overflow-hidden transform transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            bg-zinc-950 border-4 border-zinc-800 rounded-[2rem] shadow-[12px_12px_0px_0px_#000]
            ${isAnimating ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-8 opacity-0"}
        `}
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.focus();
        }}
      >
        <div className="border-b-4 border-zinc-800 p-6 bg-zinc-900 flex items-center gap-5 shrink-0 relative overflow-hidden">
          <div className="w-14 h-14 bg-blue-500 text-white flex items-center justify-center font-bold text-xl border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] z-10 shrink-0 transform -rotate-3">
            <Search className="w-7 h-7" />
          </div>
          <div className="flex-1 z-10 min-w-0">
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-zinc-200 text-3xl font-expanded font-black focus:outline-none placeholder-zinc-700 tracking-tight uppercase"
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
            className="w-10 h-10 flex items-center justify-center bg-zinc-950 border-2 border-zinc-800 rounded-xl text-zinc-500 hover:text-red-500 hover:border-red-500 hover:bg-red-500/10 transition-all z-10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="overflow-y-auto custom-scrollbar bg-zinc-950 flex-1 scroll-smooth"
        >
          {renderResults()}
        </div>

        <div className="bg-zinc-900 px-8 py-3 flex justify-between items-center border-t-4 border-zinc-800 shrink-0">
          <div className="flex gap-6 text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
            <span className="flex items-center gap-1.5">
              <span className="p-1 bg-zinc-800 rounded border border-zinc-700">
                <ArrowDown className="w-3 h-3" />
              </span>{" "}
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="p-1 bg-zinc-800 rounded border border-zinc-700">
                <CornerDownRight className="w-3 h-3" />
              </span>{" "}
              Select
            </span>
            <span className="flex items-center gap-1.5">
              <span className="p-1 bg-zinc-800 rounded border border-zinc-700">
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
