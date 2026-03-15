import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { TopBar } from "../components/layout/TopBar";
import { ContentRouter } from "../components/layout/ContentRouter";
import { BottomNav } from "../components/layout/BottomNav";
import { FloatingViewToggle } from "../components/timetable/FloatingViewToggle";
import { ProfileMenu } from "../components/profile-menu";
import {
  getUpcomingClasses,
  UpcomingClass,
  getCorrectDayName,
} from "../utils/timetable-slots";
import { useSettings, applyTheme } from "../utils/settings-store";
import {
  QuickLink,
  MenuCategory,
  CourseSummary,
  Assignment,
  TimetableCourse,
  Semester,
  CoursePageOption,
} from "../types/vtop";
import { motion, AnimatePresence } from "framer-motion";

import * as MockData from "../utils/mock-data";
import "../input.css";

export type ViewType =
  | "dashboard"
  | "content"
  | "timetable"
  | "curriculum"
  | "marks"
  | "profile"
  | "settings"
  | "coursePage";

export const getDestinationView = (link: QuickLink): ViewType | "content" => {
  const lowerTitle = link.title.toLowerCase();
  const lowerUrl = link.url.toLowerCase();

  if (
    lowerTitle.includes("time table") ||
    lowerTitle.includes("timetable") ||
    lowerUrl.includes("timetable")
  )
    return "timetable";
  if (lowerTitle.includes("curriculum") || lowerUrl.includes("curriculum"))
    return "curriculum";
  if (
    lowerTitle.includes("mark") ||
    lowerTitle.includes("grade") ||
    lowerUrl.includes("mark")
  )
    return "marks";
  if (lowerTitle.includes("profile") || lowerUrl.includes("profile"))
    return "profile";
  if (lowerTitle.includes("course") || lowerUrl.includes("course"))
    return "coursePage";

  return "content";
};

const getViewFromHash = (): ViewType => {
  const hash = window.location.hash.replace("#", "");
  const validViews = [
    "dashboard",
    "content",
    "timetable",
    "curriculum",
    "marks",
    "profile",
    "settings",
    "coursePage",
  ];
  return validViews.includes(hash) ? (hash as ViewType) : "dashboard";
};

