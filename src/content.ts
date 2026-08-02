import { renderDashboard } from "./pages/app";
import { scrapeMenu } from "./parsers/menu";
import {
  injectGlobalStyles,
  injectGlobalFonts,
  initializeContainer,
  getAppRoot,
} from "./utils/bridge";
import React from "react";
import { createRoot } from "react-dom/client";
import { NativePortals } from "./components/NativePortals";
import { asciiArtTT, asciiArtSMV, asciiArtMGR } from "./components/asciiArt";
import { autoSolveCaptcha } from "./utils/captchaSolver";

const vtopContext = {
  csrf: "",
  authId: "",
};

// Apply theme immediately to prevent flashing, but strictly ignore /open/page
const applyThemeFromSettings = (saved: any) => {
  try {
    const data = typeof saved === "string" ? JSON.parse(saved) : saved;
    const settings = data.state?.settings || data;
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
  if (!window.location.pathname.includes("/open/page")) {
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
  }
} catch (e) {}

// Splash Screen logic removed
function injectSplashScreen() {}

function removeSplashScreen() {}

injectSplashScreen();

const originalFetch = window.fetch;

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

  dialog.innerHTML = `
    <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(239, 68, 68, 0.2), transparent, transparent); pointer-events: none;"></div>
    
    <div style="margin-top: auto; width: 100%; display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 24px 48px; box-sizing: border-box; pointer-events: auto; background: linear-gradient(to top, var(--bg-main, #000) 40%, transparent); backdrop-filter: blur(2px);">
      
      <div style="display: flex; align-items: center; gap: 16px;">
        <span class="material-symbols-rounded" style="color: #ef4444; font-size: 40px;">warning</span>
        <div style="display: flex; flex-direction: column; text-align: left;">
          <h1 style="font-size: 24px; font-weight: 900; color: var(--text-main, #fff); margin: 0; text-transform: uppercase; font-family: 'Google Sans Flex', sans-serif; line-height: 1;">${title}</h1>
          <p style="font-size: 14px; font-family: monospace; color: #f87171; margin: 6px 0 0; max-width: 600px; white-space: pre-wrap;">${message}</p>
        </div>
      </div>
      
      <button id="retop-error-action-btn" style="display: flex; align-items: center; gap: 8px; background: var(--accent-base, #2563eb); color: var(--text-inverse, #ffffff); border: none; padding: 12px 24px; border-radius: 9999px; font-weight: 700; font-size: 14px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); transition: background 0.2s;" onmouseover="this.style.filter='brightness(1.2)'" onmouseout="this.style.filter='none'">
        <span class="material-symbols-rounded" style="font-size: 18px;">autorenew</span>
        ${btnText}
      </button>
      
    </div>
  `;

  document.body.appendChild(dialog);

  const btn = document.getElementById("retop-error-action-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      if (btnAction === "reload") window.location.reload();
      else window.location.href = btnAction;
    });
  }
}

