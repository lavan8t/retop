import React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Home,
  RefreshCw,
  LayoutGrid,
  List,
  Calendar,
  User,
  Search,
} from "lucide-react";
import {
  QuickLink,
  Semester,
  TimetableCourse,
  ClassGroup,
} from "../../types/vtop";
import { SemesterDropdown } from "../timetable/SemesterDropdown";
import { ClassGroupDropdown } from "../timetable/ClassGroupDropdown";
import { getCategoryIcon } from "../../utils/icons";

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

  marksSemesters: { id: string; label: string }[];
  marksSelectedSem: string;
  setMarksSelectedSem: (id: string) => void;
  marksSearchQuery: string;
  setMarksSearchQuery: (query: string) => void;
  isMarksModernView: boolean;
  setIsMarksModernView: (view: boolean) => void;

  calSemesters: { id: string; label: string }[];
  calSelectedSem: string;
  setCalSelectedSem: (id: string) => void;
  calClassGroups: ClassGroup[];
  calSelectedGroup: string;
  setCalSelectedGroup: (id: string) => void;

  user: { name: string; regNo: string };
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  handleLinkClick: (link: QuickLink) => void;
  handleLogout: () => void;
  setIsOmniboxOpen: (open: boolean) => void;
  setCurrentView: (view: any) => void;

  pinnedLinks: QuickLink[];
}

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
      return "SETTINGS";
    case "coursePage":
      return "COURSE PAGE";
    case "calendar":
      return "CALENDAR";
    case "content":
      return dynamicTitle || "CONTENT";
    default:
      return "retop";
  }
};

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  contentTitle,
  ttLoading,
  ttSemesters,
  ttSelectedSem,
  ttViewMode,
  setTtViewMode,
  loadTimetable,
  cpSelectedSem,
  setCpSelectedSem,
  setCpSelectedCourseId,
  marksSemesters,
  marksSelectedSem,
  setMarksSelectedSem,
  marksSearchQuery,
  setMarksSearchQuery,
  isMarksModernView,
  setIsMarksModernView,
  calSemesters,
  calSelectedSem,
  setCalSelectedSem,
  calClassGroups,
  calSelectedGroup,
  setCalSelectedGroup,
  user,
  showProfileMenu,
  setShowProfileMenu,
  handleLinkClick,
  handleLogout,
  setIsOmniboxOpen,
  setCurrentView,
  pinnedLinks,
}) => {
  const dockColors = ["bg-purple-400", "bg-cyan-400", "bg-lime-400"];

  return (
    <>
      {/* Top Fade Mask */}
      <div
        className="fixed top-0 left-0 right-0 h-24 md:h-32 bg-gradient-to-b from-(--bg-main) via-(--bg-main) to-transparent z-[90] pointer-events-none"
        style={{
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      />

      <header className="h-16 md:h-18 bg-transparent fixed w-full top-0 z-[100] pl-4 md:pl-8 pr-0 flex items-center justify-between shrink-0 transition-all pointer-events-none">
        <div className="flex items-center h-full pointer-events-auto">
          <div className="flex flex-col justify-center h-full gap-0.5">
            <div className="flex items-center gap-2 md:gap-3">
              <div
                className={`relative items-baseline select-none cursor-pointer ${
                  currentView !== "dashboard" ? "hidden md:flex" : "flex"
                }`}
                onClick={() => setCurrentView("dashboard")}
              >
                <span className="font-expanded font-black text-[2rem] md:text-[2.5rem]  italic lowercase leading-none text-(--text-main)">
                  re
                </span>
                <div className="relative w-2 h-2 md:w-3 md:h-3 ml-0.5 mb-1 md:mb-1.5 bg-(--accent-base) rounded-full" />
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
                  className="group/back w-8 h-8 md:w-10 md:h-10 ml-0 md:ml-1 flex items-center justify-center bg-(--bg-surface) border-2 border-(--border-dim) rounded-lg text-(--text-muted) hover:text-white hover:bg-(--accent-base) hover:border-(--border-main) transition-all active:scale-90 shrink-0 cursor-pointer pointer-events-auto shadow-sm hover:shadow-[4px_4px_0px_0px_var(--shadow-main)]"
                >
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover/back:hidden" />
                  <Home className="w-4 h-4 md:w-5 md:h-5 hidden group-hover/back:block" />
                </motion.button>
              )}

              {currentView !== "dashboard" && (
                <h1
                  onClick={() => setCurrentView("dashboard")}
                  title="Return to Dashboard"
                  className="font-expanded font-black text-lg md:text-3xl text-(--text-main)  uppercase truncate max-w-[40vw] sm:max-w-[30vw] leading-none mt-1 mb-0 ml-1 md:ml-2 pl-2 md:pl-3 border-l-2 md:border-l-4 border-(--border-dim) cursor-pointer hover:text-(--accent-hover) transition-colors pointer-events-auto"
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
              {pinnedLinks.slice(0, 3).map((link, idx) => {
                const Icon = getCategoryIcon(link.title, link.url);
                return (
                  <button
                    key={idx}
                    onClick={() => handleLinkClick(link)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 border-2 border-(--border-main) rounded-xl shadow-none hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_var(--shadow-main)] active:translate-y-0 active:shadow-none transition-all font-black font-expanded text-xs  uppercase text-black ${dockColors[idx]} cursor-pointer`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentView === "timetable" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 md:gap-3 lg:gap-4 pr-0 pointer-events-auto"
            >
              {ttLoading && (
                <RefreshCw className="w-4 h-4 text-(--accent-base) animate-spin hidden sm:block" />
              )}
              <SemesterDropdown
                semesters={ttSemesters}
                selectedId={ttSelectedSem}
                onChange={loadTimetable}
              />

              <div className="hidden sm:flex bg-(--bg-highlight) border-2 border-(--border-main) rounded-xl p-1 gap-1 shadow-sm">
                <button
                  onClick={() => setTtViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all border-2 ${
                    ttViewMode === "grid"
                      ? "bg-(--accent-base) text-white border-(--border-main) shadow-none -translate-y-px"
                      : "border-transparent text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-surface)"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTtViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all border-2 ${
                    ttViewMode === "list"
                      ? "bg-(--accent-base) text-white border-(--border-main) shadow-none -translate-y-px"
                      : "border-transparent text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-surface)"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTtViewMode("week")}
                  className={`p-1.5 rounded-lg transition-all border-2 ${
                    ttViewMode === "week"
                      ? "bg-(--accent-base) text-white border-(--border-main) shadow-none -translate-y-px"
                      : "border-transparent text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-surface)"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
              <div className="hidden sm:block w-0.5 h-8 bg-(--border-dim) mx-1"></div>
            </motion.div>
          )}

          {currentView === "marks" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 mr-1 md:mr-2"
            >
              <button
                onClick={() => setIsMarksModernView(!isMarksModernView)}
                className="hidden sm:block bg-(--bg-surface) border-2 border-(--border-dim) text-(--text-main) px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase  hover:bg-(--accent-base) hover:text-white transition-all cursor-pointer shadow-sm hover:shadow-[4px_4px_0px_0px_var(--shadow-main)] active:translate-y-px active:shadow-none"
              >
                {isMarksModernView ? "Legacy View" : "Modern View"}
              </button>

              <div className="relative group hidden sm:block">
                <input
                  type="text"
                  placeholder="Search Marks"
                  value={marksSearchQuery}
                  onChange={(e) => setMarksSearchQuery(e.target.value)}
                  className="bg-(--bg-main) border-2 border-(--border-dim) text-(--text-main) text-xs rounded-xl pl-8 pr-3 py-1.5 w-36 lg:w-48 focus:outline-none focus:border-(--accent-base) transition-all placeholder:text-(--text-muted) shadow-sm"
                />
                <Search className="w-3.5 h-3.5 text-(--text-muted) absolute left-2.5 top-2 group-focus-within:text-(--accent-base) transition-colors" />
              </div>

              <SemesterDropdown
                semesters={marksSemesters}
                selectedId={marksSelectedSem}
                onChange={(id: string) => {
                  setMarksSelectedSem(id);
                }}
              />
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
            </motion.div>
          )}

          {currentView === "calendar" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 md:gap-3 lg:gap-4 pr-0 pointer-events-auto"
            >
              <SemesterDropdown
                semesters={calSemesters}
                selectedId={calSelectedSem}
                onChange={(id: string) => setCalSelectedSem(id)}
              />
              <ClassGroupDropdown
                groups={calClassGroups}
                selectedId={calSelectedGroup}
                onChange={(id: string) => setCalSelectedGroup(id)}
              />
            </motion.div>
          )}

          {currentView !== "dashboard" && (
            <button
              onClick={() => setIsOmniboxOpen(true)}
              className="hidden xl:flex shrink-0 items-center gap-2 px-3.5 py-1.5 mr-2 bg-(--bg-highlight) border-2 border-(--border-main) rounded-xl text-(--text-main) hover:text-(--accent-base) shadow-none hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_var(--shadow-main)] active:translate-y-0 active:shadow-none transition-all group cursor-pointer"
            >
              <Search className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="font-expanded font-bold text-[10px]  uppercase mt-0.5">
                Search
              </span>
              <kbd className="ml-1 font-mono bg-(--bg-surface) text-(--text-muted) px-1.5 py-0.5 text-[9px] rounded-md border border-(--border-dim) group-hover:border-(--accent-base) group-hover:text-(--accent-base) transition-colors">
                /
              </kbd>
            </button>
          )}

          <div className="relative shrink-0 flex items-center justify-center mr-2 lg:mr-6">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center focus:outline-none group cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 relative flex items-center justify-center">
                {!showProfileMenu && (
                  <motion.div className="w-10 h-10 md:w-12 md:h-12 absolute inset-0 rounded-full overflow-hidden shrink-0 border-2 border-(--border-main) group-hover:border-(--accent-base) shadow-sm transition-all flex items-center justify-center bg-(--bg-highlight) z-9999">
                    {user.regNo !== "..." ? (
                      <img
                        src={`/vtop/users/image/?id=${user.regNo}`}
                        className="w-full h-full object-cover"
                        alt="Profile"
                      />
                    ) : (
                      <User className="w-5 h-5 md:w-6 md:h-6 text-(--text-dim)" />
                    )}
                  </motion.div>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
