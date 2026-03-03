import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Omnibox } from "../components/omnibox";
import { TopBar } from "../components/layout/TopBar";
import { ContentRouter } from "../components/layout/ContentRouter";
import { LegacyReturnButton } from "../components/LegacyReturnButton";
import { motion, AnimatePresence } from "framer-motion";

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { settings, updateSetting } = useSettings();

  const [isModernUI, setIsModernUI] = useState(
    () => sessionStorage.getItem("vtop-legacy-mode") !== "true",
  );
  const [isPeeking, setIsPeeking] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [contentTitle, setContentTitle] = useState("");
  const [status, setStatus] = useState("Initializing...");

  // Data State
  const [stats, setStats] = useState({ cgpa: "...", credits: "..." });
  const [attendance, setAttendance] = useState<CourseSummary[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingClass[]>([]);

  // Timetable State
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

  const statusColor =
    status === "Online" || status === "Active" ? "bg-lime-400" : "bg-red-500";

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

    setUser(scrapeUserProfile(document));
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
      {/* Forces the Legacy UI to be visible during Peek (No White Filter) */}
      {isPeeking && (
        <style>{`
          #page-wrapper, .container-fluid, .wrapper, body > table, body > form {
            opacity: 1 !important;
            pointer-events: auto !important;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
        `}</style>
      )}

      {/* FIXED LOGO TRIGGER: Stays physically detached from the animating UI */}
      {isModernUI && (
        <div
          className="group fixed top-0 z-150 h-20 px-6 md:px-8 flex items-center gap-4 cursor-pointer pointer-events-auto"
          onMouseEnter={() => setIsPeeking(true)}
          onMouseLeave={() => setIsPeeking(false)}
          onClick={() => {
            setIsPeeking(false);
            setIsModernUI(false);
          }}
          title="Return to Legacy UI"
        >
          {currentView !== "dashboard" && <div className="w-10 shrink-0" />}
          <div className="flex flex-col justify-center h-full gap-0.5">
            <div className="flex items-center gap-3">
              <div className="relative flex items-baseline">
                {/* Text uses difference blending to stay visible when background changes */}
                <span
                  className={`font-expanded font-black text-[2.5rem] tracking-tighter italic lowercase leading-none select-none transition-all duration-300 ${isPeeking ? "text-white mix-blend-difference" : "text-(--text-main)"}`}
                >
                  re
                </span>
                <div className="relative w-3.5 h-3.5 ml-0.5 mb-1">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-3.5 w-3.5 ${statusColor}`}
                  ></span>
                  <div
                    className={`absolute left-1/2 top-full mt-3 -translate-x-1/2 px-2.5 py-1 bg-(--bg-highlight) text-(--text-main) text-[9px] font-bold uppercase tracking-widest rounded-md border border-(--border-dim) pointer-events-none whitespace-nowrap z-100 shadow-xl transition-opacity duration-200 ${isPeeking ? "opacity-0" : "opacity-0 group-hover:opacity-100"}`}
                  >
                    {status}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-(--bg-highlight) border-t border-l border-(--border-dim) rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
            <Omnibox
              isOpen={isOmniboxOpen}
              onClose={() => setIsOmniboxOpen(false)}
              menuCategories={menu}
              onNavigate={handleLinkClick}
            />
            <div className="flex flex-col h-full pointer-events-auto">
              <TopBar
                currentView={currentView}
                contentTitle={contentTitle}
                status={status}
                ttCourses={ttCourses}
                ttLoading={ttLoading}
                ttSemesters={ttSemesters}
                ttSelectedSem={ttSelectedSem}
                ttViewMode={ttViewMode}
                setTtViewMode={setTtViewMode}
                loadTimetable={loadTimetable}
                user={user}
                showProfileMenu={showProfileMenu}
                setShowProfileMenu={setShowProfileMenu}
                handleLinkClick={handleLinkClick}
                handleLogout={handleLogout}
                setIsModernUI={setIsModernUI}
                setIsOmniboxOpen={setIsOmniboxOpen}
                setCurrentView={setCurrentView}
              />
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
                    />
                  </motion.div>
                </AnimatePresence>
              </main>
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
