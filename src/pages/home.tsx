import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  GraduationCap,
  Coins,
  ListTodo,
  Ghost,
  CalendarDays,
  TrendingUp,
  Search,
  Folder,
  FileText,
  CornerDownRight,
  AlertCircle,
  MapPin,
  Clock,
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
  ChevronDown,
} from "lucide-react";
import {
  CourseSummary,
  Assignment,
  QuickLink,
  MenuCategory,
} from "../types/vtop";
import { UpcomingClass } from "../utils/timetable-slots";
import { motion, AnimatePresence } from "framer-motion";
import { getCourseAcronym } from "../utils/formatting";

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

const SolidStatCard = ({
  title,
  value,
  subtitle,
  bgClass,
  icon: Icon,
}: any) => (
  <div
    className={`
      ${bgClass} border-4 border-black rounded-3xl p-5 
      shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] 
      transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
      hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]
      relative overflow-hidden group h-full flex flex-col justify-center min-h-[120px]
    `}
  >
    <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:opacity-30 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 pointer-events-none">
      <Icon className="w-28 h-28 text-black" />
    </div>
    <div className="relative z-10 flex flex-col justify-center h-full">
      <h3 className="text-black font-bold font-expanded uppercase tracking-widest text-xs border-b-2 border-black/20 pb-1 w-fit mb-1">
        {title}
      </h3>
      <div className="text-4xl md:text-5xl font-black font-expanded text-black tracking-tighter leading-none drop-shadow-sm">
        {value}
      </div>
      {subtitle && (
        <p className="text-[10px] font-bold font-mono text-black/60 uppercase mt-1 tracking-wide">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

const SolidProgressCard = ({ progress }: { progress: number }) => (
  <div
    className={`
      bg-cyan-400 border-4 border-black rounded-3xl p-5 
      shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] 
      transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
      hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]
      relative overflow-hidden group h-full flex flex-col justify-center min-h-[120px]
    `}
  >
    <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:opacity-30 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 pointer-events-none">
      <TrendingUp className="w-28 h-28 text-black" />
    </div>

    <div className="relative z-10 w-full h-full flex flex-col justify-center gap-2">
      <div className="flex justify-between items-end">
        <h3 className="text-black font-bold font-expanded uppercase tracking-widest text-xs border-b-2 border-black/20 pb-1">
          Semester Progress
        </h3>
        <span className="font-black text-2xl text-black leading-none">
          {progress}%
        </span>
      </div>

      <div className="w-full mt-1">
        <div className="w-full h-3 bg-black/10 border-2 border-black/20 rounded-full overflow-hidden mb-1">
          <motion.div
            className="h-full bg-black rounded-full opacity-80"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }}
          ></motion.div>
        </div>
        <div className="flex justify-between text-[9px] font-bold font-mono text-black/50 uppercase">
          <span>Start: Jan</span>
          <span>Target: May</span>
        </div>
      </div>
    </div>
  </div>
);

const ListCard = ({ title, count, bgClass, borderClass, children }: any) => (
  <div
    className={`
      bg-[var(--bg-highlight)] border-4 ${borderClass} rounded-[2rem] 
      shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] 
      flex flex-col h-full overflow-hidden min-h-[250px]
      transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]
    `}
  >
    <div
      className={`${bgClass} px-5 py-3 border-b-4 border-black flex justify-between items-center shrink-0`}
    >
      <h3 className="font-expanded font-black text-lg text-black uppercase tracking-tighter flex items-center gap-2 m-0 leading-none">
        {title}
      </h3>
      {count !== undefined && (
        <span className="text-[10px] font-black font-mono text-black bg-white/40 px-2 py-0.5 rounded-lg border-2 border-black/10">
          {count}
        </span>
      )}
    </div>

    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-[var(--bg-highlight)]">
      {children}
    </div>
  </div>
);

const AttendanceRow = ({ course }: { course: CourseSummary }) => {
  const val = parseFloat(course.attendance);
  let statusColor = "bg-lime-400 text-black border-lime-500/50";
  if (isNaN(val)) statusColor = "bg-zinc-400 text-black border-zinc-500/50";
  else if (val < 75) statusColor = "bg-red-500 text-white border-red-600/50";
  else if (val < 80)
    statusColor = "bg-yellow-400 text-black border-yellow-500/50";

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] hover:border-[var(--text-dim)] transition-all group">
      <div className="min-w-0 flex-1 pr-3">
        <div className="text-xs font-bold text-[var(--text-main)] truncate">
          {course.name}
        </div>
        <div className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5 truncate uppercase">
          {course.code}
        </div>
      </div>
      <div
        className={`px-2.5 py-1.5 rounded-lg font-black font-expanded text-lg border-2 shadow-sm leading-none ${statusColor}`}
      >
        {course.attendance}
      </div>
    </div>
  );
};

