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
  Calendar,
  GraduationCap,
  User,
  Settings as SettingsIcon,
} from "lucide-react";

interface OmniboxProps {
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
  menuCategories: MenuCategory[];
  onNavigate: (link: QuickLink) => void;
  pinnedLinks: QuickLink[];
  onTogglePin: (link: QuickLink) => void;
  getDestinationView: (link: QuickLink) => string;
}

export const getCategoryIcon = (title: string, url: string = "") => {
  const t = title.toLowerCase();
  const u = url.toLowerCase();

  if (t.includes("time table") || u.includes("studenttimetable"))
    return Calendar;
  if (
    t.includes("course page") ||
    u.includes("coursepage") ||
    t.includes("course")
  )
    return Layers;
  if (t.includes("curriculum")) return BookOpen;
  if (t.includes("mark") || t.includes("grade")) return GraduationCap;
  if (t.includes("profile") || u.includes("studentprofileallview")) return User;
  if (t.includes("setting") || u.includes("setting")) return SettingsIcon;

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
  return FileText;
};

const fuzzyMatch = (text: string, query: string) => {
  let tIdx = 0,
    qIdx = 0;
  const t = text.toLowerCase(),
    q = query.toLowerCase();
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
  getDestinationView,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setExpandedCats(new Set());
      setTimeout(() => {
        if (inputRef.current && (!isMobile || initialQuery !== ""))
          inputRef.current.focus();
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
          <div className="flex flex-col items-center justify-center p-12 text-(--text-dim) border-4 border-dashed border-(--border-dim) m-4 rounded-4xl bg-(--bg-main)">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <span className="font-expanded text-lg uppercase tracking-widest">
              No matches
            </span>
          </div>
        );
      return (
        <div className="p-3 space-y-2">
          {flattenedLinks.map((link, i) => {
            const isSelected = i === selectedIndex;
            // FIX: Map the link via getDestinationView to match aliases perfectly
            const linkDest = getDestinationView(link);
            const isPinned =
              linkDest !== "content" &&
              pinnedLinks.some((p) => getDestinationView(p) === linkDest);

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
                  className={`p-3 md:p-4 rounded-xl transition-all border-2 shrink-0 ${
                    isPinned
                      ? "bg-(--accent-base) text-white border-black shadow-[2px_2px_0px_0px_#000]"
                      : "bg-(--bg-surface) border-transparent hover:border-(--border-dim) text-(--text-muted)"
                  }`}
                  title={isPinned ? "Unpin from Dock" : "Pin to Dock"}
                >
                  <Pin
                    className="w-4 h-4 md:w-5 md:h-5"
                    fill={isPinned ? "currentColor" : "none"}
                    style={{ transform: isPinned ? "rotate(45deg)" : "none" }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="columns-1 sm:columns-2 gap-4 p-4">
        {menuCategories.map((cat, idx) => {
          const isExpanded = expandedCats.has(cat.title);
          const CatIcon = getCategoryIcon(cat.title);
          return (
            <div
              key={idx}
              className={`break-inside-avoid mb-4 bg-(--bg-surface) border-2 md:border-4 rounded-2xl overflow-hidden transition-all ${isExpanded ? "border-black shadow-[6px_6px_0px_0px_#000] -translate-y-1" : "border-(--border-dim)"}`}
            >
              <button
                onClick={() =>
                  setExpandedCats((prev) => {
                    const n = new Set(prev);
                    isExpanded ? n.delete(cat.title) : n.add(cat.title);
                    return n;
                  })
                }
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 ${isExpanded ? "bg-blue-500 text-white border-black" : "bg-(--bg-main) text-(--text-muted)"}`}
                  >
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black font-expanded uppercase">
                    {cat.title}
                  </h3>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-blue-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-(--text-dim)" />
                )}
              </button>
              {isExpanded && (
                <div className="border-t-4 border-black bg-(--bg-main) p-2 space-y-1">
                  {cat.links.map((link, li) => {
                    // FIX: Map the link via getDestinationView to match aliases perfectly
                    const linkDest = getDestinationView(link);
                    const isPinned =
                      linkDest !== "content" &&
                      pinnedLinks.some(
                        (p) => getDestinationView(p) === linkDest,
                      );

                    return (
                      <div key={li} className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onNavigate(link);
                            onClose();
                          }}
                          className="flex-1 text-left px-4 py-3 rounded-xl text-xs font-bold text-(--text-muted) hover:text-(--text-main) truncate"
                        >
                          {link.title}
                        </button>
                        <button
                          onClick={() => onTogglePin(link)}
                          className={`p-2 rounded-lg border-2 transition-all ${isPinned ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_#000]" : "border-transparent text-(--text-dim)"}`}
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
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-200 flex bg-black/60 ${isMobile ? "items-end" : "items-start justify-center pt-[10vh] px-2"}`}
          onClick={onClose}
        >
          <motion.div
            initial={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 30 }}
            className={`w-full flex flex-col overflow-hidden bg-(--bg-surface) shadow-[0px_-8px_0px_0px_#000] sm:shadow-[16px_16px_0px_0px_#000] ${isMobile ? "max-h-[90vh] rounded-t-3xl border-t-4 border-black pb-6" : "max-w-3xl max-h-[80vh] rounded-4xl border-4 border-black"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b-4 border-black p-6 bg-(--bg-surface) flex items-center gap-5 shrink-0">
              <div className="w-14 h-14 bg-blue-500 text-white flex items-center justify-center border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] transform -rotate-3">
                <Search className="w-7 h-7" />
              </div>
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent text-(--text-main) text-3xl font-expanded font-black focus:outline-none placeholder-(--text-dim) uppercase"
                placeholder="WHERE TO?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                onClick={onClose}
                className="w-12 h-12 flex items-center justify-center bg-(--bg-main) border-2 border-(--border-dim) rounded-2xl hover:bg-red-500 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div
              ref={scrollRef}
              className="overflow-y-auto custom-scrollbar bg-(--bg-main) flex-1"
            >
              {renderResults()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
