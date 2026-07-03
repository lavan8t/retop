import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Home,
  Autorenew,
  GridView,
  List,
  CalendarMonth,
  Person,
  Search,
  Download,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import {
  QuickLink,
  Semester,
  TimetableCourse,
  ClassGroup,
  MenuCategory,
} from "../../types/vtop";
import { SemesterDropdown } from "../timetable/SemesterDropdown";
import { ClassGroupDropdown } from "../timetable/ClassGroupDropdown";
import { TopBarSearch } from "./TopBarSearch";
import { getCategoryIcon } from "../../utils/icons";
import { useDataStore } from "../../store/dataStore";
import { downloadICalFile } from "../../utils/ical-export";

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

  gradesSemesters: { id: string; label: string }[];
  gradesSelectedSem: string;
  setGradesSelectedSem: (id: string) => void;

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
  isOmniboxOpen: boolean;
  setIsOmniboxOpen: (open: boolean) => void;
  setCurrentView: (view: any) => void;

  pinnedLinks: QuickLink[];
  menuCategories: MenuCategory[];
  onTogglePin: (link: QuickLink) => void;
  onNavigate: (link: QuickLink) => void;
  initialQuery?: string;
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
    case "grades":
      return "GRADES";
    case "profile":
      return "STUDENT PROFILE";
    case "settings":
      return "SETTINGS";
    case "coursePage":
      return "COURSE PAGE";
    case "calendar":
      return "ACADEMICS CALENDAR";
    case "attendance":
      return "CLASS ATTENDANCE";
    case "content":
      return dynamicTitle || "CONTENT";
    default:
      return "retop";
  }
};

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  contentTitle,
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
  marksSemesters,
  marksSelectedSem,
  setMarksSelectedSem,
  marksSearchQuery,
  setMarksSearchQuery,
  isMarksModernView,
  setIsMarksModernView,
  gradesSemesters,
  gradesSelectedSem,
  setGradesSelectedSem,
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
  isOmniboxOpen,
  setIsOmniboxOpen,
  setCurrentView,
  pinnedLinks,
  menuCategories,
  onTogglePin,
  onNavigate,
  initialQuery = "",
}) => {
  const { attSelectedSem, setAttSelectedSem, calGridData } = useDataStore();

  return (
    <>
      {/* Top Fade Mask */}
      <div
        className="fixed top-0 left-0 right-0 h-16 md:h-24 bg-linear-to-b from-(--bg-main) via-(--bg-main) to-transparent z-90 pointer-events-none"
        style={{
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      />

      <header className="h-16 md:h-18 bg-transparent fixed w-full top-0 z-100 pl-4 md:pl-8 pr-0 flex items-center justify-between shrink-0 transition-all pointer-events-none">
        <div className="flex items-center h-full pointer-events-auto">
          <div className="flex flex-col justify-center h-full gap-0.5">
            <div className="flex items-center gap-2 md:gap-3">
              <AnimatePresence mode="wait">
                {currentView !== "dashboard" && (
                  <motion.div
                    key="topbar-search"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      x: -20,
                      transition: { duration: 0.15 },
                    }}
                  >
                    <TopBarSearch
                      currentView={currentView}
                      isOmniboxOpen={isOmniboxOpen}
                      setIsOmniboxOpen={setIsOmniboxOpen}
                      menuCategories={menuCategories}
                      pinnedLinks={pinnedLinks}
                      onNavigate={onNavigate}
                      onTogglePin={onTogglePin}
                      initialQuery={initialQuery}
                      pageTitle={getPageTitle(currentView, contentTitle)}
                      onBack={() => setCurrentView("dashboard")}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 h-full pointer-events-auto">
          <AnimatePresence mode="wait">
            {currentView === "dashboard" && (
              <motion.div
                key="dashboard-links"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                className="hidden xl:flex items-center gap-2.5"
              >
                {pinnedLinks.slice(0, 3).map((link, idx) => {
                  const Icon = getCategoryIcon(link.title, link.url);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleLinkClick(link)}
                      className="flex items-center gap-2 px-3.5 py-1.5 border-2 border-(--border-main) rounded-xl shadow-none hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_var(--shadow-main)] active:translate-y-0 active:shadow-none transition-all font-black font-expanded text-xs uppercase text-(--text-main) bg-(--bg-surface) cursor-pointer group hover:border-(--accent-base)"
                    >
                      <Icon className="w-4 h-4 text-(--text-muted) transition-colors" />
                      <span className="transition-colors">{link.title}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}

            {currentView === "timetable" && (
              <motion.div
                key="timetable-controls"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                className="flex items-center gap-1.5 md:gap-3 lg:gap-4 pr-0 pointer-events-auto"
              >
                {ttLoading && (
                  <Autorenew className="w-4 h-4 text-(--accent-base) animate-spin hidden sm:block" />
                )}
                <SemesterDropdown
                  semesters={ttSemesters}
                  selectedId={ttSelectedSem}
                  onChange={loadTimetable}
                />

                <div className="hidden sm:flex bg-(--bg-highlight) rounded-full p-0.5 w-max border-2 border-(--border-main) shadow-[2px_2px_0px_0px_var(--shadow-main)]">
                  <button
                    onClick={() => setTtViewMode("grid")}
                    className={`px-3 py-1 text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                      ttViewMode === "grid"
                        ? "bg-(--text-main) text-(--bg-main) rounded-[20px]"
                        : "bg-transparent text-(--text-muted) hover:text-(--text-main) rounded-l-[20px] rounded-r-md"
                    }`}
                  >
                    <GridView className="w-3.5 h-3.5" />
                    <span>Grid</span>
                  </button>
                  <button
                    onClick={() => setTtViewMode("list")}
                    className={`px-3 py-1 text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                      ttViewMode === "list"
                        ? "bg-(--text-main) text-(--bg-main) rounded-[20px]"
                        : "bg-transparent text-(--text-muted) hover:text-(--text-main) rounded-md"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>List</span>
                  </button>
                  <button
                    onClick={() => setTtViewMode("week")}
                    className={`px-3 py-1 text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                      ttViewMode === "week"
                        ? "bg-(--text-main) text-(--bg-main) rounded-[20px]"
                        : "bg-transparent text-(--text-muted) hover:text-(--text-main) rounded-l-md rounded-r-[20px]"
                    }`}
                  >
                    <CalendarMonth className="w-3.5 h-3.5" />
                    <span>Week</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    const semLabel = ttSemesters.find((s) => s.id === ttSelectedSem)?.label || "";
                    if (calGridData.length === 0) {
                      alert("Please open the Academics Calendar page first to load calendar data, then come back here to export.");
                      return;
                    }
                    downloadICalFile({
                      courses: ttCourses,
                      calGridData,
                      semesterLabel: semLabel,
                    });
                  }}
                  disabled={ttCourses.length === 0}
                  title="Export timetable as iCal (.ics) file for Google Calendar"
                  className="bg-(--bg-surface) border-2 border-(--border-main) text-(--text-main) p-1.5 rounded-xl shadow-[2px_2px_0px_0px_var(--shadow-main)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--shadow-main)] active:translate-y-0 active:shadow-none transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {currentView === "marks" && (
              <motion.div
                key="marks-controls"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                className="flex items-center gap-2 mr-1 md:mr-2"
              >
                <button
                  onClick={() => setIsMarksModernView(!isMarksModernView)}
                  className="hidden sm:block bg-(--bg-surface) border-2 border-(--border-dim) text-(--text-main) px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase  hover:bg-(--accent-base) hover:text-white transition-all cursor-pointer shadow-sm hover:shadow-[4px_4px_0px_0px_var(--shadow-main)] active:translate-y-px active:shadow-none"
                >
                  {isMarksModernView ? "Legacy View" : "Modern View"}
                </button>



                <SemesterDropdown
                  semesters={marksSemesters}
                  selectedId={marksSelectedSem}
                  onChange={(id: string) => {
                    setMarksSelectedSem(id);
                  }}
                />
              </motion.div>
            )}

            {currentView === "grades" && (
              <motion.div
                key="grades-controls"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                className="flex items-center gap-2 mr-1 md:mr-2 pointer-events-auto"
              >
                <SemesterDropdown
                  semesters={gradesSemesters}
                  selectedId={gradesSelectedSem}
                  onChange={(id: string) => setGradesSelectedSem(id)}
                />
              </motion.div>
            )}

            {currentView === "coursePage" && (
              <motion.div
                key="coursePage-controls"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
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
                key="calendar-controls"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
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

            {currentView === "attendance" && (
              <motion.div
                key="attendance-controls"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                className="flex items-center gap-2 mr-1 md:mr-2"
              >
                <SemesterDropdown
                  semesters={ttSemesters}
                  selectedId={attSelectedSem}
                  onChange={(sem: string) => setAttSelectedSem(sem)}
                />
              </motion.div>
            )}
          </AnimatePresence>

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
                      <Person className="w-5 h-5 md:w-6 md:h-6 text-(--text-dim)" />
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
