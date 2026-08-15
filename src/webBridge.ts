import { getExtUrl } from "./utils/url";
import { set as idbSet, get as idbGet, entries as idbEntries } from "idb-keyval";

if (typeof window !== "undefined") {
  try {
    localStorage.setItem("__RETOP_EXT_PRESENT__", "true");
  } catch {}

  const origin = window.location.origin;

  // 1. Announce presence to web app
  window.postMessage({ type: "RETOP_EXT_SYNC_COMPLETE", data: {} }, origin);
  window.postMessage({ type: "RETOP_EXT_PRESENT" }, origin);

  // 2. Listen for messages from background service worker (scraped data relay)
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === "RETOP_PWA_SYNC_PAYLOAD" && message.payload) {
        const payload = message.payload;
        const persistState = {
          state: {
            data: payload,
            lastSynced: Date.now(),
          },
          version: 0,
        };

        // Write directly to PWA's IndexedDB store under the Zustand persist key
        idbSet("portal-app-storage", JSON.stringify(persistState))
          .then(() => {
            // Also notify live React app via CustomEvent and postMessage
            window.dispatchEvent(new CustomEvent("retop-pwa-synced", { detail: payload }));
            window.postMessage({ type: "RETOP_PWA_SYNCED", payload }, origin);
            sendResponse({ success: true });
          })
          .catch((err) => {
            console.error("[Bridge Script] Failed writing to IndexedDB:", err);
            sendResponse({ success: false, error: String(err) });
          });

        return true; // Keep channel open for async response
      }
    });
  }

  // 3. Listen for window.postMessage requests from page scripts (offline.js / storageAdapter)
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || typeof event.data !== "object") return;
    const { type, keys, data, requestId } = event.data;

    if (type === "RETOP_GET_STORAGE") {
      if (Array.isArray(keys)) {
        Promise.all(keys.map(async (k) => [k, await idbGet(k)])).then((pairs) => {
          const res: Record<string, any> = {};
          for (const [k, v] of pairs) {
            if (v !== undefined) res[k] = v;
          }
          window.postMessage({ type: "RETOP_STORAGE_DATA", data: res, requestId }, origin);
        });
      }
    } else if (type === "RETOP_GET_ALL_STORAGE") {
      idbEntries().then((entries) => {
        const res: Record<string, any> = {};
        for (const [k, v] of entries) {
          res[String(k)] = v;
        }
        window.postMessage({ type: "RETOP_ALL_STORAGE_DATA", data: res, requestId }, origin);
      });
    } else if (type === "RETOP_SET_STORAGE") {
      if (data && typeof data === "object") {
        Promise.all(Object.entries(data).map(([k, v]) => idbSet(k, v))).then(() => {
          window.postMessage({ type: "RETOP_STORAGE_SAVED", success: true, requestId }, origin);
        });
      }
    }
  });
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
