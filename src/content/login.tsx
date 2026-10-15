/**
 * Login takeover — deferred ESM entry loaded by src/content.ts.
 *
 * Runs after the bootstrapper already cancelled the native document and attached
 * the shadow root, so this file only has to style it and render the shared
 * VtopLoginCard. Same component the offline PWA and the standalone extension
 * page use: one validation implementation, one CAPTCHA solver, one login client.
 */
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { VtopLoginCard } from "../components/auth/VtopLoginCard";
import { AsciiPanel } from "../components/asciiArt";
import {
  initializeContainer,
  getAppRoot,
  adoptExtensionStyles,
  setUIVisibility,
  injectGlobalFonts,
} from "../utils/bridge";
import { applyTheme, useSettingsStore } from "../utils/settings-store";
import { getExtUrl } from "../utils/url";
import { setStorageData } from "../utils/storageAdapter";
import { getVtopBaseUrl } from "../utils/vtopClient";
import {
  readRole,
  readRoleSync,
  setRole,
  RetopRole,
  isOwnableRole,
} from "../utils/roleStore";
import type { CachedUser } from "../utils/syncOrchestrator";
import type { VtopClient } from "../utils/vtopClient";

const GSF: React.CSSProperties = {
  fontFamily: "'Google Sans Flex', system-ui, sans-serif",
};

const isChennaiHost = () => window.location.hostname.includes("vtopcc");

/**
 * Header the old injected theme built on top of #vtopOpenPageHeader: the VIT
 * emblem, swapped for the retop mark, and the campus label on the right.
 */
const BrandHeader: React.FC = () => {
  const campusLabel = isChennaiHost() ? "CHENNAI CAMPUS" : "VELLORE CAMPUS";
  const emblem = getExtUrl("dist/assets/vitLogo.svg");

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-10 flex items-center gap-4 px-6 sm:px-10 py-3"
      style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-main)" }}
    >
      <img src={emblem} alt="VIT" style={{ height: "44px", width: "auto" }} />
      <span
        className="text-xs font-bold tracking-widest"
        style={GSF}
      >
        {campusLabel}
      </span>
    </nav>
  );
};

/** Bottom-left escape hatch the old theme exposed for the offline PWA. */
const OfflineLink: React.FC = () => (
  <a
    href="https://getretop.web.app/"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-5 left-6 z-10 text-xs font-bold text-(--text-muted) hover:text-(--text-main) no-underline transition-colors"
    style={GSF}
  >
    No internet?
  </a>
);

const RoleGate: React.FC<{ role: RetopRole }> = ({ role }) => {
  const label = role === "alumni" ? "Alumni" : "Parent";

  return (
    <div className="w-full max-w-md mx-auto text-left">
      <div className="card-header loginBoxBorder mb-4">
        <h4 style={GSF}>{label} portal</h4>
        <p id="retop-welcome-text">Sign in on VTOP</p>
      </div>
      <p
        className="text-sm text-(--text-muted) mb-6"
        style={{ fontFamily: "'Google Sans Flex', system-ui, sans-serif" }}
      >
        {label} accounts still sign in on the native {label.toLowerCase()} form.
        Your retop role is saved, so every other VTOP page uses the modern UI.
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="btn btn-primary cursor-pointer active:scale-98 transition-all"
          onClick={() => window.location.reload()}
        >
          <span>CONTINUE ON VTOP</span>
        </button>
        <button
          type="button"
          className="text-xs text-(--text-muted) hover:text-(--text-main) font-medium cursor-pointer transition-colors"
          onClick={async () => {
            await setRole("student");
            window.location.reload();
          }}
        >
          Switch back to student
        </button>
      </div>
    </div>
  );
};

