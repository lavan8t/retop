import { getExtUrl } from "./utils/url";
import { set as idbSet, get as idbGet, entries as idbEntries } from "idb-keyval";

if (typeof window !== "undefined") {
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
}

// 4. On /u/[id]/home routes: take over page & mount offline app UI
const isOfflineRoute = /\/u\/[^/]+\/home(\/|$)/.test(window.location.pathname);

if (isOfflineRoute && typeof chrome !== "undefined" && typeof chrome.runtime?.getURL === "function") {
  const takeover = () => {
    // Clean placeholder styles from offline-shell.html
    document.querySelectorAll("head style, head link").forEach((el) => el.remove());
    document.body.innerHTML = "";
    document.documentElement.setAttribute("data-theme", "dark");

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", takeover, { once: true });
  } else {
    takeover();
  }
}
