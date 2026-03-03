import React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  RefreshCw,
  LayoutGrid,
  List,
  Calendar,
  Menu,
  BookOpen,
  GraduationCap,
  User,
  Settings,
} from "lucide-react";
import { QuickLink, Semester, TimetableCourse } from "../../types/vtop";
import { SemesterDropdown } from "../timetable/SemesterDropdown";
import { ProfileMenu } from "../profile-menu";

interface TopBarProps {
  currentView: string;
  contentTitle: string;
  status: string;
  ttCourses: TimetableCourse[];
  ttLoading: boolean;
  ttSemesters: Semester[];
  ttSelectedSem: string;
  ttViewMode: "grid" | "list" | "week";
  setTtViewMode: (mode: "grid" | "list" | "week") => void;
  loadTimetable: (semId: string) => void;
  user: { name: string; regNo: string };
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  handleLinkClick: (link: QuickLink) => void;
  handleLogout: () => void;
  setIsModernUI: (modern: boolean) => void;
  setIsOmniboxOpen: (open: boolean) => void;
  setCurrentView: (view: any) => void;
}

const favoriteLinks = [
  {
    title: "Time Table",
    url: "studenttimetable",
    category: "Core",
    icon: Calendar,
    color: "bg-purple-400",
  },
  {
    title: "Curriculum",
    url: "curriculum",
    category: "Core",
    icon: BookOpen,
    color: "bg-blue-400",
  },
  {
    title: "Marks",
    url: "mark",
    category: "Core",
    icon: GraduationCap,
    color: "bg-lime-400",
  },
  {
    title: "Profile",
    url: "studentprofileallview",
    category: "Core",
    icon: User,
    color: "bg-yellow-400",
  },
  {
    title: "Settings",
    url: "#settings",
    category: "System",
    icon: Settings,
    color: "bg-pink-400",
  },
];

