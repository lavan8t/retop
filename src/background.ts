import { uploadBackup, downloadBackup } from "./utils/googleDriveSync";
import { getExtUrl } from "./utils/url";

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
    const isVtopDownload =
      item.url.includes("vtop.vit.ac.in") ||
      item.url.startsWith("blob:") ||
      (item.referrer && item.referrer.includes("vtop.vit.ac.in"));

    if (!isVtopDownload) {
      suggest();
      return;
    }

    chrome.storage.local.get(["lastDownloadInfo"], (res) => {
      const info = res?.lastDownloadInfo as {
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
        } else if (info.type === "daqp") {
          suggest({ filename: `retop/${sem}/${course}/daqp/${itemFileName}` });
          return;
        }
      }

      suggest({ filename: `retop/downloads/${itemFileName}` });
    });

    return true; // indicates async response
  });
}

// Handle Google Drive sync requests from content scripts where chrome.identity is restricted
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
});