window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    if (
      response.status === 404 ||
      response.status === 401 ||
      response.status === 403
    ) {
      handleNetworkError(response.status);
    }
    return response;
  } catch (error: any) {
    // If the browser is offline, it's a real network error
    // If online, it's likely an aborted fetch due to page navigation
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
  this.addEventListener("load", function () {
    if (this.status === 404 || this.status === 401 || this.status === 403) {
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
      const data =
        typeof settingsResult === "string"
          ? JSON.parse(settingsResult as string)
          : settingsResult;
      const settings = data.state?.settings || data;
      if (
        settings.defaultView === "legacy" &&
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
  const portalsRoot = document.createElement("div");
  portalsRoot.id = "retop-native-portals";
  document.body.appendChild(portalsRoot);
  createRoot(portalsRoot).render(React.createElement(NativePortals));

  const isRoleSelection =
    document.getElementById("stdForm") !== null ||
    document.getElementById("empForm") !== null ||
    (path.includes("/vtop/login") &&
      document.getElementById("username") === null &&
      document.getElementById("captchaBlock") === null);

  if (path.includes("/vtop/open/page") || isRoleSelection) {
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

  if (path.includes("/vtop/login")) {
    enhanceLegacyLogin();
    return;
  }

  // --- Authenticated Pages Only ---
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
  } else {
    document.body.classList.add("show-legacy-ui");
    removeSplashScreen();
  }
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

const injectLoginTheme = () => {
  if (document.getElementById("vtop-login-theme")) return;

  injectGlobalFonts();

  const link = document.createElement("link");
  link.id = "vtop-login-theme";
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("dist/login.css");
  document.head.appendChild(link);

  // Remove native Person Icon Wrapper if it exists
  const userIconWrapper = document.getElementById("basic-addon1");
  if (userIconWrapper) {
    userIconWrapper.style.display = "none";
  }

  const passIconWrapper = document.getElementById("basic-addon2");
  if (passIconWrapper) {
    // Restore the SVG with the animated retop-eye-strike
    passIconWrapper.innerHTML = `
      <svg id="passwordIcon" class="fa fa-eye lucide lucide-eye" onclick="javascript:toggleEye();" style="cursor: pointer; width: 24px; height: 24px; stroke: currentColor; fill: none;" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
        <line x1="2" y1="2" x2="22" y2="22" class="retop-eye-strike" />
      </svg>
    `;
  }

  // No custom lock icon injected anymore per user request.

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
            newBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M126-212v-342q0-30 13-56.5t37-44.5l228-171q34-26 76-26t76 26l228 171q24 18 37 44.5t13 56.5v342q0 53-36.5 89.5T708-86h-77q-26 0-44.5-18.5T568-149v-196q0-26-18.5-44.5T505-408h-50q-26 0-44.5 18.5T392-345v196q0 26-18.5 44.5T329-86h-77q-53 0-89.5-36.5T126-212" /></svg>`;
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
            link.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M126-212v-342q0-30 13-56.5t37-44.5l228-171q34-26 76-26t76 26l228 171q24 18 37 44.5t13 56.5v342q0 53-36.5 89.5T708-86h-77q-26 0-44.5-18.5T568-149v-196q0-26-18.5-44.5T505-408h-50q-26 0-44.5 18.5T392-345v196q0 26-18.5 44.5T329-86h-77q-53 0-89.5-36.5T126-212" /></svg>`;
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

      mergedDiv.innerHTML = `Forgot <a href="javascript:void(0)" onclick="javascript:resetPassword()">password</a> or <a href="javascript:void(0)" onclick="javascript:forgotUserID()">login ID</a>?`;

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
        animation: retop-wiggle 0.4s ease-in-out !important;
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

          // Check password
          if (
            passwordInput &&
            (!passwordInput.value || passwordInput.value.length < 8)
          ) {
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
      vitLogo.src = chrome.runtime.getURL("dist/assets/vitLogo.svg");
    }

    // Remove the "VIT" text properly
    const vitText = header.querySelector(".VITLogoStyle");
    if (vitText) {
      vitText.remove();
    }

    // Transform the campus text to fit the new width
    const navbarText = header.querySelector(".navbar-text");
    if (navbarText && !navbarText.classList.contains("retop-campus-text")) {
      navbarText.innerHTML = "VELLORE CAMPUS";
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

    const isPRP = false;
    
    let rawArt = asciiArtTT;
    if (pickedArt === "SMV") rawArt = asciiArtSMV;
    if (pickedArt === "MGR") rawArt = asciiArtMGR;
    
    const asciiArt = rawArt.replace(/\r/g, "");

    // Force left alignment so 2D grid coordinates (charX) perfectly match the DOM rendering
    asciiPre.style.setProperty("text-align", "left", "important");

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
      asciiPre.style.setProperty("font-size", "5.25px", "important");
      // line-height left to CSS default (1)
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
      charW = 3.15; // 25% smaller than 4.2
      charH = 5.25; // line-height is 1
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
        const charX = Math.floor(currentX / charW);
        const charY = Math.floor(currentY / charH);
        let onWater = false;

        // Check current char and surrounding chars for leniency (radius increased for sparse arts like MGR)
        for (
          let cy = Math.max(0, charY - 3);
          cy <= Math.min(originalLines.length - 1, charY + 3);
          cy++
        ) {
          const line = originalLines[cy];
          for (
            let cx = Math.max(0, charX - 8);
            cx <= Math.min(line.length - 1, charX + 8);
            cx++
          ) {
            if (line[cx] && line[cx] !== " ") onWater = true;
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

          let newText = "";
          for (let y = 0; y < originalLines.length; y++) {
            const line = originalLines[y];
            const py = y * charH;

            let newLine = "";
            for (let x = 0; x < line.length; x++) {
              const char = line[x];
              if (char === " ") {
                newLine += " ";
                continue;
              }
              const px = x * charW;

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
      const savedSettings = result["retop-settings"] as string;
      if (savedSettings) {
        // Zustand persist wraps state in { state: { ... }, version: ... }
        const parsed = JSON.parse(savedSettings);
        const settings = parsed.state?.settings || parsed;

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
    } catch (err) {
      console.warn(
        "[retop] Failed to load theme settings for login page:",
        err,
      );
    }
  });
};

const enhanceLegacyLogin = () => {
  console.log("[retop] Looking for CAPTCHA elements...");
  let attempts = 0;
  const maxAttempts = 300; // 30 seconds (300 * 100ms)

  // Save/Restore Username
  const usernameInput = document.getElementById("username") as HTMLInputElement;
  if (usernameInput) {
    chrome.storage.local.get("retop-saved-username", (result) => {
      const savedUser = result["retop-saved-username"] as string;
      if (savedUser && !usernameInput.value) {
        usernameInput.value = savedUser;
      }
    });
    usernameInput.addEventListener("blur", () => {
      if (usernameInput.value) {
        chrome.storage.local.set({
          "retop-saved-username": usernameInput.value,
        });
      }
    });
  }

  // Polling loop to handle VTOP's asynchronous CAPTCHA loading
  const findAndSolve = setInterval(async () => {
    attempts++;

    // Updated Selectors based on VTOP's current HTML structure
    const captchaBlock = document.getElementById("captchaBlock");
    injectLoginTheme();
    const captchaImg = captchaBlock?.querySelector("img") as HTMLImageElement;
    const captchaInput = document.getElementById(
      "captchaStr",
    ) as HTMLInputElement;

    // Check if image exists and actually has pixel data
    if (
      captchaBlock &&
      captchaImg &&
      captchaInput &&
      captchaImg.complete &&
      captchaImg.naturalWidth > 0
    ) {
      clearInterval(findAndSolve);
      console.log("[retop] CAPTCHA found. Initializing solver.");

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

          // Move the actual reload button into our container
          const reloadBtn = document.getElementById("button-addon2");
          if (reloadBtn) {
            flexContainer.appendChild(reloadBtn);
            reloadBtn.className = ""; // Strip native Bootstrap classes like .btn
            reloadBtn.classList.add("retop-reload-btn");
          } else {
            // Fallback if inside captchaBlock
            const fallbackReloadBtn = captchaBlock.querySelector("a, button");
            if (fallbackReloadBtn) {
              fallbackReloadBtn.className = "";
              fallbackReloadBtn.classList.add("retop-reload-btn");
            }
          }

          // Physically remove the old wrappers
          if (captchaInputGroup) {
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
            console.log("[retop] CAPTCHA Auto-Solved:", solvedText);
          }
        } catch (e) {
          console.error("[retop] Failed to solve CAPTCHA:", e);
        }
      };

      // Solve the initial load
      await solve(captchaImg);

      // Attach observer to the wrapper block, not the image.
      // VTOP uses innerHTML to replace the image, which destroys the old image node.
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            const newImg = captchaBlock.querySelector(
              "img",
            ) as HTMLImageElement;
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
    } else if (attempts >= maxAttempts) {
      clearInterval(findAndSolve);
      console.warn("[retop] CAPTCHA elements not found after 30 seconds.");
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
