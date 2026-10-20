import { getExtUrl } from "./utils/url";
import { set as idbSet } from "idb-keyval";

if (typeof window !== "undefined") {
  const version =
    (typeof chrome !== "undefined" && chrome.runtime?.getManifest?.().version) || "0.0.0";
  // Signal to the web application that the extension is active
  try {
    localStorage.setItem("__RETOP_EXT_PRESENT__", "true");
  } catch {}
  (window as any).__RETOP_EXTENSION_INSTALLED__ = true;
  (window as any).__RETOP_EXTENSION_VERSION__ = version;
  document.documentElement.setAttribute("data-retop-extension", "true");

  window.dispatchEvent(new CustomEvent("retop-extension-ready", { detail: { version } }));
  document.dispatchEvent(new CustomEvent("retop-extension-ready", { detail: { version } }));
  window.postMessage({ type: "RETOP_EXT_PRESENT", version }, "*");

  // Proactively fetch all cached extension storage to hydrate the web app
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    try {
      chrome.runtime.sendMessage({ action: "GET_ALL_SYNC_DATA" }, (res) => {
        if (res && res.data && typeof res.data === "object") {
          Promise.all(
            Object.entries(res.data).map(async ([k, v]) => {
              try {
                await idbSet(k, v);
                if (typeof v === "string") localStorage.setItem(k, v);
                else localStorage.setItem(k, JSON.stringify(v));
              } catch {}
            })
          ).catch(() => {});
        }
      });
    } catch {}
  }

  // Listen for messages from background service worker (scraped data relay)
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === "RETOP_PWA_SYNC_PAYLOAD" && message.payload) {
        idbSet("portal-app-storage", {
          state: { data: message.payload, lastSynced: Date.now() },
          version: 0,
        })
          .then(() => sendResponse({ success: true }))
          .catch((err) => sendResponse({ success: false, error: String(err) }));

        return true;
      }
    });
  }

  // ── Offline surface ──────────────────────────────────────────────────────
  // getretop.web.app is offline-only: passcode plus cached data, never live VTOP.
  // VTOP sends no CORS headers, so this page could not reach it even if it tried.
  // Signing in happens once on vtop.vit.ac.in, which the extension mirrors here.

  const checkIsOfflineRoute = () => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();

    return (
      /\/u\/[^/]+(\/home|\/|$)/.test(path) ||
      path.includes("/offline") ||
      path.includes("/app") ||
      path.includes("/dashboard") ||
      hash.includes("offline") ||
      hash.includes("/u/") ||
      search.includes("offline=true")
    );
  };

  const takeover = () => {
    if ((window as any).__RETOP_TAKEOVER_DONE__) return;
    (window as any).__RETOP_TAKEOVER_DONE__ = true;
    (window as any).__RETOP_OFFLINE__ = true;

    // Clean placeholder styles from landing page
    document.querySelectorAll("head style, head link:not([rel='manifest'])").forEach((el) => el.remove());
    document.body.innerHTML = "";
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.style.background = "#09090b";
    document.body.style.background = "#09090b";

    // Inject fonts & ext stylesheets
    const injectLink = (href: string) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      document.head.appendChild(l);
    };

    // Global font face CSS injection
    const fontStyle = document.createElement("style");
    fontStyle.textContent = `
      @font-face {
        font-family: 'Material Symbols Rounded';
        font-style: normal;
        font-weight: 100 700;
        src: url("${getExtUrl("fonts/material-symbols-rounded.woff2")}") format('woff2');
      }
      @font-face {
        font-family: "Google Sans Flex";
        font-weight: 1 1000;
        font-stretch: 25% 151%;
        font-display: swap;
        src: url("${getExtUrl("fonts/gsf.subset.woff2")}") format("woff2");
      }
    `;
    document.head.appendChild(fontStyle);

    injectLink(getExtUrl("style.css"));
    injectLink(getExtUrl("login.css"));

    const script = document.createElement("script");
    script.type = "module";
    script.src = getExtUrl("offline.js");
    document.head.appendChild(script);
  };

  if (typeof chrome !== "undefined" && typeof chrome.runtime?.getURL === "function") {
    // 1. Check current route
    if (checkIsOfflineRoute()) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", takeover, { once: true });
      } else {
        takeover();
      }
    }

    // 2. Intercept clicks on "Go to Retop" / "Launch" / "Offline" buttons
    document.addEventListener(
      "click",
      (e) => {
        const target = (e.target as HTMLElement)?.closest?.("a, button, [role='button'], [data-retop-launch]");
        if (!target) return;

        const text = (target.textContent || "").trim().toLowerCase();
        const href = (target.getAttribute("href") || "").toLowerCase();
        const isLaunchTarget =
          target.hasAttribute("data-retop-launch") ||
          target.id === "retop-launch" ||
          target.id === "go-to-retop" ||
          text.includes("go to retop") ||
          text.includes("open retop") ||
          text.includes("launch retop") ||
          text.includes("launch app") ||
          text.includes("open app") ||
          text.includes("offline mode") ||
          href.includes("offline") ||
          href.includes("/u/") ||
          href.includes("/app");

        if (isLaunchTarget) {
          e.preventDefault();
          e.stopPropagation();
          takeover();
        }
      },
      true,
    );

    // 3. Listen for postMessage from page
    window.addEventListener("message", (e) => {
      if (
        e.data === "RETOP_LAUNCH_OFFLINE" ||
        e.data?.type === "RETOP_LAUNCH_OFFLINE" ||
        e.data?.action === "GO_TO_RETOP"
      ) {
        takeover();
      }

      // The /disable page asks the extension to turn retop back on.
      if (e.data?.type === "RETOP_ENABLE_AGAIN" || e.data?.action === "RETOP_ENABLE_AGAIN") {
        try {
          chrome.runtime.sendMessage({ action: "CLEAR_DISABLED" }, () => {});
        } catch {}
      }
    });

    // 4. Handle SPA navigation
    window.addEventListener("popstate", () => {
      if (checkIsOfflineRoute()) takeover();
    });
    window.addEventListener("hashchange", () => {
      if (checkIsOfflineRoute()) takeover();
    });
  }
}
