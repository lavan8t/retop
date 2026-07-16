import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useDataStore } from "../store/dataStore";
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
import { getCachedData, setCachedData } from "../utils/cache";
import { scrapeMenu, scrapeUserProfile } from "../parsers/menu";
import {
  parseAcademicStats,
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
  ViewType,
} from "../types/vtop";
import { motion, AnimatePresence } from "framer-motion";

import { TopBar } from "../components/layout/TopBar";
import { TopBarSearch } from "../components/layout/TopBarSearch";
import { ContentRouter } from "../components/layout/ContentRouter";

import { FloatingViewToggle } from "../components/timetable/FloatingViewToggle";
import {
  getUpcomingClasses,
  UpcomingClass,
  getCorrectDayName,
} from "../utils/timetable-slots";
import { useSettings, applyTheme } from "../utils/settings-store";
import { LegacyReturnButton } from "../components/LegacyReturnButton";
import { SnackbarManager } from "../components/ui/Snackbar";


const getDestinationView = (link: QuickLink): ViewType | "content" => {
  const lowerTitle = link.title.toLowerCase();
  const lowerUrl = link.url.toLowerCase();

  if (lowerTitle === "home" || lowerTitle === "dashboard" || lowerUrl.includes("home")) {
    return "dashboard";
  }

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
    lowerUrl.includes("mark")
  )
    return "marks";
  if (
    lowerTitle.includes("grade") ||
    lowerUrl.includes("grade")
  )
    return "grades";
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
  if (
    lowerTitle.includes("calendar") ||
    lowerUrl.includes("processviewcalendar") ||
    lowerUrl.includes("calendarpreview")
  )
    return "calendar";
  if (
    lowerTitle.includes("attendance") ||
    lowerUrl.includes("studentattendance")
  )
    return "attendance";
  if (
    lowerTitle.includes("digital assignment") ||
    lowerTitle.includes("digital assignment upload") ||
    lowerTitle.includes("assignment") ||
    lowerUrl.includes("studentda")
  )
    return "digitalAssignments";

  return "content";
};

// Using the Session Storage routing we built previously
const getSavedView = (): ViewType => {
  const saved = sessionStorage.getItem("vtop-retop-view");
  const validViews = [
    "dashboard",
    "content",
    "timetable",
    "curriculum",
    "marks",
    "grades",
    "profile",
    "settings",
    "coursePage",
    "calendar",
    "attendance",
    "digitalAssignments",
  ];
  return validViews.includes(saved as ViewType)
    ? (saved as ViewType)
    : "dashboard";
};

const navigateLegacy = (title: string) => {
  const links = Array.from(document.querySelectorAll("a"));
  const target = links.find(
    (el) => el.textContent?.trim() === title || el.innerText?.trim() === title,
  );
  if (target) target.click();
  else console.warn("Legacy link not found for:", title);
};
import { useAppStore } from "../store/appStore";

export function renderDashboard() {
  initializeContainer();
  const rootEl = getAppRoot();
  if (rootEl) {
    if ((rootEl as any)._reactRoot) {
      (rootEl as any)._reactRoot.render(
          <DashboardApp />
      );
    } else {
      const root = createRoot(rootEl);
      (rootEl as any)._reactRoot = root;
      root.render(
          <DashboardApp />
      );
    }
  }
}

