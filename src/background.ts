import { uploadBackup, downloadBackup, getAuthToken } from "./utils/googleDriveSync";
import { getExtUrl } from "./utils/url";
import { get as idbGet, set as idbSet } from "idb-keyval";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the web app as an onboarding screen on first install
    chrome.tabs.create({ url: "https://getretop.web.app/?installed=true" });
  }
});

chrome.action.onClicked.addListener(() => {
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
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "PORTAL_SCRAPED_DATA" || message.type === "PORTAL_SCRAPED_DATA") {
    const payload = message.payload || message.data;
    if (payload) {
      // 1. Persist to IndexedDB
      idbSet("retop_last_sync_payload", payload).catch(() => {});
      idbSet("retop_last_sync_time", Date.now()).catch(() => {});

      // 2. Relay incoming payload updates to any active tab running the PWA
      const pwaUrlPatterns = [
        "https://getretop.web.app/*",
        "http://localhost/*",
        "http://127.0.0.1/*"
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
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(null, (items) => {
        sendResponse({ success: true, data: items || {} });
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

  if (message.action === "UPLOAD_DRIVE_BACKUP") {
    uploadBackup(message.settingsData, message.clientId)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err?.message || String(err) }));
    return true; // Keep channel open for async response
  }

  if (message.action === "DOWNLOAD_DRIVE_BACKUP") {
    downloadBackup(message.clientId)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err?.message || String(err) }));
    return true; // Keep channel open for async response
  }

  if (message.action === "SIGN_IN_GOOGLE" || message.action === "GET_AUTH_TOKEN") {
    getAuthToken(message.clientId)
      .then((token) => sendResponse({ success: true, token }))
      .catch((err) => sendResponse({ success: false, error: err?.message || String(err) }));
    return true;
  }
});
