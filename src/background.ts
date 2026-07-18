chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the offline PWA as an onboarding screen on first install
    chrome.tabs.create({ url: chrome.runtime.getURL("dist/offline.html") });
  }
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
