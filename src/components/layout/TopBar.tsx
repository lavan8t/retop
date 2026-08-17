import React from "react";
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
  MoreVert,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { NoInternetIcon } from "../icons/NoInternetIcon";
import {
  QuickLink,
  Semester,
  TimetableCourse,
  ClassGroup,
  MenuCategory,
  CoursePageOption,
  CourseSummary,
} from "../../types/vtop";
import { MaterialSwitch } from "../MaterialSwitch";
import { SemesterDropdown } from "../timetable/SemesterDropdown";
import { ClassGroupDropdown } from "../timetable/ClassGroupDropdown";
import { TopBarSearch } from "./TopBarSearch";
import { OfficialResourcesMenu } from "../resources/OfficialResourcesMenu";
import { Tooltip } from "../ui/Tooltip";
import { SegmentedControl } from "../ui/SegmentedControl";
import { getCategoryIcon } from "../../utils/icons";
import { useDataStore } from "../../store/dataStore";
import { useAppStore } from "../../store/appStore";

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
      return "Search";
    case "timetable":
      return "Timetable";
    case "curriculum":
      return "Curriculum";
    case "marks":
      return "Marks";
    case "grades":
      return "Grades & History";
    case "profile":
      return "Profile";
    case "settings":
      return "Settings";
    case "coursePage":
      return "Course Page";
    case "calendar":
      return "Academics Calendar";
    case "attendance":
      return "Class Attendance";
    case "digitalAssignments":
      return "Digital Assignments";
    case "examSchedule":
      return "Exam Schedule";
    case "lateHour":
      return "Late Hour Permission";
    case "content":
      return dynamicTitle || "Content";
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
  const [isMobileControlsOpen, setIsMobileControlsOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMobileControlsOpen(false);
  }, [currentView]);
  const {
    ttViewMode, setTtViewMode,
    calViewMode, setCalViewMode,
    cpSelectedCourseId, setCpSelectedCourseId, cpOptions, cpSearchTerm, setCpSearchTerm,
    marksSemesters, marksSelectedSem, setMarksSelectedSem, marksSearchQuery, setMarksSearchQuery, isMarksModernView, setIsMarksModernView,
    gradesSemesters, gradesSelectedSem, setGradesSelectedSem,
    curriculumHideCompleted, setCurriculumHideCompleted
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
    examSemesters,
    examSelectedSem,
    setExamSelectedSem,
    fetchExamSchedule,
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
      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;
      const isInputEl = (el: EventTarget | null) =>
        Boolean(
          el &&
            el instanceof Element &&
            (el.tagName === "INPUT" ||
              el.tagName === "TEXTAREA" ||
              el.tagName === "SELECT" ||
              (el as HTMLElement).isContentEditable ||
              (typeof el.closest === "function" &&
                Boolean(
                  el.closest("input, textarea, select, [contenteditable='true']"),
                ))),
        );

      if (isInputEl(target) || isInputEl(activeEl)) {
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

      <header className="h-14 sm:h-16 md:h-18 bg-transparent fixed w-full top-0 z-100 px-2.5 sm:px-4 md:px-8 flex items-center justify-between shrink-0 transition-all pointer-events-none">
        <div className="flex items-center h-full pointer-events-auto min-w-0 flex-1">
          <div className="flex flex-col justify-center h-full gap-0.5 min-w-0 w-full">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 w-full">
              <div
                key="topbar-search"
                className="min-w-0 w-full sm:w-auto"
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
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 h-full pointer-events-auto shrink-0">
          {/* Desktop inline page controls (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-2 md:gap-4 h-full pointer-events-auto">
            {currentView === "timetable" && (
              <div
                key="timetable-controls"
                className="flex items-center gap-1.5 md:gap-3 lg:gap-4 pr-0 pointer-events-auto"
              >
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
                          <div className="flex items-center justify-center" title="Grid View">
                            <GridView className="w-3.5 h-3.5" />
                          </div>
                        ),
                        value: "grid",
                      },
                      {
                        label: (
                          <div className="flex items-center justify-center" title="List View">
                            <List className="w-3.5 h-3.5" />
                          </div>
                        ),
                        value: "list",
                      },
                      {
                        label: (
                          <div className="flex items-center justify-center" title="Week View">
                            <CalendarMonth className="w-3.5 h-3.5" />
                          </div>
                        ),
                        value: "week",
                      },
                    ]}
                    value={ttViewMode}
                    onChange={(val) => setTtViewMode(val as any)}
                  />
                </div>
              </div>
            )}

            {currentView === "calendar" && (
              <div
                key="calendar-controls"
                className="flex items-center gap-2 mr-1 md:mr-2 pointer-events-auto"
              >
                <SemesterDropdown
                  semesters={calSemesters}
                  selectedId={calSelectedSem}
                  onChange={(id: string) => {
                    setCalSelectedSem(id);
                  }}
                />
                {calClassGroups.length > 0 && (
                  <ClassGroupDropdown
                    groups={calClassGroups}
                    selectedId={calSelectedGroup}
                    onChange={(id: string) => {
                      setCalSelectedGroup(id);
                    }}
                  />
                )}

                <div className="flex bg-transparent rounded-full border-2 border-(--border-main) shadow-(--brutal-shadow-sm) items-center">
                  <SegmentedControl
                    options={[
                      {
                        label: (
                          <div className="flex items-center justify-center" title="Grid View">
                            <GridView className="w-3.5 h-3.5" />
                          </div>
                        ),
                        value: "grid",
                      },
                      {
                        label: (
                          <div className="flex items-center justify-center" title="List View">
                            <List className="w-3.5 h-3.5" />
                          </div>
                        ),
                        value: "list",
                      },
                    ]}
                    value={calViewMode}
                    onChange={(val) => setCalViewMode(val as any)}
                  />
                </div>
              </div>
            )}

            {currentView === "marks" && (
              <div
                key="marks-controls"
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
              </div>
            )}

            {currentView === "grades" && (
              <div
                key="grades-controls"
                className="flex items-center gap-2 mr-1 md:mr-2 pointer-events-auto"
              >
                <SemesterDropdown
                  semesters={gradesSemesters}
                  selectedId={gradesSelectedSem}
                  onChange={(id: string) => setGradesSelectedSem(id)}
                />
              </div>
            )}

            {currentView === "curriculum" && (
              <div
                key="curriculum-controls"
                className="flex items-center gap-2 mr-1 md:mr-2 pointer-events-auto"
              >
                <div className="flex items-center gap-2 px-2">
                  <span className="text-[10px] md:text-xs font-bold text-(--text-muted) uppercase">
                    Hide Done
                  </span>
                  <MaterialSwitch
                    selected={curriculumHideCompleted}
                    onChange={(checked) => setCurriculumHideCompleted(checked)}
                  />
                </div>
              </div>
            )}

            {currentView === "coursePage" && (
              <div
                key="coursePage-controls"
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
              </div>
            )}

            {currentView === "digitalAssignments" && (
              <div
                key="digitalAssignments-controls"
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
              </div>
            )}

            {currentView === "examSchedule" && (
              <div
                key="examSchedule-controls"
                className="flex items-center gap-2 mr-1 md:mr-2 pointer-events-auto"
              >
                <SemesterDropdown
                  semesters={examSemesters}
                  selectedId={examSelectedSem}
                  onChange={(id: string) => {
                    setExamSelectedSem(id);
                    if (network) {
                      fetchExamSchedule(network, id);
                    }
                  }}
                />
              </div>
            )}

            {currentView === "attendance" && (
              <div
                key="attendance-controls"
                className="flex items-center gap-2 mr-1 md:mr-2"
              >
                <SemesterDropdown
                  semesters={ttSemesters}
                  selectedId={attSelectedSem}
                  onChange={(sem: string) => setAttSelectedSem(sem)}
                />
              </div>
            )}
          </div>

          {/* Mobile 3-Dot Options Menu */}
          {[
            "timetable",
            "calendar",
            "marks",
            "grades",
            "curriculum",
            "coursePage",
            "digitalAssignments",
            "examSchedule",
            "attendance",
          ].includes(currentView) && (
            <div className="sm:hidden relative flex items-center">
              <button
                onClick={() => setIsMobileControlsOpen(!isMobileControlsOpen)}
                className="p-1 rounded-full bg-transparent text-(--text-muted) hover:text-(--text-main) active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                aria-label="Options"
              >
                <MoreVert className="w-5 h-5" />
              </button>

              {isMobileControlsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-99998 bg-black/60 backdrop-blur-xs transition-opacity"
                    onClick={() => setIsMobileControlsOpen(false)}
                  />
                  <div className="fixed inset-x-0 bottom-0 z-99999 bg-(--bg-surface) border-t-2 border-(--border-main) rounded-t-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 animate-sheet-up max-h-[85vh] overflow-y-auto">
                    {/* Bottom Sheet Drag Handle */}
                    <div className="w-12 h-1.5 bg-(--border-main) rounded-full mx-auto -mt-1 mb-1 opacity-60" />

                    {currentView === "timetable" && (
                      <div className="flex flex-col gap-3">
                        <div className="flex bg-transparent rounded-full border-2 border-(--border-main) shadow-(--brutal-shadow-sm) items-center">
                          <SegmentedControl
                            options={[
                              { label: <div className="flex items-center justify-center" title="Grid View"><GridView className="w-3.5 h-3.5" /></div>, value: "grid" },
                              { label: <div className="flex items-center justify-center" title="List View"><List className="w-3.5 h-3.5" /></div>, value: "list" },
                              { label: <div className="flex items-center justify-center" title="Week View"><CalendarMonth className="w-3.5 h-3.5" /></div>, value: "week" },
                            ]}
                            value={ttViewMode}
                            onChange={(val) => setTtViewMode(val as any)}
                          />
                        </div>
                        <SemesterDropdown
                          semesters={ttSemesters}
                          selectedId={ttSelectedSem}
                          onChange={(id: string) => {
                            onTimetableSemChange?.(id);
                            setIsMobileControlsOpen(false);
                          }}
                        />
                      </div>
                    )}

                    {currentView === "calendar" && (
                      <div className="flex flex-col gap-3">
                        <div className="flex bg-transparent rounded-full border-2 border-(--border-main) shadow-(--brutal-shadow-sm) items-center">
                          <SegmentedControl
                            options={[
                              { label: <div className="flex items-center justify-center" title="Grid View"><GridView className="w-3.5 h-3.5" /></div>, value: "grid" },
                              { label: <div className="flex items-center justify-center" title="List View"><List className="w-3.5 h-3.5" /></div>, value: "list" },
                            ]}
                            value={calViewMode}
                            onChange={(val) => setCalViewMode(val as any)}
                          />
                        </div>
                        <SemesterDropdown
                          semesters={calSemesters}
                          selectedId={calSelectedSem}
                          onChange={(id: string) => {
                            setCalSelectedSem(id);
                            setIsMobileControlsOpen(false);
                          }}
                        />
                        {calClassGroups.length > 0 && (
                          <ClassGroupDropdown
                            groups={calClassGroups}
                            selectedId={calSelectedGroup}
                            onChange={(id: string) => {
                              setCalSelectedGroup(id);
                              setIsMobileControlsOpen(false);
                            }}
                          />
                        )}
                      </div>
                    )}

                    {currentView === "marks" && (
                      <div className="flex flex-col gap-3">
                        <SemesterDropdown
                          semesters={marksSemesters}
                          selectedId={marksSelectedSem}
                          onChange={(id: string) => {
                            setMarksSelectedSem(id);
                            setIsMobileControlsOpen(false);
                          }}
                        />
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs font-bold text-(--text-main)">Modern View</span>
                          <MaterialSwitch
                            selected={isMarksModernView}
                            onChange={(checked) => setIsMarksModernView(checked)}
                          />
                        </div>
                      </div>
                    )}

                    {currentView === "grades" && (
                      <SemesterDropdown
                        semesters={gradesSemesters}
                        selectedId={gradesSelectedSem}
                        onChange={(id: string) => {
                          setGradesSelectedSem(id);
                          setIsMobileControlsOpen(false);
                        }}
                      />
                    )}

                    {currentView === "curriculum" && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-bold text-(--text-main)">Hide Completed</span>
                        <MaterialSwitch
                          selected={curriculumHideCompleted}
                          onChange={(checked) => setCurriculumHideCompleted(checked)}
                        />
                      </div>
                    )}

                    {currentView === "coursePage" && (
                      <SemesterDropdown
                        semesters={ttSemesters}
                        selectedId={cpSelectedSem}
                        onChange={(sem: string) => {
                          setCpSelectedSem(sem);
                          setCpSelectedCourseId("");
                          setIsMobileControlsOpen(false);
                        }}
                      />
                    )}

                    {currentView === "digitalAssignments" && (
                      <div className="flex flex-col gap-3">
                        <SemesterDropdown
                          semesters={daSemesters}
                          selectedId={daSelectedSem}
                          onChange={(id: string) => {
                            setDaSelectedSem(id);
                            if (network) fetchDACourses(network, id);
                            setIsMobileControlsOpen(false);
                          }}
                        />
                        <button
                          onClick={() => {
                            if (daSelectedSem && network) fetchDACourses(network, daSelectedSem, true);
                            else if (network) fetchDASemesters(network, true);
                            setIsMobileControlsOpen(false);
                          }}
                          disabled={daLoading}
                          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-(--bg-highlight) rounded-xl text-xs font-bold text-(--text-main) border border-(--border-dim) cursor-pointer"
                        >
                          <Refresh className={`w-4 h-4 ${daLoading ? "animate-spin" : ""}`} />
                          <span>Refresh</span>
                        </button>
                      </div>
                    )}

                    {currentView === "examSchedule" && (
                      <SemesterDropdown
                        semesters={examSemesters}
                        selectedId={examSelectedSem}
                        onChange={(id: string) => {
                          setExamSelectedSem(id);
                          if (network) fetchExamSchedule(network, id);
                          setIsMobileControlsOpen(false);
                        }}
                      />
                    )}

                    {currentView === "attendance" && (
                      <SemesterDropdown
                        semesters={ttSemesters}
                        selectedId={attSelectedSem}
                        onChange={(sem: string) => {
                          setAttSelectedSem(sem);
                          setIsMobileControlsOpen(false);
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {(() => {
            // Map currentView → QuickLink for pin toggle
            const VIEW_LINKS: Record<string, QuickLink> = {
              timetable: { title: "Time Table", url: "academics/common/StudentTimeTable", category: "Made for retop" },
              attendance: { title: "Class Attendance", url: "academics/common/StudentAttendance", category: "Made for retop" },
              digitalAssignments: { title: "Assignments", url: "examinations/StudentDA", category: "Made for retop" },
              coursePage: { title: "Course Page Consolidated", url: "academics/common/StudentCoursePage", category: "Made for retop" },
              marks: { title: "Marks View", url: "examinations/StudentMarkView", category: "Made for retop" },
              grades: { title: "Grades View", url: "examinations/StudentGradeView", category: "Made for retop" },
              calendar: { title: "Academic Calendar", url: "academics/common/CalendarPreview", category: "Made for retop" },
              profile: { title: "Student Profile", url: "studentsRecord/StudentProfileAllView", category: "Made for retop" },
              curriculum: { title: "Curriculum", url: "academics/common/CurriculumSyllabus", category: "Made for retop" },
              examSchedule: { title: "Exam Schedule", url: "examinations/StudExamSchedule", category: "Made for retop" },
              lateHour: { title: "Late Hour Permission", url: "hostels/late/hour/student/request/1", category: "Made for retop" },
            };
            const currentLink = VIEW_LINKS[currentView];
            const isCurrentPinned = currentLink
              ? pinnedLinks.some((p) => p.url === currentLink.url)
              : false;
            const canPinCurrent = !!currentLink && currentView !== "dashboard";

            return (
              <div className="hidden xl:flex items-center relative pointer-events-auto shrink-0">
                {isStarOpen && (
                  <div
                    className="fixed inset-0 z-[998]"
                    onClick={() => setIsStarOpen(false)}
                  />
                )}
                {/* Star button: click = toggle current page pin; hover = open list */}
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-[14px] bg-transparent border-0 cursor-pointer transition-all shadow-none z-[999] ${isCurrentPinned ? "text-(--accent-base)" : "text-(--text-muted) hover:text-(--text-main)"}`}
                  onClick={() => {
                    if (canPinCurrent) {
                      onTogglePin(currentLink!);
                    } else {
                      setIsStarOpen(!isStarOpen);
                    }
                  }}
                  onMouseEnter={() => pinnedLinks.length > 0 && setIsStarOpen(true)}
                  onMouseLeave={() => {
                    // close after brief delay so user can move into dropdown
                    setTimeout(() => {
                      if (!document.querySelector("[data-star-dropdown]:hover")) {
                        setIsStarOpen(false);
                      }
                    }, 120);
                  }}
                  title={canPinCurrent ? (isCurrentPinned ? "Unpin this page" : "Pin this page") : "Favourites"}
                >
                  <Star className={`w-5 h-5 transition-all ${isCurrentPinned ? "scale-110" : "opacity-50 hover:opacity-100"}`} />
                </div>

                {/* Pinned pages dropdown */}
                {pinnedLinks.length > 0 && (
                  <div
                    data-star-dropdown
                    onMouseEnter={() => setIsStarOpen(true)}
                    onMouseLeave={() => setIsStarOpen(false)}
                    className={`absolute top-full right-0 mt-2 transition-all duration-150 flex flex-col bg-(--bg-surface) border-2 border-(--border-dim) rounded-[16px] p-1.5 popup-shadow min-w-52 z-[999] ${isStarOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none translate-y-1"}`}
                  >
                    <div className="px-2.5 py-1.5 text-[9px] font-expanded font-bold text-(--text-muted) uppercase tracking-wider border-b border-(--border-dim) mb-1">
                      Pinned Pages · Press 1–{Math.min(pinnedLinks.length, 9)} to jump
                    </div>
                    {pinnedLinks.map((link, idx) => {
                      const Icon = getCategoryIcon(link.title, link.url);
                      const isThisCurrentPage = currentLink && link.url === currentLink.url;
                      return (
                        <div key={idx} className="flex items-center gap-1 group/row">
                          <button
                            onClick={() => {
                              handleLinkClick(link);
                              setIsStarOpen(false);
                            }}
                            className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] transition-colors text-left border-2 border-transparent hover:border-(--border-dim) hover:bg-(--bg-highlight) relative overflow-hidden ${isThisCurrentPage ? "bg-(--accent-base)/8" : ""}`}
                          >
                            <div className="relative shrink-0">
                              <Icon className="w-3.5 h-3.5 text-(--text-muted)" />
                              {isThisCurrentPage && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-(--accent-base)" />
                              )}
                            </div>
                            <span className={`text-[11px] font-bold truncate flex-1 ${isThisCurrentPage ? "text-(--accent-base)" : "text-(--text-main)"}`}>
                              {link.title}
                            </span>
                            <span className="text-[9px] font-black font-mono text-(--text-muted) opacity-40 ml-auto shrink-0">
                              {idx + 1}
                            </span>
                          </button>
                          {/* Unpin button */}
                          <button
                            onClick={() => onTogglePin(link)}
                            className="p-1 rounded-lg text-(--text-muted) hover:text-(--accent-base) opacity-0 group-hover/row:opacity-100 transition-all cursor-pointer shrink-0"
                            title="Unpin"
                          >
                            <Star className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="hidden lg:flex items-center pointer-events-auto mr-1 md:mr-2">
            <Tooltip
              text={
                (typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__)
                  ? `Offline Mode - Last saved ${
                      lastSyncTime > 0
                        ? (() => {
                            const ago = Math.floor((Date.now() - lastSyncTime) / 1000);
                            if (ago < 60) return "just now";
                            if (ago < 3600) return `${Math.floor(ago / 60)}m ago`;
                            return `${Math.floor(ago / 3600)}h ago`;
                          })()
                        : "cached"
                    }`
                  : (isSyncing || isLoading)
                  ? "Syncing..."
                  : "Sync now"
              }
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) {
                    const isChennai = window.location.hostname.includes("vtopcc");
                    window.open(isChennai ? "https://vtopcc.vit.ac.in/vtop/open/page" : "https://vtop.vit.ac.in/vtop/open/page", "_blank");
                  } else if (onSync && !isSyncing && !isLoading) {
                    onSync();
                  }
                }}
                disabled={(isSyncing || isLoading) && !(typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__)}
                className="flex flex-col items-center justify-center px-1.5 py-0.5 rounded-lg hover:bg-(--bg-hover) transition-colors cursor-pointer text-center disabled:opacity-50 shrink-0 min-w-[24px]"
              >
                <div
                  className={`shrink-0 flex items-center justify-center ${(isSyncing || isLoading) && !(typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) ? "animate-spin" : ""}`}
                >
                  {(typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) ? (
                    <NoInternetIcon className="w-3.5 h-3.5 md:w-4 md:h-4 transition-colors" style={{ color: "var(--accent-base, #3b82f6)" }} />
                  ) : (
                    <Refresh className="w-3.5 h-3.5 md:w-4 md:h-4 text-(--text-muted) hover:text-(--text-main) transition-colors" />
                  )}
                </div>
                {lastSyncTime > 0 && (
                  <span className="text-[9px] font-mono font-bold text-(--text-muted) leading-none mt-0.5">
                    {(() => {
                      const ago = Math.floor(
                        (Date.now() - lastSyncTime) / 1000,
                      );
                      if (ago < 60) return "now";
                      if (ago < 3600) return `${Math.floor(ago / 60)}m`;
                      return `${Math.floor(ago / 3600)}h`;
                    })()}
                  </span>
                )}
              </button>
            </Tooltip>
          </div>

          {((typeof window !== "undefined" && window.location.hostname.includes("vtopcc")) ||
            (typeof document !== "undefined" && document.documentElement.getAttribute("data-campus") === "chennai")) && (
            <div className="flex items-center pointer-events-auto mr-1 md:mr-2">
              <OfficialResourcesMenu />
            </div>
          )}

          <div className={`relative shrink-0 flex items-center justify-center pointer-events-auto ${isOmniboxOpen ? "hidden lg:flex" : ""}`}>
            <button
              id="topbar-profile-btn"
              data-profile-trigger="true"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center focus:outline-none group cursor-pointer transition-all"
              aria-label="Toggle profile menu"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 relative flex items-center justify-center">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 absolute inset-0 rounded-full overflow-hidden shrink-0 border-2 border-(--border-main) group-hover:border-(--accent-base) shadow-sm transition-all duration-200 ease-out flex items-center justify-center bg-(--bg-highlight) ${
                    showProfileMenu
                      ? "opacity-0 scale-90 pointer-events-none"
                      : "opacity-100 scale-100"
                  }`}
                >
                  {user.regNo !== "..." && user.profileImgBase64 ? (
                    <img
                      src={user.profileImgBase64}
                      className="w-full h-full object-cover"
                      alt="Profile"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Person className="w-5 h-5 md:w-6 md:h-6 text-(--text-dim)" />
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
