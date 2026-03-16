import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  GraduationCap,
  Coins,
  ListTodo,
  CalendarDays,
  Search,
  FileText,
  CornerDownRight,
  AlertCircle,
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
  ChevronRight,
  ArrowUpDown,
  ArrowUpRight,
} from "lucide-react";
import {
  CourseSummary,
  Assignment,
  QuickLink,
  MenuCategory,
} from "../types/vtop";
import { UpcomingClass } from "../utils/timetable-slots";
import { motion, AnimatePresence } from "framer-motion";

// Extracted Component Imports
import { SolidStatCard } from "../components/home/SolidStatCard";
import { SolidProgressCard } from "../components/home/SolidProgressCard";
import { ListCard } from "../components/home/ListCard";
import {
  AttendanceRow,
  ScheduleRow,
  AssignmentRow,
} from "../components/home/HomeRows";
import { EmptyState } from "../components/home/EmptyState";

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

const catStyles = [
  {
    bg: "bg-cyan-400",
    hover:
      "hover:bg-cyan-400 hover:shadow-[3px_3px_0px_0px_var(--shadow-main)]",
  },
  {
    bg: "bg-lime-400",
    hover:
      "hover:bg-lime-400 hover:shadow-[3px_3px_0px_0px_var(--shadow-main)]",
  },
  {
    bg: "bg-blue-400",
    hover:
      "hover:bg-blue-400 hover:shadow-[3px_3px_0px_0px_var(--shadow-main)]",
  },
  {
    bg: "bg-purple-400",
    hover:
      "hover:bg-purple-400 hover:shadow-[3px_3px_0px_0px_var(--shadow-main)]",
  },
  {
    bg: "bg-pink-400",
    hover:
      "hover:bg-pink-400 hover:shadow-[3px_3px_0px_0px_var(--shadow-main)]",
  },
  {
    bg: "bg-yellow-400",
    hover:
      "hover:bg-yellow-400 hover:shadow-[3px_3px_0px_0px_var(--shadow-main)]",
  },
  {
    bg: "bg-orange-400",
    hover:
      "hover:bg-orange-400 hover:shadow-[3px_3px_0px_0px_var(--shadow-main)]",
  },
];

interface HomeViewProps {
  showProgress: boolean;
  stats: { cgpa: string; credits: string };
  attendance: CourseSummary[];
  assignments: Assignment[];
  upcoming: UpcomingClass[];
  dayName: string;
  menuCategories: MenuCategory[];
  onNavigate: (link: QuickLink) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  showProgress,
  stats,
  attendance,
  assignments,
  upcoming,
  dayName,
  menuCategories,
  onNavigate,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [attSort, setAttSort] = useState<"asc" | "desc">("asc");

  const [activeMenu, setActiveMenu] = useState<{
    cat: MenuCategory;
    rect: DOMRect;
    color: string;
  } | null>(null);