const ScheduleRow = ({ item }: { item: UpcomingClass }) => {
  const isLab = item.course.type.includes("Lab");
  return (
    <div className="flex gap-3 p-3 rounded-xl border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] hover:border-blue-500 transition-all group">
      <div className="w-14 shrink-0 flex flex-col items-center justify-center border-r-2 border-[var(--border-dim)] pr-3">
        <span className="text-sm font-black font-expanded text-[var(--text-main)] leading-none">
          {item.time}
        </span>
        <span
          className={`text-[8px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded border leading-none ${item.status === "Now" ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse" : "bg-[var(--bg-highlight)] text-[var(--text-muted)] border-[var(--border-main)]"}`}
        >
          {item.status}
        </span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[9px] font-black uppercase px-1.5 rounded border leading-none py-0.5 ${isLab ? "bg-purple-500/20 text-purple-400 border-purple-500/50" : "bg-blue-500/20 text-blue-400 border-blue-500/50"}`}
          >
            {item.course.slot}
          </span>
          <span className="text-xs font-bold text-[var(--text-main)] truncate leading-none mt-0.5">
            {getCourseAcronym(item.course.title)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {item.course.venue}
          </span>
          <span className="flex items-center gap-1 truncate">
            <Clock className="w-3 h-3" />
            50m
          </span>
        </div>
      </div>
    </div>
  );
};

const AssignmentRow = ({ assignment }: { assignment: Assignment }) => (
  <div className="p-3.5 rounded-xl border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] hover:border-blue-500 hover:bg-blue-500/5 transition-all group cursor-default">
    <div className="flex justify-between items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-[var(--text-main)] leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">
          {assignment.title}
        </div>
        <div className="text-[10px] font-mono text-[var(--text-muted)] mt-1.5 truncate">
          {assignment.course}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end">
        <span className="text-[10px] font-bold font-mono text-blue-400 bg-blue-950/30 border border-blue-900/50 px-2 py-1 rounded leading-none">
          {assignment.dueDate}
        </span>
      </div>
    </div>
  </div>
);

const EmptyState = ({
  msg,
  icon: Icon = Ghost,
}: {
  msg: string;
  icon?: any;
}) => (
  <div className="flex flex-col items-center justify-center h-full text-[var(--text-dim)] border-4 border-dashed border-[var(--border-dim)] rounded-2xl p-6 bg-[var(--bg-main)] m-2">
    <Icon className="w-10 h-10 mb-3 opacity-30" />
    <div className="text-xs font-expanded font-bold uppercase tracking-widest text-center opacity-70">
      {msg}
    </div>
  </div>
);

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

  // State for the Flyout Context Menu
  const [activeMenu, setActiveMenu] = useState<{
    cat: MenuCategory;
    rect: DOMRect;
    color: string;
  } | null>(null);

  const catColors = [
    "bg-cyan-400",
    "bg-lime-400",
    "bg-blue-400",
    "bg-purple-400",
    "bg-pink-400",
    "bg-yellow-400",
    "bg-orange-400",
  ];

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Close context menu on scroll or click outside
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
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setActiveMenu(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [query, flattenedLinks, selectedIndex, activeMenu, onNavigate]);

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-6 p-4 md:p-6 lg:p-8 overflow-y-auto lg:overflow-hidden bg-[var(--bg-main)] max-w-[1700px] mx-auto">
      {/* LEFT PANE: Search & Legacy Navigation */}
      <div className="w-full lg:w-[30%] xl:w-[25%] flex flex-col border-4 border-black bg-[var(--bg-surface)] rounded-[2rem] shadow-[8px_8px_0px_0px_#000] overflow-hidden shrink-0 h-[50vh] lg:h-full relative z-30">
        <div className="p-4 border-b-4 border-black bg-[var(--bg-surface)] shrink-0 flex items-center gap-3 relative z-20">
          <div className="w-10 h-10 bg-blue-500 text-white flex items-center justify-center font-bold border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="WHERE TO?"
            className="bg-transparent text-xl font-expanded font-black text-[var(--text-main)] focus:outline-none w-full placeholder-[var(--text-dim)] tracking-tight uppercase"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
              setActiveMenu(null);
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-main)] relative z-10">
          {query ? (
            flattenedLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-[var(--text-dim)]">
                <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
                <span className="font-expanded text-sm uppercase tracking-widest">
                  No Matches
                </span>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {flattenedLinks.map((link, i) => {
                  const isSelected = i === selectedIndex;
                  return (
                    <button
                      key={i}
                      onClick={() => onNavigate(link)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`
                        w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-3 border-2
                        ${
                          isSelected
                            ? "bg-blue-500 text-white border-black shadow-[3px_3px_0px_0px_#000] -translate-y-[1px]"
                            : "bg-[var(--bg-surface)] border-transparent text-[var(--text-muted)] hover:border-[var(--border-dim)]"
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
            <div className="p-3 space-y-1.5">
              {menuCategories.map((cat, catIdx) => {
                const iconColor = catColors[catIdx % catColors.length];
                const CatIcon = getCategoryIcon(cat.title);
                const isActive = activeMenu?.cat.title === cat.title;

                return (
                  <button
                    key={catIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isActive) setActiveMenu(null);
                      else {
                        setSelectedIndex(0);
                        setActiveMenu({
                          cat,
                          rect: e.currentTarget.getBoundingClientRect(),
                          color: iconColor,
                        });
                      }
                    }}
                    className={`w-full bg-transparent p-3 flex items-center justify-between group rounded-2xl transition-all border-2 ${isActive ? "bg-[var(--bg-highlight)] border-[var(--border-main)] shadow-sm" : "border-transparent hover:bg-[var(--bg-surface)] hover:border-[var(--border-dim)]"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000] ${iconColor} group-hover:-translate-y-0.5 group-hover:shadow-[4px_4px_0px_0px_#000] transition-all`}
                      >
                        <CatIcon className="w-4 h-4 text-black" />
                      </div>
                      <h3
                        className={`text-sm font-black tracking-wide mb-0 font-expanded uppercase ${isActive ? "text-[var(--text-main)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-main)]"}`}
                      >
                        {cat.title}
                      </h3>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 transition-transform ${isActive ? "text-blue-500 translate-x-1" : "text-[var(--text-dim)] group-hover:text-[var(--text-muted)]"}`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FLYOUT CONTEXT MENU (Rendered globally over right pane) */}
      <AnimatePresence>
        {activeMenu && (
          <div className="fixed inset-0 z-[200] pointer-events-none">
            {/* Invisible backdrop to catch clicks */}
            <div
              className="absolute inset-0 pointer-events-auto"
              onClick={() => setActiveMenu(null)}
              onWheel={() => setActiveMenu(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: -30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -20 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                mass: 0.8,
              }}
              className={`absolute pointer-events-auto bg-zinc-950/85 backdrop-blur-3xl border-4 border-black rounded-[2rem] shadow-[16px_16px_0px_0px_rgba(0,0,0,0.6)] p-5 flex flex-col`}
              style={{
                left: Math.min(
                  activeMenu.rect.right + 20,
                  window.innerWidth - 300,
                ),
                top: Math.max(
                  20,
                  Math.min(
                    activeMenu.rect.top,
                    window.innerHeight -
                      Math.min(activeMenu.cat.links.length * 50 + 100, 600),
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
              <div className="flex items-center gap-4 mb-4 pb-4 border-b-4 border-zinc-800 shrink-0">
                <div
                  className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000] ${activeMenu.color}`}
                >
                  {React.createElement(getCategoryIcon(activeMenu.cat.title), {
                    className: "w-5 h-5 text-black",
                  })}
                </div>
                <h3 className="font-expanded font-black text-2xl uppercase tracking-tighter text-white mb-0 leading-none">
                  {activeMenu.cat.title}
                </h3>
              </div>

              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
                }}
                initial="hidden"
                animate="show"
                className={`grid ${activeMenu.cat.links.length > 20 ? "grid-cols-3" : activeMenu.cat.links.length > 10 ? "grid-cols-2" : "grid-cols-1"} gap-2 overflow-y-auto custom-scrollbar pr-2`}
              >
                {activeMenu.cat.links.map((link, i) => (
                  <motion.button
                    key={i}
                    variants={{
                      hidden: { opacity: 0, x: -20, scale: 0.9 },
                      show: {
                        opacity: 1,
                        x: 0,
                        scale: 1,
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 20,
                        },
                      },
                    }}
                    onMouseEnter={() => setSelectedIndex(i)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onNavigate(link);
                      setActiveMenu(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-3 group ${i === selectedIndex ? "bg-blue-500 text-white border-black shadow-[3px_3px_0px_0px_#000]" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-colors ${i === selectedIndex ? "bg-white" : "bg-zinc-700 group-hover:bg-blue-500"}`}
                    />
                    <span className="flex-1 truncate">{link.title}</span>
                    {i === selectedIndex && (
                      <CornerDownRight className="w-3 h-3 shrink-0" />
                    )}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RIGHT PANE: Stats & Lists */}
      <div className="flex-1 flex flex-col min-h-0 gap-6 overflow-y-auto lg:overflow-hidden pb-10 lg:pb-0">
        {/* Top Row: Mini Cards (Fixed height on desktop) */}
        <div className="flex flex-col sm:flex-row gap-6 shrink-0 h-auto lg:h-[160px]">
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

        {/* Bottom Row: Tall Lists (Flex 1 fills remaining space) */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          <div className="flex-1 min-h-[350px] lg:min-h-0 h-full flex flex-col">
            <ListCard
              title="Attendance"
              bgClass="bg-yellow-400"
              borderClass="border-yellow-500"
            >
              {attendance.length === 0 ? (
                <EmptyState msg="No Registered Courses" />
              ) : (
                attendance.map((c, i) => <AttendanceRow key={i} course={c} />)
              )}
            </ListCard>
          </div>

          <div className="flex-1 min-h-87.5 lg:min-h-0 h-full flex flex-col">
            <ListCard
              title={`${dayName}`}
              bgClass="bg-pink-400"
              borderClass="border-pink-500"
            >
              {upcoming.length === 0 ? (
                <EmptyState msg="No Classes Scheduled" icon={CalendarDays} />
              ) : (
                upcoming.map((c, i) => <ScheduleRow key={i} item={c} />)
              )}
            </ListCard>
          </div>

          <div className="flex-1 min-h-[350px] lg:min-h-0 h-full flex flex-col">
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
  );
};
