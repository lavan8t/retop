import { getExtUrl } from "./url";
import { VIT_EMBLEM_SVG_RAW } from "../components/common/VitEmblemSvg";
import { VIT_EMBLEM_ANIMATION_CSS } from "../components/common/vitEmblemStyles";

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
  if (typeof document === "undefined") return null;
  if ((window as any).__RETOP_OFFLINE__ || (window as any).__RETOP_STANDALONE__) {
    return document.getElementById("retop-root") || document.getElementById("offline-root") || document.getElementById("root");
  }
  const el = document.getElementById("retop-root") || document.getElementById("offline-root");
  if (el) return el;
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

export function initializeContainer(opts?: { includeAppStylesheet?: boolean }) {
  if (isInitialized && document.getElementById("retop-host")) return;

  const includeAppStylesheet = opts?.includeAppStylesheet !== false;

  if ((window as any).__RETOP_OFFLINE__ || (window as any).__RETOP_STANDALONE__) {
    const root = document.getElementById("root") || document.body;
    let appRoot = document.getElementById("retop-root");
    if (!appRoot) {
      appRoot = document.createElement("div");
      appRoot.id = "retop-root";
      appRoot.style.cssText = "width: 100%; height: 100%; pointer-events: auto; background: transparent;";
      root?.appendChild(appRoot);
    }
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

  // Keep the host wherever it already lives. The login takeover mounts it inside
  // <body> and owns the document; hoisting it to <html> would detach it from the
  // body it was placed in. Only an unattached host gets a parent here, which is
  // the dashboard path where the native VTOP body must survive.
  const parent = host.parentElement || document.documentElement || document.body;
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
        :host {
          all: initial;
          display: block;
        }
        *, ::before, ::after {
          box-sizing: border-box;
          border-color: transparent !important;
        }
        #retop-root {
          width: 100%;
          height: 100%;
          pointer-events: none;
          background: transparent;
        }
      `;
      shadowRoot.insertBefore(earlyShadowStyle, shadowRoot.firstChild);
    }

    if (
      includeAppStylesheet &&
      !shadowRoot.querySelector("link[href*='dist/style.css']")
    ) {
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

/**
 * Installs compiled extension stylesheets into a shadow root as constructed
 * stylesheets: one fetch, one parse, no <link> round trip. Callers await this
 * before mounting React so the skeleton never flashes unstyled.
 */
export async function adoptExtensionStyles(
  target: ShadowRoot,
  paths: string[],
): Promise<void> {
  const cssTexts = await Promise.all(
    paths.map(async (path) => {
      try {
        const res = await fetch(getExtUrl(path));
        return res.ok ? await res.text() : "";
      } catch {
        return "";
      }
    }),
  );

  // A constructed stylesheet resolves relative url() against the document base,
  // not the extension. Left alone, ./fonts/*.woff2 would be requested from
  // vtop.vit.ac.in. Rewrite them to absolute extension URLs.
  const base = getExtUrl("dist/assets/").slice(0, -"assets/".length);

  for (const css of cssTexts) {
    if (!css) continue;
    const absolute = css.replace(/url\((['"]?)\.\//g, `url($1${base}`);
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(absolute);
      target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
    } catch {
      const style = document.createElement("style");
      style.textContent = absolute;
      target.appendChild(style);
    }
  }
}

export function injectSplashScreen(showLogo: boolean = true) {
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
        width: 210px !important;
        height: 210px !important;
        pointer-events: none !important;
        user-select: none !important;
      }
      ${VIT_EMBLEM_ANIMATION_CSS}
    `;
    (document.head || document.documentElement).appendChild(earlyStyle);
  }

  const loader = document.createElement("div");
  loader.id = "retop-open-loader";
  if (showLogo) {
    loader.innerHTML = `<div class="vit-emblem-splash" style="width:210px;height:210px;display:flex;align-items:center;justify-content:center;">${VIT_EMBLEM_SVG_RAW}</div>`;
  }
  document.documentElement.appendChild(loader);
}

export function removeSplashScreen() {
  const loader = document.getElementById("retop-open-loader");
  const cloak = document.getElementById("retop-early-cloak");
  const bootCloak = document.getElementById("retop-boot-cloak");

  if (loader) {
    const splash = loader.querySelector(".vit-emblem-splash") || loader;
    splash.classList.add("vit-emblem-fast-finish");

    // Speed up and finish all strokes/animations in 150ms
    setTimeout(() => {
      // Last 50ms: stay still and fade away smoothly
      loader.style.transition = "opacity 50ms ease-out";
      loader.style.opacity = "0";

      setTimeout(() => {
        loader.remove();
        cloak?.remove();
        bootCloak?.remove();
        if (document.body) {
          document.body.style.opacity = "1";
          document.body.style.visibility = "visible";
        }
      }, 50);
    }, 150);
  } else {
    cloak?.remove();
    bootCloak?.remove();
    if (document.body) {
      document.body.style.opacity = "1";
      document.body.style.visibility = "visible";
    }
  }
}

export function setUIVisibility(visible: boolean) {
  const host = document.getElementById("retop-host");
  const appRoot = shadowRoot ? (shadowRoot.querySelector("#retop-root") as HTMLElement | null) : null;

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

export function cleanupLegacyHMenuBar() {
  document.getElementById("retop-hmenu-search-toggle")?.remove();
  document.getElementById("retop-vtop-search-menu")?.remove();
  // VTOP's own search is hidden, never removed: removing it would take the
  // native search away for good, so the teardown could not give it back.
  for (const id of ["vtop-search-menu-btn", "MG_SEARCH"]) {
    const el = document.getElementById(id);
    el?.style.setProperty("display", "none", "important");
  }
}

export function revealLegacyUI() {
  setUIVisibility(false);
  removeSplashScreen();
  import("../components/legacy/injectLegacyMenuSearch").then(({ injectLegacyMenuSearch }) => {
    injectLegacyMenuSearch();
  }).catch(() => {});
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

// The teardown (removing every retop modification from VTOP) lives in
// utils/teardown.ts, next to the global error net that calls it.


