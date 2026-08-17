import { renderDashboard } from "./pages/app";
import { scrapeMenu } from "./parsers/menu";
import {
  injectGlobalStyles,
  injectGlobalFonts,
  initializeContainer,
  getAppRoot,
  injectSplashScreen,
  removeSplashScreen,
  cleanupLegacyHMenuBar,
} from "./utils/bridge";
import React from "react";
import { createRoot } from "react-dom/client";
import { NativePortals } from "./components/NativePortals";
import { VIT_EMBLEM_SVG_RAW } from "./components/common/VitEmblemSvg";
import { getExtUrl } from "./utils/url";
import { interceptDashboardResponse } from "./utils/dashboardInterceptor";
import { applyTheme } from "./utils/settings-store";
import { get as idbGet, set as idbSet, entries as idbEntries } from "idb-keyval";

// Mirror IndexedDB cache to chrome.storage.local for offline tab access
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local && typeof indexedDB !== "undefined") {
  idbEntries().then((entries) => {
    if (entries && entries.length > 0) {
      const payload: Record<string, any> = {};
      for (const [k, v] of entries) {
        if (typeof k === "string") payload[k] = v;
      }
      chrome.storage.local.set(payload).catch(() => {});
    }
  }).catch(() => {});
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
  idbGet("retop-settings").then((saved) => {
    if (saved) {
      applyThemeFromSettings(saved);
    }
  }).catch(() => {});
} catch (e) {}

// ── Early intercept at document_start for all VTOP pages ──
const isTopWindow = window.self === window.top;
const isVtopDomain =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("vtop") ||
   window.location.hostname.includes("localhost") ||
   window.location.pathname.includes("/vtop"));

if (isTopWindow && isVtopDomain) {
  const p = window.location.pathname;
  const isPreloginOrLogin =
    p.includes("/vtop/open/page") ||
    p.includes("/vtop/open/login") ||
    p.includes("/vtop/login") ||
    p.includes("/vtop/vtopLogin") ||
    p.includes("/vtop/prelogin") ||
    p.includes("/vtop/init/page");

  if (isPreloginOrLogin) {
    injectSplashScreen();

    if (p.includes("/vtop/open/page") || p.includes("/vtop/prelogin")) {
      const earlyLink = document.createElement("link");
      earlyLink.id = "vtop-early-theme";
      earlyLink.rel = "stylesheet";
      earlyLink.href = getExtUrl("dist/prelogin.css");
      (document.head || document.documentElement).appendChild(earlyLink);
    } else {
      const earlyLink = document.createElement("link");
      earlyLink.id = "vtop-early-theme";
      earlyLink.rel = "stylesheet";
      earlyLink.href = getExtUrl("dist/login.css");
      (document.head || document.documentElement).appendChild(earlyLink);
    }
  } else if (p.includes("/vtop/content") || p.includes("/vtop/main")) {
    // Authenticated page: inject splash to cover load flicker, removed after retop mounts
    injectSplashScreen();
  }
}

