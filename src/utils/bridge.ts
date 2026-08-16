import { getExtUrl } from "./url";
import { VIT_EMBLEM_SVG_RAW } from "../components/common/VitEmblemSvg";

let isInitialized = false;
let shadowRoot: ShadowRoot | null = null;
let hostObserver: MutationObserver | null = null;

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
  if ((window as any).__RETOP_OFFLINE__) return document.getElementById("retop-root");
  return shadowRoot
    ? (shadowRoot.querySelector("#retop-root") as HTMLElement)
    : null;
}

export function injectGlobalFonts() {
  if (!document.getElementById("retop-material-symbols-style")) {
    const extUrl = getExtUrl("dist/fonts");
    const style = document.createElement("style");
    style.id = "retop-material-symbols-style";
    style.textContent = `
      @font-face {
        font-family: 'Material Symbols Rounded';
        font-style: normal;
        font-weight: 100 700;
        src: url("${extUrl}/material-symbols-rounded.woff2") format('woff2');
      }

      .material-symbols-rounded {
        font-family: 'Material Symbols Rounded' !important;
        font-weight: normal !important;
        font-style: normal !important;
        display: inline-block !important;
        line-height: 1 !important;
        text-transform: none !important;
        letter-spacing: normal !important;
        word-wrap: normal !important;
        white-space: nowrap !important;
        direction: ltr !important;
        -webkit-font-smoothing: antialiased !important;
      }

      /* Google Sans Flex — Latin + UI text */
      @font-face {
        font-family: "Google Sans Flex";
        font-weight: 1 1000;
        font-stretch: 25% 151%;
        font-display: swap;
        src: url("${extUrl}/gsf.subset.woff2") format("woff2");
        unicode-range:
          U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
          U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
          U+2212, U+2215, U+FEFF, U+FFFD;
      }

      /* Google Sans Flex — Symbols, emoji, extended */
      @font-face {
        font-family: "Google Sans Flex";
        font-weight: 1 1000;
        font-stretch: 25% 151%;
        font-display: swap;
        src: url("${extUrl}/gsf.subset2.woff2") format("woff2");
        unicode-range:
          U+0001-000C, U+000E-001F, U+007F-009F, U+20DD-20E0, U+20E2-20E4,
          U+2150-218F, U+2190, U+2192, U+2194-2199, U+21AF, U+21E6-21F0, U+21F3,
          U+2218-2219, U+2299, U+22C4-22C6, U+2300-243F, U+2440-244A, U+2460-24FF,
          U+25A0-27BF, U+2800-28FF, U+2921-2922, U+2981, U+29BF, U+29EB, U+2B00-2BFF,
          U+4DC0-4DFF, U+FFF9-FFFB, U+10140-1018E, U+10190-1019C, U+101A0,
          U+101D0-101FD, U+102E0-102FB, U+10E60-10E7E, U+1D2C0-1D2D3, U+1D2E0-1D37F,
          U+1F000-1F0FF, U+1F100-1F1AD;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }
}

export function injectGlobalStyles() {
  if (document.getElementById("retop-global-css")) return;

  const link = document.createElement("link");
  link.id = "retop-global-css";
  link.rel = "stylesheet";
  link.href = getExtUrl("dist/style.css");
  safeAppend(link);

  injectGlobalFonts();
}

export function initializeContainer() {
  if (isInitialized && document.getElementById("retop-host")) return;

  if ((window as any).__RETOP_OFFLINE__) {
    const root = document.getElementById("root") || document.body;
    const appRoot = document.createElement("div");
    appRoot.id = "retop-root";
    appRoot.style.cssText = "width: 100%; height: 100%; pointer-events: auto; background: transparent;";
    root?.appendChild(appRoot);
    isInitialized = true;
    return;
  }

  let host = document.getElementById("retop-host") as HTMLElement;
  if (!host) {
    host = document.createElement("div");
    host.id = "retop-host";
  }

  host.style.cssText =
    "position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; pointer-events: none; background: transparent !important;";

  const parent = document.documentElement || document.body;
  if (parent && host.parentElement !== parent) {
    parent.appendChild(host);
  }

  if (!shadowRoot || !host.shadowRoot) {
    shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });

    const resetStyleId = "retop-shadow-reset";
    if (!shadowRoot.querySelector(`#${resetStyleId}`)) {
      const earlyShadowStyle = document.createElement("style");
      earlyShadowStyle.id = resetStyleId;
      earlyShadowStyle.textContent = `
        *, ::before, ::after {
          box-sizing: border-box;
          border-color: transparent !important;
        }
      `;
      shadowRoot.insertBefore(earlyShadowStyle, shadowRoot.firstChild);
    }

    if (!shadowRoot.querySelector("link[href*='dist/style.css']")) {
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = getExtUrl("dist/style.css");
      shadowRoot.appendChild(cssLink);
    }

    if (!shadowRoot.querySelector("#retop-root")) {
      const appRoot = document.createElement("div");
      appRoot.id = "retop-root";
      appRoot.style.cssText =
        "width: 100%; height: 100%; pointer-events: none; background: transparent;";
      shadowRoot.appendChild(appRoot);
    }
  }

  isInitialized = true;
}

