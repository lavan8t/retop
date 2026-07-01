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
import { UpcomingClass, CAMPUS_SLOTS, CAMPUS_SLOT_TIMINGS } from "../utils/timetable-slots";
import { motion, AnimatePresence } from "framer-motion";

// Extracted Component Imports
import { SolidStatCard } from "../components/home/SolidStatCard";
import { SolidProgressCard } from "../components/home/SolidProgressCard";
import { ListCard } from "../components/home/ListCard";
import { AttendanceRow, ScheduleRow, AssignmentRow } from "../components/home/HomeRows";
import { EmptyState } from "../components/home/EmptyState";
import { CoursePopup } from "../components/timetable/CoursePopup";
import { Card } from "../components/ui/Card";

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

interface HomeViewProps {
  showProgress: boolean;
  stats: { cgpa: string; credits: string; totalCredits?: string; nonGraded?: string; placement?: string; };
  attendance: CourseSummary[];
  assignments: Assignment[];
  upcoming: UpcomingClass[];
  dayName: string;
  menuCategories: MenuCategory[];
  onNavigate: (link: QuickLink) => void;
  ttCourses: TimetableCourse[]; // Added to pass full timetable
  use24HourTime?: boolean;
  calSemesters?: { id: string; name: string }[];
  calSelectedSem?: string;
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
  ttCourses,
  use24HourTime = true,
  calSemesters = [],
  calSelectedSem = "",
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [attSort, setAttSort] = useState<"asc" | "desc">("asc");
  const [eventFilter, setEventFilter] = useState<"all" | "classes" | "assignments">("all");

  const [selectedCourse, setSelectedCourse] = useState<{
    data: UpcomingClass;
    pos: { x: number; y: number };
  } | null>(null);

