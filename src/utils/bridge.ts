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
  if (document.getElementById("vtop-remastered-global")) return;
  const style = document.createElement("style");
  style.id = "vtop-remastered-global";
  style.textContent = `
    html { font-size: 16px !important; }
    html, body { background-color: #09090b !important; overflow: hidden !important; }
    #page-wrapper, .container-fluid, .wrapper, body > table, body > form { 
      opacity: 0 !important; pointer-events: none !important; display: none !important; 
    }
  `;
  safeAppend(style);

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
  host.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647; display: block;";
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
  splash.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: #09090b; z-index: 2147483647; 
    display: flex; align-items: center; justify-content: center;
  `;
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
  const toggleContainer = document.createElement("div");
  toggleContainer.id = "vtop-ui-toggle-container";
  toggleContainer.style.cssText =
    "position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; display: none;";

  const returnBtn = document.createElement("button");
  returnBtn.innerHTML = "RETURN TO MODERN UI";
  returnBtn.style.cssText =
    "background-color: #facc15; padding: 12px 24px; border-radius: 99px; font-weight: bold; cursor: pointer; border: 3px solid black;";
  returnBtn.onclick = () => window.dispatchEvent(new Event("vtop-restore-ui"));

  toggleContainer.appendChild(returnBtn);
  document.body.appendChild(toggleContainer);
}

export function setUIVisibility(visible: boolean) {
  const toggle = document.getElementById("vtop-ui-toggle-container");
  const host = document.getElementById("vtop-remastered-host");
  const globalStyle = document.getElementById(
    "vtop-remastered-global",
  ) as HTMLStyleElement;

  if (visible) {
    if (globalStyle) globalStyle.disabled = false;
    document.body.style.overflow = "hidden";
    if (toggle) toggle.style.display = "none";
    if (host) host.style.display = "block";
  } else {
    if (globalStyle) globalStyle.disabled = true;
    document.body.style.overflow = "auto";
    if (toggle) toggle.style.display = "block";
    if (host) host.style.display = "none";
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
