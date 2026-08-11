import { renderDashboard } from "./pages/app";
import { scrapeMenu } from "./parsers/menu";
import { saveUserPin, getUserPinRecord } from "./utils/pinSecurity";
import {
  injectGlobalStyles,
  injectGlobalFonts,
  initializeContainer,
  getAppRoot,
  injectSplashScreen,
  removeSplashScreen,
} from "./utils/bridge";
import React from "react";
import { createRoot } from "react-dom/client";
import { NativePortals } from "./components/NativePortals";
import { asciiArtTT, asciiArtSMV, asciiArtMGR } from "./components/asciiArt";
import { autoSolveCaptcha } from "./utils/captchaSolver";
import { getExtUrl } from "./utils/url";
import { interceptDashboardResponse } from "./utils/dashboardInterceptor";

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
    const decoded = typeof raw === "string" ? decodeStoragePayload(raw) : raw;
    const parsed = typeof decoded === "string" ? JSON.parse(decoded) : decoded;
    return parsed?.state?.settings || parsed?.settings || (parsed?.defaultView ? parsed : null);
  } catch (e) {
    return null;
  }
};

const applyThemeFromSettings = (saved: any) => {
  try {
    const settings = parseSettingsPayload(saved);
    if (!settings) return;
    if (settings.themeMode) {
      let activeTheme = settings.themeMode;
      if (activeTheme === "auto") {
        const hour = new Date().getHours();
        activeTheme = hour >= 6 && hour < 18 ? "light" : "dark";
      }
      document.documentElement.setAttribute("data-theme", activeTheme);
    }
    const MATERIAL_ACCENTS: Record<string, string> = {
      blue: "#2563eb",
      indigo: "#4f46e5",
      purple: "#9333ea",
      pink: "#db2777",
      red: "#dc2626",
      orange: "#ea580c",
      yellow: "#ca8a04",
      lime: "#65a30d",
      green: "#16a34a",
      cyan: "#0891b2",
    };
    let baseColor =
      MATERIAL_ACCENTS[settings.accentColor] || MATERIAL_ACCENTS.blue;
    if (settings.randomAccentColor) {
      const hue = Math.floor(Math.random() * 360);
      baseColor = `hsl(${hue}, 70%, 45%)`;
    }
    document.documentElement.style.setProperty("--accent-base", baseColor);
  } catch (err) {}
};

try {
  chrome.storage.local.get("retop-settings", (result) => {
    const saved = result["retop-settings"];
    if (saved) {
      applyThemeFromSettings(saved);
    }
  });

  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes["retop-settings"]) {
        const newValue = changes["retop-settings"].newValue;
        if (newValue) applyThemeFromSettings(newValue);
      }
    });
  }
} catch (e) {}

// ── Early intercept at document_start for prelogin / open / login pages ──
const isTopWindow = window.self === window.top;
const isPreloginOrLoginPage =
  isTopWindow && (
    window.location.pathname.includes("/vtop/open/page") ||
    window.location.pathname.includes("/vtop/vtopLogin") ||
    window.location.pathname.includes("/vtop/login") ||
    window.location.pathname.includes("/vtop/prelogin")
  );

const isContentPage =
  window.location.pathname.includes("/vtop/content") ||
  window.location.pathname.includes("/vtop/process") ||
  window.location.pathname.includes("/vtop/main");

