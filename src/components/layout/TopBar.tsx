import React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Home,
  RefreshCw,
  LayoutGrid,
  List,
  Calendar,
  BookOpen,
  GraduationCap,
  User,
  Layers,
  Search,
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

  cpSelectedSem: string;
  setCpSelectedSem: (semId: string) => void;
  setCpSelectedCourseId: (id: string) => void;

  user: { name: string; regNo: string };
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  handleLinkClick: (link: QuickLink) => void;
  handleLogout: () => void;
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
    title: "Course Page",
    url: "academics/CoursePageConsolidated/CoursePage",
    category: "Core",
    icon: Layers,
    color: "bg-cyan-400",
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
    case "coursePage":
      return "COURSE PAGE";
    case "content":
      return dynamicTitle || "CONTENT";
    default:
      return "retop";
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
  cpSelectedSem,
  setCpSelectedSem,
  setCpSelectedCourseId,
  user,
  showProfileMenu,
  setShowProfileMenu,
  handleLinkClick,
  handleLogout,
  setIsOmniboxOpen,
  setCurrentView,
}) => {
  return (
    <>
      {/* Reduced desktop height from h-20 (80px) to h-[72px] (10% smaller) */}
      <header className="h-16 md:h-18 bg-(--bg-main) border-b-2 md:border-b-4 border-(--border-main) sticky top-0 z-100 pl-4 md:pl-8 pr-0 flex items-center justify-between shadow-xl shrink-0 transition-all">
        <div className="flex items-center h-full">
          <div className="flex flex-col justify-center h-full gap-0.5">
            <div className="flex items-center gap-2 md:gap-3">
              <div
                className={`relative items-baseline select-none cursor-pointer ${
                  currentView !== "dashboard" ? "hidden md:flex" : "flex"
                }`}
                onClick={() => setCurrentView("dashboard")}
              >
                <span className="font-expanded font-black text-[2rem] md:text-[2.5rem] tracking-tighter italic lowercase leading-none text-(--text-main)">
                  re
                </span>
                <div className="relative w-2 h-2 md:w-3 md:h-3 ml-0.5 mb-1 md:mb-1.5 bg-blue-500 rounded-full" />
              </div>

              {currentView !== "dashboard" && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentView("dashboard");
                  }}
                  title="Return to Dashboard"
                  className="group/back w-8 h-8 md:w-10 md:h-10 ml-0 md:ml-1 flex items-center justify-center bg-(--bg-surface) border-2 border-(--border-dim) rounded-lg text-(--text-muted) hover:text-white hover:bg-blue-500 hover:border-black transition-all active:scale-90 shrink-0 cursor-pointer pointer-events-auto shadow-sm hover:shadow-[2px_2px_0px_0px_#000]"
                >
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover/back:hidden" />
                  <Home className="w-4 h-4 md:w-5 md:h-5 hidden group-hover/back:block" />
                </motion.button>
              )}

              {currentView !== "dashboard" && (
                <h1
                  onClick={() => setCurrentView("dashboard")}
                  title="Return to Dashboard"
                  className="font-expanded font-black text-lg md:text-3xl text-(--text-main) tracking-tight uppercase truncate max-w-[40vw] sm:max-w-[30vw] leading-none mt-1 mb-0 ml-1 md:ml-2 pl-2 md:pl-3 border-l-2 md:border-l-4 border-(--border-dim) cursor-pointer hover:text-(--accent-hover) transition-colors pointer-events-auto"
                >
                  {getPageTitle(currentView, contentTitle)}
                </h1>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 h-full pointer-events-auto">
          {currentView === "dashboard" && (
            <div className="hidden xl:flex items-center gap-2.5">
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
              className="flex items-center gap-1 md:gap-2 mr-1 md:mr-2"
            >
              {ttLoading && (
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin hidden sm:block" />
              )}
              <SemesterDropdown
                semesters={ttSemesters}
                selectedId={ttSelectedSem}
                onChange={loadTimetable}
              />
              <div className="hidden sm:flex bg-(--bg-surface) border-2 border-(--border-dim) rounded-xl p-1 gap-1">
                <button
                  onClick={() => setTtViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${ttViewMode === "grid" ? "bg-(--accent-base) text-white shadow-sm" : "text-(--text-muted) hover:text-(--text-main)"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTtViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${ttViewMode === "list" ? "bg-(--accent-base) text-white shadow-sm" : "text-(--text-muted) hover:text-(--text-main)"}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTtViewMode("week")}
                  className={`p-1.5 rounded-lg transition-all ${ttViewMode === "week" ? "bg-(--accent-base) text-white shadow-sm" : "text-(--text-muted) hover:text-(--text-main)"}`}
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
              <div className="hidden sm:block w-0.5 h-8 bg-(--border-dim) mx-1"></div>
            </motion.div>
          )}

          {currentView === "coursePage" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 mr-1 md:mr-2"
            >
              <SemesterDropdown
                semesters={ttSemesters}
                selectedId={cpSelectedSem}
                onChange={(sem: string) => {
                  setCpSelectedSem(sem);
                  setCpSelectedCourseId("");
                }}
              />
              <div className="hidden sm:block w-0.5 h-8 bg-(--border-dim) mx-1"></div>
            </motion.div>
          )}

          <button
            onClick={() => setIsOmniboxOpen(true)}
            className="flex lg:hidden items-center justify-center p-2 mr-1 text-(--text-muted) hover:text-(--text-main) transition-colors cursor-pointer active:scale-90"
          >
            <Search className="w-4.5 h-4.5 md:w-5 md:h-5" />
          </button>

          {currentView !== "dashboard" && (
            <button
              onClick={() => setIsOmniboxOpen(true)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 mr-2 bg-(--bg-surface) border-2 border-(--border-main) rounded-full text-(--text-muted) hover:border-(--accent-base) hover:text-(--text-main) transition-all group shadow-lg active:scale-95 cursor-pointer"
            >
              <Search className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="font-bold text-xs tracking-widest uppercase">
                Search
              </span>
              <kbd className="ml-1 font-mono bg-(--bg-highlight) text-(--text-muted) px-2 py-0.5 text-[10px] rounded-lg border border-(--border-dim) group-hover:text-(--text-main) group-hover:border-(--border-main)">
                /
              </kbd>
            </button>
          )}

          <div className="relative h-full">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center h-full focus:outline-none group cursor-pointer gap-3"
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

              <div className="h-full w-10 md:w-auto md:min-w-10 bg-(--bg-highlight) overflow-hidden shrink-0 border-l-2 md:border-l-4 border-(--border-main) group-hover:brightness-110 transition-all flex items-center justify-center">
                {user.regNo !== "..." ? (
                  <img
                    src="/assets/photo.png"
                    className="w-full h-full object-cover object-top"
                    alt="Profile"
                  />
                ) : (
                  <User className="w-5 h-5 md:w-8 md:h-8 text-(--text-dim)" />
                )}
              </div>
            </button>

            {/* Adjusted dropdown position to match new 72px height */}
            <div className="absolute top-16 md:top-18 right-0 z-50">
              <ProfileMenu
                isOpen={showProfileMenu}
                userName={user.name}
                onNavigate={handleLinkClick}
                onLogout={handleLogout}
                onClose={() => setShowProfileMenu(false)}
              />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