  // --- NEW: Recent Links State & Handler ---
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
    }, 150);
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
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      
      // If typing an alphanumeric character and not already focused on an input field
      if (!isInput && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        inputRef.current?.focus();
        // Note: we intentionally do not preventDefault here so the character gets typed into the input
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const progress = (() => {
    const start = new Date("2026-01-05").getTime();
    const end = new Date("2026-05-15").getTime();
    const now = new Date().getTime();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  })();

  const graded = parseFloat(stats.credits);
  const nonGraded = parseFloat(stats.nonGraded || "");
  const isLoaded = !isNaN(graded) && !isNaN(nonGraded);
  const totalEarned = isLoaded ? (graded + nonGraded).toString().replace(/\.0$/, '') : "...";

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

  const getClassesForDate = (date: Date) => {
    const jsDay = date.getDay();
    const dName = jsDay === 0 ? "Sunday" : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][jsDay - 1];
    
    if (!CAMPUS_SLOTS[dName]) return [];
    const dayConfig = CAMPUS_SLOTS[dName];
    
    const tempClasses: { course: any; startCol: number; endCol: number; type: "Theory" | "Lab" }[] = [];
    ttCourses.forEach((course) => {
      const slots = course.slot.split("+").map((s) => s.trim());
      slots.forEach((slot) => {
        let col = dayConfig.Theory.indexOf(slot);
        let type: "Theory" | "Lab" = "Theory";
        
        if (col === -1) {
          col = dayConfig.Lab.indexOf(slot);
          type = "Lab";
        }
        
        if (col !== -1 && CAMPUS_SLOT_TIMINGS[type][col]) {
          tempClasses.push({ course, startCol: col, endCol: col, type });
        }
      });
    });

    tempClasses.sort((a, b) => a.startCol - b.startCol);

    const mergedClasses: typeof tempClasses = [];
    tempClasses.forEach(curr => {
      if (mergedClasses.length === 0) {
        mergedClasses.push(curr);
      } else {
        const last = mergedClasses[mergedClasses.length - 1];
        if (curr.course.title === last.course.title && curr.type === last.type && curr.startCol === last.endCol + 1) {
           last.endCol = curr.endCol;
        } else {
           mergedClasses.push(curr);
        }
      }
    });

    const dayClasses: UpcomingClass[] = mergedClasses.map(m => {
       return {
         course: m.course,
         time: `${CAMPUS_SLOT_TIMINGS[m.type][m.startCol].start} - ${CAMPUS_SLOT_TIMINGS[m.type][m.endCol].end}`,
         status: "Next"
       };
    });

    return dayClasses;
  };

  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i <= 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const monthDisplay = useMemo(() => {
    if (calendarDays.length === 0) return { text: "", semName: "" };
    const startM = calendarDays[0].toLocaleDateString('en-US', { month: 'long' });
    const endM = calendarDays[calendarDays.length - 1].toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    let base = "";
    if (startM === endM.split(' ')[0]) {
      base = endM;
    } else {
      base = `${startM} - ${endM}`;
    }

    const semName = calSemesters.find(s => s.id === calSelectedSem)?.name || "";
    return { text: base, semName };
  }, [calendarDays, calSemesters, calSelectedSem]);

  const todayRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setTimeout(() => {
      if (nowRef.current) {
        nowRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (todayRef.current) {
        todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }, [calendarDays]);

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
  }, [query, flattenedLinks, selectedIndex, activeMenu, onNavigate]);

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-6 py-0 pl-4 pr-0 md:py-0 md:pl-6 md:pr-0 lg:py-0 lg:px-8 overflow-y-auto lg:overflow-hidden bg-(--bg-main) max-w-425 mx-auto relative">
      <div className="hidden lg:flex w-full lg:w-[26%] xl:w-[22%] flex-col shrink-0 h-auto lg:h-full relative z-30 pt-20 md:pt-24 lg:pt-28 pb-4 md:pb-6 lg:pb-8 gap-4">
        <Card
          onMouseEnter={handleMenuEnter}
          onMouseLeave={handleMenuLeave}
          className="bg-(--bg-highlight) rounded-4xl flex flex-col h-[50vh] lg:h-[55%] overflow-hidden min-h-0 w-full shrink-0 relative z-30"
        >
          {/* Professional Search Header */}
          <div className="bg-(--bg-surface) px-4 py-3 border-b-4 border-(--border-main) flex justify-between items-center shrink-0 z-10 gap-3">
            <div className="w-9 h-9 bg-(--accent-base) text-(--text-inverse) flex items-center justify-center font-bold border-4 border-(--border-main) rounded-xl shadow-none shrink-0">
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
              className="bg-transparent text-lg font-expanded font-black text-(--text-main) focus:outline-none w-full placeholder-(--text-muted)  uppercase"
            />
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-(--bg-highlight)">
            {query ? (
              flattenedLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-(--text-dim)">
                  <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
                  <span className="font-expanded text-sm uppercase  text-(--text-muted)">
                    No Matches
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {flattenedLinks.map((link, i) => {
                    const isSelected = i === selectedIndex;
                    return (
                      <button
                        key={i}
                        id={`home-search-item-${i}`}
                        onClick={() => handleNavigate(link)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`
                          w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center gap-3 border-4
                          ${
                            isSelected
                              ? "bg-(--accent-base) text-(--text-inverse) border-(--border-main) shadow-none -translate-y-px"
                              : "bg-(--bg-surface) border-transparent text-(--text-muted) hover:border-(--border-dim) hover:text-(--text-main)"
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
                  })}
                </div>
              )
            ) : (
              <div className="flex flex-col gap-3 pb-2">
                {/* RECENT SECTION (Max 4, Pill Grid, No Headings) */}
                {recentLinks.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-1">
                    {recentLinks.slice(0, 4).map((link, i) => {
                      const RecentIcon = getCategoryIcon(
                        link.category || link.title,
                      );
                      return (
                        <button
                          key={`recent-${i}`}
                          onClick={() => handleNavigate(link)}
                          title={link.title}
                          className="flex items-center gap-2 p-1 pr-3 rounded-full border-4 bg-(--bg-surface) border-transparent text-(--text-main) hover:border-(--border-main) hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--shadow-main)] transition-all group overflow-hidden"
                        >
                          <div className="w-7 h-7 rounded-full bg-(--bg-highlight) flex items-center justify-center shrink-0 group-hover:bg-(--accent-base) transition-colors border border-(--border-dim) group-hover:border-transparent">
                            <RecentIcon className="w-3.5 h-3.5 text-(--text-muted) group-hover:text-(--text-inverse)" />
                          </div>
                          <span className="text-[10px] font-bold truncate flex-1 text-left">
                            {link.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* CATEGORIES SECTION (No Headings) */}
                <div className="space-y-1.5">
                  {menuCategories.map((cat, catIdx) => {
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
                          });
                        }}
                        onMouseEnter={(e) => {
                          setSelectedIndex(0);
                          setActiveMenu({
                            cat,
                            rect: e.currentTarget.getBoundingClientRect(),
                          });
                        }}
                        className={`flex w-full items-center justify-between p-2 rounded-3xl border-4 transition-all duration-150 group 
                          ${
                            isActive
                              ? `bg-(--accent-base) border-(--border-main) shadow-none -translate-y-0.5 text-(--text-inverse)`
                              : `bg-(--bg-surface) border-transparent hover:shadow-[6px_6px_0px_0px_var(--shadow-main)] hover:-translate-y-0.5 text-(--text-main)`
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            <CatIcon
                              className={`w-5 h-5 transition-colors ${isActive ? "text-(--text-inverse)" : "text-(--text-muted) group-hover:text-(--accent-base)"}`}
                            />
                          </div>
                          <span
                            className={`font-expanded font-black text-[10px] uppercase  text-left mt-0.5 transition-colors ${isActive ? "text-(--text-inverse)" : "text-(--text-main) group-hover:text-(--accent-base)"}`}
                          >
                            {cat.title}
                          </span>
                        </div>
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-all ${isActive ? "opacity-100 translate-x-0 text-(--text-inverse)" : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-(--text-muted) group-hover:text-(--accent-base)"}`}
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Attendance Compact Box */}
        <div className="flex-1 overflow-visible flex flex-col min-h-0 pb-2">
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
                className="flex items-center justify-center p-1.5 bg-transparent hover:bg-black/10 rounded-lg transition-colors text-(--text-main) active:scale-95"
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
            className={`fixed z-200 bg-(--bg-surface) border-4 border-(--border-main) rounded-2xl shadow-[6px_6px_0px_0px_var(--shadow-main)] p-3 flex flex-col`}
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
            {/* Category Title Header */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-(--border-dim) px-1 shrink-0">
               <span className="font-expanded font-black uppercase text-[11px] text-(--accent-base)">{activeMenu.cat.title}</span>
            </div>

            <div
              className={`grid ${activeMenu.cat.links.length > 20 ? "grid-cols-3" : activeMenu.cat.links.length > 10 ? "grid-cols-2" : "grid-cols-1"} gap-1 overflow-y-auto custom-scrollbar`}
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
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-colors shrink-0 ${
                      i === selectedIndex
                        ? "bg-(--text-inverse)"
                        : "bg-(--border-main) group-hover:bg-(--accent-base)"
                    }`}
                  />
                  <span className="flex-1 truncate">{link.title}</span>
                  {i === selectedIndex && (
                    <CornerDownRight className="w-3 h-3 shrink-0 opacity-80" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTER PANE: Surface Level Unified Event Calendar */}
      <div className="flex-none lg:flex-1 w-full flex flex-col gap-6 md:gap-8 overflow-hidden pt-1 pl-1 md:pl-0 min-h-0">
        <div className="flex flex-col items-center mb-2 lg:mb-4 px-2 w-full relative z-20 pointer-events-auto pt-20 md:pt-24 lg:pt-28">
          <div className="flex flex-col items-stretch">
            {/* Month Header */}
            <div className="flex justify-between items-center mb-6 px-4">
              <div className="text-[10px] md:text-xs font-black font-expanded uppercase text-(--text-main) tracking-[0.2em] pointer-events-none">
                {monthDisplay.text}
              </div>
              {monthDisplay.semName && (
                <div className="text-[9px] md:text-[10px] font-black font-expanded uppercase tracking-[0.2em] relative pointer-events-none text-right">
                  <span className="text-(--text-muted) opacity-50">{monthDisplay.semName}</span>
                  <span 
                    className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-(--accent-base)" 
                    style={{ width: `${progress}%` }}
                  >
                    {monthDisplay.semName}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); setEventFilter("all"); }}
                className={`flex-1 px-4 py-1.5 text-[10px] md:text-xs font-bold uppercase transition-all duration-300 ${
                  eventFilter === "all"
                    ? "bg-(--text-main) text-(--bg-main) rounded-[20px] shadow-none"
                    : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) rounded-l-[20px] rounded-r-[6px] shadow-none"
                }`}
              >
                All
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEventFilter("classes"); }}
                className={`flex-1 px-4 py-1.5 text-[10px] md:text-xs font-bold uppercase transition-all duration-300 ${
                  eventFilter === "classes"
                    ? "bg-(--text-main) text-(--bg-main) rounded-[20px] shadow-none"
                    : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) rounded-[6px] shadow-none"
                }`}
              >
                Classes
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEventFilter("assignments"); }}
                className={`flex-1 px-4 py-1.5 text-[10px] md:text-xs font-bold uppercase transition-all duration-300 ${
                  eventFilter === "assignments"
                    ? "bg-(--text-main) text-(--bg-main) rounded-[20px] shadow-none"
                    : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) rounded-l-[6px] rounded-r-[20px] shadow-none"
                }`}
              >
                Tasks
              </button>
            </div>
          </div>
        </div>

        {/* Surface level list (no card wrapper) */}
        <div 
          className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-3 pb-32 pt-[150px] -mt-[120px] -mb-12 relative z-0 pointer-events-auto"
          style={{ maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)" }}
        >
          {calendarDays.map((d, dIdx) => {
            const isToday = d.toDateString() === new Date().toDateString();
            
            // Get classes for this specific date
            const classesForDay = getClassesForDate(d);
            
            // Map into the unified event structure expected by rendering
            const dayEvents: Array<{ type: 'class'; data: UpcomingClass } | { type: 'assignment'; data: Assignment }> = [];
            
            if (eventFilter === "all" || eventFilter === "classes") {
               classesForDay.forEach(c => dayEvents.push({ type: 'class', data: c }));
            }
            if (eventFilter === "all" || eventFilter === "assignments") {
               // Assuming assignments don't have strict dates in this data model, we'll just show them today for now or map properly if they had dates
               // Since they don't have strict dates in the mock, we only attach them to 'today'
               if (isToday) {
                 assignments.forEach(a => dayEvents.push({ type: 'assignment', data: a }));
               }
            }
            
            if (dayEvents.length === 0) {
              return isToday ? <div key={dIdx} ref={todayRef} /> : null;
            }

            const currentHour = new Date().getHours();
            
            const eventsWithStatus = dayEvents.map(evt => {
              let isDone = false;
              if (isToday) {
                if (evt.type === 'class') {
                  const timeParts = evt.data.time.split('-');
                  const endHour = timeParts.length > 1 ? parseInt(timeParts[1]) : parseInt(timeParts[0]);
                  isDone = currentHour > endHour;
                } else if (evt.type === 'assignment') {
                  isDone = evt.data.status === "submitted";
                }
              } else if (d < new Date(new Date().setHours(0,0,0,0))) {
                isDone = true;
              }
              return { ...evt, isDone };
            });

            const doneEvents = eventsWithStatus.filter(e => e.isDone);
            const upcomingEvents = eventsWithStatus.filter(e => !e.isDone);

            return (
              <div key={dIdx} className="mb-4 flex gap-3 relative" ref={isToday ? todayRef : null}>
                {/* Date indicator on the left */}
                <div className="flex flex-col items-center shrink-0 w-12 pt-1 sticky top-4 h-fit z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mb-0.5 ${isToday ? 'bg-(--accent-base) text-(--text-inverse)' : 'text-(--text-main)'}`}>
                    {d.getDate()}
                  </div>
                  <div className={`text-[9px] font-expanded font-bold uppercase ${isToday ? 'text-(--accent-base)' : 'text-(--text-muted)'}`}>
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                </div>

                {/* Events list on the right */}
                <div className="flex flex-col gap-3 flex-1 min-w-0 pb-4 border-l-2 border-(--border-dim) pl-4">
                  {doneEvents.map((evt, i) => (
                    <div key={`done-${i}`} className="opacity-50 grayscale-[50%] pointer-events-none transition-all">
                      {evt.type === 'class' ? 
                        <ScheduleRow 
                           item={evt.data as UpcomingClass} 
                           onClick={() => {}}
                           use24HourTime={use24HourTime}
                        /> : 
                        <AssignmentRow assignment={evt.data as Assignment} />
                      }
                    </div>
                  ))}

                  {isToday && doneEvents.length > 0 && upcomingEvents.length > 0 && (
                    <div ref={nowRef} className="flex items-center gap-2 my-1 relative -ml-6 scroll-mt-32">
                      <div className="w-4 h-px bg-(--accent-base)"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-(--accent-base) shrink-0"></div>
                      <div className="h-px flex-1 bg-gradient-to-r from-(--accent-base) to-transparent opacity-50"></div>
                      <span className="text-[8px] font-expanded font-black text-(--accent-base) uppercase absolute left-8 -top-3.5 bg-(--bg-main) px-1">Now</span>
                    </div>
                  )}
                  {isToday && doneEvents.length === 0 && upcomingEvents.length > 0 && (
                    <div ref={nowRef} className="flex items-center gap-2 mb-1 relative -ml-6 scroll-mt-32">
                      <div className="w-4 h-px bg-(--accent-base)"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-(--accent-base) shrink-0"></div>
                      <div className="h-px flex-1 bg-gradient-to-r from-(--accent-base) to-transparent opacity-50"></div>
                      <span className="text-[8px] font-expanded font-black text-(--accent-base) uppercase absolute left-8 -top-3.5 bg-(--bg-main) px-1">Now</span>
                    </div>
                  )}

                  {upcomingEvents.map((evt, i) => (
                    <div key={`upcoming-${i}`}>
                      {evt.type === 'class' ? 
                        <ScheduleRow 
                           item={evt.data as UpcomingClass} 
                           onClick={(e, item) => {
                             e.stopPropagation();
                             setSelectedCourse({ data: item, pos: { x: e.clientX, y: e.clientY } });
                           }}
                           use24HourTime={use24HourTime}
                        /> : 
                        <AssignmentRow assignment={evt.data as Assignment} />
                      }
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="hidden lg:flex w-full lg:w-[24%] xl:w-[20%] flex-col shrink-0 h-auto lg:h-full relative z-30 pt-20 md:pt-24 lg:pt-28 pb-4 md:pb-6 lg:pb-8 pr-4 md:pr-6 lg:pr-0">
        <Card 
          initial="rest"
          whileHover="hover"
          animate="rest"
          className="shrink-0 h-auto bg-(--bg-highlight) rounded-4xl p-5 flex flex-col relative z-30 cursor-default overflow-hidden"
        >
           {/* Persistent CGPA */}
           <motion.div 
             variants={{ rest: { y: 0 }, hover: { y: -4 } }}
             transition={{ type: "spring", stiffness: 400, damping: 25 }}
             className="flex flex-col relative z-10"
           >
             <div className="flex items-center justify-between">
               <GraduationCap className="w-10 h-10 text-(--text-main) mix-blend-overlay opacity-80" />
               <div className="text-right">
                 <div className="text-[10px] font-expanded font-bold uppercase text-(--text-muted)">CGPA</div>
                 <div className="text-3xl font-black font-expanded leading-none">{stats.cgpa}</div>
               </div>
             </div>
             <div className="h-0.5 w-full bg-(--border-main) my-5"></div>
           </motion.div>

           {/* Resting Combined View */}
           <motion.div 
             variants={{ 
               rest: { height: "auto", opacity: 1 }, 
               hover: { height: 0, opacity: 0 } 
             }}
             transition={{ type: "spring", stiffness: 400, damping: 30 }}
             className="flex items-center justify-between overflow-hidden relative z-10"
           >
             <Coins className="w-10 h-10 text-(--text-main) mix-blend-overlay opacity-80 shrink-0" />
             <div className="text-right">
               <div className="text-[10px] font-expanded font-bold uppercase text-(--text-muted)">Credits</div>
               <div className="text-3xl font-black font-expanded leading-none whitespace-nowrap">
                 {totalEarned} <span className="text-xl text-(--text-muted)">/ {stats.totalCredits || "..."}</span>
               </div>
             </div>
           </motion.div>

           {/* Expanded Split View */}
           <motion.div
             variants={{
               rest: { height: 0, opacity: 0 },
               hover: { height: "auto", opacity: 1 }
             }}
             transition={{ type: "spring", stiffness: 400, damping: 30 }}
             className="flex flex-col overflow-hidden relative z-10"
           >
             <div className="flex flex-col items-center w-full pt-1">
               <div className="text-[10px] font-expanded font-bold uppercase text-(--text-muted) mb-3">
                 Credits
               </div>
               
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-2 text-3xl font-black font-expanded leading-none">
                   <span>{stats.credits}</span>
                   <span className="text-xl text-(--text-muted)">+</span>
                   <span>{stats.nonGraded}</span>
                 </div>
                 
                 <div className="h-1 w-full min-w-[120px] bg-(--border-main) rounded-full my-2.5"></div>
                 
                 <div className="text-3xl font-black font-expanded leading-none">
                   {stats.totalCredits}
                 </div>
               </div>
               
               {stats.placement && (
                 <div className={`mt-6 text-[10px] font-black uppercase tracking-widest text-center ${stats.placement.toLowerCase().includes('eligible') ? 'text-(--att-safe)' : 'text-(--att-danger)'}`}>
                   {stats.placement}
                 </div>
               )}
             </div>
           </motion.div>
         </Card>
      </div>

      <CoursePopup
        course={selectedCourse?.data.course || null}
        position={selectedCourse?.pos || null}
        attendance={
          attendance?.find((a) => a.code === selectedCourse?.data.course.code)?.attendance
        }
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
};