if (isPreloginOrLoginPage || isContentPage) {
  injectSplashScreen();

  if (window.location.pathname.includes("/vtop/open/page")) {
    const earlyLink = document.createElement("link");
    earlyLink.id = "vtop-early-theme";
    earlyLink.rel = "stylesheet";
    earlyLink.href = getExtUrl("dist/prelogin.css");
    (document.head || document.documentElement).appendChild(earlyLink);
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
    if (!chrome?.runtime?.id) throw new Error("Context invalidated");
    [pausedResult, settingsResult] = await Promise.all([
      new Promise((resolve) => {
        chrome.storage.local.get("retop-paused-until", (res) =>
          resolve(res["retop-paused-until"]),
        );
      }),
      new Promise((resolve) => {
        chrome.storage.local.get("retop-settings", (res) =>
          resolve(res["retop-settings"]),
        );
      }),
    ]);
  } catch (err) {
    console.warn(
      "[retop] Extension context invalidated or storage error. Falling back to native VTOP.",
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
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "open_settings") {
      const root = document.getElementById("retop-root");
      if (root) {
        // Find a way to navigate or fire custom event to open settings
        window.dispatchEvent(new CustomEvent("retop-open-settings"));
      }
    }
  });

  const path = window.location.pathname;

  // CRITICAL: Force native DOM visibility immediately.
  // Prevents the page from going blank.
  document.body.style.opacity = "1";
  document.body.style.display = "block";
  document.body.style.visibility = "visible";
  document.body.classList.add("show-legacy-ui");

  // Mount native portals for injected React icons over legacy VTOP UI
  let portalsRoot = document.getElementById("retop-native-portals");
  if (!portalsRoot) {
    portalsRoot = document.createElement("div");
    portalsRoot.id = "retop-native-portals";
    document.body.appendChild(portalsRoot);
    createRoot(portalsRoot).render(React.createElement(NativePortals));
  }

  const isRoleSelection =
    document.getElementById("stdForm") !== null ||
    document.getElementById("empForm") !== null ||
    (path.includes("/vtop/login") &&
      document.getElementById("username") === null &&
      document.getElementById("captchaBlock") === null);

  const isLoginPage =
    path.includes("/vtop/open/page") ||
    path.includes("/vtop/vtopLogin") ||
    path.includes("/vtop/login") ||
    path.includes("/vtop/prelogin") ||
    isRoleSelection;

  if (isLoginPage) {
    // CSS was already injected at document_start. Now the DOM is ready:
    // remove the loader and uncloak the page.
    //
    // PAGE DETECTION FIX: VTOP sometimes serves /open/page (role selection)
    // content at /vtop/login URL. Detect actual page content by checking
    // for DOM elements unique to each page, not just the URL path.
    const isActuallyRoleSelectionPage =
      isRoleSelection ||
      document.querySelector(".spotlight-background, .spotlightMsgDivs, #stdForm") !== null;

    if (path.includes("/vtop/open/page") || isActuallyRoleSelectionPage) {
      injectPreloginTheme();
    } else {
      injectLoginTheme();
      enhanceLegacyLogin();
    }

    removeSplashScreen();

    console.log("[retop] Open/login page styled and revealed");

    if (!(window as any).__retop_click_listener_attached) {
      (window as any).__retop_click_listener_attached = true;
      document.addEventListener(
        "click",
        (e) => {
          const target = e.target as HTMLElement;
          const form = target.closest("form");
          if (form && form.id) {
            if (form.id === "stdForm")
              chrome.storage.local.set({ "retop-user-role": "student" });
            if (form.id === "empForm")
              chrome.storage.local.set({ "retop-user-role": "employee" });
            if (form.id === "parentForm")
              chrome.storage.local.set({ "retop-user-role": "parent" });
            if (form.id === "alumniForm")
              chrome.storage.local.set({ "retop-user-role": "alumni" });
          }
        },
        true,
      );
    }

    // SKIP ROLE SELECTION: When enabled in settings, auto-select student
    // role and proceed to login, bypassing /open/page role picker.
    if (isActuallyRoleSelectionPage) {
      try {
        const skipResult = await new Promise<any>((resolve) => {
          chrome.storage.local.get("retop-settings", (res) => resolve(res["retop-settings"]));
        });
        const skipSettings = parseSettingsPayload(skipResult);
        if (skipSettings?.skipRoleSelection) {
          const stdForm = document.getElementById("stdForm") as HTMLFormElement;
          if (stdForm) {
            console.log("[retop] skipRoleSelection enabled, auto-submitting student form");
            chrome.storage.local.set({ "retop-user-role": "student" });
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

  const roleResult = await new Promise((resolve) => {
    chrome.storage.local.get("retop-user-role", (res) =>
      resolve(res["retop-user-role"]),
    );
  });
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
  injectSplashScreen();
  document.body.classList.remove("show-legacy-ui");
  injectGlobalStyles();

  await waitForTokens();
  initializeContainer();

  if (vtopContext.authId && vtopContext.csrf) {
    console.log("[retop] Session Active. Verifying menu items...");

    // Wait up to 5 seconds to ensure at least 1 menu item is fetchable
    let menuCount = 0;
    for (let i = 0; i < 50; i++) {
      const newMenu = scrapeMenu(document);
      menuCount = newMenu.reduce((acc, cat) => acc + cat.links.length, 0);
      if (menuCount > 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    if (menuCount === 0) {
      console.log(
        "[retop] No menu items fetchable. Falling back to native VTOP.",
      );
      document.body.classList.add("show-legacy-ui");
      removeSplashScreen();
      return; // Stop initialization of Retop UI completely
    }

    renderDashboard();
    if (vtopContext.authId) {
      promptOfflinePinSetup(vtopContext.authId);
    }
  } else {
    document.body.classList.add("show-legacy-ui");
    removeSplashScreen();
  }
};

const promptOfflinePinSetup = async (regNo: string) => {
  if (!regNo || document.getElementById("retop-offline-pin-toast")) return;

  // Delay slightly so dashboard renders first
  await new Promise((r) => setTimeout(r, 1200));

  if (document.getElementById("retop-offline-pin-toast")) return;

  try {
    const record = await getUserPinRecord(regNo);
    if (record) return;
  } catch {}

  const toast = document.createElement("div");
  toast.id = "retop-offline-pin-toast";
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    background: #18181b;
    color: #ffffff;
    border: 2px solid #3f3f46;
    padding: 16px 20px;
    border-radius: 20px;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
    font-family: 'Google Sans Flex', system-ui, sans-serif;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: retopSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  `;

  const toastHtml = `
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); display: flex; align-items: center; justify-content: center; font-weight: bold;">⚡</div>
        <div>
          <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Setup Offline Mode PIN</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Protect & access your profile offline anytime</div>
        </div>
      </div>
      <button id="retop-pin-toast-close" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 0;">✕</button>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <input id="retop-pin-toast-input" type="password" maxlength="4" placeholder="4 Digits" style="flex: 1; background: #09090b; border: 2px solid #3f3f46; color: #fff; text-align: center; border-radius: 12px; height: 38px; font-family: monospace; font-size: 16px; letter-spacing: 0.3em; outline: none;" />
      <button id="retop-pin-toast-submit" style="background: #2563eb; color: #fff; border: none; font-weight: 700; font-size: 12px; border-radius: 12px; height: 38px; padding: 0 16px; cursor: pointer; white-space: nowrap;">Save PIN</button>
    </div>
    <div id="retop-pin-toast-status" style="font-size: 11px; color: #10b981; font-weight: 600; display: none;">✓ Security PIN Encrypted & Saved!</div>
  `;
  const parsedToastDoc = new DOMParser().parseFromString(toastHtml, "text/html");
  while (parsedToastDoc.body.firstChild) {
    toast.appendChild(parsedToastDoc.body.firstChild);
  }

  document.body.appendChild(toast);

  const closeBtn = document.getElementById("retop-pin-toast-close");
  const submitBtn = document.getElementById("retop-pin-toast-submit");
  const inputEl = document.getElementById("retop-pin-toast-input") as HTMLInputElement;
  const statusEl = document.getElementById("retop-pin-toast-status");

  closeBtn?.addEventListener("click", () => toast.remove());

  submitBtn?.addEventListener("click", async () => {
    const val = inputEl.value.trim();
    if (val.length === 4) {
      await saveUserPin(regNo, val);
      if (statusEl) statusEl.style.display = "block";
      setTimeout(() => {
        toast.remove();
      }, 1800);
    } else {
      inputEl.style.borderColor = "#ef4444";
      setTimeout(() => {
        inputEl.style.borderColor = "#3f3f46";
      }, 1000);
    }
  });
};

function waitForTokens(): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 50;

    const interval = setInterval(() => {
      attempts++;
      const csrfInput = document.querySelector(
        'input[name="_csrf"]',
      ) as HTMLInputElement;
      const authInput = document.getElementById(
        "authorizedIDX",
      ) as HTMLInputElement;

      if (csrfInput) vtopContext.csrf = csrfInput.value;
      if (authInput) vtopContext.authId = authInput.value;

      if (vtopContext.csrf || attempts >= maxAttempts) {
        clearInterval(interval);
        resolve(!!vtopContext.csrf);
      }
    }, 100);
  });
}

const injectPreloginTheme = () => {
  if (document.getElementById("vtop-prelogin-theme")) return;

  console.log("[retop] Injecting prelogin theme for /open/page");

  injectGlobalFonts();

  const link = document.createElement("link");
  link.id = "vtop-prelogin-theme";
  link.rel = "stylesheet";
  link.href = getExtUrl("dist/prelogin.css");
  document.head.appendChild(link);

  document.addEventListener("click", (e) => {
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

    const item = target.closest(".list-group-item, .spotlightMsgDivs li, .spotlight-background li");
    if (item) {
      const link = item.querySelector("a, button[data-spotlighttitle]") as HTMLElement;
      if (link && target !== link && !link.contains(target)) {
        link.click();
      }
    }
  });

  console.log("[retop] prelogin.css URL:", link.href);
};

const injectLoginTheme = () => {
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
    const navbarText = header.querySelector(".navbar-text");
    if (navbarText && !navbarText.classList.contains("retop-campus-text")) {
      navbarText.textContent = "VELLORE CAMPUS";
      navbarText.classList.add("retop-campus-text");
    }

    // Footer logic moved to the right side
  }

  // Inject ASCII Art full page
  if (!document.getElementById("retop-right-footer-wrapper")) {
    const wrapper = document.createElement("div");
    wrapper.id = "retop-right-footer-wrapper";

    const asciiPre = document.createElement("pre");
    asciiPre.id = "retop-ascii-art";
    const artTypes = ["TT", "SMV", "MGR"];
    const lastArt = localStorage.getItem("retop_last_ascii_art") || "";
    const availableArts = artTypes.filter(type => type !== lastArt);
    const pickedArt = availableArts.length ? availableArts[Math.floor(Math.random() * availableArts.length)] : "TT";
    localStorage.setItem("retop_last_ascii_art", pickedArt);
    
    let rawArt = asciiArtTT;
    if (pickedArt === "SMV") rawArt = asciiArtSMV;
    if (pickedArt === "MGR") rawArt = asciiArtMGR;
    
    const asciiArt = rawArt.replace(/\r/g, "");

    // Force right alignment for ASCII art
    asciiPre.style.setProperty("text-align", "right", "important");

    if (pickedArt === "PRP") {
      asciiPre.style.letterSpacing = "0px";
      asciiPre.style.setProperty("margin-right", "0px", "important");
      asciiPre.style.setProperty("font-size", "5px", "important");
      // Use 4.5px line-height to counter Windows 125%/150% DPI scaling rounding artifacts
      // which cause 1px gaps every ~4 lines at tiny font sizes.
      asciiPre.style.setProperty("line-height", "4.5px", "important");
    } else if (pickedArt === "SMV") {
      asciiPre.style.letterSpacing = "0px";
      asciiPre.style.setProperty("margin-right", "0px", "important");
      asciiPre.style.setProperty("font-size", "4.2px", "important");
      asciiPre.style.setProperty("line-height", "4px", "important");
    } else if (pickedArt === "MGR") {
      asciiPre.style.letterSpacing = "0px";
      asciiPre.style.setProperty("margin-right", "0px", "important");
      asciiPre.style.setProperty("font-size", "4.8px", "important");
      asciiPre.style.setProperty("line-height", "4.4px", "important");
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
    
    if (pickedArt === "PRP") {
      charW = 3;
      charH = 4.5;
    } else if (pickedArt === "SMV") {
      charW = 2.5; // ~40% smaller than 4.2
      charH = 4;
    } else if (pickedArt === "MGR") {
      charW = 2.9;
      charH = 4.4;
    }

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

        const getLineOffsetX = (lineLen: number) => {
          if (pickedArt === "MGR") {
            return Math.max(0, rect.width - lineLen * charW);
          }
          return 0;
        };

        // Check current char and surrounding chars for leniency (radius increased for sparse arts like MGR)
        for (
          let cy = Math.max(0, charY - 3);
          cy <= Math.min(originalLines.length - 1, charY + 3);
          cy++
        ) {
          const line = originalLines[cy];
          const offsetX = getLineOffsetX(line.length);
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
            const offsetX = pickedArt === "MGR" ? Math.max(0, preWidth - line.length * charW) : 0;

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

  chrome.storage.local.get("retop-settings", (result) => {
    try {
      const savedSettings = result["retop-settings"];
      if (savedSettings) {
        const settings = parseSettingsPayload(savedSettings);
        if (settings) {

        const MATERIAL_ACCENTS: Record<string, string> = {
          blue: "#2563eb",
          indigo: "#4f46e5",
          purple: "#9333ea",
          pink: "#db2777",
          red: "#dc2626",
          orange: "#ea580c",
          yellow: "#ca8a04",
          lime: "#65a30d",
          green: "#16a34a",
          cyan: "#0891b2",
        };

        let baseColor =
          MATERIAL_ACCENTS[settings.accentColor] || MATERIAL_ACCENTS.blue;

        if (settings.randomAccentColor) {
          const hue = Math.floor(Math.random() * 360);
          baseColor = `hsl(${hue}, 70%, 45%)`;
        }

        document.documentElement.style.setProperty("--accent-base", baseColor);
        let activeTheme = settings.themeMode;
        if (activeTheme === "auto") {
          const hour = new Date().getHours();
          activeTheme = hour >= 6 && hour < 18 ? "light" : "dark";
        }
        document.documentElement.setAttribute("data-theme", activeTheme);
        }
      }
    } catch (err) {
      console.warn(
        "[retop] Failed to load theme settings for login page:",
        err,
      );
    }
  });

  document.title = "Login - retop";

  // Inject Offline Access Button (bottom-left corner)
  if (!document.getElementById("retop-offline-btn")) {
    const offlineBtn = document.createElement("a");
    offlineBtn.id = "retop-offline-btn";
    offlineBtn.href = "https://getretop.web.app/";
    offlineBtn.target = "_blank";
    offlineBtn.rel = "noopener noreferrer";
    offlineBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" style="width:16px;height:16px;flex-shrink:0;" viewBox="0 -960 960 960" fill="currentColor"><path d="m880-80-82-82q-42 29-91 45.5T600-100q-58 0-111-18t-98-52l56-56q34 24 74 37.5t79 13.5q26 0 50.5-5t48.5-15L522-372q-4 1-8.5 2t-9.5 2l-56-56q18-4 35.5-9.5T518-448L328-638q-30 38-51 82.5T244-460h-80q15-100 57.5-171T316-744L80-980l56-56 800 800-56 56ZM556-540l-56-56q36-20 74.5-37T646-660q-40-14-82-22t-84-10v80h-80v-80q-58 2-111.5 16T184-646l-58-58q60-42 130-63t144-23v-90h80v90q70 2 133.5 20T738-718l-62 62q-24-14-50-24.5T572-696q-28 10-53 22.5T472-646q26 4 50.5 12t48.5 18l-58 58q-18-8-37-13.5T436-580l-56-56 176 96Zm124 180-58-58q14-28 23-57.5t13-60.5h-78l-80-80h238q-14 100-56.5 171T680-360Z"/></svg> No internet?`;
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
    chrome.storage.local.get("retop-saved-username", (result) => {
      const savedUser = result["retop-saved-username"] as string;
      if (savedUser && !usernameInput.value) {
        usernameInput.value = savedUser;
        usernameInput.dispatchEvent(new Event("input", { bubbles: true }));
        usernameInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    const saveUser = () => {
      if (usernameInput.value) {
        chrome.storage.local.set({
          "retop-saved-username": usernameInput.value,
        });
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

      // Attach observer to the wrapper block, not the image.
      // VTOP uses innerHTML to replace the image, which destroys the old image node.
      if (captchaBlock) {
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
