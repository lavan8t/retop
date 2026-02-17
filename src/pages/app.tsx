import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Omnibox } from "../components/omnibox";
import { ProfileMenu } from "../components/profile-menu";
import {
  initializeContainer,
  getAppRoot,
  setUIVisibility,
  revealLegacyUI,
  createHiddenForm,
  removeSplashScreen,
} from "../utils/bridge";
import { VTOPNetwork } from "../utils/network";
import { scrapeMenu, scrapeUserProfile } from "../parsers/menu";
import {
  parseCGPA,
  parseCredits,
  parseDigitalAssignments,
  parseCourseDetails,
} from "../parsers/dashboard";
import { parseSemesters, parseTimetable } from "../parsers/timetable";
import {
  QuickLink,
  MenuCategory,
  CourseSummary,
  Assignment,
  TimetableCourse,
  Semester,
} from "../types/vtop";
import {
  Menu,
  ArrowLeft,
  Loader2,
  LayoutGrid,
  List,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { HomeView } from "./home";
import { TimetableContentView } from "./timetable";
import { SettingsPage } from "./settings";
import { CurriculumPage } from "./curriculum";
import { MarksPage } from "./marks";
import { ProfilePage } from "./profile";
import { SemesterDropdown } from "../components/timetable/SemesterDropdown";
import {
  getUpcomingClasses,
  UpcomingClass,
  getCorrectDayName,
} from "../utils/timetable-slots";
import { useSettings, applyTheme } from "../utils/settings-store";

type ViewType =
  | "dashboard"
  | "content"
  | "timetable"
  | "curriculum"
  | "marks"
  | "profile"
  | "settings";

const getPageTitle = (view: ViewType, dynamicTitle?: string) => {
  switch (view) {
    case "dashboard":
      return "HOME";
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

  return "content";
};

const navigateLegacy = (title: string) => {
  const links = Array.from(document.querySelectorAll("a"));
  const target = links.find(
    (el) => el.textContent?.trim() === title || el.innerText?.trim() === title,
  );
  if (target) target.click();
  else {
    console.warn("Legacy link not found for:", title);
    alert(`Could not automatically open "${title}" in Legacy UI.`);
  }
};

export function renderDashboard() {
  initializeContainer();

  const rootEl = getAppRoot();

  if (rootEl && !rootEl.hasChildNodes()) {
    const root = createRoot(rootEl);
    root.render(<DashboardApp />);
  }
}

const DashboardApp = () => {
  const [user, setUser] = useState({ name: "Student", regNo: "..." });
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [isModernUI, setIsModernUI] = useState(true);
  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { settings, updateSetting } = useSettings();

  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [contentTitle, setContentTitle] = useState("");
  const [status, setStatus] = useState("Initializing...");

  const [stats, setStats] = useState({ cgpa: "...", credits: "..." });
  const [attendance, setAttendance] = useState<CourseSummary[]>([]);
  const [avgAttendance, setAvgAttendance] = useState<number | string>("...");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingClass[]>([]);

  const [ttSemesters, setTtSemesters] = useState<Semester[]>([]);
  const [ttSelectedSem, setTtSelectedSem] = useState("");
  const [ttCourses, setTtCourses] = useState<TimetableCourse[]>([]);
  const [ttLoading, setTtLoading] = useState(true);
  const [ttViewMode, setTtViewMode] = useState<"grid" | "list">("grid");

  const [pageContent, setPageContent] = useState("");

  const networkRef = useRef<VTOPNetwork | null>(null);
  const csrfRef = useRef<string>("");
  const authIdRef = useRef<string>("");

  useEffect(() => {
    applyTheme(settings);

    const authIdInput = document.getElementById(
      "authorizedIDX",
    ) as HTMLInputElement;
    const authId = authIdInput?.value;
    const htmlContent = document.documentElement.innerHTML;
    const csrfMatch = htmlContent.match(/csrfValue\s*=\s*"([^"]+)"/);
    const csrf = csrfMatch ? csrfMatch[1] : "";

    if (!authId || !csrf) {
      revealLegacyUI();
      return;
    }

    csrfRef.current = csrf;
    authIdRef.current = authId;
    networkRef.current = new VTOPNetwork(csrf, authId);

    const userProfile = scrapeUserProfile(document);
    setUser(userProfile);

    fetchData().then(() => setTimeout(() => removeSplashScreen(), 500));

    let attempts = 0;
    const menuPoller = setInterval(() => {
      attempts++;
      const newMenu = scrapeMenu(document);
      const count = newMenu.reduce((acc, cat) => acc + cat.links.length, 0);
      setMenu((prev) =>
        count > prev.reduce((acc, cat) => acc + cat.links.length, 0)
          ? newMenu
          : prev,
      );
      if (count >= 102 || attempts > 15) clearInterval(menuPoller);
    }, 2000);

    const handleKeys = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setIsOmniboxOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeys);

    const restoreHandler = () => setIsModernUI(true);
    window.addEventListener("vtop-restore-ui", restoreHandler);

    return () => {
      clearInterval(menuPoller);
      window.removeEventListener("keydown", handleKeys);
      window.removeEventListener("vtop-restore-ui", restoreHandler);
    };
  }, []);

  useEffect(() => {
    setUIVisibility(isModernUI);
  }, [isModernUI]);

  useEffect(() => {
    if (attendance.length > 0) {
      const total = attendance.reduce((acc, curr) => {
        const val = parseFloat(curr.attendance);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      setAvgAttendance(Math.ceil(total / attendance.length));
    } else {
      setAvgAttendance("N/A");
    }
  }, [attendance]);

  const fetchData = async () => {
    if (!networkRef.current) return;
    try {
      setStatus("Syncing...");
      const [eduHTML, attHTML, daHTML] = await Promise.all([
        networkRef.current.fetchFragment("get/dashboard/current/cgpa/credits"),
        networkRef.current.fetchFragment(
          "get/dashboard/current/semester/course/details",
        ),
        networkRef.current.fetchFragment("get/upcoming/digital/assignments"),
      ]);

      setStats({ cgpa: parseCGPA(eduHTML), credits: parseCredits(eduHTML) });
      setAttendance(parseCourseDetails(attHTML));
      setAssignments(parseDigitalAssignments(daHTML));

      try {
        const semHTML = await networkRef.current.fetchFragment(
          "academics/common/StudentTimeTable",
        );
        const sems = parseSemesters(semHTML);
        if (sems.length > 0) {
          const semId = sems[0].id;
          setTtSemesters(sems);
          setTtSelectedSem(semId);
          await loadTimetable(semId);
        }
      } catch (e) {
        console.warn(e);
      }

      setStatus("Online");
    } catch {
      setStatus("Sync Failed");
    }
  };

  const loadTimetable = async (semId: string) => {
    if (!networkRef.current) return;
    setTtLoading(true);
    setTtSelectedSem(semId);
    try {
      const url = "/vtop/processViewTimeTable";
      const body = new URLSearchParams();
      body.append("_csrf", csrfRef.current);
      body.append("authorizedID", authIdRef.current);
      body.append("semesterSubId", semId);
      body.append("x", new Date().toUTCString());

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: body,
      });
      const html = await res.text();
      const parsed = parseTimetable(html).filter(
        (c) =>
          !c.status.toLowerCase().includes("drop") &&
          !c.status.toLowerCase().includes("withdrawn"),
      );
      setTtCourses(parsed);
      setUpcoming(getUpcomingClasses(parsed));
    } catch (err) {
      console.error(err);
    } finally {
      setTtLoading(false);
    }
  };

  const handleLinkClick = async (link: QuickLink) => {
    setIsOmniboxOpen(false);
    setShowProfileMenu(false);

    if (!isModernUI) {
      navigateLegacy(link.title);
      return;
    }
    if (link.url === "#settings" || link.title.toLowerCase() === "settings") {
      setCurrentView("settings");
      return;
    }
    if (!networkRef.current) return;

    const dest = getDestinationView(link);
    if (dest !== "content") {
      setCurrentView(dest);
      return;
    }

    setCurrentView("content");
    setContentTitle(link.title.toUpperCase());
    setPageContent("");

    try {
      setStatus(`Fetching ${link.title}...`);
      const html = await networkRef.current.fetchFragment(link.url);
      const cleanHtml = html.replace(
        /<script\b[^>]*>([\s\S]*?)<\/script>/gm,
        "",
      );
      setPageContent(cleanHtml);
      setStatus("Active");
    } catch {
      setPageContent(
        '<div class="p-10 text-rose-500 font-expanded font-bold text-center border-4 border-rose-500 rounded-3xl m-4 bg-rose-950/30">Failed to load content.</div>',
      );
    }
  };

  const handleLogout = () => {
    if (confirm("Sign out?")) {
      createHiddenForm("/vtop/logout", {
        _csrf: csrfRef.current,
        authorizedID: authIdRef.current,
      }).submit();
    }
  };

  const renderNavbarRight = () => {
    return (
      <div className="flex items-center gap-3">
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
            <div className="flex bg-zinc-900 border-2 border-zinc-700 rounded-xl p-1 gap-1">
              <button
                onClick={() => setTtViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${ttViewMode === "grid" ? "bg-blue-500 text-white shadow-sm" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTtViewMode("list")}
                className={`p-1.5 rounded-lg transition-all ${ttViewMode === "list" ? "bg-blue-500 text-white shadow-sm" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <div className="w-0.5 h-8 bg-zinc-800 mx-1"></div>
          </motion.div>
        )}

        <button
          onClick={() => setIsOmniboxOpen(true)}
          className="hidden lg:flex items-center gap-3 px-3 py-2 bg-zinc-900 border-2 border-zinc-800 rounded-full text-zinc-400 hover:border-blue-500 hover:text-white transition-all group shadow-lg active:scale-95"
        >
          <Menu className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="font-bold text-xs tracking-widest uppercase">
            Menu
          </span>
          <kbd className="ml-2 font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 text-[10px] rounded-lg border border-zinc-700 group-hover:text-white group-hover:border-zinc-600">
            /
          </kbd>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 focus:outline-none group"
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-zinc-200 uppercase tracking-wider group-hover:text-blue-400 transition-colors">
                {user.regNo}
              </div>
            </div>
            <div className="w-10 h-10 border-2 border-blue-500 rounded-full overflow-hidden bg-zinc-800 shadow-[0px_0px_10px_rgba(59,130,246,0.5)] group-hover:shadow-[0px_0px_15px_rgba(59,130,246,0.8)] group-hover:scale-105 transition-all duration-300">
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
    );
  };

  const renderContent = () => {
    if (!networkRef.current) return null;
    switch (currentView) {
      case "dashboard":
        return (
          <HomeView
            showProgress={settings.showSemesterProgress}
            stats={stats}
            attendance={attendance}
            avgAttendance={avgAttendance}
            assignments={assignments}
            upcoming={upcoming}
            dayName={getCorrectDayName(new Date())}
          />
        );
      case "timetable":
        return (
          <TimetableContentView
            courses={ttCourses}
            loading={ttLoading}
            viewMode={ttViewMode}
          />
        );
      case "curriculum":
        return (
          <CurriculumPage
            onBack={() => setCurrentView("dashboard")}
            network={networkRef.current}
          />
        );
      case "marks":
        return (
          <MarksPage
            onBack={() => setCurrentView("dashboard")}
            network={networkRef.current}
          />
        );
      case "profile":
        return <ProfilePage network={networkRef.current} />;
      case "settings":
        return (
          <SettingsPage settings={settings} updateSetting={updateSetting} />
        );
      case "content":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="h-full overflow-y-auto custom-scrollbar px-4 md:px-8 py-8 max-w-[1600px] mx-auto"
          >
            <div className="bg-zinc-900 border-4 border-zinc-800 rounded-[2rem] shadow-sm min-h-[80vh] flex flex-col relative overflow-hidden">
              <div className="flex-1 p-6 lg:p-8 overflow-x-auto">
                {pageContent ? (
                  <div
                    className="legacy-content-wrapper text-zinc-300 font-sans"
                    dangerouslySetInnerHTML={{ __html: pageContent }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 font-mono animate-pulse">
                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
                    <span className="text-xl font-bold font-expanded mb-0">
                      FETCHING DATA STREAM...
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const statusColor =
    status === "Online" || status === "Active" ? "bg-lime-400" : "bg-red-500";

  return (
    <div
      className={`min-h-screen font-mono selection:bg-blue-500 selection:text-white flex flex-col transition-all duration-300 ${isModernUI ? "bg-zinc-950 text-slate-200 opacity-100 pointer-events-auto" : "bg-transparent text-transparent opacity-0 pointer-events-none"}`}
      style={
        !isModernUI && isOmniboxOpen
          ? {
              pointerEvents: "auto",
              opacity: 1,
              backgroundColor: "transparent",
            }
          : {}
      }
    >
      <Omnibox
        isOpen={isOmniboxOpen}
        onClose={() => setIsOmniboxOpen(false)}
        menuCategories={menu}
        onNavigate={handleLinkClick}
      />
      <div
        className={`flex flex-col h-full ${!isModernUI ? "hidden" : "flex"}`}
      >
        <header className="h-20 bg-zinc-950 border-b-4 border-zinc-800 sticky top-0 z-[100] px-6 md:px-8 flex items-center justify-between shadow-xl shrink-0">
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
                className="w-10 h-10 flex items-center justify-center bg-zinc-900 border-2 border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-blue-500 transition-all active:scale-90"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            )}
            <div className="flex flex-col justify-center h-full gap-0.5">
              <div className="flex items-center gap-3">
                <div className="relative group/logo">
                  <div className="w-8 h-8 bg-blue-500 border-2 border-black text-black flex items-center justify-center font-expanded font-black text-lg rounded-lg shadow-[2px_2px_0px_0px_#fff] mb-0">
                    V
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 border-2 border-black ${statusColor}`}
                    ></span>
                  </span>
                  <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 px-2.5 py-1 bg-zinc-800 text-zinc-200 text-[9px] font-bold uppercase tracking-widest rounded-md border border-zinc-700 opacity-0 group-hover/logo:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl">
                    {status}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-t border-l border-zinc-700 rotate-45"></div>
                  </div>
                </div>

                <h1 className="font-expanded font-black text-3xl text-zinc-200 tracking-tight uppercase truncate max-w-[50vw] leading-none mt-1 mb-0">
                  {getPageTitle(currentView, contentTitle)}
                </h1>
              </div>
              {currentView === "timetable" ? (
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 ml-11 mb-0">
                  {ttCourses.length} COURSES REGISTERED
                </p>
              ) : null}
            </div>
          </div>
          {renderNavbarRight()}
        </header>
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              className="h-full w-full"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
