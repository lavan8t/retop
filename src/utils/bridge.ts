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

export function injectGlobalStyles() {
  if (document.getElementById("vtop-remastered-global-css")) return;

  const link = document.createElement("link");
  link.id = "vtop-remastered-global-css";
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("dist/style.css");
  safeAppend(link);

  if (!document.getElementById("vtop-remastered-fonts")) {
    const fontLink = document.createElement("link");
    fontLink.id = "vtop-remastered-fonts";
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,GRAD,ROND@6..144,100,100&display=swap&family=Anek+Tamil:wdth,wght@125,100..800&display=swap";
    safeAppend(fontLink);
  }
}

export function initializeContainer() {
  if (isInitialized) return;

  const host = document.createElement("div");
  host.id = "vtop-remastered-host";

  document.body.appendChild(host);

  shadowRoot = host.attachShadow({ mode: "open" });

  const cssLink = document.createElement("link");
  cssLink.rel = "stylesheet";
  cssLink.href = chrome.runtime.getURL("dist/style.css");
  shadowRoot.appendChild(cssLink);

  const appRoot = document.createElement("div");
  appRoot.id = "vtop-remastered-root";

  appRoot.style.cssText = "width: 100%; height: 100%; overflow-y: auto;";
  shadowRoot.appendChild(appRoot);

  createToggleButton();
  isInitialized = true;
}

export function injectSplashScreen() {
  if (document.getElementById("vtop-remastered-splash")) return;
  const splash = document.createElement("div");
  splash.id = "vtop-remastered-splash";

  splash.innerHTML = `<div style="color:white; font-family:sans-serif;">Loading VTOP Remastered...</div>`;
  safeAppend(splash);
}

export function removeSplashScreen() {
  const splash = document.getElementById("vtop-remastered-splash");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 500);
  }
}

function createToggleButton() {
  if (document.getElementById("vtop-ui-toggle-container")) return;

  const container = document.createElement("div");
  container.id = "vtop-ui-toggle-container";

  const btn = document.createElement("button");
  btn.innerHTML = "RETURN TO MODERN UI";
  btn.className = "vtop-toggle-btn";

  btn.onclick = () => {
    window.dispatchEvent(new Event("vtop-restore-ui"));
  };

  container.appendChild(btn);
  document.body.appendChild(container);
}

export function setUIVisibility(visible: boolean) {
  if (visible) {
    document.body.classList.remove("show-legacy-ui");
    document.body.style.overflow = "hidden";
  } else {
    document.body.classList.add("show-legacy-ui");
    document.body.style.overflow = "auto";
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
