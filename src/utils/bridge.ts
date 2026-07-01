let isInitialized = false;
let shadowRoot: ShadowRoot | null = null;

function safeAppend(element: HTMLElement) {
  if (document.head) document.head.appendChild(element);
  else if (document.documentElement)
    document.documentElement.appendChild(element);
  else {
    const observer = new MutationObserver(() => {
      if (document.documentElement) {
        document.documentElement.appendChild(element);
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true });
  }
}

export function getAppRoot(): HTMLElement | null {
  return shadowRoot
    ? (shadowRoot.getElementById("vtop-remastered-root") as HTMLElement)
    : null;
}

export function injectGlobalFonts() {
  if (!document.getElementById("vtop-remastered-fonts")) {
    const fontLink = document.createElement("link");
    fontLink.id = "vtop-remastered-fonts";
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,slnt,wdth,wght,GRAD,ROND@6..144,-10..0,25..151,1..1000,100,0..100&family=Anek+Tamil:wdth,wght@125,100..800&display=swap";
    safeAppend(fontLink);
  }
}

export function injectGlobalStyles() {
  if (document.getElementById("vtop-remastered-global-css")) return;

  const link = document.createElement("link");
  link.id = "vtop-remastered-global-css";
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("dist/style.css");
  safeAppend(link);

  injectGlobalFonts();
}

export function initializeContainer() {
  if (isInitialized) return;

  const host = document.createElement("div");
  host.id = "vtop-remastered-host";

  // Set default fixed positioning.
  host.style.cssText =
    "position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; background: transparent;";
  document.body.appendChild(host);

  shadowRoot = host.attachShadow({ mode: "open" });

  const cssLink = document.createElement("link");
  cssLink.rel = "stylesheet";
  cssLink.href = chrome.runtime.getURL("dist/style.css");
  shadowRoot.appendChild(cssLink);

  const appRoot = document.createElement("div");
  appRoot.id = "vtop-remastered-root";
  appRoot.style.cssText =
    "width: 100%; height: 100%; pointer-events: none; background: transparent;";
  shadowRoot.appendChild(appRoot);

  isInitialized = true;
}

export function injectSplashScreen() {
  if (document.getElementById("vtop-remastered-splash")) return;
  const splash = document.createElement("div");
  splash.id = "vtop-remastered-splash";

  splash.innerHTML = `<div style="color:white; font-family:sans-serif;">Loading retop...</div>`;
  safeAppend(splash);
}

export function removeSplashScreen() {
  const splash = document.getElementById("vtop-remastered-splash");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 500);
  }
}

export function setUIVisibility(visible: boolean) {
  const host = document.getElementById("vtop-remastered-host");
  const appRoot = shadowRoot
    ? shadowRoot.getElementById("vtop-remastered-root")
    : null;

  if (visible) {
    document.body.classList.remove("show-legacy-ui");
    document.body.style.overflow = "hidden";

    // Restore pointer events so Modern UI can be interacted with
    if (host) host.style.setProperty("pointer-events", "auto", "important");
    if (appRoot)
      appRoot.style.setProperty("pointer-events", "auto", "important");
  } else {
    document.body.classList.add("show-legacy-ui");
    document.body.style.overflow = "auto";

    // CRITICAL FIX: Force the shadow host to remain visible so React can render the Return Button.
    // We set pointer-events to 'none' so all clicks bypass the host and hit the legacy UI below.
    if (host) {
      host.style.setProperty("display", "block", "important");
      host.style.setProperty("opacity", "1", "important");
      host.style.setProperty("visibility", "visible", "important");
      host.style.setProperty("pointer-events", "none", "important");
      host.style.setProperty("background-color", "transparent", "important");
    }
    if (appRoot) {
      appRoot.style.setProperty("display", "block", "important");
      appRoot.style.setProperty("opacity", "1", "important");
      appRoot.style.setProperty("visibility", "visible", "important");
      appRoot.style.setProperty("pointer-events", "none", "important");
      appRoot.style.setProperty("background-color", "transparent", "important");
    }
  }
}

export function revealLegacyUI() {
  setUIVisibility(false);
  removeSplashScreen();
}

export function createHiddenForm(
  action: string,
  inputs: Record<string, string>,
) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.style.display = "none";
  for (const [key, value] of Object.entries(inputs)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  return form;
}

export function injectScriptFile(fileName: string) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL(fileName);
  script.onload = function () {
    (this as HTMLScriptElement).remove();
  };
  safeAppend(script);
}