  useEffect(() => {
    // Only auto-focus on desktop
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

  const progress = (() => {
    const start = new Date("2026-01-05").getTime();
    const end = new Date("2026-05-15").getTime();
    const now = new Date().getTime();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  })();

  const flattenedLinks = useMemo(() => {
    if (!query) return [];
    const lowerQ = query.toLowerCase();
    const links: QuickLink[] = [];
    menuCategories.forEach((cat) => links.push(...cat.links));

    return links.filter(
      (l) =>
        l.title.toLowerCase().includes(lowerQ) ||
        (l.category && l.category.toLowerCase().includes(lowerQ)),
    );
  }, [query, menuCategories]);

  const sortedAttendance = useMemo(() => {
    return [...attendance].sort((a, b) => {
      const valA = parseFloat(a.attendance) || 0;
      const valB = parseFloat(b.attendance) || 0;
      return attSort === "asc" ? valA - valB : valB - valA;
    });
  }, [attendance, attSort]);

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
          onNavigate(currentList[selectedIndex]);
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
  }, [query, flattenedLinks, selectedIndex, activeMenu, onNavigate]);

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-6 py-4 pl-4 pr-0 md:py-6 md:pl-6 md:pr-0 lg:p-8 pb-20 lg:pb-8 overflow-y-auto lg:overflow-hidden bg-(--bg-main) max-w-425 mx-auto relative">
      {/* LEFT PANE: Omnibox Instance (HIDDEN ON MOBILE, VISIBLE ON DESKTOP `lg`) */}
      <div className="hidden lg:flex w-full lg:w-[26%] xl:w-[20%] flex-col shrink-0 h-auto lg:h-full relative z-30 pt-1">
        <motion.div
          initial={{ boxShadow: "6px 6px 0px 0px var(--shadow-main)" }}
          whileHover={{
            y: -6,
            boxShadow: "10px 10px 0px 0px var(--shadow-main)",
          }}
          transition={{
            default: { type: "spring", stiffness: 400, damping: 25 },
            boxShadow: { type: "tween", duration: 0.3 },
          }}
          className="bg-(--bg-highlight) border-4 border-purple-500 rounded-4xl flex flex-col h-[50vh] lg:h-full overflow-hidden min-h-0 lg:min-h-62.5 w-full shrink-0 relative z-30"
        >
          {/* Card Header matching ListCard but with Search Input */}
          <div className="bg-purple-400 px-4 py-3 border-b-4 border-black flex justify-between items-center shrink-0 z-10 gap-3">
            <div className="w-9 h-9 bg-blue-500 text-white flex items-center justify-center font-bold border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_var(--shadow-main)] shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="WHERE TO?"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
                setActiveMenu(null);
              }}
              className="bg-transparent text-lg font-expanded font-black text-black focus:outline-none w-full placeholder-black/60 tracking-tight uppercase"
            />
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar bg-(--bg-highlight)">
            {query ? (
              flattenedLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-(--text-dim)">
                  <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
                  <span className="font-expanded text-sm uppercase tracking-widest">
                    No Matches
                  </span>
                </div>
              ) : (
                flattenedLinks.map((link, i) => {
                  const isSelected = i === selectedIndex;
                  return (
                    <button
                      key={i}
                      id={`home-search-item-${i}`}
                      onClick={() => onNavigate(link)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`
                        w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center gap-3 border-2
                        ${
                          isSelected
                            ? "bg-blue-500 text-white border-black shadow-[3px_3px_0px_0px_var(--shadow-main)] -translate-y-px"
                            : "bg-(--bg-surface) border-transparent text-(--text-muted) hover:border-(--border-dim)"
                        }
                      `}
                    >
                      <FileText
                        className={`w-4 h-4 shrink-0 ${isSelected ? "opacity-100" : "opacity-50"}`}
                      />
                      <span className="flex-1 truncate">{link.title}</span>
                      {isSelected && (
                        <CornerDownRight className="w-4 h-4 shrink-0" />
                      )}
                    </button>
                  );
                })
              )
            ) : (
              menuCategories.map((cat, catIdx) => {
                const style = catStyles[catIdx % catStyles.length];
                const CatIcon = getCategoryIcon(cat.title);
                const isActive = activeMenu?.cat.title === cat.title;

                return (
                  <motion.button
                    key={catIdx}
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(0);
                      setActiveMenu({
                        cat,
                        rect: e.currentTarget.getBoundingClientRect(),
                        color: style.bg,
                      });
                    }}
                    className={`flex w-full items-center justify-between p-2 rounded-3xl border-2 transition-all duration-150 group 
                      ${isActive ? `${style.bg} border-black shadow-[3px_3px_0px_0px_var(--shadow-main)] -translate-y-0.5 text-black` : `border-transparent hover:border-black hover:-translate-y-0.5 text-(--text-main) ${style.hover}`}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <CatIcon
                          className={`w-5 h-5 transition-colors ${isActive ? "text-black" : "text-(--text-main) group-hover:text-black"}`}
                        />
                      </div>
                      <span
                        className={`font-expanded font-black text-[10px] uppercase tracking-wider text-left mt-0.5 transition-colors ${isActive ? "text-black" : "group-hover:text-black"}`}
                      >
                        {cat.title}
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-all ${isActive ? "opacity-100 translate-x-0 text-black" : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-(--text-main) group-hover:text-black"}`}
                    />
                  </motion.button>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {activeMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -10 }}
            transition={{ type: "spring", stiffness: 600, damping: 35 }}
            className={`fixed z-200 bg-zinc-950/85 backdrop-blur-3xl border-4 border-black rounded-4xl shadow-[16px_16px_0px_0px_rgba(0,0,0,0.6)] p-3 flex flex-col`}
            style={{
              left: Math.min(
                activeMenu.rect.right + 12,
                window.innerWidth - 300,
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
                      45 -
                    30,
                ),
              ),
              maxHeight: "calc(100vh - 40px)",
              width:
                activeMenu.cat.links.length > 20
                  ? "750px"
                  : activeMenu.cat.links.length > 10
                    ? "550px"
                    : "320px",
              maxWidth: "calc(100vw - 40px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`grid ${activeMenu.cat.links.length > 20 ? "grid-cols-3" : activeMenu.cat.links.length > 10 ? "grid-cols-2" : "grid-cols-1"} gap-1.5 overflow-y-auto custom-scrollbar`}
            >
              {activeMenu.cat.links.map((link, i) => (
                <button
                  key={i}
                  id={`home-popup-item-${i}`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => {
                    onNavigate(link);
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-3 group ${i === selectedIndex ? "bg-blue-500 text-white border-black shadow-[2px_2px_0px_0px_var(--shadow-main)]" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"}`}
                >
                  <div
                    className={`w-2 h-2 rounded-full transition-colors shrink-0 ${i === selectedIndex ? "bg-white" : "bg-zinc-700 group-hover:bg-blue-500"}`}
                  />
                  <span className="flex-1 truncate">{link.title}</span>
                  {i === selectedIndex && (
                    <CornerDownRight className="w-3 h-3 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT PANE: Main Content Grid */}
      <div className="flex-none lg:flex-1 w-full flex flex-col lg:flex-row gap-6 overflow-visible pt-2 -mt-2 pl-1 pr-4 md:pr-6 lg:pr-0 lg:px-0 -ml-1 lg:ml-0">
        {/* Attendance Column */}
        <div className="w-full lg:w-[40%] xl:w-[35%] flex flex-col shrink-0 h-auto lg:h-full pt-1">
          <ListCard
            title="Attendance"
            bgClass="bg-yellow-400"
            borderClass="border-yellow-500"
            headerAction={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAttSort((prev) => (prev === "asc" ? "desc" : "asc"));
                }}
                className="flex items-center justify-center p-1.5 bg-black/10 hover:bg-black/20 rounded-lg transition-colors text-black active:scale-95"
                title="Toggle Sort Order"
              >
                <ArrowUpDown
                  className={`w-4 h-4 transition-transform ${attSort === "asc" ? "rotate-180" : ""}`}
                />
              </button>
            }
          >
            {sortedAttendance.length === 0 ? (
              <EmptyState msg="No Registered Courses" />
            ) : (
              sortedAttendance.map((c, i) => (
                <AttendanceRow key={i} course={c} />
              ))
            )}
          </ListCard>
        </div>

        {/* Stats & Tall Lists Column */}
        <div className="flex-none lg:flex-1 flex flex-col gap-6 lg:min-h-0 pt-1">
          {/* Top Row: Mini Cards */}
          <div className="flex flex-col sm:flex-row gap-6 shrink-0 h-auto lg:h-37.5">
            <div className="flex-1 h-full">
              {showProgress ? (
                <SolidProgressCard progress={progress} />
              ) : (
                <SolidStatCard
                  title="CGPA"
                  value={stats.cgpa}
                  subtitle="Cumulative"
                  bgClass="bg-cyan-400"
                  icon={GraduationCap}
                />
              )}
            </div>
            <div className="flex-1 h-full">
              <SolidStatCard
                title="Credits"
                value={stats.credits}
                subtitle="Earned"
                bgClass="bg-lime-400"
                icon={Coins}
              />
            </div>
          </div>

          {/* Bottom Row: Schedule & Assignments */}
          <div className="flex-none lg:flex-1 flex flex-col sm:flex-row gap-6 lg:min-h-0">
            <div className="flex-1 h-auto lg:h-full flex flex-col">
              <ListCard
                title={`${dayName}`}
                bgClass="bg-pink-400"
                borderClass="border-pink-500"
                onClick={() =>
                  onNavigate({
                    title: "Time Table",
                    url: "studenttimetable",
                    category: "Core",
                  })
                }
                headerAction={
                  <ArrowUpRight className="w-5 h-5 text-black opacity-60 group-hover:opacity-100 transition-opacity" />
                }
              >
                {upcoming.length === 0 ? (
                  <EmptyState msg="No Classes Scheduled" icon={CalendarDays} />
                ) : (
                  upcoming.map((c, i) => <ScheduleRow key={i} item={c} />)
                )}
              </ListCard>
            </div>

            <div className="flex-1 h-auto lg:h-full flex flex-col">
              <ListCard
                title="Assignments"
                count={assignments.length}
                bgClass="bg-blue-400"
                borderClass="border-blue-500"
              >
                {assignments.length === 0 ? (
                  <EmptyState msg="All Caught Up!" icon={ListTodo} />
                ) : (
                  assignments.map((a, i) => (
                    <AssignmentRow key={i} assignment={a} />
                  ))
                )}
              </ListCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
