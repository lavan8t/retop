import { getExtUrl } from "./utils/url";
import { get as idbGet, set as idbSet } from "idb-keyval";


chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the web app as an onboarding screen on first install
    chrome.tabs.create({ url: "https://getretop.web.app/?installed=true" });
  }
});

chrome.action.onClicked.addListener(() => {
  // No network: the toolbar is the app launcher. Open the offline page in its
  // own window so it behaves like an installed PWA.
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    chrome.windows.create({
      url: chrome.runtime.getURL("offline.html"),
      type: "popup",
      width: 1100,
      height: 820,
      focused: true,
    });
    return;
  }
  chrome.tabs.create({ url: "https://vtop.vit.ac.in/vtop/" });
});

if (typeof chrome !== "undefined" && chrome.downloads?.onDeterminingFilename) {
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    // Strictly identify downloads from retop extension or VTOP pages
    const extId = typeof chrome.runtime !== "undefined" ? chrome.runtime.id : "";
    const isByRetopExtension = Boolean(item.byExtensionId && extId && item.byExtensionId === extId);

    const isVitUrl = Boolean(
      (item.url && item.url.includes("vit.ac.in")) ||
      (item.finalUrl && item.finalUrl.includes("vit.ac.in"))
    );

    const isVitOrRetopReferrer = Boolean(
      item.referrer &&
      (item.referrer.includes("vit.ac.in") ||
       item.referrer.includes("getretop.web.app") ||
       (extId && item.referrer.includes(extId)))
    );

    // For blob: URLs, NEVER intercept unless referrer is VIT / retop or byExtensionId matches
    const isBlobFromVtopOrRetop = item.url.startsWith("blob:") && (isVitOrRetopReferrer || isByRetopExtension);

    const isRetopOrVtopDownload = isByRetopExtension || isVitUrl || isVitOrRetopReferrer || isBlobFromVtopOrRetop;

    if (!isRetopOrVtopDownload) {
      suggest();
      return;
    }

    idbGet("lastDownloadInfo").then((res: any) => {
      const info = res as {
        timestamp: number;
        type: string;
        semester?: string;
        courseName?: string;
        facultyName?: string;
      } | undefined;

      const sanitize = (str?: string) =>
        (str || "")
          .replace(/[\/\\?%*:|"<>]/g, "_")
          .replace(/\s+/g, " ")
          .trim();

      const rawFileName = item.filename ? item.filename.replace(/^.*[\\\/]/, '') : "download.pdf";
      const itemFileName = sanitize(rawFileName) || "download.pdf";

      if (info && Date.now() - info.timestamp < 30000) {
        const sem = sanitize(info.semester) || "General";
        const course = sanitize(info.courseName) || "General";
        const faculty = sanitize(info.facultyName) || "Faculty";

        if (info.type === "course_page") {
          suggest({ filename: `retop/${sem}/${course}/${faculty}/${itemFileName}` });
          return;
        } else if (info.type === "curriculum") {
          suggest({ filename: `retop/${sem}/${course}/curriculum/${itemFileName}` });
          return;
        } else if (info.type === "daqp" || info.type === "assignments") {
          suggest({ filename: `retop/${sem}/${course}/assignments/${itemFileName}` });
          return;
        }
      }

      suggest({ filename: `retop/downloads/${itemFileName}` });
    }).catch(() => {
      suggest();
    });

    return true; // indicates async response
  });
}

// Handle Google Drive sync and Portal-to-PWA data relay
const isBridgeSender = (sender: chrome.runtime.MessageSender): boolean => {
  const source = sender.origin || sender.url || "";
  return source.startsWith("https://getretop.web.app");
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ── Turn retop off / on ───────────────────────────────────────────────────
  if (message.action === "SET_DISABLED") {
    chrome.storage.local.set({ retop_disabled: true }, () =>
      sendResponse({ success: true }),
    );
    return true;
  }

  if (message.action === "IS_DISABLED") {
    chrome.storage.local.get(["retop_disabled"], (items) => {
      sendResponse({ success: true, disabled: !!items?.retop_disabled });
    });
    return true;
  }

  if (message.action === "CLEAR_DISABLED") {
    chrome.storage.local.remove(["retop_disabled"], () => {
      // Tell open VTOP tabs to drop their page marker and come back to retop.
      chrome.tabs.query(
        { url: ["https://vtop.vit.ac.in/*", "https://vtopcc.vit.ac.in/*"] },
        (tabs) => {
          (tabs || []).forEach((tab) => {
            if (tab.id !== undefined) {
              chrome.tabs
                .sendMessage(tab.id, { type: "RETOP_REENABLED" })
                .catch(() => {});
            }
          });
        },
      );
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === "OPEN_DISABLE") {
    chrome.tabs.create({ url: "https://getretop.web.app/disable" });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "OPEN_OFFLINE" || message.type === "OPEN_OFFLINE") {
    const url = chrome.runtime.getURL("offline.html");
    const win = chrome.windows?.create
      ? chrome.windows.create({ url, type: "popup", width: 1100, height: 820, focused: true })
      : null;
    if (!win) chrome.tabs.create({ url });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "FETCH_BARCODE") {
    // The digital ID card renders its barcode from the TEC-IT service. The page
    // origin cannot reach it, so the request goes through the worker, which
    // holds the host permission.
    const url = String(message.url || "");
    if (!url.startsWith("https://barcode.tec-it.com/")) {
      sendResponse({ error: "not allowed" });
      return true;
    }
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`barcode ${res.status}`);
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        sendResponse({ base64: btoa(binary) });
      })
      .catch((err) => sendResponse({ error: String(err) }));
    return true;
  }

  if (message.action === "PORTAL_SCRAPED_DATA" || message.type === "PORTAL_SCRAPED_DATA") {
    const payload = message.payload || message.data;
    if (payload) {
      // 1. Persist to IndexedDB
      idbSet("retop_last_sync_payload", payload).catch(() => {});
      idbSet("retop_last_sync_time", Date.now()).catch(() => {});

      // 2. Relay incoming payload updates to any active tab running the PWA
      const pwaUrlPatterns = [
        "https://getretop.web.app/*"
      ];
      chrome.tabs.query({ url: pwaUrlPatterns }, (tabs) => {
        if (tabs && tabs.length > 0) {
          for (const tab of tabs) {
            if (tab.id !== undefined) {
              chrome.tabs.sendMessage(tab.id, {
                type: "RETOP_PWA_SYNC_PAYLOAD",
                payload,
              }).catch(() => {});
            }
          }
        }
      });
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "GET_ALL_SYNC_DATA" || message.type === "GET_ALL_SYNC_DATA") {
    if (!isBridgeSender(sender)) {
      sendResponse({ success: false, data: {} });
      return true;
    }
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(null, (items) => {
        // Only retop-owned keys cross into the page; never dump everything.
        const data: Record<string, any> = {};
        for (const [key, value] of Object.entries(items || {})) {
          if (key.startsWith("retop_")) data[key] = value;
        }
        sendResponse({ success: true, data });
      });
    } else {
      sendResponse({ success: false, data: {} });
    }
    return true;
  }

  if (message.action === "GET_STORAGE" || message.type === "GET_STORAGE") {
    const keys = message.keys;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(keys || null, (items) => {
        sendResponse({ success: true, data: items || {} });
      });
    } else {
      sendResponse({ success: false, data: {} });
    }
    return true;
  }

  if (message.action === "SET_STORAGE" || message.type === "SET_STORAGE") {
    const data = message.data;
    if (data && typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set(data, () => {
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }

});

