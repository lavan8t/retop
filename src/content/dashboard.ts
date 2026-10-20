/**
 * Dashboard entry — deferred ESM entry loaded by src/content.ts.
 *
 * Owns every VTOP route retop does not take over at document_start: authenticated
 * content pages, and the native sign-in pages of parent/alumni roles that retop
 * deliberately leaves alone.
 *
 * Login is not handled here. VtopLoginCard, VtopClient and the CAPTCHA solver all
 * live behind the login takeover entry; see src/content/login.tsx.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { renderDashboard } from "../pages/app";
import { scrapeMenu } from "../parsers/menu";
import { injectLegacyMenuSearch } from "../components/legacy/injectLegacyMenuSearch";
import { injectRoleSwitcher } from "../components/legacy/injectRoleSwitcher";
import {
  injectGlobalFonts,
  initializeContainer,
  injectSplashScreen,
  removeSplashScreen,
  cleanupLegacyHMenuBar,
  setUIVisibility,
} from "../utils/bridge";
import { NativePortals } from "../components/NativePortals";
import { VIT_EMBLEM_SVG_RAW } from "../components/common/VitEmblemSvg";
import { interceptDashboardResponse } from "../utils/dashboardInterceptor";
import { applyTheme } from "../utils/settings-store";
import { get as idbGet, entries as idbEntries } from "idb-keyval";
import { readRole, isOwnableRole, RetopRole } from "../utils/roleStore";

const AUTH_ROUTES = ["/vtop/content", "/vtop/main", "/vtop/process"];

const LOGIN_ROUTES = [
  "/vtop/open/page",
  "/vtop/open/login",
  "/vtop/login",
  "/vtop/vtopLogin",
  "/vtop/prelogin",
  "/vtop/init/page",
];

const path = window.location.pathname;

const matches = (routes: string[]) => routes.some((r) => path.includes(r));

const isAuthRoute = matches(AUTH_ROUTES);
const isLoginRoute = matches(LOGIN_ROUTES);

// Mirror IndexedDB cache to chrome.storage.local for offline tab access.
// Cache writes already go there, so this is only a safety net for old IDB-only
// entries; running it on every VTOP navigation duplicated megabytes per page.
const MIRROR_STAMP_KEY = "retop_idb_mirrored_at";
const MIRROR_INTERVAL_MS = 5 * 60 * 1000;

let lastMirror = Date.now();
try {
  lastMirror = Number(localStorage.getItem(MIRROR_STAMP_KEY) || 0);
} catch {}

if (
  Date.now() - lastMirror > MIRROR_INTERVAL_MS &&
  typeof chrome !== "undefined" &&
  chrome.storage &&
  chrome.storage.local &&
  typeof indexedDB !== "undefined"
) {
  idbEntries()
    .then((entries) => {
      if (entries && entries.length > 0) {
        const payload: Record<string, any> = {};
        for (const [k, v] of entries) {
          if (typeof k === "string") payload[k] = v;
        }
        return chrome.storage.local.set(payload).then(() => {
          try {
            localStorage.setItem(MIRROR_STAMP_KEY, String(Date.now()));
          } catch {}
        });
      }
    })
    .catch(() => {});
}

const vtopContext = {
  csrf: "",
  authId: "",
};

// Apply theme immediately to prevent flashing, but strictly ignore /open/page
const decodeStoragePayload = (str: any): string => {
  if (typeof str !== "string") return str;
  try {
    if (str.startsWith("enc_")) {
      return decodeURIComponent(atob(str.slice(4)));
    }
    return str;
  } catch {
    return str;
  }
};

const parseSettingsPayload = (raw: any): any => {
  if (!raw) return null;
  try {
    if (typeof raw === "string") {
      const decoded = decodeStoragePayload(raw);
      const parsed = JSON.parse(decoded);
      return (
        parsed?.state?.settings ||
        parsed?.settings ||
        (parsed?.defaultView ? parsed : null)
      );
    }
    return raw?.state?.settings || raw?.settings || (raw?.defaultView ? raw : null);
  } catch {
    return null;
  }
};

const applyThemeFromSettings = (saved: any) => {
  try {
    const settings = parseSettingsPayload(saved);
    if (!settings) return;
    applyTheme(settings);
  } catch (err) {
    console.warn("[retop] Failed to apply theme:", err);
  }
};

try {
  idbGet("retop-settings")
    .then((saved) => {
      if (saved) {
        applyThemeFromSettings(saved);
      }
    })
    .catch(() => {});
} catch (e) {}

// The bootstrapper already cloaked the document for these roles; add the emblem
// loader so the wait reads as retop rather than a blank page.
if (isAuthRoute && isOwnableRole(localStorage.getItem("retop-user-role") || "student")) {
  injectSplashScreen(true);
}

// Enhance native VTOP processLoader whenever it appears (only on authenticated content)
function enhanceProcessLoader(el: HTMLElement) {
  if (!isAuthRoute) return;

  if (document.getElementById("retop-open-loader")) {
    // Splash screen is already handling early load
    return;
  }
  if (!el.querySelector(".vit-emblem-splash")) {
    el.innerHTML = `<div class="vit-emblem-splash" style="width:210px;height:210px;display:flex;align-items:center;justify-content:center;">${VIT_EMBLEM_SVG_RAW}</div>`;
  }
}

if (typeof document !== "undefined") {
  const initProcessLoaderObserver = () => {
    const existing = document.getElementById("processLoader");
    if (existing) enhanceProcessLoader(existing);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.id === "processLoader") {
              enhanceProcessLoader(node);
            } else {
              const nested = node.querySelector?.("#processLoader") as HTMLElement | null;
              if (nested) enhanceProcessLoader(nested);
            }
          }
        }
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProcessLoaderObserver, { once: true });
  } else {
    initProcessLoaderObserver();
  }
}

const originalFetch = window.fetch.bind(window);

let isHandlingNetworkError = false;

function showErrorSnackbar(message: string) {
  window.dispatchEvent(
    new CustomEvent("retop-toast", {
      detail: { message, type: "error" },
    }),
  );
}

async function handleNetworkError(status?: number) {
  if (isHandlingNetworkError) return;
  isHandlingNetworkError = true;
  if (status === 404) {
    showErrorSnackbar("E404: Something went wrong.");
  } else if (status === 401 || status === 403) {
    showErrorDialog(
      "Session Expired",
      "Your VTOP session has expired. Please login again to continue.",
      "Return to Login",
      "/vtop/open/page",
    );
  } else {
    showErrorSnackbar("An unexpected network error occurred.");
  }
  isHandlingNetworkError = false;
}

function showErrorDialog(
  title: string,
  message: string,
  btnText: string,
  btnAction: string,
) {
  if (document.getElementById("retop-session-dialog")) return;

  const dialog = document.createElement("div");
  dialog.id = "retop-session-dialog";
  dialog.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    z-index: 999999999; display: flex; flex-direction: column;
    pointer-events: none;
    font-family: 'Google Sans Flex', system-ui, sans-serif !important;
  `;

  const formattedMessage = message.replace(
    /VTOP/g,
    '<span style="font-family: \'Times New Roman\', Times, serif !important; font-weight: 700 !important;">VTOP</span>',
  );

  const parsedDoc = new DOMParser().parseFromString(
    `
    <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(239, 68, 68, 0.2), transparent, transparent); pointer-events: none;"></div>

    <div style="margin-top: auto; width: 100%; display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 24px 48px; box-sizing: border-box; pointer-events: auto; background: linear-gradient(to top, var(--bg-main, #000) 40%, transparent);">

      <div style="display: flex; align-items: center; gap: 16px;">
        <span class="material-symbols-rounded" style="color: #ef4444; font-size: 40px;">warning</span>
        <div style="display: flex; flex-direction: column; text-align: right;">
          <h1 style="font-size: 24px; font-weight: 900; color: var(--text-main, #fff); margin: 0; text-transform: uppercase; font-family: 'Google Sans Flex', sans-serif; line-height: 1;">${title}</h1>
          <p style="font-size: 14px; font-family: monospace; color: #f87171; margin: 6px 0 0; max-width: 600px; white-space: pre-wrap;">${formattedMessage}</p>
        </div>
      </div>

      <button id="retop-error-action-btn" style="display: flex; align-items: center; gap: 8px; background: var(--accent-base, #2563eb); color: var(--text-inverse, #ffffff); border: none; padding: 12px 24px; border-radius: 9999px; font-weight: 700; font-size: 14px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); transition: background 0.2s;" onmouseover="this.style.filter='brightness(1.2)'" onmouseout="this.style.filter='none'">
        <span class="material-symbols-rounded" style="font-size: 18px;">autorenew</span>
        ${btnText}
      </button>

    </div>
  `,
    "text/html",
  );
  while (parsedDoc.body.firstChild) {
    dialog.appendChild(parsedDoc.body.firstChild);
  }

  document.body.appendChild(dialog);

  const btn = document.getElementById("retop-error-action-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      if (btnAction === "reload") window.location.reload();
      else window.location.href = btnAction;
    });
  }
}

(window as any).fetch = async (...args: [any, any?]) => {
  try {
    const response = await originalFetch(...args);
    const urlStr = typeof args[0] === "string" ? args[0] : (args[0] as any)?.url || "";
    if (response.ok && urlStr) {
      try {
        const clone = response.clone();
        clone.text().then((text) => interceptDashboardResponse(urlStr, text)).catch(() => {});
      } catch (e) {}
    }
    if (response.status === 401 || response.status === 403) {
      handleNetworkError(response.status);
    }
    return response;
  } catch (error: any) {
    if (!navigator.onLine) {
      handleNetworkError();
    }
    throw error;
  }
};

const originalXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (
  this: XMLHttpRequest,
  ...args: any[]
) {
  const urlStr = args[1] ? String(args[1]) : "";
  this.addEventListener("load", function () {
    if (this.status === 200 && urlStr) {
      try {
        const responseText = this.responseText;
        if (typeof responseText === "string") {
          interceptDashboardResponse(urlStr, responseText);
        }
      } catch (e) {}
    }
    if (this.status === 401 || this.status === 403) {
      handleNetworkError(this.status);
    }
  });
  this.addEventListener("error", function () {
    if (!navigator.onLine) {
      handleNetworkError();
    }
  });
  return originalXhrOpen.apply(this, args as any);
};

try {
  const originalResponseTypeDesc = Object.getOwnPropertyDescriptor(
    XMLHttpRequest.prototype,
    "responseType",
  );
  if (originalResponseTypeDesc && originalResponseTypeDesc.set) {
    const origSet = originalResponseTypeDesc.set;
    Object.defineProperty(XMLHttpRequest.prototype, "responseType", {
      set: function (val: any) {
        try {
          origSet.call(this, val);
        } catch (e) {
          // Ignore invalid enum values (e.g. moz-chunked-arraybuffer in Chrome)
        }
      },
      get: originalResponseTypeDesc.get,
      configurable: true,
      enumerable: true,
    });
  }
} catch (e) {}

function waitForTokens(): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 50;

    const check = () => {
      attempts++;
      // Preserve JSESSIONID for /vtop/content after login redirect
      const cookieMatch = document.cookie.match(/JSESSIONID=([^;]+)/);
      if (cookieMatch) (window as any).__vtopSessionCookie = cookieMatch[1];
      const csrfInput = document.querySelector(
        'input[name="_csrf"]',
      ) as HTMLInputElement;
      const authInput = (document.getElementById("authorizedIDX") ||
        document.getElementById("authorizedID")) as HTMLInputElement;

      if (csrfInput && csrfInput.value) vtopContext.csrf = csrfInput.value;
      if (authInput && authInput.value) vtopContext.authId = authInput.value;

      if (!vtopContext.authId || !vtopContext.csrf) {
        for (let i = 0; i < document.scripts.length; i++) {
          const text = document.scripts[i].textContent;
          if (!text) continue;
          if (!vtopContext.csrf) {
            const csrfMatch = text.match(/var\s+csrfValue\s*=\s*["']([^"']+)["']/i);
            if (csrfMatch) vtopContext.csrf = csrfMatch[1];
          }
          if (!vtopContext.authId) {
            const idMatch =
              text.match(/var\s+id\s*=\s*["']([^"']+)["']/i) ||
              text.match(/authorizedID["']?\s*,\s*value:\s*["']([^"']+)["']/i);
            if (idMatch) vtopContext.authId = idMatch[1];
          }
          if (vtopContext.authId && vtopContext.csrf) break;
        }
      }

      // Stop on the registration number, not the CSRF token: the token is optional for
      // mounting, and waiting on it would burn the full 5 s budget every time VTOP
      // serves a landing document without one.
      if (vtopContext.authId || attempts >= maxAttempts) {
        clearInterval(interval);
        resolve(!!vtopContext.authId);
      }
    };

    const interval = setInterval(check, 100);
    check();
  });
}

const checkIsAuthPage = () => {
  return (
    isAuthRoute ||
    document.getElementById("authorizedIDX") !== null ||
    document.getElementById("authorizedID") !== null ||
    document.getElementById("top-hmenu-bar") !== null ||
    document.getElementById("vtop-header") !== null
  );
};

const HALTED_BANNER_ID = "retop-halted-banner";

/**
 * Restores the native document and explains why retop stepped aside. Used when
 * retop cannot or must not own the page, so the user is never left on a blank
 * screen with no explanation.
 */