export const DashboardApp = () => {
  const [user] = useState({
    name: MockData.MOCK_USER.name,
    regNo: MockData.MOCK_USER.regNo,
  });
  const [menu] = useState<MenuCategory[]>(MockData.MOCK_MENU);
  const [stats] = useState(MockData.MOCK_STATS);
  const [attendance] = useState<CourseSummary[]>(MockData.MOCK_ATTENDANCE);
  const [assignments] = useState<Assignment[]>(MockData.MOCK_ASSIGNMENTS);

  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [omniboxInitial, setOmniboxInitial] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [status] = useState("Mock Online");
  const { settings, updateSetting } = useSettings();

  const [currentView, _setCurrentView] = useState<ViewType>(getViewFromHash());

  const pinnedLinks = settings.pinnedLinks || [];

  const handleTogglePin = (link: QuickLink) => {
    const dest = getDestinationView(link);
    if (dest === "content") {
      alert("Only ReTop exclusive native pages can be pinned to the dock.");
      return;
    }

    const isAlreadyPinned = pinnedLinks.some(
      (p) => getDestinationView(p) === dest,
    );

    if (isAlreadyPinned) {
      const newPins = pinnedLinks.filter((p) => getDestinationView(p) !== dest);
      updateSetting("pinnedLinks", newPins);
    } else {
      if (pinnedLinks.length >= 3) {
        alert("You can only pin up to 3 custom items.");
        return;
      }
      updateSetting("pinnedLinks", [...pinnedLinks, link]);
    }
  };

  const setCurrentView = (view: ViewType) => {
    if (window.location.hash !== `#${view}`) {
      window.location.hash = view;
    }
  };

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#dashboard");
      _setCurrentView("dashboard");
    }
    const handleHashChange = () => _setCurrentView(getViewFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const [ttSemesters] = useState<Semester[]>(MockData.MOCK_SEMESTERS);
  const [ttSelectedSem, setTtSelectedSem] = useState(
    MockData.MOCK_SEMESTERS[0]?.id || "",
  );
  const [ttCourses, setTtCourses] = useState<TimetableCourse[]>(
    MockData.MOCK_TIMETABLE,
  );
  const [upcoming, setUpcoming] = useState<UpcomingClass[]>(
    getUpcomingClasses(MockData.MOCK_TIMETABLE),
  );
  const [ttLoading, setTtLoading] = useState(false);
  const [ttViewMode, setTtViewMode] = useState<"grid" | "list" | "week">(
    "grid",
  );

  const [cpOptions] = useState<CoursePageOption[]>(
    MockData.MOCK_COURSE_OPTIONS,
  );
  const [cpSelectedSem, setCpSelectedSem] = useState(
    MockData.MOCK_SEMESTERS[0]?.id || "",
  );
  const [cpSelectedCourseId, setCpSelectedCourseId] = useState("");

  const networkRef = useRef<any>({ isMockMode: true });

  useEffect(() => {
    applyTheme(settings);
    const handleKeys = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        isOmniboxOpen
      )
        return;
      if (currentView !== "dashboard") {
        if (e.key === "/" || (e.key.length === 1 && !e.ctrlKey && !e.metaKey)) {
          e.preventDefault();
          setOmniboxInitial(e.key === "/" ? "" : e.key);
          setIsOmniboxOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [currentView, settings, isOmniboxOpen]);

  const loadTimetable = async (semId: string) => {
    setTtLoading(true);
    setTtSelectedSem(semId);
    setTimeout(() => {
      setTtLoading(false);
    }, 400);
  };

  const handleLinkClick = async (link: QuickLink) => {
    setIsOmniboxOpen(false);
    setShowProfileMenu(false);
    if (link.url === "#settings") {
      setCurrentView("settings");
      return;
    }
    const dest = getDestinationView(link);
    if (dest === "content") {
      alert("Legacy views are restricted in this mock.");
      return;
    }
    setCurrentView(dest);
  };

  return (
    <>
      <div className="fixed inset-0 h-screen font-mono selection:bg-blue-500 selection:text-white flex flex-col overflow-hidden bg-(--bg-main) z-0 pointer-events-auto">
        <div className="flex flex-col h-full pointer-events-auto overflow-hidden">
          <TopBar
            currentView={currentView}
            contentTitle={""}
            status={status}
            ttCourses={ttCourses}
            ttLoading={ttLoading}
            ttSemesters={ttSemesters}
            ttSelectedSem={ttSelectedSem}
            ttViewMode={ttViewMode}
            setTtViewMode={setTtViewMode}
            loadTimetable={loadTimetable}
            cpSelectedSem={cpSelectedSem}
            setCpSelectedSem={setCpSelectedSem}
            setCpSelectedCourseId={setCpSelectedCourseId}
            user={user}
            showProfileMenu={showProfileMenu}
            setShowProfileMenu={setShowProfileMenu}
            handleLinkClick={handleLinkClick}
            handleLogout={() => {}}
            setIsOmniboxOpen={setIsOmniboxOpen}
            setCurrentView={setCurrentView}
            pinnedLinks={pinnedLinks}
          />

          <main className="flex-1 overflow-hidden relative">
            <AnimatePresence>
              {showProfileMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <ProfileMenu
                    userName={user.name}
                    onNavigate={handleLinkClick}
                    onLogout={() => {}}
                    onClose={() => setShowProfileMenu(false)}
                  />
                </>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                className="h-full w-full flex flex-col overflow-hidden"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <ContentRouter
                  currentView={currentView}
                  networkRef={networkRef}
                  settings={settings}
                  updateSetting={updateSetting}
                  stats={stats}
                  attendance={attendance}
                  assignments={assignments}
                  upcoming={upcoming}
                  dayName={getCorrectDayName(new Date())}
                  menu={menu}
                  handleLinkClick={handleLinkClick}
                  ttCourses={ttCourses}
                  ttLoading={ttLoading}
                  ttViewMode={ttViewMode}
                  setTtViewMode={setTtViewMode}
                  cpOptions={cpOptions}
                  setCpOptions={() => {}}
                  cpSelectedSem={cpSelectedSem}
                  cpSelectedCourseId={cpSelectedCourseId}
                  setCpSelectedCourseId={setCpSelectedCourseId}
                />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <BottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        pinnedLinks={pinnedLinks}
        onNavigate={handleLinkClick}
        getDestinationView={getDestinationView}
        isOmniboxOpen={isOmniboxOpen}
        setIsOmniboxOpen={setIsOmniboxOpen}
        menuCategories={menu}
        initialQuery={omniboxInitial}
        onTogglePin={handleTogglePin}
      />

      {currentView === "timetable" && !isOmniboxOpen && (
        <FloatingViewToggle viewMode={ttViewMode} setViewMode={setTtViewMode} />
      )}
    </>
  );
};

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <DashboardApp />
    </React.StrictMode>,
  );
}