// Enhance native VTOP processLoader whenever it appears
function enhanceProcessLoader(el: HTMLElement) {
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

    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
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

  const parsedDoc = new DOMParser().parseFromString(`
    <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(239, 68, 68, 0.2), transparent, transparent); pointer-events: none;"></div>
    
    <div style="margin-top: auto; width: 100%; display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 24px 48px; box-sizing: border-box; pointer-events: auto; background: linear-gradient(to top, var(--bg-main, #000) 40%, transparent);">
      
      <div style="display: flex; align-items: center; gap: 16px;">
        <span class="material-symbols-rounded" style="color: #ef4444; font-size: 40px;">warning</span>
        <div style="display: flex; flex-direction: column; text-align: right;">
          <h1 style="font-size: 24px; font-weight: 900; color: var(--text-main, #fff); margin: 0; text-transform: uppercase; font-family: 'Google Sans Flex', sans-serif; line-height: 1;">${title}</h1>
          <p style="font-size: 14px; font-family: monospace; color: #f87171; margin: 6px 0 0; max-width: 600px; white-space: pre-wrap;">${message}</p>
        </div>
      </div>
      
      <button id="retop-error-action-btn" style="display: flex; align-items: center; gap: 8px; background: var(--accent-base, #2563eb); color: var(--text-inverse, #ffffff); border: none; padding: 12px 24px; border-radius: 9999px; font-weight: 700; font-size: 14px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); transition: background 0.2s;" onmouseover="this.style.filter='brightness(1.2)'" onmouseout="this.style.filter='none'">
        <span class="material-symbols-rounded" style="font-size: 18px;">autorenew</span>
        ${btnText}
      </button>
      
    </div>
  `, "text/html");
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
    if (
      response.status === 401 ||
      response.status === 403
    ) {
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

const init = async () => {
  console.log("[retop] Initializing...");

  let pausedResult = null;
  let settingsResult = null;

  try {
    [pausedResult, settingsResult] = await Promise.all([
      idbGet("retop-paused-until"),
      idbGet("retop-settings"),
    ]);
  } catch (err) {
    console.warn(
      "[retop] Storage error. Falling back to native VTOP.",
    );
    document.body.style.opacity = "1";
    document.body.classList.add("show-legacy-ui");
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
    console.log(
      "[retop] Extension is currently halted. Falling back to native VTOP.",
    );
    document.body.style.opacity = "1";
    document.body.classList.add("show-legacy-ui");
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

  const path = window.location.pathname;

  // CRITICAL: Force native DOM visibility immediately.
  // Prevents the page from going blank.
  document.body.style.opacity = "1";
  document.body.style.display = "block";
  document.body.style.visibility = "visible";
  document.body.classList.add("show-legacy-ui");

  const checkIsAuthPage = () => {
    return (
      path.includes("/vtop/content") ||
      path.includes("/vtop/main") ||
      path.includes("/vtop/process") ||
      document.getElementById("authorizedIDX") !== null ||
      document.getElementById("authorizedID") !== null ||
      document.getElementById("top-hmenu-bar") !== null ||
      document.getElementById("vtop-header") !== null
    );
  };

  // Mount native portals ONLY on unauthenticated prelogin pages
  if (!checkIsAuthPage()) {
    let portalsRoot = document.getElementById("retop-native-portals");
    if (!portalsRoot) {
      portalsRoot = document.createElement("div");
      portalsRoot.id = "retop-native-portals";
      document.body.appendChild(portalsRoot);
      createRoot(portalsRoot).render(React.createElement(NativePortals));
    }
  } else {
    document.getElementById("retop-native-portals")?.remove();
  }

  const detectStructure = (): "role_selection" | "login" | "unknown" => {
    if (checkIsAuthPage()) return "unknown";

    const hasStdForm = document.getElementById("stdForm") !== null;
    const hasEmpForm = document.getElementById("empForm") !== null;
    const hasParentForm = document.getElementById("parentForm") !== null;
    const hasAlumniForm = document.getElementById("alumniForm") !== null;
    const hasRoleCards = document.querySelector(".cardStudent, .cardEmployee, .cardParent, .cardAlumni") !== null;

    const hasUsername = document.getElementById("username") !== null || document.getElementById("uname") !== null;
    const hasPassword = document.getElementById("password") !== null || document.getElementById("passwd") !== null;
    const hasCaptcha = document.getElementById("captchaBlock") !== null || document.getElementById("captchaStr") !== null || document.getElementById("captchaCheck") !== null || document.getElementById("imgCaptcha") !== null;

    if (hasUsername || (hasPassword && hasCaptcha)) {
      return "login";
    }

    if (hasStdForm || hasEmpForm || hasParentForm || hasAlumniForm || hasRoleCards) {
      return "role_selection";
    }

    if (path.includes("/vtop/open/page") || path.includes("/vtop/prelogin")) {
      return "role_selection";
    }

    if (path.includes("/vtop/login") || path.includes("/vtop/vtopLogin") || path.includes("/vtop/open/login") || path.includes("/vtop/init/page")) {
      return "login";
    }

    return "unknown";
  };

  const initialStructure = detectStructure();
  const isLoginPageOrRole =
    !checkIsAuthPage() &&
    (initialStructure === "role_selection" ||
      initialStructure === "login" ||
      path.includes("/vtop/open/page") ||
      path.includes("/vtop/open/login") ||
      path.includes("/vtop/vtopLogin") ||
      path.includes("/vtop/login") ||
      path.includes("/vtop/prelogin") ||
      path.includes("/vtop/init/page"));

  if (isLoginPageOrRole) {
    if (initialStructure === "role_selection") {
      injectPreloginTheme();
    } else {
      injectLoginTheme();
      enhanceLegacyLogin();
    }

    // Observe DOM mutations to seamlessly swap themes if VTOP changes page structure without a reload
    const structureObserver = new MutationObserver(() => {
      if (checkIsAuthPage()) {
        structureObserver.disconnect();
        return;
      }
      const current = detectStructure();
      if (current === "role_selection" && !document.getElementById("vtop-prelogin-theme")) {
        injectPreloginTheme();
      } else if (current === "login" && !document.getElementById("vtop-login-theme")) {
        injectLoginTheme();
        enhanceLegacyLogin();
      }
    });
    structureObserver.observe(document.body, { childList: true, subtree: true });

    removeSplashScreen();

    console.log(`[retop] Structure detected: ${initialStructure}. Styled and revealed.`);

    if (!(window as any).__retop_click_listener_attached) {
      (window as any).__retop_click_listener_attached = true;
      document.addEventListener(
        "click",
        (e) => {
          const target = e.target as HTMLElement;
          const form = target.closest("form");
          if (form && form.id) {
            if (form.id === "stdForm")
              idbSet("retop-user-role", "student");
            if (form.id === "empForm")
              idbSet("retop-user-role", "employee");
            if (form.id === "parentForm")
              idbSet("retop-user-role", "parent");
            if (form.id === "alumniForm")
              idbSet("retop-user-role", "alumni");
          }
        },
        true,
      );
    }

    // SKIP ROLE SELECTION: When enabled in settings, auto-select student role
    if (initialStructure === "role_selection") {
      try {
        const skipResult = await idbGet("retop-settings");
        const skipSettings = parseSettingsPayload(skipResult);
        if (skipSettings?.skipRoleSelection) {
          const stdForm = document.getElementById("stdForm") as HTMLFormElement;
          if (stdForm) {
            console.log("[retop] skipRoleSelection enabled, auto-submitting student form");
            await idbSet("retop-user-role", "student");
            stdForm.submit();
            return;
          }
        }
      } catch (e) {
        console.warn("[retop] skipRoleSelection check failed", e);
      }
    }

    return;
  }

  const roleResult = await idbGet("retop-user-role");
  const currentRole = roleResult || "student";

  if (currentRole !== "student") {
    console.log(`[retop] Active role is ${currentRole}. Extension disabled.`);
    return;
  }

  if (
    path.toLowerCase().includes("login") ||
    document.getElementById("username") !== null ||
    document.getElementById("captchaStr") !== null
  ) {
    enhanceLegacyLogin();
    return;
  }

  // --- Authenticated Pages Only ---
  document.getElementById("vtop-prelogin-theme")?.remove();
  document.getElementById("vtop-login-theme")?.remove();
  document.getElementById("vtop-early-theme")?.remove();

  document.body.classList.remove("show-legacy-ui");
  // @font-face declarations MUST be in the main document to work across shadow DOM —
  // inject fonts only, NOT style.css (which would break native VTOP header/menu).
  injectGlobalFonts();
  cleanupLegacyHMenuBar();

  await waitForTokens();
  initializeContainer();

  if (vtopContext.authId && vtopContext.csrf) {
    console.log("[retop] Session Active. Verifying menu items...");

    // Fast check for DOM menu items (up to 1s max)
    let menuCount = 0;
    for (let i = 0; i < 10; i++) {
      const newMenu = scrapeMenu(document);
      menuCount = newMenu.reduce((acc, cat) => acc + cat.links.length, 0);
      if (menuCount > 0) break;
      await new Promise((r) => setTimeout(r, 80));
    }

    renderDashboard();
  } else {
    document.body.classList.add("show-legacy-ui");
    removeSplashScreen();
    cleanupLegacyHMenuBar();
  }
};

function waitForTokens(): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 50;

    const check = () => {
      attempts++;
      const csrfInput = document.querySelector(
        'input[name="_csrf"]',
      ) as HTMLInputElement;
      const authInput = (document.getElementById("authorizedIDX") ||
        document.getElementById("authorizedID")) as HTMLInputElement;

      if (csrfInput && csrfInput.value) vtopContext.csrf = csrfInput.value;
      if (authInput && authInput.value) vtopContext.authId = authInput.value;

      if (!vtopContext.csrf || !vtopContext.authId) {
        for (let i = 0; i < document.scripts.length; i++) {
          const text = document.scripts[i].textContent;
          if (!text) continue;
          if (!vtopContext.csrf) {
            const csrfMatch = text.match(/var\s+csrfValue\s*=\s*["']([^"']+)["']/i);
            if (csrfMatch) vtopContext.csrf = csrfMatch[1];
          }
          if (!vtopContext.authId) {
            const idMatch = text.match(/var\s+id\s*=\s*["']([^"']+)["']/i) || text.match(/authorizedID["']?\s*,\s*value:\s*["']([^"']+)["']/i);
            if (idMatch) vtopContext.authId = idMatch[1];
          }
          if (vtopContext.csrf && vtopContext.authId) break;
        }
      }

      if (vtopContext.csrf || attempts >= maxAttempts) {
        clearInterval(interval);
        resolve(!!vtopContext.csrf);
      }
    };

    const interval = setInterval(check, 100);
    check();
  });
}

const enhancePreloginRoleCards = () => {
  const roleRow = document.querySelector(".row.row-cols-2.row-cols-sm-4") as HTMLElement;
  if (roleRow) {
    roleRow.classList.remove("py-3");
    roleRow.style.setProperty("padding-top", "0px", "important");
    roleRow.style.setProperty("padding-bottom", "0px", "important");
  }

  const roleConfigs = [
    {
      selectors: [".cardStudent", "#stdForm"],
      name: "Student",
      svg: `<svg class="retop-role-svg" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-120 200-272v-240L40-600l440-240 440 240v320h-80V-556l-80 44v240L480-120Z"/></svg>`,
    },
    {
      selectors: [".cardEmployee", "#empForm"],
      name: "Employee",
      svg: `<svg class="retop-role-svg" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Z"/></svg>`,
    },
    {
      selectors: [".cardParent", "#parentForm"],
      name: "Parent",
      svg: `<svg class="retop-role-svg" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z"/></svg>`,
    },
    {
      selectors: [".cardAlumni", "#alumniForm"],
      name: "Alumni",
      svg: `<svg class="retop-role-svg" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 -960 960 960" fill="currentColor"><path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>`,
    },
  ];

  roleConfigs.forEach((cfg) => {
    for (const sel of cfg.selectors) {
      const card = document.querySelector(sel)?.closest(".cardStudent, .cardEmployee, .cardParent, .cardAlumni") as HTMLElement;
      if (card) {
        const link = card.querySelector("a") as HTMLElement;
        if (link) {
          link.innerHTML = `
            <div class="retop-role-card-inner">
              <div class="retop-role-icon-col">${cfg.svg}</div>
              <div class="retop-role-text-col"><p>${cfg.name}</p></div>
            </div>
          `;
          card.onclick = (e) => {
            if (e.target !== link && !link.contains(e.target as Node)) {
              link.click();
            }
          };
        }
        break;
      }
    }
  });
};

const enhancePreloginInfoAndApps = () => {
  const openHeader = document.getElementById("vtopOpenPageHeader");
  if (!openHeader) return;

  const isChennai = window.location.hostname.includes("vtopcc");

  // 1. Format the VIT Rankings Info Card ONLY on Chennai campus (vtopcc.vit.ac.in)
  // On Vellore campus (vtop.vit.ac.in), keep the native Spotlight list intact!
  if (isChennai) {
    const infoCard = document.querySelector(".card.border-0.shadow-lg, .spotlightHeader")?.closest(".card") as HTMLElement;
    if (infoCard) {
      infoCard.querySelector(".card-header")?.remove();

      const cardBody = infoCard.querySelector(".card-body") as HTMLElement;
      if (cardBody) {
        cardBody.style.maxHeight = "";
        cardBody.style.overflowY = "";
        cardBody.classList.remove("custom-scrollbar");
        cardBody.classList.add("p-0");

        const stats = [
          { badge: "#691", desc: "QS World 2026" },
          { badge: "Top 150", desc: "QS Asia 2025" },
          { badge: "#142", desc: "QS Engg & Tech (#9 India)" },
          { badge: "#396", desc: "QS Sustainability (#8 India)" },
          { badge: "#65", desc: "THE Interdisciplinary (#2 India)" },
          { badge: "#173", desc: "THE Young Univ 2025" },
          { badge: "#687", desc: "US News 2024 (#6 India)" },
          { badge: "Top 500", desc: "Shanghai ARWU 2024" },
          { badge: "Top 20", desc: "NIRF 2025 (Univ, Research)" },
          { badge: "A++", desc: "NAAC Grade (3.66 / 4.0)" },
        ];

        cardBody.innerHTML = `
          <div class="retop-rankings-grid">
            ${stats
              .map(
                (s) => `
              <div class="retop-rank-tile">
                <div class="retop-rank-big-num">${s.badge}</div>
                <div class="retop-rank-subtext">${s.desc}</div>
              </div>
            `
              )
              .join("")}
          </div>
        `;
      }
    }
  } else {
    // Vellore campus: ensure Spotlight card body has proper scrollbar
    const spotlightCard = document.querySelector(".spotlightHeader")?.closest(".card") as HTMLElement;
    if (spotlightCard) {
      const cardBody = spotlightCard.querySelector(".card-body") as HTMLElement;
      if (cardBody) {
        cardBody.classList.add("custom-scrollbar");
      }
    }
  }

  // 2. Relocate and enhance the mobile app download cards to sit right of the main card
  const appsSection = document.querySelector(".row.row-cols-2.row-cols-sm-4.py-3.justify-content-center") as HTMLElement;
  const targetCol = document.querySelector(".col-12.col-md-6.order-1.order-md-2") as HTMLElement;

  if (appsSection && targetCol && !targetCol.contains(appsSection)) {
    targetCol.appendChild(appsSection);
    appsSection.className = "row row-cols-1 row-cols-sm-3 g-3 p-4 bg-transparent rounded-3xl border-0 shadow-none";
  }
};

const enhancePreloginHeader = () => {
  const header = document.getElementById("vtopOpenPageHeader");
  if (!header) return;

  const isChennai = window.location.hostname.includes("vtopcc");
  document.title = isChennai ? "retop Chennai" : "retop";

  const emblem = (header.querySelector("img.VITEmblem, .navbar-brand img") ||
    header.querySelector("img")) as HTMLImageElement;
  if (emblem) {
    emblem.src = getExtUrl("dist/assets/vitLogo.svg");
    emblem.id = "vtop-prelogin-logo";
    emblem.style.maxHeight = "44px";
    emblem.style.height = "44px";
    emblem.style.width = "auto";
  }

  const vitText = header.querySelector(".VITLogoStyle");
  if (vitText) {
    vitText.remove();
  }

  const campusLabel = isChennai ? "CHENNAI CAMPUS" : "VELLORE CAMPUS";
  let navbarText = header.querySelector(".navbar-text") as HTMLElement;
  if (!navbarText) {
    navbarText = document.createElement("span");
    navbarText.className = "navbar-text text-light";
    const brand =
      header.querySelector(".navbar-brand") ||
      header.querySelector(".container-fluid") ||
      header;
    brand.appendChild(navbarText);
  }
  navbarText.textContent = campusLabel;
  navbarText.classList.add("retop-campus-text");
};

const injectPreloginTheme = () => {
  if (
    document.getElementById("authorizedIDX") ||
    document.getElementById("authorizedID") ||
    document.getElementById("top-hmenu-bar") ||
    document.getElementById("vtop-header")
  ) {
    return;
  }

  // Remove conflicting login stylesheets
  const existingLogin = document.getElementById("vtop-login-theme");
  if (existingLogin) existingLogin.remove();

  const earlyLink = document.getElementById("vtop-early-theme");
  if (earlyLink) earlyLink.remove();

  // Reset any huge inline margin-top computed by native VTOP scripts
  if (document.body) {
    document.body.style.marginTop = "60px";
    document.body.style.paddingTop = "0px";
    document.body.style.paddingLeft = "0px";
  }

  if (document.getElementById("vtop-prelogin-theme")) return;

  console.log("[retop] Injecting prelogin theme based on DOM structure");

  injectGlobalFonts();

  const isChennai = window.location.hostname.includes("vtopcc");
  document.documentElement.setAttribute("data-campus", isChennai ? "chennai" : "vellore");

  const link = document.createElement("link");
  link.id = "vtop-prelogin-theme";
  link.rel = "stylesheet";
  link.href = getExtUrl("dist/prelogin.css");
  document.head.appendChild(link);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      enhancePreloginHeader();
      enhancePreloginInfoAndApps();
    });
  } else {
    enhancePreloginHeader();
    enhancePreloginInfoAndApps();
  }

  if (!(window as any).__retop_prelogin_click_attached) {
    (window as any).__retop_prelogin_click_attached = true;
    document.addEventListener("click", (e) => {
      // Guard: never intercept clicks on authenticated pages
      if (
        document.getElementById("authorizedIDX") ||
        document.getElementById("authorizedID") ||
        document.getElementById("top-hmenu-bar") ||
        document.getElementById("vtop-header")
      ) {
        return;
      }

      const target = e.target as HTMLElement;

      const roleCard = target.closest(".cardStudent, .cardEmployee, .cardParent, .cardAlumni") as HTMLElement;
      if (roleCard) {
        const form = roleCard.querySelector("form") as HTMLFormElement;
        if (form) {
          try {
            form.submit();
            return;
          } catch {}
        }
        const link = roleCard.querySelector("a") as HTMLElement;
        if (link && target !== link) {
          link.click();
          return;
        }
      }

      const item = target.closest(".cardStudent, .cardEmployee, .cardParent, .cardAlumni, #vtopOpenPageHeader ~ * .list-group-item");
      if (item) {
        const link = item.querySelector("a, button[data-spotlighttitle]") as HTMLElement;
        if (link && target !== link && !link.contains(target)) {
          link.click();
        }
      }
    });
  }

  console.log("[retop] prelogin.css URL:", link.href);
};

