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
import { parseStudentProfile } from "../parsers/profile";
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
  Calendar,
  RefreshCw,
  BookOpen,
  GraduationCap,
  User,
  Settings,
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
import { LegacyReturnButton } from "../components/LegacyReturnButton";

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
      return "re.";
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
  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { settings, updateSetting } = useSettings();

  const [isModernUI, setIsModernUI] = useState(() => {
    return sessionStorage.getItem("vtop-legacy-mode") !== "true";
  });

  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [contentTitle, setContentTitle] = useState("");
  const [status, setStatus] = useState("Initializing...");

  const [stats, setStats] = useState({ cgpa: "...", credits: "..." });
  const [attendance, setAttendance] = useState<CourseSummary[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingClass[]>([]);

  const [ttSemesters, setTtSemesters] = useState<Semester[]>([]);
  const [ttSelectedSem, setTtSelectedSem] = useState("");
  const [ttCourses, setTtCourses] = useState<TimetableCourse[]>([]);
  const [ttLoading, setTtLoading] = useState(true);
  const [ttViewMode, setTtViewMode] = useState<"grid" | "list" | "week">(
    "grid",
  );

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
    fetchUserProfile();

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
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) &&
        currentView !== "dashboard"
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
  }, [currentView]);

  useEffect(() => {
    setUIVisibility(isModernUI);
    sessionStorage.setItem("vtop-legacy-mode", (!isModernUI).toString());
  }, [isModernUI]);

  const fetchUserProfile = async () => {
    if (!networkRef.current) return;
    try {
      const html = await networkRef.current.fetchWithCache(
        "student_profile_data",
        async () => {
          return await networkRef.current!.fetchFragment(
            "studentsRecord/StudentProfileAllView",
          );
        },
      );

      const profile = parseStudentProfile(html);
      if (profile?.basic?.name) {
        setUser((prev) => ({
          ...prev,
          name: profile.basic.name,
          regNo: profile.basic.regNo || prev.regNo,
        }));
      }
    } catch (err) {
      console.warn("Failed to silently fetch user profile for name", err);
    }
  };

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

    if (link.url === "#settings" || link.title.toLowerCase() === "settings") {
      setIsModernUI(true);
      setCurrentView("settings");
      return;
    }

    const dest = getDestinationView(link);

    if (dest === "content") {
      setIsModernUI(false);
      setTimeout(() => {
        navigateLegacy(link.title);
      }, 50);
      return;
    }

    if (!networkRef.current) return;
    setIsModernUI(true);
    setCurrentView(dest);
  };

  const handleLogout = () => {
    if (confirm("Sign out?")) {
      createHiddenForm("/vtop/logout", {
        _csrf: csrfRef.current,
        authorizedID: authIdRef.current,
      }).submit();
    }
  };

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

  const renderNavbarRight = () => {
    return (
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
            <div className="w-1 h-8 bg-[var(--border-dim)] rounded-full mx-2"></div>
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
            <div className="flex bg-(--bg-surface) border-2 border-[var(--border-dim)] rounded-xl p-1 gap-1">
              <button
                onClick={() => setTtViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${ttViewMode === "grid" ? "bg-[var(--accent-base)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-highlight)]"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTtViewMode("list")}
                className={`p-1.5 rounded-lg transition-all ${ttViewMode === "list" ? "bg-[var(--accent-base)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-highlight)]"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTtViewMode("week")}
                className={`p-1.5 rounded-lg transition-all ${ttViewMode === "week" ? "bg-[var(--accent-base)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-highlight)]"}`}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
            <div className="w-0.5 h-8 bg-[var(--border-dim)] mx-1"></div>
          </motion.div>
        )}

        {currentView !== "dashboard" && (
          <button
            onClick={() => setIsOmniboxOpen(true)}
            className="hidden lg:flex items-center gap-3 px-3 py-2 bg-(--bg-surface) border-2 border-(--border-main) rounded-full text-[var(--text-muted)] hover:border-[var(--accent-base)] hover:text-[var(--text-main)] transition-all group shadow-lg active:scale-95 cursor-pointer"
          >
            <Menu className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="font-bold text-xs tracking-widest uppercase">
              Menu
            </span>
            <kbd className="ml-2 font-mono bg-[var(--bg-highlight)] text-[var(--text-muted)] px-2 py-0.5 text-[10px] rounded-lg border border-[var(--border-dim)] group-hover:text-[var(--text-main)] group-hover:border-(--border-main)">
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
              <div className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider group-hover:text-[var(--accent-hover)] transition-colors">
                {user.name !== "Student" ? user.name : user.regNo}
              </div>
              {user.name !== "Student" && (
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold -mt-0.5">
                  {user.regNo}
                </div>
              )}
            </div>
            <div className="w-10 h-10 border-2 border-[var(--accent-base)] rounded-full overflow-hidden bg-[var(--bg-highlight)] shadow-[0px_0px_10px_var(--accent-base)] group-hover:shadow-[0px_0px_15px_var(--accent-hover)] group-hover:scale-105 transition-all duration-300">
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
            assignments={assignments}
            upcoming={upcoming}
            dayName={getCorrectDayName(new Date())}
            menuCategories={menu}
            onNavigate={handleLinkClick}
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
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] font-mono animate-pulse pointer-events-auto">
            <Loader2 className="w-16 h-16 text-[var(--accent-base)] animate-spin mb-4" />
            <span className="text-xl font-bold font-expanded mb-0">
              LAUNCHING LEGACY SYSTEM...
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const statusColor =
    status === "Online" || status === "Active" ? "bg-lime-400" : "bg-red-500";

  return (
    <>
      <AnimatePresence>
        {isModernUI && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 35,
              stiffness: 300,
              mass: 0.8,
            }}
            className="fixed inset-0 h-screen font-mono selection:bg-blue-500 selection:text-white flex flex-col transition-opacity duration-300 overflow-hidden pointer-events-auto bg-[var(--bg-main)] z-[100]"
          >
            <Omnibox
              isOpen={isOmniboxOpen}
              onClose={() => setIsOmniboxOpen(false)}
              menuCategories={menu}
              onNavigate={handleLinkClick}
            />
            <div className="flex flex-col h-full pointer-events-auto">
              <header className="h-20 bg-[var(--bg-main)] border-b-4 border-(--border-main) sticky top-0 z-[100] px-6 md:px-8 flex items-center justify-between shadow-xl shrink-0">
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
                      className="w-10 h-10 flex items-center justify-center bg-(--bg-surface) border-2 border-[var(--border-dim)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-base)] transition-all active:scale-90 shrink-0 cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </motion.button>
                  )}
                  <div className="flex flex-col justify-center h-full gap-0.5">
                    <div className="flex items-center gap-3">
                      <div className="relative group/logo">
                        <div className="w-8 h-8 bg-[var(--accent-base)] border-2 border-(--border-main) text-white flex items-center justify-center font-expanded font-black text-lg rounded-lg shadow-[2px_2px_0px_0px_var(--text-main)] mb-0">
                          V
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`}
                          ></span>
                          <span
                            className={`relative inline-flex rounded-full h-3 w-3 border-2 border-(--border-main) ${statusColor}`}
                          ></span>
                        </span>
                        <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 px-2.5 py-1 bg-[var(--bg-highlight)] text-[var(--text-main)] text-[9px] font-bold uppercase tracking-widest rounded-md border border-[var(--border-dim)] opacity-0 group-hover/logo:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl">
                          {status}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[var(--bg-highlight)] border-t border-l border-[var(--border-dim)] rotate-45"></div>
                        </div>
                      </div>

                      <h1 className="font-expanded font-black text-3xl text-[var(--text-main)] tracking-tight uppercase truncate max-w-[200px] sm:max-w-[40vw] leading-none mt-1 mb-0 lowercase">
                        {getPageTitle(currentView, contentTitle)}
                      </h1>
                    </div>
                    {currentView === "timetable" ? (
                      <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5 ml-11 mb-0">
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
                    className="h-full w-full flex flex-col"
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isModernUI && (
          <LegacyReturnButton onClick={() => setIsModernUI(true)} />
        )}
      </AnimatePresence>
    </>
  );
};
