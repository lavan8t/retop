import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Omnibox } from "../components/omnibox";
import { TopBar } from "../components/layout/TopBar";
import { ContentRouter } from "../components/layout/ContentRouter";
import { BottomNav } from "../components/layout/BottomNav";
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

// Import our Mock Data
import * as MockData from "../utils/mock-data";

// Import styles directly here since this is now the entry point
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

const getDestinationView = (link: QuickLink): ViewType | "content" => {
  const lowerTitle = link.title.toLowerCase();
  const lowerUrl = link.url.toLowerCase();

  if (
    lowerTitle.includes("time table") ||
    lowerUrl.includes("studenttimetable")
  )
    return "timetable";
  if (lowerTitle.includes("curriculum")) return "curriculum";
  if (lowerTitle.includes("mark") || lowerTitle.includes("grade"))
    return "marks";
  if (
    lowerTitle.includes("profile view") ||
    lowerUrl.includes("studentprofileallview")
  )
    return "profile";
  if (lowerTitle.includes("course page") || lowerUrl.includes("coursepage"))
    return "coursePage";

  return "content";
};

// --- HASH ROUTING UTILITY ---
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
  const [user, setUser] = useState({
    name: MockData.MOCK_USER.name,
    regNo: MockData.MOCK_USER.regNo,
  });
  const [menu, setMenu] = useState<MenuCategory[]>(MockData.MOCK_MENU);
  const [stats, setStats] = useState(MockData.MOCK_STATS);
  const [attendance, setAttendance] = useState<CourseSummary[]>(
    MockData.MOCK_ATTENDANCE,
  );
  const [assignments, setAssignments] = useState<Assignment[]>(
    MockData.MOCK_ASSIGNMENTS,
  );

  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [omniboxInitial, setOmniboxInitial] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [status, setStatus] = useState("Mock Online");
  const { settings, updateSetting } = useSettings();

  // --- STATE MODIFIED FOR HASH ROUTING ---
  // Initialize state directly from the URL hash
  const [currentView, _setCurrentView] = useState<ViewType>(getViewFromHash());

  // Wrapper function: Navigating sets the hash, which triggers the state update via event listener
  const setCurrentView = (view: ViewType) => {
    if (window.location.hash !== `#${view}`) {
      window.location.hash = view;
    }
  };

  useEffect(() => {
    // Ensure we have a baseline hash for the back stack to register against
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#dashboard");
      _setCurrentView("dashboard");
    }

    // Listen for browser Back/Forward navigation to update the UI
    const handleHashChange = () => {
      _setCurrentView(getViewFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  // ----------------------------------------

  const [ttSemesters, setTtSemesters] = useState<Semester[]>(
    MockData.MOCK_SEMESTERS,
  );
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

  const [cpOptions, setCpOptions] = useState<CoursePageOption[]>(
    MockData.MOCK_COURSE_OPTIONS,
  );
  const [cpSelectedSem, setCpSelectedSem] = useState(
    MockData.MOCK_SEMESTERS[0]?.id || "",
  );
  const [cpSelectedCourseId, setCpSelectedCourseId] = useState("");

  const networkRef = useRef<any>({ isMockMode: true });
  const isOmniboxOpenRef = useRef(isOmniboxOpen);
  isOmniboxOpenRef.current = isOmniboxOpen;

  useEffect(() => {
    applyTheme(settings);

    const handleKeys = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const targetEl = e.target as HTMLElement;

      const isInput = (el: HTMLElement | null) => {
        if (!el) return false;
        const tag = el.tagName?.toUpperCase();
        return (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          el.isContentEditable
        );
      };

      if (isInput(activeEl) || isInput(targetEl)) return;
      if (isOmniboxOpenRef.current) return;
      if (e.key === "Escape") return;

      if (currentView !== "dashboard") {
        if (
          e.key === "/" ||
          (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
        ) {
          e.preventDefault();
          isOmniboxOpenRef.current = true;
          setOmniboxInitial(e.key === "/" ? "" : e.key);
          setIsOmniboxOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [currentView, settings]);

  const loadTimetable = async (semId: string) => {
    setTtLoading(true);
    setTtSelectedSem(semId);
    setTimeout(() => {
      setTtCourses(MockData.MOCK_TIMETABLE);
      setUpcoming(getUpcomingClasses(MockData.MOCK_TIMETABLE));
      setTtLoading(false);
    }, 400);
  };

  const handleLinkClick = async (link: QuickLink) => {
    setIsOmniboxOpen(false);
    setShowProfileMenu(false);

    if (link.url === "#settings" || link.title.toLowerCase() === "settings") {
      setCurrentView("settings");
      return;
    }

    const dest = getDestinationView(link);

    if (dest === "content") {
      alert(
        "This legacy page link is not available in the standalone mock environment.",
      );
      return;
    }

    setCurrentView(dest);
  };

  const handleLogout = () => {
    alert("Logout clicked! (Disabled in mock environment)");
  };

  return (
    <>
      <div className="fixed inset-0 h-screen font-mono selection:bg-blue-500 selection:text-white flex flex-col overflow-hidden bg-(--bg-main) z-0 pointer-events-auto">
        <Omnibox
          isOpen={isOmniboxOpen}
          initialQuery={omniboxInitial}
          onClose={() => setIsOmniboxOpen(false)}
          menuCategories={menu}
          onNavigate={handleLinkClick}
        />

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
            handleLogout={handleLogout}
            setIsOmniboxOpen={setIsOmniboxOpen}
            setCurrentView={setCurrentView}
          />

          <main className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                className="h-full w-full flex flex-col overflow-hidden"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
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
                  setCpOptions={setCpOptions}
                  cpSelectedSem={cpSelectedSem}
                  cpSelectedCourseId={cpSelectedCourseId}
                  setCpSelectedCourseId={setCpSelectedCourseId}
                />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
    </>
  );
};

// --- DOM MOUNTING LOGIC ---
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <DashboardApp />
    </React.StrictMode>,
  );
}