const fallBackToNative = (reason: string) => {
  document.getElementById(HALTED_BANNER_ID)?.remove();
  document.getElementById("retop-host")?.remove();
  document.getElementById("retop-boot-cloak")?.remove();
  removeSplashScreen();

  if (document.body) {
    document.body.style.opacity = "1";
    document.body.style.display = "block";
    document.body.style.visibility = "visible";
    document.body.classList.add("show-legacy-ui");
  }

  if (!reason || !document.body) return;
  const banner = document.createElement("div");
  banner.id = HALTED_BANNER_ID;
  banner.textContent = reason;
  banner.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0;
    z-index: 2147483646; padding: 10px 16px;
    background: #313033; color: #f4eff4;
    font: 600 13px 'Google Sans Flex', system-ui, sans-serif;
    text-align: center;
  `;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 6000);
};

const init = async () => {
  console.log("[retop] Initializing...");

  try {
    await run();
  } catch (err) {
    console.error("[retop] Dashboard entry failed:", err);
    fallBackToNative("retop hit an error and stepped aside.");
  }
};

const run = async () => {
  let pausedResult = null;
  let settingsResult = null;

  try {
    [pausedResult, settingsResult] = await Promise.all([
      idbGet("retop-paused-until"),
      idbGet("retop-settings"),
    ]);
  } catch (err) {
    console.warn("[retop] Storage error. Falling back to native VTOP.", err);
    fallBackToNative("");
    return;
  }

  if (settingsResult) {
    try {
      const settings = parseSettingsPayload(settingsResult);
      if (
        settings?.defaultView === "legacy" &&
        sessionStorage.getItem("vtop-legacy-mode") === null
      ) {
        sessionStorage.setItem("vtop-legacy-mode", "true");
      }
    } catch (e) {}
  }

  if (pausedResult && Date.now() < parseInt(pausedResult as string, 10)) {
    console.log("[retop] Extension is currently halted. Falling back to native VTOP.");
    fallBackToNative("retop is paused. Showing VTOP.");
    return;
  }

  // Also listen for settings trigger from the popup
  try {
    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "open_settings") {
          const root = document.getElementById("retop-root");
          if (root) {
            window.dispatchEvent(new CustomEvent("retop-open-settings"));
          }
        }
      });
    }
  } catch (e) {
    // Extension context invalidated (e.g. after reload) — safe to ignore
  }

  // CRITICAL: Force native DOM visibility immediately.
  // Prevents the page from going blank.
  document.body.style.opacity = "1";
  document.body.style.display = "block";
  document.body.style.visibility = "visible";
  document.body.classList.add("show-legacy-ui");

  const role: RetopRole = await readRole();

  // Parent and alumni sign in on VTOP's own form. retop only contributes the role
  // switcher and the native portals that already existed on that page.
  if (isLoginRoute && !checkIsAuthPage()) {
    if (!document.getElementById("retop-native-portals")) {
      const portalsRoot = document.createElement("div");
      portalsRoot.id = "retop-native-portals";
      document.body.appendChild(portalsRoot);
      createRoot(portalsRoot).render(React.createElement(NativePortals));
    }
    document.body.classList.add("show-legacy-ui");
    document.getElementById("retop-boot-cloak")?.remove();
    removeSplashScreen();
    await injectRoleSwitcher(role);
    return;
  }

  if (role !== "student") {
    console.log(`[retop] Active role is ${role}. Extension disabled.`);
    fallBackToNative("");
    return;
  }

  // --- Authenticated Pages Only ---
  // Legacy login/prelogin stylesheet hosts are gone with the takeover, but a tab
  // restored from bfcache mid-migration can still carry them.
  document.getElementById("vtop-prelogin-theme")?.remove();
  document.getElementById("vtop-login-theme")?.remove();
  document.getElementById("vtop-early-theme")?.remove();

  setUIVisibility(true);
  document.body.classList.remove("show-legacy-ui");
  // @font-face declarations MUST be in the main document to work across shadow DOM —
  // inject fonts only, NOT style.css (which would break native VTOP header/menu).
  injectGlobalFonts();
  cleanupLegacyHMenuBar();

  // Requires the registration number. The CSRF token is best-effort: VTOP omits it
  // from some landing documents, and a missing token must not cost a valid session.
  await waitForTokens();
  initializeContainer();

  if (vtopContext.authId) {
    console.log("[retop] Session Active. Verifying menu items...");

    // Fast check for DOM menu items (up to 1s max)
    for (let i = 0; i < 10; i++) {
      const newMenu = scrapeMenu(document);
      const menuCount = newMenu.reduce((acc, cat) => acc + cat.links.length, 0);
      if (menuCount > 0) break;
      await new Promise((r) => setTimeout(r, 80));
    }

    renderDashboard();
    injectLegacyMenuSearch();
  } else {
    // No usable session tokens. Hand the document back instead of mounting a
    // dashboard that would only show errors.
    fallBackToNative("retop could not read the VTOP session.");
    injectLegacyMenuSearch();
    // A missing token pair almost always means the session died mid-navigation.
    // VTOP re-authenticates on its own login route, which the bootstrapper owns.
    setTimeout(() => {
      if (document.visibilityState === "visible") {
        window.location.replace("/vtop/open/page");
      }
    }, 2500);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}