const getPageTitle = (view: string, dynamicTitle?: string) => {
  switch (view) {
    case "dashboard":
      return "home";
    case "timetable":
      return "TIMETABLE";
    case "curriculum":
      return "CURRICULUM";
    case "marks":
      return "MARKS";
    case "profile":
      return "STUDENT PROFILE";
    case "settings":
      return "PREFERENCES";
    case "content":
      return dynamicTitle || "CONTENT";
    default:
      return "VTOP";
  }
};

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  contentTitle,
  status,
  ttCourses,
  ttLoading,
  ttSemesters,
  ttSelectedSem,
  ttViewMode,
  setTtViewMode,
  loadTimetable,
  user,
  showProfileMenu,
  setShowProfileMenu,
  handleLinkClick,
  handleLogout,
  setIsModernUI,
  setIsOmniboxOpen,
  setCurrentView,
}) => {
  return (
    <header className="h-20 bg-(--bg-main) border-b-4 border-(--border-main) sticky top-0 z-100 px-6 md:px-8 flex items-center justify-between shadow-xl shrink-0">
      <div
        className="flex items-center gap-4 group cursor-pointer h-full"
        onClick={() => setCurrentView("dashboard")}
      >
        {currentView !== "dashboard" && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentView("dashboard");
            }}
            className="w-10 h-10 flex items-center justify-center bg-(--bg-surface) border-2 border-(--border-dim) rounded-lg text-(--text-muted) hover:text-(--text-main) hover:border-(--accent-base) transition-all active:scale-90 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        )}
        <div className="flex flex-col justify-center h-full gap-0.5">
          <div className="flex items-center gap-3">
            {/* INVISIBLE PLACEHOLDER: Reserves exact space for the fixed re. logo */}
            <div className="relative flex items-baseline opacity-0 select-none pointer-events-none">
              <span className="font-expanded font-black text-[2.5rem] tracking-tighter italic lowercase leading-none">
                re
              </span>
              <div className="relative w-3.5 h-3.5 ml-0.5 mb-1" />
            </div>

            {currentView !== "dashboard" && (
              <h1 className="font-expanded font-black text-3xl text-(--text-main) tracking-tight uppercase truncate max-w-50 sm:max-w-[40vw] leading-none mt-1 mb-0 ml-2 pl-3 border-l-4 border-(--border-dim)">
                {getPageTitle(currentView, contentTitle)}
              </h1>
            )}
          </div>
          {currentView === "timetable" && (
            <p className="text-[9px] text-(--text-muted) font-bold uppercase tracking-widest mt-0.5 ml-18 mb-0">
              {ttCourses.length} COURSES REGISTERED
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 pointer-events-auto">
        {currentView === "dashboard" && (
          <div className="hidden xl:flex items-center gap-2.5 mr-4">
            {favoriteLinks.map((link, idx) => (
              <button
                key={idx}
                onClick={() => handleLinkClick(link as QuickLink)}
                className={`flex items-center gap-2 px-3.5 py-1.5 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] active:translate-y-0 active:shadow-none transition-all font-black font-expanded text-xs tracking-wide uppercase text-black ${link.color} cursor-pointer`}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.title}</span>
              </button>
            ))}
            <div className="w-1 h-8 bg-(--border-dim) rounded-full mx-2"></div>
          </div>
        )}

        {currentView === "timetable" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 mr-2"
          >
            {ttLoading && (
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
            )}
            <SemesterDropdown
              semesters={ttSemesters}
              selectedId={ttSelectedSem}
              onChange={loadTimetable}
            />
            <div className="flex bg-(--bg-surface) border-2 border-(--border-dim) rounded-xl p-1 gap-1">
              <button
                onClick={() => setTtViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${ttViewMode === "grid" ? "bg-(--accent-base) text-white shadow-sm" : "text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight)"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTtViewMode("list")}
                className={`p-1.5 rounded-lg transition-all ${ttViewMode === "list" ? "bg-(--accent-base) text-white shadow-sm" : "text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight)"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTtViewMode("week")}
                className={`p-1.5 rounded-lg transition-all ${ttViewMode === "week" ? "bg-(--accent-base) text-white shadow-sm" : "text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight)"}`}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
            <div className="w-0.5 h-8 bg-(--border-dim) mx-1"></div>
          </motion.div>
        )}

        {currentView !== "dashboard" && (
          <button
            onClick={() => setIsOmniboxOpen(true)}
            className="hidden lg:flex items-center gap-3 px-3 py-2 bg-(--bg-surface) border-2 border-(--border-main) rounded-full text-(--text-muted) hover:border-(--accent-base) hover:text-(--text-main) transition-all group shadow-lg active:scale-95 cursor-pointer"
          >
            <Menu className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="font-bold text-xs tracking-widest uppercase">
              Menu
            </span>
            <kbd className="ml-2 font-mono bg-(--bg-highlight) text-(--text-muted) px-2 py-0.5 text-[10px] rounded-lg border border-(--border-dim) group-hover:text-(--text-main) group-hover:border-(--border-main)">
              /
            </kbd>
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 focus:outline-none group cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-(--text-main) uppercase tracking-wider group-hover:text-(--accent-hover) transition-colors">
                {user.name !== "Student" ? user.name : user.regNo}
              </div>
              {user.name !== "Student" && (
                <div className="text-[10px] text-(--text-muted) uppercase tracking-widest font-bold -mt-0.5">
                  {user.regNo}
                </div>
              )}
            </div>
            <div className="w-10 h-10 border-2 border-(--accent-base) rounded-full overflow-hidden bg-(--bg-highlight) shadow-[0px_0px_10px_var(--accent-base)] group-hover:shadow-[0px_0px_15px_var(--accent-hover)] group-hover:scale-105 transition-all duration-300">
              <img
                src={`/vtop/users/image/?id=${user.regNo}`}
                className="w-full h-full object-cover"
              />
            </div>
          </button>
          <ProfileMenu
            isOpen={showProfileMenu}
            userName={user.name}
            onNavigate={handleLinkClick}
            onLegacyToggle={() => setIsModernUI(false)}
            onLogout={handleLogout}
            onClose={() => setShowProfileMenu(false)}
          />
        </div>
      </div>
    </header>
  );
};
