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
  MenuBook,
  KeyboardArrowDown,
  Refresh,
  Star,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import {
  QuickLink,
  Semester,
  TimetableCourse,
  ClassGroup,
  MenuCategory,
  CoursePageOption,
  CourseSummary,
} from "../../types/vtop";
import { SemesterDropdown } from "../timetable/SemesterDropdown";
import { ClassGroupDropdown } from "../timetable/ClassGroupDropdown";
import { TopBarSearch } from "./TopBarSearch";
import { SegmentedControl } from "../ui/SegmentedControl";
import { getCategoryIcon } from "../../utils/icons";
import { useDataStore } from "../../store/dataStore";
import { useAppStore } from "../../store/appStore";
import { downloadICalFile } from "../../utils/ical-export";
import { Tooltip } from "../ui/Tooltip";

interface TopBarProps {
  currentView: string;
  contentTitle: string;
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
  onTimetableSemChange?: (semId: string) => void;
  onSync?: () => void;
  network?: any; // Add network prop
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
      return "GRADES & HISTORY";
    case "profile":
      return "PROFILE";
    case "settings":
      return "SETTINGS";
    case "coursePage":
      return "COURSE PAGE";
    case "calendar":
      return "ACADEMICS CALENDAR";
    case "attendance":
      return "CLASS ATTENDANCE";
    case "digitalAssignments":
      return "DIGITAL ASSIGNMENTS";
    case "content":
      return dynamicTitle || "CONTENT";
    default:
      return "retop";
  }
};

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  contentTitle,
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
  onTimetableSemChange,
  onSync,
  network,
}) => {
  const [isStarOpen, setIsStarOpen] = React.useState(false);
  const {
    ttViewMode, setTtViewMode,
    cpSelectedCourseId, setCpSelectedCourseId, cpOptions, cpSearchTerm, setCpSearchTerm,
    marksSemesters, marksSelectedSem, setMarksSelectedSem, marksSearchQuery, setMarksSearchQuery, isMarksModernView, setIsMarksModernView,
    gradesSemesters, gradesSelectedSem, setGradesSelectedSem
  } = useAppStore();
  const {
    attSelectedSem,
    setAttSelectedSem,
    calGridData,
    status,
    calLoadingGrid,
    calLoadingMonths,
    attRecordsLoading,
    ttCourses,
    ttLoading,
    ttSemesters,
    ttSelectedSem,
    cpSelectedSem,
    setCpSelectedSem,
    calSemesters,
    calSelectedSem,
    setCalSelectedSem,
    calClassGroups,
    calSelectedGroup,
    setCalSelectedGroup,
    user,
    daSemesters,
    daSelectedSem,
    setDaSelectedSem,
    fetchDACourses,
    fetchDASemesters,
    daLoading,
    daCourses,
    isSyncing,
    lastSyncTime,
  } = useDataStore();

  const isLoading =
    status === "Syncing..." ||
    status === "Initializing..." ||
    isSyncing ||
    ttLoading ||
    calLoadingGrid ||
    calLoadingMonths ||
    attRecordsLoading;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Check if key is a number between 1 and 9
      const num = parseInt(e.key);
      if (!isNaN(num) && num > 0 && num <= Math.min(pinnedLinks.length, 9)) {
        e.preventDefault();
        handleLinkClick(pinnedLinks[num - 1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, pinnedLinks, handleLinkClick]);

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

      <header className="h-16 md:h-18 bg-transparent fixed w-full top-0 z-100 px-4 md:px-8 flex items-center justify-between shrink-0 transition-all pointer-events-none">
        <div className="flex items-center h-full pointer-events-auto">
          <div className="flex flex-col justify-center h-full gap-0.5">
            <div className="flex items-center gap-2 md:gap-3">
              <AnimatePresence mode="wait">
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
                    status={isLoading ? "loading" : "idle"}
                    onSync={onSync}
                    isSyncing={isSyncing}
                    lastSyncTime={lastSyncTime}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 h-full pointer-events-auto">
          <AnimatePresence mode="wait">
            {pinnedLinks.length > 0 && (
              <motion.div
                key="dashboard-links"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                className="hidden xl:flex items-center gap-2.5 relative"
              >
                {isStarOpen && (
                  <div 
                    className="fixed inset-0 z-[998]"
                    onClick={() => setIsStarOpen(false)}
                  />
                )}
                <div 
                  className="flex items-center justify-center w-11 h-11 rounded-[14px] bg-transparent text-(--text-muted) border-0 cursor-pointer hover:text-(--text-main) transition-colors shadow-none z-[999]"
                  onClick={() => setIsStarOpen(!isStarOpen)}
                >
                  <Star className="w-6 h-6" />
                </div>
                
                <div className={`absolute top-full right-0 mt-3 transition-all duration-200 flex flex-col gap-1.5 bg-(--bg-surface) border-2 border-(--border-dim) rounded-[24px] p-2 popup-shadow min-w-56 z-[999] ${isStarOpen ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'}`}>
                  {pinnedLinks.slice(0, 9).map((link, idx) => {
                    const Icon = getCategoryIcon(link.title, link.url);
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          handleLinkClick(link);
                          setIsStarOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-[16px] bg-transparent hover:bg-(--bg-highlight) transition-colors text-left group/item border-2 border-transparent hover:border-(--border-dim)"
                      >
                        <div className="w-6 h-6 rounded-md bg-(--bg-main) flex items-center justify-center text-[10px] font-black font-mono text-(--text-muted) transition-colors border-2 border-(--border-dim) shrink-0 group-hover/item:border-(--border-main) group-hover/item:text-(--text-main)">
                          {idx + 1}
                        </div>
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 text-(--text-muted) group-hover/item:text-(--text-main) transition-colors shrink-0" />
                          <span className="text-xs font-bold text-(--text-main) truncate uppercase">{link.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">

            {currentView === "timetable" && (
              <motion.div
                key="timetable-controls"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                className="flex items-center gap-1.5 md:gap-3 lg:gap-4 pr-0 pointer-events-auto"
              >
                {ttLoading && (
                  <motion.div
                    animate={{ y: [0, -4, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                    className="w-2 h-2 bg-(--accent-base) rounded-full hidden sm:block"
                  />
                )}
                <SemesterDropdown
                  semesters={ttSemesters}
                  selectedId={ttSelectedSem}
                  onChange={(id: string) => onTimetableSemChange?.(id)}
                />

                <div className="hidden sm:flex bg-transparent rounded-full border-2 border-(--border-main) shadow-(--brutal-shadow-sm) items-center">
                  <SegmentedControl
                    options={[
                      {
                        label: (
                          <div className="flex items-center gap-1.5">
                            <GridView className="w-3.5 h-3.5" />
                            <span>Grid</span>
                          </div>
                        ),
                        value: "grid",
                      },
                      {
                        label: (
                          <div className="flex items-center gap-1.5">
                            <List className="w-3.5 h-3.5" />
                            <span>List</span>
                          </div>
                        ),
                        value: "list",
                      },
                      {
                        label: (
                          <div className="flex items-center gap-1.5">
                            <CalendarMonth className="w-3.5 h-3.5" />
                            <span>Week</span>
                          </div>
                        ),
                        value: "week",
                      },
                    ]}
                    value={ttViewMode}
                    onChange={(val) => setTtViewMode(val as any)}
                  />
                </div>

                <button
                  onClick={() => {
                    const semLabel =
                      ttSemesters.find((s) => s.id === ttSelectedSem)?.label ||
                      "";
                    if (calGridData.length === 0) {
                      alert(
                        "Please open the Academics Calendar page first to load calendar data, then come back here to export.",
                      );
                      return;
                    }
                    downloadICalFile({
                      courses: ttCourses,
                      calGridData,
                      semesterLabel: semLabel,
                    });
                  }}
                  disabled={ttCourses.length === 0}
                  className="bg-(--bg-surface) border-2 border-(--border-main) text-(--text-main) p-1.5 rounded-xl shadow-(--brutal-shadow-sm) hover:-translate-y-0.5 hover:shadow-(--brutal-shadow-hover) active:translate-y-0 active:shadow-(--brutal-shadow-active) transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Tooltip text="Export timetable as iCal (.ics) file for Google Calendar">
                    <Download className="w-4 h-4" />
                  </Tooltip>
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
                  className="hidden sm:flex items-center justify-center bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) w-8 h-8 rounded-xl transition-colors cursor-pointer"
                >
                  <Tooltip text={isMarksModernView ? "Switch to Legacy View" : "Switch to Modern View"}>
                    {isMarksModernView ? <List className="w-4 h-4" /> : <GridView className="w-4 h-4" />}
                  </Tooltip>
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
                {/* Course Page Search Bar */}
                {cpSelectedCourseId && cpOptions.length > 0 && (
                  <div className="relative z-50 hidden md:block w-32 lg:w-48 xl:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--text-muted)" />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full pl-8 pr-3 py-1.5 bg-(--bg-surface) border-2 border-(--border-main) rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-(--text-main) focus:outline-none focus:border-(--accent-base) focus:shadow-(--brutal-shadow-hover) transition-all placeholder:text-(--text-dim) uppercase"
                      value={cpSearchTerm}
                      onChange={(e) => setCpSearchTerm(e.target.value)}
                    />
                  </div>
                )}


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

            {currentView === "digitalAssignments" && (
              <motion.div
                key="digitalAssignments-controls"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                className="flex items-center gap-2 mr-1 md:mr-2 pointer-events-auto"
              >
                <SemesterDropdown
                  semesters={daSemesters}
                  selectedId={daSelectedSem}
                  onChange={(id: string) => {
                    setDaSelectedSem(id);
                    if (network) {
                      fetchDACourses(network, id);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (daSelectedSem) {
                      if (network) {
                        fetchDACourses(network, daSelectedSem, true);
                      }
                    } else {
                      if (network) {
                        fetchDASemesters(network, true);
                      }
                    }
                  }}
                  disabled={daLoading}
                  className="p-1.5 md:p-2 bg-(--md-sys-color-surface-variant) border-2 border-(--md-sys-color-outline) hover:border-(--md-sys-color-on-surface) rounded-xl shadow-none hover:-translate-y-0.5 hover:shadow-(--brutal-shadow-hover) active:translate-y-0 active:shadow-(--brutal-shadow-active) transition-all disabled:opacity-50 text-(--md-sys-color-on-surface-variant)"
                >
                  <Refresh className={`w-4 h-4 md:w-5 md:h-5 ${daLoading && !daCourses?.length ? "animate-spin" : ""}`} />
                </button>
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

          <div className="relative shrink-0 flex items-center justify-center pointer-events-auto">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center focus:outline-none group cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 relative flex items-center justify-center">
                {!showProfileMenu && (
                  <motion.div className="w-10 h-10 md:w-12 md:h-12 absolute inset-0 rounded-full overflow-hidden shrink-0 border-2 border-(--border-main) group-hover:border-(--accent-base) shadow-sm transition-all flex items-center justify-center bg-(--bg-highlight) z-9999">
                    {user.regNo !== "..." ? (
                      <img
                        src={
                          user.profileImgBase64 ||
                          `/vtop/users/image/?id=${user.regNo}`
                        }
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