const LoginTakeover: React.FC = () => {
  const [role, setRoleState] = useState<RetopRole>(() => readRoleSync());

  useEffect(() => {
    let cancelled = false;
    readRole().then((stored) => {
      if (!cancelled) setRoleState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoginSuccess = async (user: CachedUser, client: VtopClient) => {
    const regNo = user.regNo || client.registrationNumber;
    const record = {
      retop_active_user: regNo,
      retop_lastAuthId: regNo,
      retop_last_campus: client.campus,
    };

    await setStorageData(record).catch(() => {});
    try {
      localStorage.setItem("retop_active_user", regNo);
      localStorage.setItem("retop_lastAuthId", regNo);
    } catch {}

    // The session cookie is already live; hand the browser to VTOP's own landing
    // page so the dashboard entry boots on a fully parsed authenticated document.
    const landing = client.landingUrl || `${getVtopBaseUrl(client.campus)}/vtop/content`;
    window.location.assign(landing);
  };

  if (!isOwnableRole(role)) {
    return <RoleGate role={role} />;
  }

  return (
    <div
      className="min-h-screen w-screen bg-(--bg-main) text-(--text-main) flex flex-col lg:flex-row overflow-x-hidden selection:bg-(--accent-base)/30 selection:text-(--text-main)"
      style={GSF}
    >
      <BrandHeader />
      <OfflineLink />

      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-4 pt-24 pb-16 sm:px-8 lg:px-16 z-10">
        <div className="w-full max-w-md mx-auto">
          <VtopLoginCard
            initialCampus={isChennaiHost() ? "chennai" : "vellore"}
            title="retop"
            subtitle="Welcome back."
            syncAfterLogin={false}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
        <button
          type="button"
          className="mt-6 text-xs text-(--text-muted) hover:text-(--text-main) font-medium cursor-pointer transition-colors"
          onClick={async () => {
            await setRole("parent");
            window.location.reload();
          }}
        >
          Parent or alumni? Sign in on VTOP
        </button>
      </div>

      <div className="hidden lg:flex w-1/2 min-h-screen relative overflow-hidden bg-(--bg-surface) flex-col items-center justify-center border-l border-(--border-main)/40">
        <div className="absolute inset-0 z-0">
          <AsciiPanel campus={isChennaiHost() ? "chennai" : "vellore"} />
        </div>
      </div>
    </div>
  );
};

export async function mountLoginTakeover(): Promise<void> {
  // Reuse the host and shadow root the bootstrapper already created, but skip
  // its <link> so both stylesheets can be installed before the first render.
  initializeContainer({ includeAppStylesheet: false });

  const rootEl = getAppRoot();
  if (!rootEl) {
    console.warn("[retop] Login takeover: shadow root unavailable");
    return;
  }

  // Paint the saved theme rather than the default. The dashboard entry does this
  // from IndexedDB; here the zustand persist store rehydrates from the same key.
  try {
    await useSettingsStore.persist.rehydrate();
    applyTheme(useSettingsStore.getState().settings);
  } catch (err) {
    console.warn("[retop] Login takeover: theme rehydrate failed:", err);
  }

  const shadow = rootEl.getRootNode() as ShadowRoot;
  // @font-face inside a shadow root's adopted stylesheet never loads: it does not
  // join the document's font set, so no woff2 is fetched and every rule falls back
  // to system-ui. The faces must be declared in the document head, which is what
  // the old injected login theme did via injectGlobalFonts().
  injectGlobalFonts();
  await adoptExtensionStyles(shadow, ["dist/style.css", "dist/login.css"]);

  // initializeContainer parks both host and root at pointer-events: none for the
  // dashboard case, where clicks must fall through to legacy VTOP. Here retop owns
  // the whole document, so hand the pointer events back.
  setUIVisibility(true);

  document.title = isChennaiHost() ? "retop Chennai" : "retop";

  createRoot(rootEl).render(<LoginTakeover />);
}

mountLoginTakeover().catch((err) => {
  console.error("[retop] Login takeover mount failed:", err);
  // The bootstrapper already destroyed the native document, so un-mounting in
  // place would leave a blank page. Reload once with the bypass armed instead.
  try {
    sessionStorage.setItem("retop-login-bypass", "1");
  } catch {}
  window.location.reload();
});