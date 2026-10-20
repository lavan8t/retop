import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { DashboardApp } from "./pages/app";
import { VtopLoginCard } from "./components/auth/VtopLoginCard";
import { AsciiPanel } from "./components/asciiArt";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { applyTheme, DEFAULT_SETTINGS } from "./utils/settings-store";
import { getStorageData, setStorageData } from "./utils/storageAdapter";
import { CachedUser } from "./utils/syncOrchestrator";
import { VtopClient, VtopCampus } from "./utils/vtopClient";
import { get as idbGet } from "idb-keyval";

// Mark global standalone flag
(window as any).__RETOP_STANDALONE__ = true;

// Apply theme immediately
try {
  applyTheme(DEFAULT_SETTINGS);
} catch {}

const GSF: React.CSSProperties = {
  fontFamily: "'Google Sans Flex', system-ui, sans-serif",
};

const StandaloneRoot: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [campus, setCampus] = useState<VtopCampus>("vellore");

  useEffect(() => {
    // 1. Load theme from settings
    idbGet("retop-settings").then((savedSettings) => {
      if (savedSettings) {
        let parsed = savedSettings;
        if (typeof savedSettings === "string") {
          try {
            parsed = JSON.parse(savedSettings);
          } catch {}
        }
        const s = parsed?.state?.settings || parsed;
        if (s) applyTheme(s);
      }
    }).catch(() => {});

    // 2. Check for active student session or cached credentials
    getStorageData([
      "retop_active_user",
      "retop_lastAuthId",
      "retop_last_campus",
    ]).then((res) => {
      const activeUser =
        (res.retop_active_user as string) ||
        (res.retop_lastAuthId as string) ||
        localStorage.getItem("retop_active_user") ||
        localStorage.getItem("retop_lastAuthId");

      const savedCampus =
        (res.retop_last_campus as VtopCampus) ||
        (localStorage.getItem("retop_campus") as VtopCampus) ||
        "vellore";

      setCampus(savedCampus);

      if (activeUser && activeUser.length >= 3) {
        setupDomForUser(activeUser);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoggedIn(false);
      setIsLoading(false);
    });
  }, []);

  const setupDomForUser = (regNo: string, csrf?: string) => {
    (window as any).authorizedID = regNo;
    (window as any).csrfValue = csrf || (window as any).csrfValue || "retop_csrf";

    let authInput = document.getElementById("authorizedIDX") as HTMLInputElement;
    if (!authInput) {
      authInput = document.createElement("input");
      authInput.type = "hidden";
      authInput.id = "authorizedIDX";
      document.body.appendChild(authInput);
    }
    authInput.value = regNo;
  };

  const handleLoginSuccess = async (user: CachedUser, client: VtopClient) => {
    setupDomForUser(user.regNo, client.csrf);

    localStorage.setItem("retop_active_user", user.regNo);
    localStorage.setItem("retop_lastAuthId", user.regNo);
    localStorage.setItem("retop_campus", client.campus);

    await setStorageData({
      retop_active_user: user.regNo,
      retop_lastAuthId: user.regNo,
      retop_last_campus: client.campus,
    });

    setIsLoggedIn(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen bg-(--bg-main) flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-(--accent-base) border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <ErrorBoundary variant="fullscreen" name="retop App">
        <DashboardApp />
      </ErrorBoundary>
    );
  }

  return (
    <div
      className="min-h-screen w-screen bg-(--bg-main) text-(--text-main) flex flex-col lg:flex-row overflow-x-hidden selection:bg-(--accent-base)/30 selection:text-(--text-main)"
      style={GSF}
    >
      {/* Left 50% Column: Form (.container-fluid / #loginBox) */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:px-8 lg:px-16 z-10">
        <div className="w-full max-w-md mx-auto">
          <VtopLoginCard
            initialCampus={campus}
            title="retop"
            subtitle="vtop login"
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      </div>

      {/* Right 50% Column: ASCII Art Animation (Large screens only) */}
      <div className="hidden lg:flex w-1/2 min-h-screen relative overflow-hidden bg-(--bg-surface) flex-col items-center justify-center border-l border-(--border-main)/40">
        <div className="absolute inset-0 z-0 flex items-end justify-end">
          <AsciiPanel campus={campus} />
        </div>
      </div>
    </div>
  );
};

// Mount to document
const container = document.getElementById("root") || document.body;
const root = createRoot(container);
root.render(<StandaloneRoot />);
