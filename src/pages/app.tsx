import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
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
  CoursePageOption,
} from "../types/vtop";
import { motion, AnimatePresence } from "framer-motion";

import { TopBar } from "../components/layout/TopBar";
import { ContentRouter } from "../components/layout/ContentRouter";
import { BottomNav } from "../components/layout/BottomNav";
import { FloatingViewToggle } from "../components/timetable/FloatingViewToggle";
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
  | "settings"
  | "coursePage";

const getDestinationView = (link: QuickLink): ViewType | "content" => {
  const lowerTitle = link.title.toLowerCase();
  const lowerUrl = link.url.toLowerCase();

  if (
    lowerTitle.includes("time table") ||
    lowerTitle.includes("timetable") ||
    lowerUrl.includes("timetable") ||
    lowerUrl.includes("studenttimetable")
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
  if (
    lowerTitle.includes("profile view") ||
    lowerTitle.includes("profile") ||
    lowerUrl.includes("studentprofileallview") ||
    lowerUrl.includes("profile")
  )
    return "profile";
  if (
    lowerTitle.includes("course page") ||
    lowerTitle.includes("course") ||
    lowerUrl.includes("coursepage") ||
    lowerUrl.includes("course")
  )
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

const navigateLegacy = (title: string) => {
  const links = Array.from(document.querySelectorAll("a"));
  const target = links.find(
    (el) => el.textContent?.trim() === title || el.innerText?.trim() === title,
  );
  if (target) target.click();
  else console.warn("Legacy link not found for:", title);
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
  const [omniboxInitial, setOmniboxInitial] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { settings, updateSetting } = useSettings();

  const [isModernUI, setIsModernUI] = useState(() => {
    return sessionStorage.getItem("vtop-legacy-mode") !== "true";
  });

  const [isPeeking, setIsPeeking] = useState(false);
  const [currentView, _setCurrentView] = useState<ViewType>(getViewFromHash());
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

  const [cpOptions, setCpOptions] = useState<CoursePageOption[]>([]);
  const [cpSelectedSem, setCpSelectedSem] = useState("");
  const [cpSelectedCourseId, setCpSelectedCourseId] = useState("");

  const networkRef = useRef<VTOPNetwork | null>(null);
  const csrfRef = useRef<string>("");
  const authIdRef = useRef<string>("");

  const isOmniboxOpenRef = useRef(isOmniboxOpen);
  isOmniboxOpenRef.current = isOmniboxOpen;

  const pinnedLinks = settings.pinnedLinks || [];

  const statusColor =
    status === "Online" || status === "Active" ? "bg-lime-400" : "bg-red-500";

  const setCurrentView = (view: ViewType) => {
    if (window.location.hash !== `#${view}`) {
      window.location.hash = view;
    }
  };

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

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#dashboard");
      _setCurrentView("dashboard");
    }
    const handleHashChange = () => _setCurrentView(getViewFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

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
      console.warn("Failed to fetch user profile", err);
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
          setCpSelectedSem(semId);

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
      setContentTitle(link.title);
      setTimeout(() => navigateLegacy(link.title), 50);
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

  return (
    <>
      {isPeeking && (
        <style>{`
          body:not(.show-legacy-ui) #page-wrapper, 
          body:not(.show-legacy-ui) .container-fluid, 
          body:not(.show-legacy-ui) .wrapper, 
          body:not(.show-legacy-ui) body > table, 
          body:not(.show-legacy-ui) body > form {
            opacity: 1 !important;
            pointer-events: auto !important;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
        `}</style>
      )}

      {isModernUI && (
        <div
          className="group fixed top-0 z-150 h-20 pl-6 md:pl-8 flex items-center gap-4 cursor-pointer pointer-events-auto"
          onClick={() => {
            setIsPeeking(false);
            setIsModernUI(false);
          }}
          title="Return to Legacy UI"
        ></div>
      )}

      <AnimatePresence>
        {(isModernUI || isPeeking) && (
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.9, rotateX: 10 }}
            animate={{
              y: isModernUI
                ? isPeeking
                  ? "15%"
                  : "0%"
                : isPeeking
                  ? "65%"
                  : "100%",
              scale: isPeeking ? 0.96 : 1,
              rotateX: isPeeking ? 4 : 0,
              opacity: 1,
              borderRadius: isPeeking ? "2rem" : "0rem",
            }}
            exit={{ y: "100%", opacity: 0, scale: 0.9, rotateX: 10 }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 280,
              mass: 0.8,
            }}
            style={{
              transformPerspective: 1500,
              transformOrigin: "bottom center",
            }}
            className={`fixed inset-0 h-screen font-mono selection:bg-blue-500 selection:text-white flex flex-col overflow-hidden bg-(--bg-main) z-100 ${!isModernUI && isPeeking ? "pointer-events-none" : "pointer-events-auto"} ${isPeeking ? "shadow-[0px_-20px_60px_rgba(0,0,0,0.6)]" : ""}`}
          >
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
                        onLogout={handleLogout}
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

              {/* FIX: Moved BottomNav and FloatingViewToggle inside the motion.div wrapper */}
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
                <FloatingViewToggle
                  viewMode={ttViewMode}
                  setViewMode={setTtViewMode}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isModernUI && (
          <LegacyReturnButton
            onClick={() => {
              setIsPeeking(false);
              setIsModernUI(true);
            }}
            onMouseEnter={() => setIsPeeking(true)}
            onMouseLeave={() => setIsPeeking(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
