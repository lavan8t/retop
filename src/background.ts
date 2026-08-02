import { uploadBackup, downloadBackup } from "./utils/googleDriveSync";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the offline PWA as an onboarding screen on first install
    chrome.tabs.create({ url: chrome.runtime.getURL("dist/offline.html") });
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "https://vtop.vit.ac.in/vtop/" });
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (
    item.url.includes("vtop.vit.ac.in") ||
    (item.referrer && item.referrer.includes("vtop.vit.ac.in"))
  ) {
    chrome.storage.local.get(["lastDownloadInfo"], (res) => {
      const info = res.lastDownloadInfo as { timestamp: number; type: string; courseName: string; facultyName: string } | undefined;
      if (info && Date.now() - info.timestamp < 5000) {
        if (info.type === "course_page") {
          const sanitizedCourse = info.courseName.replace(/[\/\\?%*:|"<>]/g, '-').trim();
          const sanitizedFaculty = info.facultyName.replace(/[\/\\?%*:|"<>]/g, '-').trim();
          suggest({ filename: `VIT/course_page/${sanitizedCourse}/${sanitizedFaculty}_${item.filename}` });
          return;
        }
      }
      suggest({ filename: `VIT/curriculum/${item.filename}` });
    });
    return true; // indicates that we will call suggest asynchronously
  }
});

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
