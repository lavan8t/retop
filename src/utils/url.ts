export const getExtUrl = (path: string): string => {
  let isFlattened = false;
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) {
    const manifest = chrome.runtime.getManifest();
    if (manifest.content_scripts?.[0]?.js?.[0] && !manifest.content_scripts[0].js[0].includes("dist/")) {
      isFlattened = true;
    } else if (manifest.background && "scripts" in manifest.background && Array.isArray(manifest.background.scripts)) {
      if (manifest.background.scripts[0] && !manifest.background.scripts[0].includes("dist/")) {
        isFlattened = true;
      }
    }
  }

  if (isFlattened && path.startsWith("dist/")) {
    return chrome.runtime.getURL(path.substring(5)); // strip dist/
  }
  return chrome.runtime.getURL(path);
};