const DashboardApp = () => {
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [omniboxInitial, setOmniboxInitial] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { settings, updateSetting } = useSettings();

  const {
    isModernUI,
    setIsModernUI,
    isPeeking,
    setIsPeeking,
    currentView,
    setCurrentView,
    ttViewMode,
    setTtViewMode
  } = useAppStore();

  const [contentTitle, setContentTitle] = useState("");

  const {
    user,
    setUser,
    status,
    stats,
    attendance,
    assignments,
    events,
    upcoming,
    ttSemesters,
    ttSelectedSem,
    ttCourses,
    ttLoading,
    cpSelectedSem,
    setCpSelectedSem,
    calSemesters,
    setCalSemesters,
    calSelectedSem,
    setCalSelectedSem,
    calClassGroups,
    calSelectedGroup,
    setCalSelectedGroup,
    calGridData,
    fetchUserProfile,
    fetchDashboardData,
    loadTimetable,
    syncDashboard,
  } = useDataStore();


  const networkRef = useRef<VTOPNetwork | null>(null);
  const csrfRef = useRef<string>("");
  const authIdRef = useRef<string>("");

  const isOmniboxOpenRef = useRef(isOmniboxOpen);
  isOmniboxOpenRef.current = isOmniboxOpen;

  const currentViewRef = useRef(currentView);
  currentViewRef.current = currentView;

  const pinnedLinks = settings.pinnedLinks || [];

  const handleTogglePin = (link: QuickLink) => {
    const dest = getDestinationView(link);
    if (dest === "content") {
      alert("Only retop exclusive native pages can be pinned to the dock.");
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
    if (status !== "Initializing..." && status !== "Syncing...") {
      setIsInitialLoad(false);
    }
  }, [status]);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }

    if (!window.history.state?.view) {
      window.history.replaceState(
        { view: getSavedView() },
        "",
        window.location.pathname + window.location.search,
      );
    }

    const handlePopState = (e: PopStateEvent) => {
      const view = e.state?.view || "dashboard";
      setCurrentView(view);
      sessionStorage.setItem("vtop-retop-view", view);
    };

    const handleOpenSettings = () => {
      if ((window as any).__RETOP_OFFLINE__) {
        setCurrentView("settings");
      } else if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
        window.open(chrome.runtime.getURL("dist/offline.html"), "_blank");
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("retop-open-settings", handleOpenSettings);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("retop-open-settings", handleOpenSettings);
    };
  }, [isModernUI]);

  useEffect(() => {
    applyTheme(settings);

    const authIdInput = document.getElementById(
      "authorizedIDX",
    ) as HTMLInputElement;
    const authId = authIdInput?.value;
    const htmlContent = document.documentElement.innerHTML;
    const csrfMatch = htmlContent.match(/csrfValue\s*=\s*"([^"]+)"/);
    const csrf = (csrfMatch ? csrfMatch[1] : (window as any).csrfValue) || "";

    if (!authId || !csrf) {
      revealLegacyUI();
      return;
    }

    csrfRef.current = csrf;
    authIdRef.current = authId;
    networkRef.current = new VTOPNetwork(csrf, authId);

    const userProfile = scrapeUserProfile(document);
    setUser(userProfile);
    
    // Cache for offline mode
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["retop_profileImage"], (res) => {
        chrome.storage.local.set({
          "retop_lastAuthId": userProfile.regNo,
          "retop_lastName": userProfile.name,
          "retop_profileImage": userProfile.profileImgBase64 || res.retop_profileImage || "",
        });
      });
    }

    fetchDashboardData(networkRef.current, csrf, authId);
    fetchUserProfile(networkRef.current);

    let menuPoller: ReturnType<typeof setInterval> | undefined;
    let feedbackPoller: ReturnType<typeof setInterval> | undefined;

    if ((window as any).__RETOP_OFFLINE__) {
      getCachedData<MenuCategory[]>(`${authId}_vtop_menu`).then(cachedMenu => {
        if (cachedMenu && cachedMenu.length > 0) {
          setMenu(cachedMenu);
        }
      });
    } else {
      let attempts = 0;
      menuPoller = setInterval(() => {
        attempts++;
        const newMenu = scrapeMenu(document);
        const count = newMenu.reduce((acc, cat) => acc + cat.links.length, 0);
        
        setMenu((prev) => {
          const prevCount = prev.reduce((acc, cat) => acc + cat.links.length, 0);
          if (count > prevCount) {
            setCachedData(`${authId}_vtop_menu`, newMenu);
            return newMenu;
          }
          return prev;
        });
        
        if (count === 0 && attempts > 5) {
          console.log("[retop] Menu items are unfetchable. Falling back to legacy UI.");
          clearInterval(menuPoller);
          revealLegacyUI();
          setIsModernUI(false);
          return;
        }

        if (count >= 102 || attempts > 15) clearInterval(menuPoller);
      }, 2000);

      feedbackPoller = setInterval(() => {
        try {
          const bodyClone = document.body.cloneNode(true) as HTMLElement;
          const sidebars = bodyClone.querySelectorAll("nav, .sidebar, #sidebar, [class*='menu'], .hmenu");
          sidebars.forEach(s => s.remove());
          
          const mainText = bodyClone.textContent?.toLowerCase() || "";
          const isFeedback = mainText.includes("faculty feedback") || 
                             mainText.includes("student feedback") || 
                             mainText.includes("course feedback") ||
                             mainText.includes("mandatory feedback") ||
                             mainText.includes("provide feedback");
                             
          if (isFeedback) {
            const hasInputs = document.querySelectorAll("input[type='radio'], textarea, select").length > 0;
            if (hasInputs) {
              console.log("[retop] Mandatory feedback or blocking form detected in background. Triggering legacy UI.");
              clearInterval(feedbackPoller);
              revealLegacyUI();
              setIsModernUI(false);
            }
          }
        } catch (e) {}
      }, 3000);
    }

    const handleKeys = (e: KeyboardEvent) => {
      // Get target element resolving through shadow DOM
      const targetEl = (
        e.composedPath ? e.composedPath()[0] : e.target
      ) as HTMLElement;

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

      if (isInput(targetEl)) return;
      if (isOmniboxOpenRef.current) {
        if (e.key !== "Escape" && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("vtop-omnibox-type", { detail: e.key }));
        }
        return;
      }
      if (e.key === "Escape") return;

      const shouldOpen = e.key === " ";

      if (shouldOpen) {
        e.preventDefault();
        isOmniboxOpenRef.current = true;
        setOmniboxInitial("");
        setIsOmniboxOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeys);

    const restoreHandler = () => setIsModernUI(true);
    window.addEventListener("vtop-restore-ui", restoreHandler);

    const scrollHideTimeouts = new Map<HTMLElement, any>();
    const handleScroll = (e: Event) => {
      const target = (e.composedPath ? e.composedPath()[0] : e.target) as HTMLElement;
      if (
        target &&
        target.classList &&
        (target.classList.contains("custom-scrollbar") ||
          (typeof target.className === "string" && target.className.includes("overflow-")))
      ) {
        if (!target.hasAttribute("data-scrolling")) {
          target.setAttribute("data-scrolling", "true");
        }

        const existingHideTimeout = scrollHideTimeouts.get(target);
        if (existingHideTimeout) clearTimeout(existingHideTimeout);
        scrollHideTimeouts.set(target, setTimeout(() => {
          target.removeAttribute("data-scrolling");
          scrollHideTimeouts.delete(target);
        }, 3000));
      }
    };
    document.addEventListener("scroll", handleScroll, true);

    return () => {
      clearInterval(menuPoller);
      clearInterval(feedbackPoller);
      window.removeEventListener("keydown", handleKeys);
      window.removeEventListener("vtop-restore-ui", restoreHandler);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  useEffect(() => {
    setUIVisibility(isModernUI);
    sessionStorage.setItem("vtop-legacy-mode", (!isModernUI).toString());
  }, [isModernUI]);

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

  const handleLogout = async () => {
    try {
      await fetch("/vtop/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          _csrf: csrfRef.current,
          authorizedID: authIdRef.current,
        }),
      });
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      localStorage.removeItem("retop_lastAuthId");
      window.location.href = "/vtop/open/page";
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

      {/* Main Modern UI - Always rendered to preserve state, just animated off-screen when hidden */}
      <motion.div
        initial={{ y: "100%", opacity: 0, scale: 0.9, rotateX: 10 }}
        animate={{
          y: isModernUI
            ? isPeeking
              ? "-15%"
              : "0%"
            : isPeeking
              ? "65%"
              : "100%",
          scale: isModernUI ? (isPeeking ? 0.96 : 1) : isPeeking ? 0.96 : 0.9,
          rotateX: isModernUI ? (isPeeking ? -4 : 0) : isPeeking ? 4 : 10,
          opacity: isModernUI ? 1 : isPeeking ? 1 : 0,
          borderRadius: isPeeking ? "2rem" : "0rem",
        }}
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
        className={`fixed inset-0 h-screen font-mono selection:bg-blue-500 selection:text-white flex flex-col overflow-hidden bg-(--bg-main) z-100 ${!isModernUI ? "pointer-events-none" : "pointer-events-auto"} ${isPeeking ? "shadow-[0px_-20px_60px_rgba(0,0,0,0.6)]" : ""}`}
      >
        <div className="flex flex-col h-full pointer-events-auto overflow-hidden">
          <TopBar
            currentView={currentView}
            contentTitle={contentTitle}
            showProfileMenu={showProfileMenu}
            setShowProfileMenu={setShowProfileMenu}
            handleLinkClick={handleLinkClick}
            handleLogout={handleLogout}
            isOmniboxOpen={isOmniboxOpen}
            setIsOmniboxOpen={setIsOmniboxOpen}
            setCurrentView={setCurrentView}
            pinnedLinks={pinnedLinks}
            menuCategories={menu}
            onTogglePin={handleTogglePin}
            onNavigate={handleLinkClick}
            initialQuery={omniboxInitial}
            onTimetableSemChange={(semId) => {
              if (networkRef.current && csrfRef.current && authIdRef.current) {
                loadTimetable(networkRef.current, csrfRef.current, authIdRef.current, semId, true).catch(console.warn);
              }
            }}
            onSync={() => {
              if (networkRef.current && csrfRef.current && authIdRef.current) {
                syncDashboard(networkRef.current, csrfRef.current, authIdRef.current);
              }
            }}
            network={networkRef.current}
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
                  menu={menu}
                  handleLinkClick={handleLinkClick}
                  events={events}
                  pinnedLinks={pinnedLinks}
                  handleTogglePin={handleTogglePin}
                />
              </motion.div>
            </AnimatePresence>
          </main>

          <AnimatePresence>
            {showProfileMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-9998 bg-transparent"
                  onClick={() => setShowProfileMenu(false)}
                />
                <ProfileMenu
                  userName={user.name}
                  userRegNo={user.regNo}
                  userProfileImg={user.profileImgBase64}
                  onNavigate={handleLinkClick}
                  onLogout={handleLogout}
                  onLegacyToggle={() => {
                    setIsPeeking(false);
                    setIsModernUI(false);
                  }}
                  onLegacyHover={() => setIsPeeking(true)}
                  onLegacyLeave={() => setIsPeeking(false)}
                  onClose={() => setShowProfileMenu(false)}
                />
              </>
            )}
          </AnimatePresence>
          {currentView === "timetable" && !isOmniboxOpen && (
            <FloatingViewToggle
              viewMode={ttViewMode}
              setViewMode={setTtViewMode}
            />
          )}
          <SnackbarManager />
        </div>
      </motion.div>
      
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

      <AnimatePresence>
        {!isModernUI && isOmniboxOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-99999 w-[600px] max-w-[90vw] pointer-events-auto flex flex-col"
          >
            {/* Backdrop to close when clicked outside */}
            <div 
              className="fixed inset-0 z-[-1] bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOmniboxOpen(false)}
            />
            <div className="bg-(--bg-surface) rounded-[32px] shadow-2xl border-2 border-(--border-main) flex flex-col p-2 h-auto relative">
              <TopBarSearch
                currentView={currentView}
                isOmniboxOpen={isOmniboxOpen}
                setIsOmniboxOpen={setIsOmniboxOpen}
                menuCategories={menu}
                pinnedLinks={pinnedLinks}
                onNavigate={(link) => {
                  handleLinkClick(link);
                  setIsModernUI(true);
                  setIsPeeking(false);
                }}
                onTogglePin={handleTogglePin}
                initialQuery={omniboxInitial}
                pageTitle="Search Retop..."
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