export function injectSplashScreen() {
  if (document.getElementById("retop-open-loader")) return;

  const styleId = "retop-early-cloak";
  if (!document.getElementById(styleId)) {
    const extUrlStr =
      typeof chrome !== "undefined" && chrome.runtime && !!chrome.runtime.getURL
        ? getExtUrl("dist/fonts")
        : "";

    const earlyStyle = document.createElement("style");
    earlyStyle.id = styleId;
    earlyStyle.textContent = `
      ${
        extUrlStr
          ? `
      @font-face {
        font-family: "Google Sans Flex";
        font-weight: 1 1000;
        font-stretch: 25% 151%;
        font-display: block;
        src: url("${extUrlStr}/gsf.subset.woff2") format("woff2");
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
      }
      `
          : ""
      }

      /* Hide native body completely from frame 1 */
      html > body {
        opacity: 0 !important;
        visibility: hidden !important;
      }
      /* Emblem loader overlay attached to html */
      #retop-open-loader {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-direction: column !important;
        background: #09090b !important;
        visibility: visible !important;
        opacity: 1 !important;
        transition: opacity 150ms cubic-bezier(0.16, 1, 0.3, 1) !important;
        pointer-events: none !important;
      }
      #retop-open-loader .vit-emblem-splash {
        width: 72px !important;
        height: 72px !important;
        pointer-events: none !important;
        user-select: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(earlyStyle);
  }

  const loader = document.createElement("div");
  loader.id = "retop-open-loader";
  loader.innerHTML = `<div class="vit-emblem-splash" style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;">${VIT_EMBLEM_SVG_RAW}</div>`;
  document.documentElement.appendChild(loader);
}

export function removeSplashScreen() {
  const loader = document.getElementById("retop-open-loader");
  const cloak = document.getElementById("retop-early-cloak");

  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => {
      loader.remove();
      if (cloak) cloak.remove();
      if (document.body) {
        document.body.style.opacity = "1";
        document.body.style.visibility = "visible";
      }
    }, 150);
  } else {
    if (cloak) cloak.remove();
    if (document.body) {
      document.body.style.opacity = "1";
      document.body.style.visibility = "visible";
    }
  }
}

export function setUIVisibility(visible: boolean) {
  const host = document.getElementById("retop-host");
  const appRoot = shadowRoot ? shadowRoot.getElementById("retop-root") : null;

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

export function enhanceLegacyHMenuBar() {
  const hmenuBar = document.getElementById("top-hmenu-bar");
  if (!hmenuBar) return;
  const container = hmenuBar.querySelector(".d-flex.flex-nowrap");
  if (!container || container.querySelector("#retop-hmenu-search")) return;

  const searchBtn = document.createElement("a");
  searchBtn.id = "retop-hmenu-search";
  searchBtn.className = "btn btn-outline ps-0 fw-bold text-start text-nowrap hmenuItem";
  searchBtn.href = "javascript:void(0);";
  searchBtn.setAttribute("role", "button");
  searchBtn.setAttribute("title", "Search (Press Space)");
  searchBtn.innerHTML = `
    <i class="bi bi-search fs-6 me-md-1 text-primary d-none d-md-inline-block"></i>
    <span class="primaryColor1"><i class="fs-6 bi bi-search"></i>
      <span class="d-none d-md-inline-block">Search</span>
    </span>
  `;

  searchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Trigger VTOP's native Space key handler
    const spaceEvent = new KeyboardEvent("keydown", {
      key: " ",
      code: "Space",
      keyCode: 32,
      which: 32,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(spaceEvent);
    window.dispatchEvent(spaceEvent);

    // Also trigger VTOP search modal if present
    const searchModal = document.querySelector("#searchModal, #universalSearchModal, #quickSearchModal, #globalSearchModal, #quickSearch, #vtopSearchModal");
    if (searchModal && (window as any).bootstrap?.Modal) {
      try {
        const modalInstance = (window as any).bootstrap.Modal.getOrCreateInstance(searchModal);
        modalInstance.show();
      } catch (err) {}
    }
  });

  const brand = container.querySelector(".navbar-brand");
  if (brand && brand.nextSibling) {
    container.insertBefore(searchBtn, brand.nextSibling);
  } else {
    container.appendChild(searchBtn);
  }
}

export function revealLegacyUI() {
  setUIVisibility(false);
  removeSplashScreen();
  enhanceLegacyHMenuBar();
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
  script.src = getExtUrl(fileName);
  script.onload = function () {
    (this as HTMLScriptElement).remove();
  };
  safeAppend(script);
}