const injectLoginTheme = () => {
  if (
    document.getElementById("authorizedIDX") ||
    document.getElementById("authorizedID") ||
    document.getElementById("top-hmenu-bar") ||
    document.getElementById("vtop-header")
  ) {
    return;
  }

  // Remove conflicting prelogin stylesheets
  const existingPrelogin = document.getElementById("vtop-prelogin-theme");
  if (existingPrelogin) existingPrelogin.remove();

  const earlyLink = document.getElementById("vtop-early-theme");
  if (earlyLink && earlyLink.getAttribute("href")?.includes("prelogin.css")) {
    earlyLink.remove();
  }

  if (document.getElementById("vtop-login-theme")) return;

  injectGlobalFonts();

  const link = document.createElement("link");
  link.id = "vtop-login-theme";
  link.rel = "stylesheet";
  link.href = getExtUrl("dist/login.css");
  document.head.appendChild(link);

  // Remove native Person Icon Wrapper if it exists
  const userIconWrapper = document.getElementById("basic-addon1");
  if (userIconWrapper) {
    userIconWrapper.style.display = "none";
  }

  const passIconWrapper = document.getElementById("basic-addon2") || document.getElementById("passwordIcon")?.parentElement;
  const existingEye = document.getElementById("passwordIcon");

  const createEyeSvg = () => {
    // Material Symbols "visibility" (filled, 700 weight) — rendered via innerHTML
    // to avoid DOMParser XML namespace issue that prevents rendering in HTML documents
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <svg id="passwordIcon" class="fa fa-eye" xmlns="http://www.w3.org/2000/svg" style="cursor: pointer; width: 24px; height: 24px; display: inline-block; vertical-align: middle;" viewBox="0 -960 960 960" fill="currentColor">
        <path class="retop-eye-open" d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Z" />
        <path class="retop-eye-off" style="display:none" d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 35.5-12t36.5-4q75 0 127.5 52.5T660-500q0 18-4 36.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-111-150-175.5T480-740q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 111 150 175.5T480-260q22 0 43-3t39-8l-46-46q-14 5-28 7.5t-28 2.5q-75 0-127.5-52.5T300-500q0-14 2.5-28t7.5-28l-90-68Z" />
      </svg>`;
    const svg = wrapper.firstElementChild as SVGElement;

    svg.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const passInput = (document.getElementById("password") || document.querySelector("input[type='password'], input[name='password']")) as HTMLInputElement;
      if (passInput) {
        const openPath = svg.querySelector(".retop-eye-open") as SVGElement;
        const offPath = svg.querySelector(".retop-eye-off") as SVGElement;
        if (passInput.type === "password") {
          passInput.type = "text";
          svg.classList.remove("fa-eye");
          svg.classList.add("fa-eye-slash");
          if (openPath) openPath.style.display = "none";
          if (offPath) offPath.style.display = "";
        } else {
          passInput.type = "password";
          svg.classList.remove("fa-eye-slash");
          svg.classList.add("fa-eye");
          if (openPath) openPath.style.display = "";
          if (offPath) offPath.style.display = "none";
        }
      }

      if (typeof (window as any).toggleEye === "function") {
        try { (window as any).toggleEye(); } catch {}
      }
    });

    return svg;
  };

  if (existingEye && existingEye.tagName.toLowerCase() !== "svg") {
    const svg = createEyeSvg();
    existingEye.parentNode?.replaceChild(svg, existingEye);
  } else if (passIconWrapper && !passIconWrapper.querySelector("svg#passwordIcon")) {
    const svg = createEyeSvg();
    passIconWrapper.replaceChildren(svg);
  }

  // Replace Home link with SVG Icon globally
  const replaceHomeButtons = () => {
    try {
      const allLinksAndBtns = document.querySelectorAll(
        ".btn:not(.retop-home-icon), a:not(.retop-home-icon), button:not(.retop-home-icon), input[type='button'], input[type='submit']",
      );
      for (const link of allLinksAndBtns) {
        // Collect all possible text sources
        const altText = link.getAttribute("alt") || "";
        const titleText = link.getAttribute("title") || "";
        const valText = (link as HTMLInputElement).value || "";
        const inner = link.textContent || "";

        const rawText =
          `${inner} ${valText} ${altText} ${titleText}`.toLowerCase();

        // Broadly match anything containing 'home' or the specific VTOP open page href
        if (
          rawText.includes("home") ||
          link.getAttribute("href")?.includes("/vtop/open/page")
        ) {
          if (
            link.tagName.toLowerCase() === "input" ||
            link.tagName.toLowerCase() === "div"
          ) {
            const newBtn = document.createElement("button");
            const svgDoc1 = new DOMParser().parseFromString(
              `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M126-212v-342q0-30 13-56.5t37-44.5l228-171q34-26 76-26t76 26l228 171q24 18 37 44.5t13 56.5v342q0 53-36.5 89.5T708-86h-77q-26 0-44.5-18.5T568-149v-196q0-26-18.5-44.5T505-408h-50q-26 0-44.5 18.5T392-345v196q0 26-18.5 44.5T329-86h-77q-53 0-89.5-36.5T126-212" /></svg>`,
              "image/svg+xml"
            );
            if (svgDoc1.documentElement) newBtn.appendChild(svgDoc1.documentElement);
            newBtn.className = "retop-home-icon";
            newBtn.style.border = "none";
            newBtn.style.background = "transparent";
            newBtn.style.boxShadow = "none";
            newBtn.style.color = "currentColor";
            newBtn.style.display = "flex";
            newBtn.style.alignItems = "center";
            newBtn.style.justifyContent = "center";

            if (link.id) newBtn.id = link.id;
            if (link.getAttribute("onclick")) {
              newBtn.setAttribute("onclick", link.getAttribute("onclick")!);
            }
            if (link.parentNode) {
              // If parent is a formatting div, clean it up
              if (
                (link.parentNode as HTMLElement).classList?.contains("text-end")
              ) {
                (link.parentNode as HTMLElement).classList.remove("text-end");
              }
              link.parentNode.replaceChild(newBtn, link);
            }
          } else {
            const svgDoc2 = new DOMParser().parseFromString(
              `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M126-212v-342q0-30 13-56.5t37-44.5l228-171q34-26 76-26t76 26l228 171q24 18 37 44.5t13 56.5v342q0 53-36.5 89.5T708-86h-77q-26 0-44.5-18.5T568-149v-196q0-26-18.5-44.5T505-408h-50q-26 0-44.5 18.5T392-345v196q0 26-18.5 44.5T329-86h-77q-53 0-89.5-36.5T126-212" /></svg>`,
              "image/svg+xml"
            );
            link.replaceChildren(svgDoc2.documentElement);
            link.className = "retop-home-icon"; // completely overwrite classes
            (link as HTMLElement).style.border = "none";
            (link as HTMLElement).style.background = "transparent";
            (link as HTMLElement).style.boxShadow = "none";
            (link as HTMLElement).style.color = "currentColor";
            (link as HTMLElement).style.display = "inline-flex";
            (link as HTMLElement).style.alignItems = "center";
            (link as HTMLElement).style.justifyContent = "center";

            if (
              link.parentNode &&
              (link.parentNode as HTMLElement).classList?.contains("text-end")
            ) {
              (link.parentNode as HTMLElement).classList.remove("text-end");
            }
          }
        }
      }
    } catch (e) {
      console.error("ret0p: Error replacing home buttons", e);
    }
  };
  replaceHomeButtons();
  // Ensure it catches dynamically injected buttons
  const homeBtnObserver = new MutationObserver(() => replaceHomeButtons());
  homeBtnObserver.observe(document.body, { childList: true, subtree: true });

  // Merge Card Footer Links
  const cardFooter = document.querySelector(".card-footer");
  if (cardFooter && !document.getElementById("retop-merged-footer")) {
    const links = cardFooter.querySelectorAll("a");
    let resetPassLink: HTMLAnchorElement | null = null;
    let forgotUserIdLink: HTMLAnchorElement | null = null;

    for (const link of links) {
      if (link.textContent?.toLowerCase().includes("password"))
        resetPassLink = link;
      if (
        link.textContent?.toLowerCase().includes("loginid") ||
        link.textContent?.toLowerCase().includes("login id")
      )
        forgotUserIdLink = link;
    }

    if (resetPassLink && forgotUserIdLink) {
      const mergedDiv = document.createElement("div");
      mergedDiv.id = "retop-merged-footer";
      mergedDiv.className = "retop-forgot-links";

      const forgotSpan = document.createElement("span");
      forgotSpan.textContent = "Forgot ";
      const passA = document.createElement("a");
      passA.href = "javascript:void(0)";
      passA.setAttribute("onclick", "javascript:resetPassword()");
      passA.textContent = "password";
      const orSpan = document.createElement("span");
      orSpan.textContent = " or ";
      const idA = document.createElement("a");
      idA.href = "javascript:void(0)";
      idA.setAttribute("onclick", "javascript:forgotUserID()");
      idA.textContent = "login ID";
      const qSpan = document.createElement("span");
      qSpan.textContent = "?";
      mergedDiv.append(forgotSpan, passA, orSpan, idA, qSpan);

      resetPassLink.remove();
      forgotUserIdLink.remove();
      const brs = cardFooter.querySelectorAll("br");
      brs.forEach((br) => br.remove());

      cardFooter.insertBefore(mergedDiv, cardFooter.firstChild);
    }
  }

  // Change "VTOP Login" text to "retop" and add welcome text
  const titleEl = document.querySelector(".card-header.loginBoxBorder h4");
  if (titleEl) {
    if (
      titleEl.textContent === "VTOP Login" ||
      titleEl.textContent === "retop Login" ||
      titleEl.textContent === "retop"
    ) {
      titleEl.textContent = "retop";

      if (!document.getElementById("retop-welcome-text")) {
        const welcome = document.createElement("p");
        welcome.id = "retop-welcome-text";
        welcome.textContent = "Welcome back.";
        titleEl.parentNode?.insertBefore(welcome, titleEl.nextSibling);
      }
    }
  }

  // Change Submit Button Text to "Login"
  const submitBtn = document.getElementById("btnSubmit") as
    | HTMLButtonElement
    | HTMLInputElement;
  if (submitBtn) {
    if (submitBtn.tagName.toLowerCase() === "input") {
      submitBtn.value = "Login";
    } else {
      submitBtn.textContent = "Login";
    }
  } else {
    // Fallback search
    document.querySelectorAll(".btn-primary, .btn-success").forEach((btn) => {
      if (
        btn.textContent?.toLowerCase().includes("submit") ||
        btn.textContent?.toLowerCase().includes("sign in")
      ) {
        btn.textContent = "Login";
      }
    });
  }

  // Add wiggle validation for login fields
  if (!document.getElementById("retop-wiggle-style")) {
    const style = document.createElement("style");
    style.id = "retop-wiggle-style";
    style.textContent = `
      @keyframes retop-wiggle {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }
      .retop-wiggle {
        animation: retop-wiggle var(--duration-dramatic, 0.4s) ease-in-out !important;
        border-color: #ef4444 !important;
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener(
      "click",
      (e) => {
        const target = e.target as HTMLElement;
        // Match the exact login button or any button that acts as login
        if (
          target.closest("button") &&
          target.closest("button")?.textContent?.trim().toLowerCase() ===
            "login"
        ) {
          const passwordInput = document.getElementById(
            "password",
          ) as HTMLInputElement;
          const usernameInput =
            document.getElementById("authorizedIDX") ||
            (document.getElementById("username") as HTMLInputElement);
          const captchaInput = document.getElementById(
            "captchaStr",
          ) as HTMLInputElement;

          let isInvalid = false;

          const isPasswordValid = (pwd: string) => {
            return Boolean(pwd && pwd.trim().length >= 1 && pwd.length <= 100);
          };

          // Check password
          if (passwordInput && !isPasswordValid(passwordInput.value)) {
            passwordInput.classList.remove("retop-wiggle");
            void passwordInput.offsetWidth; // force reflow
            passwordInput.classList.add("retop-wiggle");
            isInvalid = true;
          }

          // Check username
          if (usernameInput && !(usernameInput as HTMLInputElement).value) {
            usernameInput.classList.remove("retop-wiggle");
            void usernameInput.offsetWidth; // force reflow
            usernameInput.classList.add("retop-wiggle");
            isInvalid = true;
          }

          // Check captcha
          if (
            captchaInput &&
            (!captchaInput.value || captchaInput.value.length !== 6)
          ) {
            captchaInput.classList.remove("retop-wiggle");
            void captchaInput.offsetWidth; // force reflow
            captchaInput.classList.add("retop-wiggle");
            isInvalid = true;
          }

          if (isInvalid) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          }
        }
      },
      true,
    );

    document.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      if (target && (target.id === "username" || target.id === "authorizedIDX")) {
        target.value = target.value.replace(/[^a-zA-Z0-9]/g, "");
      }
    });

    // Auto-focus first empty field
    setTimeout(() => {
      const userInput = (document.getElementById("authorizedIDX") || document.getElementById("username")) as HTMLInputElement;
      const passInput = document.getElementById("password") as HTMLInputElement;
      const captchaInput = document.getElementById("captchaStr") as HTMLInputElement;

      if (userInput && !userInput.value) {
        userInput.focus();
      } else if (passInput && !passInput.value) {
        passInput.focus();
      } else if (captchaInput && !captchaInput.value) {
        captchaInput.focus();
      }
    }, 200);
  }

  // Error Page Handling
  const errorSpan = document.querySelector("span.text-danger[role='alert']");
  if (errorSpan && errorSpan.textContent?.trim()) {
    const errorText = errorSpan.textContent.trim();
    errorSpan.remove(); // Hide the native ugly text

    // Spawn a beautiful compact brutalist snackbar
    const isCaptchaError = errorText.toLowerCase().includes("captcha");

    window.dispatchEvent(
      new CustomEvent("retop-toast", {
        detail: {
          message: errorText,
          type: isCaptchaError ? "warning" : "error",
        },
      }),
    );
  }

  // Replace Native Footer and move to Right Side (Header)
  const nativeFooter = document.querySelector(".footercolor");
  if (nativeFooter) {
    nativeFooter.remove();
  }

  const header = document.getElementById("vtopOpenPageHeader");

  if (header) {
    // Inject the VitLogo Synchronously
    const vitLogo = header.querySelector("img.VITEmblem") as HTMLImageElement;
    if (vitLogo && vitLogo.id !== "retop-react-logo") {
      vitLogo.id = "retop-react-logo";
      vitLogo.src = getExtUrl("dist/assets/vitLogo.svg");
    }

    // Remove the "VIT" text properly
    const vitText = header.querySelector(".VITLogoStyle");
    if (vitText) {
      vitText.remove();
    }

    // Transform the campus text to fit the new width
    const isChennai = window.location.hostname.includes("vtopcc");
    const campusLabel = isChennai ? "CHENNAI CAMPUS" : "VELLORE CAMPUS";

    let navbarText = header.querySelector(".navbar-text") as HTMLElement;
    if (!navbarText) {
      navbarText = document.createElement("span");
      navbarText.className = "navbar-text text-light";
      header.querySelector(".container-fluid")?.appendChild(navbarText);
    }
    navbarText.textContent = campusLabel;
    navbarText.classList.add("retop-campus-text");

    // Footer logic moved to the right side
  }

  // Inject ASCII Art full page
  if (!document.getElementById("retop-right-footer-wrapper")) {
    const wrapper = document.createElement("div");
    wrapper.id = "retop-right-footer-wrapper";

    const asciiPre = document.createElement("pre");
    asciiPre.id = "retop-ascii-art";
    const isChennaiHost = window.location.hostname.includes("vtopcc");
    const artTypes = isChennaiHost ? ["CC"] : ["TT", "SMV", "MGR"];
    const lastArt = localStorage.getItem("retop_last_ascii_art") || "";
    const availableArts = artTypes.filter(type => type !== lastArt);
    const pickedArt = availableArts.length ? availableArts[Math.floor(Math.random() * availableArts.length)] : artTypes[0];
    localStorage.setItem("retop_last_ascii_art", pickedArt);

    import("./components/asciiArt").then(({ asciiArtTT, asciiArtSMV, asciiArtMGR, asciiArtCC }) => {
      let rawArt = asciiArtTT;
      if (pickedArt === "CC") rawArt = asciiArtCC.trim() ? asciiArtCC : asciiArtTT;
      else if (pickedArt === "SMV") rawArt = asciiArtSMV;
      else if (pickedArt === "MGR") rawArt = asciiArtMGR;
      
      const asciiArt = rawArt.replace(/\r/g, "");

      // Force right alignment for ASCII art
      asciiPre.style.setProperty("text-align", "right", "important");

    if (pickedArt === "CC") {
      asciiPre.style.letterSpacing = "0px";
      asciiPre.style.setProperty("margin-right", "0px", "important");
      asciiPre.style.setProperty("font-size", "4px", "important");
      asciiPre.style.setProperty("line-height", "4px", "important");
    } else if (pickedArt === "SMV") {
      asciiPre.style.letterSpacing = "0px";
      asciiPre.style.setProperty("margin-right", "0px", "important");
      asciiPre.style.setProperty("font-size", "4px", "important");
      asciiPre.style.setProperty("line-height", "4px", "important");
    } else if (pickedArt === "MGR") {
      asciiPre.style.letterSpacing = "0px";
      asciiPre.style.setProperty("margin-right", "0px", "important");
      asciiPre.style.setProperty("font-size", "4.8px", "important");
      asciiPre.style.setProperty("line-height", "4px", "important");
    } else {
      asciiPre.style.letterSpacing = "0px";
      asciiPre.style.setProperty("font-size", "7px", "important");
      asciiPre.style.setProperty("line-height", "7px", "important");
    }
    asciiPre.textContent = asciiArt;
    wrapper.appendChild(asciiPre);

    document.body.appendChild(wrapper);

    // ASCII Scramble Animation Logic
    const nonSpaceIndices: number[] = [];
    for (let i = 0; i < asciiArt.length; i++) {
      if (asciiArt[i] !== " " && asciiArt[i] !== "\n") {
        nonSpaceIndices.push(i);
      }
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    let puddleInterval: ReturnType<typeof setInterval> | null = null;

    // Initial load CSS animation instead of JS rain
    asciiPre.style.animation = "retop-ascii-rise 0.5s linear forwards";

    // Kinetic Puddle Hover Logic - Awwards Level Fluid Ripples
    interface Ripple {
      x: number;
      y: number;
      timeCreated: number;
      energy: number;
    }
    let ripples: Ripple[] = [];
    const maxRipples = 25;
    const waveSpeed = 0.15; // pixels per ms
    const waveFrequency = 0.08;

    let lastMouseX = -1000;
    let lastMouseY = -1000;
    let lastTime = Date.now();

    let charW = 4.2; // default approx width of monospace char for 7px font
    let charH = 7;   // default line-height matches font size
    
    if (pickedArt === "CC") {
      charW = 2.4;
      charH = 4;
    } else if (pickedArt === "PRP") {
      charW = 3;
      charH = 4.5;
    } else if (pickedArt === "SMV") {
      charW = 2.4;
      charH = 4;
    } else if (pickedArt === "MGR") {
      charW = 2.9;
      charH = 4;
    }

    const getLineOffsetX = (preW: number, lineLen: number) => {
      return Math.max(0, preW - lineLen * charW);
    };

    const updateHoverPuddle = (
      x: number,
      y: number,
      vx: number,
      vy: number,
    ) => {
      // Create ripple exactly at the letter's grid coordinates
      ripples.push({
        x,
        y,
        timeCreated: Date.now(),
        energy: Math.min(1.0, (Math.abs(vx) + Math.abs(vy)) * 0.2), // cap energy
      });
    };

    const originalLines = asciiArt.split("\n");

    document.addEventListener("mousemove", (e) => {
      const rect = asciiPre.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const now = Date.now();
      const dt = Math.max(1, now - lastTime);
      lastTime = now;

      if (lastMouseX !== -1000) {
        const dx = currentX - lastMouseX;
        const dy = currentY - lastMouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if mouse is touching an actual character ("water") with slight leniency
        const charY = Math.floor(currentY / charH);
        let onWater = false;

        // Check current char and surrounding chars for leniency (radius increased for sparse arts like MGR)
        for (
          let cy = Math.max(0, charY - 3);
          cy <= Math.min(originalLines.length - 1, charY + 3);
          cy++
        ) {
          const line = originalLines[cy];
          const offsetX = getLineOffsetX(rect.width, line.length);
          const charX = Math.floor((currentX - offsetX) / charW);

          for (
            let cx = Math.max(0, charX - 8);
            cx <= Math.min(line.length - 1, charX + 8);
            cx++
          ) {
            if (cx >= 0 && line[cx] && line[cx] !== " ") onWater = true;
          }
        }

        // Spawn a ripple if mouse moved enough AND is touching a character
        if (onWater && (distance > 8 || ripples.length === 0)) {
          const speed = distance / dt;
          const spawnEnergy = Math.min(50 + speed * 100, 150);

          ripples.push({
            x: currentX,
            y: currentY,
            timeCreated: now,
            energy: spawnEnergy,
          });

          if (ripples.length > maxRipples) {
            ripples.shift();
          }
          lastMouseX = currentX;
          lastMouseY = currentY;
        } else if (!onWater) {
          // Mouse is over empty space; just track it without spawning
          lastMouseX = currentX;
          lastMouseY = currentY;
        }
      } else {
        lastMouseX = currentX;
        lastMouseY = currentY;
      }

      if (!puddleInterval) {
        puddleInterval = setInterval(() => {
          const now = Date.now();
          // Filter dead ripples (live for 1 second)
          ripples = ripples.filter((r) => now - r.timeCreated < 1000);

          if (ripples.length === 0) {
            asciiPre.textContent = asciiArt;
            clearInterval(puddleInterval!);
            puddleInterval = null;
            return;
          }

          const preWidth = asciiPre.getBoundingClientRect().width;
          let newText = "";
          for (let y = 0; y < originalLines.length; y++) {
            const line = originalLines[y];
            const py = y * charH;
            const offsetX = getLineOffsetX(preWidth, line.length);

            let newLine = "";
            for (let x = 0; x < line.length; x++) {
              const char = line[x];
              if (char === " ") {
                newLine += " ";
                continue;
              }
              const px = offsetX + x * charW;

              let totalWave = 0;
              let isAffected = false;

              for (let i = 0; i < ripples.length; i++) {
                const r = ripples[i];
                const dx = px - r.x;
                const dy = py - r.y;
                const distSq = dx * dx + dy * dy;

                if (distSq > 40000) continue; // max 200px radius

                const dist = Math.sqrt(distSq);
                const age = now - r.timeCreated;
                const waveRadius = age * waveSpeed;

                // Only characters near the expanding wave ring are affected
                const distanceToWave = Math.abs(dist - waveRadius);

                if (distanceToWave < 40) {
                  // thickness of the ripple
                  const phase = distanceToWave * waveFrequency;
                  // Quadratic falloff for smoother envelope
                  const amplitude = Math.pow(
                    Math.max(0, 1 - distanceToWave / 40),
                    2,
                  );
                  // Quadratic fade out as it ages
                  const lifeFade = Math.pow(Math.max(0, 1 - age / 1000), 2);

                  // Add to total wave interference
                  totalWave +=
                    Math.cos(phase) * amplitude * lifeFade * (r.energy / 100);
                  isAffected = true;
                }
              }

              if (isAffected && Math.abs(totalWave) > 0.2) {
                newLine += chars[Math.floor(Math.random() * chars.length)];
              } else {
                newLine += char;
              }
            }
            newText += newLine + "\n";
          }
          asciiPre.textContent = newText.slice(0, -1);
        }, 50); // 20fps
      }
    });

    document.addEventListener("mouseleave", () => {
      lastMouseX = -1000;
    });
    });
  }

  // Apply Floating Labels to Username and Password
  const applyFloatingLabel = (inputId: string) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (
      input &&
      !input.nextElementSibling?.classList.contains("retop-floating-label")
    ) {
      const placeholder = input.getAttribute("placeholder") || input.name;
      input.setAttribute("placeholder", " "); // Space enables :placeholder-shown CSS hack

      const label = document.createElement("label");
      label.className = "retop-floating-label";
      label.setAttribute("for", inputId);
      label.textContent = placeholder;

      input.parentElement?.insertBefore(label, input.nextSibling);
    }
  };
  applyFloatingLabel("username");
  applyFloatingLabel("password");

  idbGet("retop-settings").then((savedSettings) => {
    try {
      if (savedSettings) {
        applyThemeFromSettings(savedSettings);
      }
    } catch (err) {
      console.warn(
        "[retop] Failed to load theme settings for login page:",
        err,
      );
    }
  }).catch(() => {});

  const isChennaiHost = window.location.hostname.includes("vtopcc");
  document.title = isChennaiHost ? "retop Chennai - Login" : "Login - retop";

  // Inject Offline Access Button (bottom-left corner)
  if (!document.getElementById("retop-offline-btn")) {
    const offlineBtn = document.createElement("a");
    offlineBtn.id = "retop-offline-btn";
    offlineBtn.href = "https://getretop.web.app/";
    offlineBtn.target = "_blank";
    offlineBtn.rel = "noopener noreferrer";
    offlineBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" style="width:16px;height:16px;flex-shrink:0;" viewBox="0 0 960 960" fill="currentColor"><path d="M780,843L743,879Q723,898 696,898Q669,898 649,877Q628,857 628,829.5Q628,802 649,782L684,746L649,710Q628,691 628,663Q628,635 649,615Q669,594 696.5,594Q724,594 744,615L780,651L816,616Q835,596 863,595Q891,594 911.5,614.5Q932,635 932,662.5Q932,690 911,710L876,746L911,783Q931,803 931.5,830Q932,857 911,877Q891,898 863.5,898Q836,898 816,877L780,843ZM480,926Q387,926 306,891Q225,856 164.5,795.5Q104,735 69,654Q34,573 34,480Q34,387 69,306Q104,225 164.5,164.5Q225,104 306,69Q387,34 480,34Q567,34 645,66Q723,98 783.5,153Q844,208 881.5,282.5Q919,357 925,441Q927,471 906.5,491Q886,511 856,511Q828,511 809,491Q790,471 786,442Q784,433 782.5,423.5Q781,414 779,404L651,404Q653,421 654,436.5Q655,452 655,469Q655,486 642,498.5Q629,511 612,511Q595,511 583.5,498.5Q572,486 571,469Q571,452 570.5,435.5Q570,419 567,404L392,404Q389,423 387.5,442Q386,461 386,480Q386,499 387.5,518Q389,537 392,556L500,556Q516,556 528.5,568Q541,580 541,597.5Q541,615 529,626.5Q517,638 500,638L411,638Q423,679 440,716.5Q457,754 478,791Q491,791 502,789.5Q513,788 515,786Q543,782 566,798.5Q589,815 594,843Q599,871 582.5,894Q566,917 538,922Q523,924 508.5,925Q494,926 480,926ZM179,556L308,556Q305,537 303.5,518Q302,499 302,480Q302,461 303.5,442Q305,423 308,404L179,404Q175,422 172.5,441.5Q170,461 170,480Q170,499 172.5,518.5Q175,538 179,556ZM214,323L324,323Q333,287 344.5,253Q356,219 375,188Q322,205 281.5,240Q241,275 214,323ZM375,772Q356,742 344.5,707.5Q333,673 324,638L214,638Q241,685 282,720Q323,755 375,772ZM411,323L548,323Q536,282 518.5,244.5Q501,207 478,171Q456,206 439,244.5Q422,283 411,323ZM635,323L745,323Q718,275 676.5,240Q635,205 582,188Q601,219 613.5,253Q626,287 635,323Z"/></svg> No internet?`;
    offlineBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 24px;
      z-index: 99999;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: transparent;
      color: var(--text-muted, #94a3b8);
      border: none;
      border-radius: 9999px;
      padding: 8px 16px;
      font-family: 'Google Sans Flex', system-ui, sans-serif;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.03em;
    `;
    offlineBtn.addEventListener("mouseenter", () => {
      offlineBtn.style.background = "rgba(255, 255, 255, 0.1)";
      offlineBtn.style.color = "#ffffff";
    });
    offlineBtn.addEventListener("mouseleave", () => {
      offlineBtn.style.background = "transparent";
      offlineBtn.style.color = "var(--text-muted, #94a3b8)";
    });
    document.body.appendChild(offlineBtn);
  }
};

const enhanceLegacyLogin = () => {
  console.log("[retop] Looking for CAPTCHA elements...");
  let attempts = 0;
  const maxAttempts = 300; // 30 seconds (300 * 100ms)

  // Save/Restore Username
  const usernameInput = (document.getElementById("username") ||
    document.querySelector("input[name='username']") ||
    document.querySelector("input[name='uname']")) as HTMLInputElement;

  if (usernameInput) {
    idbGet("retop-saved-username").then((savedUser) => {
      if (savedUser && !usernameInput.value) {
        usernameInput.value = savedUser as string;
        usernameInput.dispatchEvent(new Event("input", { bubbles: true }));
        usernameInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }).catch(() => {});

    const saveUser = () => {
      if (usernameInput.value) {
        idbSet("retop-saved-username", usernameInput.value).catch(() => {});
      }
    };

    usernameInput.addEventListener("input", saveUser);
    usernameInput.addEventListener("blur", saveUser);
    usernameInput.form?.addEventListener("submit", saveUser);
  }

  // Polling loop to handle VTOP's asynchronous CAPTCHA loading
  const findAndSolve = setInterval(async () => {
    attempts++;

    // Broadened selectors for VTOP login variations
    const captchaImg = (document.getElementById("captchaCheck") ||
      document.querySelector("#captchaBlock img") ||
      document.querySelector("img[src*='captcha']")) as HTMLImageElement;
    const captchaInput = (document.getElementById("captchaStr") ||
      document.querySelector("input[name='captchaCheck']") ||
      document.querySelector("input[placeholder*='Captcha']")) as HTMLInputElement;
    const captchaBlock = document.getElementById("captchaBlock") || captchaImg?.parentElement;

    injectLoginTheme();

    // Check if image and input exist in DOM
    if (captchaImg && captchaInput) {
      clearInterval(findAndSolve);
      console.log("[retop-captcha] CAPTCHA img & input found in DOM. Initializing solver...", captchaImg, captchaInput);

      // Clear polling interval immediately once CAPTCHA elements are found
      clearInterval(findAndSolve);

      // Check for reCAPTCHA / hCaptcha presence
      const recaptchaElem = document.querySelector(
        ".g-recaptcha, iframe[src*='recaptcha'], #g-recaptcha, .h-captcha, iframe[src*='hcaptcha']",
      );
      if (recaptchaElem) {
        console.log("[retop-captcha] reCAPTCHA / hCaptcha detected on page:", recaptchaElem);
      }

      // Make it compact by physically restructuring the DOM safely
      const captchaInputGroup = captchaInput.closest(".input-group");

      if (
        captchaBlock &&
        captchaInput &&
        !document.getElementById("retop-captcha-container")
      ) {
        const flexContainer = document.createElement("div");
        flexContainer.id = "retop-captcha-container";

        const parent = captchaBlock.parentElement;
        if (parent) {
          parent.insertBefore(flexContainer, captchaBlock);

          // Move the input directly into flexContainer
          flexContainer.appendChild(captchaInput);

          // Move captchaBlock into flexContainer
          flexContainer.appendChild(captchaBlock);

          // Ensure only ONE reload button exists and is styled properly
          const reloadBtn = flexContainer.querySelector("#button-addon2, a[onclick*='loadCaptcha'], button[onclick*='loadCaptcha']");
          if (reloadBtn) {
            reloadBtn.classList.add("retop-reload-btn");
          }

          // Clean up any duplicate reload buttons inside flexContainer
          const allReloadBtns = flexContainer.querySelectorAll("#button-addon2, .retop-reload-btn, button[onclick*='loadCaptcha']");
          if (allReloadBtns.length > 1) {
            for (let i = 1; i < allReloadBtns.length; i++) {
              allReloadBtns[i].remove();
            }
          }

          // Physically remove the old wrappers
          if (captchaInputGroup && captchaInputGroup !== flexContainer) {
            captchaInputGroup.remove();
          }
          const oldCol = document
            .getElementById("basic-addon3")
            ?.closest(".col-xs-12");
          if (oldCol) oldCol.remove();
        }
      }

      const solve = async (imgElement: HTMLImageElement) => {
        try {
          const { autoSolveCaptcha } = await import("./utils/captchaSolver");
          const solvedText = await autoSolveCaptcha(imgElement);
          if (solvedText && captchaInput) {
            captchaInput.value = solvedText;
            captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
            captchaInput.dispatchEvent(new Event("change", { bubbles: true }));
            console.log("[retop-captcha] CAPTCHA Auto-Solved & filled:", solvedText);
          }
        } catch (e) {
          console.error("[retop-captcha] Failed to solve CAPTCHA:", e);
        }
      };

      // Solve the initial load
      await solve(captchaImg);

      // Attach single observer to the wrapper block
      if (captchaBlock && !(captchaBlock as any).__retop_observed) {
        (captchaBlock as any).__retop_observed = true;
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
              const newImg = (captchaBlock.querySelector("img") || document.getElementById("captchaCheck")) as HTMLImageElement;
              if (newImg) {
                captchaInput.value = ""; // Clear old value immediately
                if (newImg.complete && newImg.naturalWidth > 0) {
                  solve(newImg);
                } else {
                  newImg.addEventListener("load", () => solve(newImg), {
                    once: true,
                  });
                }
              }
            }
          });
        });

        observer.observe(captchaBlock, { childList: true, subtree: true });
      }
    } else if (attempts >= maxAttempts) {
      clearInterval(findAndSolve);
      console.log("[retop-captcha] CAPTCHA search polling finished.");
    }
  }, 100);
};

window.addEventListener("vtop-login-success", (e: any) => {
  vtopContext.authId = e.detail;
  document.body.classList.remove("show-legacy-ui");
  renderDashboard();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
