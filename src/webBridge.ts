import { getExtUrl } from "./utils/url";

if (typeof chrome !== "undefined" && chrome.storage?.local) {
  try {
    localStorage.setItem("__RETOP_EXT_PRESENT__", "true");
  } catch {}

  const origin = window.location.origin;

  // 1. Announce presence to web app
  window.postMessage({ type: "RETOP_EXT_SYNC_COMPLETE", data: {} }, origin);
  window.postMessage({ type: "RETOP_EXT_PRESENT" }, origin);

  // 2. Listen for window.postMessage requests from page scripts (offline.js / storageAdapter)
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || typeof event.data !== "object") return;
    const { type, keys, data, requestId } = event.data;

    if (type === "RETOP_GET_STORAGE") {
      let safeKeys = keys || null;
      try { safeKeys = JSON.parse(JSON.stringify(keys)); } catch {}
      chrome.storage.local.get(safeKeys, (res) => {
        let safeRes = res || {};
        try { safeRes = JSON.parse(JSON.stringify(res)); } catch {}
        window.postMessage({ type: "RETOP_STORAGE_DATA", data: safeRes, requestId }, origin);
      });
    } else if (type === "RETOP_GET_ALL_STORAGE") {
      chrome.storage.local.get(null, (res) => {
        let safeRes = res || {};
        try { safeRes = JSON.parse(JSON.stringify(res)); } catch {}
        window.postMessage({ type: "RETOP_ALL_STORAGE_DATA", data: safeRes, requestId }, origin);
      });
    } else if (type === "RETOP_SET_STORAGE") {
      if (data && typeof data === "object") {
        let safeData = data;
        try { safeData = JSON.parse(JSON.stringify(data)); } catch {}
        chrome.storage.local.set(safeData, () => {
          window.postMessage({ type: "RETOP_STORAGE_SAVED", success: true, requestId }, origin);
        });
      }
    }
  });

  // 3. Keep web app updated whenever chrome.storage.local changes
  if (chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local") {
        const updateData: Record<string, any> = {};
        for (const [key, change] of Object.entries(changes)) {
          if (change.newValue !== undefined) {
            updateData[key] = change.newValue;
          }
        }
        window.postMessage({ type: "RETOP_STORAGE_UPDATED", changes: updateData }, origin);
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
