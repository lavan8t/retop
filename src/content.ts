/**
 * content.ts — retop document_start bootstrapper.
 *
 * The only always-on content script on the VTOP origins, so it must stay free of
 * static imports: Chrome evaluates this file before every VTOP page, and every
 * top-level import would be paid for on routes retop does not own.
 *
 * Everything below happens in the first task, before the parser gets a second
 * chance to pull down VTOP's Bootstrap page:
 *   1. Decide who owns this document.
 *   2. Abort the native load with window.stop() when retop owns a login route.
 *   3. Paint a skeleton so the first frame is retop, not VTOP.
 *   4. Hand off to a deferred ESM entry for everything expensive.
 */

const VTOP_HOST = /(^|\.)vtop(cc)?\.vit\.ac\.in$/;

/** Routes where retop renders its own sign-in UI instead of VTOP's. */
const LOGIN_ROUTES = [
  "/vtop/open/page",
  "/vtop/open/login",
  "/vtop/login",
  "/vtop/vtopLogin",
  "/vtop/prelogin",
  "/vtop/init/page",
  "/vtop/forgotPassword",
  "/vtop/forgotUsername",
];

/** Routes that carry an authenticated VTOP session. */
const AUTH_ROUTES = ["/vtop/content", "/vtop/main", "/vtop/process"];

const ROLE_KEY = "retop-user-role";

const BACKDROP = "#09090b";

/**
 * Pre-paint cloak installed by the bootstrapper. Distinct id from the splash
 * screen's own cloak because both stylesheets declare `#retop-open-loader`;
 * removeSplashScreen clears them together.
 */
const BOOT_CLOAK_ID = "retop-boot-cloak";

const BYPASS_KEY = "retop-login-bypass";

const DOCUMENT_SIZING_ID = "retop-document-sizing";

const RESET_ID = "retop-shadow-reset";

const SHADOW_RESET = `
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
    pointer-events: auto;
    background: transparent;
  }
`;

/**
 * The takeover replaces the document, so html/body arrive with no content and
 * collapse to zero height. The retop host is position:fixed, so it would still
 * paint, but the document itself stays 8px tall: no scrollable area, and
 * viewports/print/screenshot all measure a blank page.
 */
const DOCUMENT_SIZING = `
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background: ${BACKDROP};
    overflow: hidden;
  }
`;

function readRoleSync(): string {
  try {
    return localStorage.getItem(ROLE_KEY) || "student";
  } catch {
    return "student";
  }
}

function isOwnableRole(role: string): boolean {
  return role === "student" || role === "employee";
}

/** Mirrors utils/url.ts so this file stays import free. */
function extUrl(path: string): string {
  const declared =
    chrome.runtime.getManifest()?.content_scripts?.[0]?.js?.[0] || "dist/x.js";
  const flattened = !String(declared).includes("dist/");
  return chrome.runtime.getURL(
    flattened && path.startsWith("dist/") ? path.slice(5) : path,
  );
}

function matches(path: string, routes: string[]): boolean {
  return routes.some((route) => path.includes(route));
}

/**
 * Loads a deferred retop entry as an ES module. The specifier is computed so the
 * bundler leaves the import alone and the browser fetches the chunk at runtime.
 */
function loadEntry(name: string): Promise<unknown> {
  // Persist the rejection: the catch inside main() attaches a second handler, and
  // without this the runtime also logs an unhandled rejection for the same error.
  return import(extUrl(name)).catch((err) => {
    console.error(`[retop] Failed to load ${name}:`, err);
    throw err;
  });
}

/** Hides the native document until retop reveals it (or reveals it itself). */
function cloakNative(): void {
  if (document.getElementById(BOOT_CLOAK_ID)) return;
  const style = document.createElement("style");
  style.id = BOOT_CLOAK_ID;
  style.textContent = `
    html > body {
      opacity: 0 !important;
      visibility: hidden !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

/**
 * Finds the parser's <body>, without ever creating one.
 *
 * Creating a body here is what broke the takeover: document_start runs before the
 * parser has built the tree, so a hand-made body and the parser's own body both
 * end up as children of <html>, and `document.body` then resolves to whichever
 * came first. The host was appended to one and queried on the other.
 *
 * Only the body is cleared. Wiping documentElement's children fights the parser,
 * which keeps appending into the elements it already created.
 */
function currentBody(): HTMLElement | null {
  return document.body;
}

/**
 * Runs `cb` with the parser's <body> as soon as it exists.
 *
 * document_start fires before the document tree is built, so this usually has to
 * wait for the parser. A MutationObserver on `document` is the earliest reliable
 * signal; readystatechange and DOMContentLoaded both land later than needed.
 *
 * Callers must not have called window.stop() yet: stopping the parser before
 * <body> exists means it is never created, and this wait never resolves.
 */
function whenBodyReady(cb: (body: HTMLElement) => void, onGiveUp?: () => void): void {
  const body = currentBody();
  if (body) {
    cb(body);
    return;
  }

  let done = false;
  const obs = new MutationObserver(() => {
    const ready = currentBody();
    if (!ready || done) return;
    done = true;
    obs.disconnect();
    cb(ready);
  });
  obs.observe(document, { childList: true, subtree: true });

  // If the parser stalls for any reason, abandon the takeover rather than leave
  // the tab blank. Nothing has been stopped yet, so VTOP finishes loading.
  setTimeout(() => {
    if (done) return;
    done = true;
    obs.disconnect();
    onGiveUp?.();
  }, 2500);
}

/**
 * Empties the body, installs the document-level sizing, and attaches the shadow
 * root retop renders into.
 */
function mountSkeleton(body: HTMLElement): ShadowRoot {
  const docEl = document.documentElement;
  if (!docEl) return body.attachShadow({ mode: "open" });

  body.replaceChildren();

  if (!document.getElementById(DOCUMENT_SIZING_ID)) {
    const sizing = document.createElement("style");
    sizing.id = DOCUMENT_SIZING_ID;
    sizing.textContent = DOCUMENT_SIZING;
    // document_start can precede <head>, and document.title needs one to stick.
    (document.head || docEl).appendChild(sizing);
  }
  if (!document.querySelector("title")) {
    const title = document.createElement("title");
    title.textContent = "retop";
    (document.head || docEl).appendChild(title);
  }

  const host = document.createElement("div");
  host.id = "retop-host";
  host.style.cssText =
    "position: fixed !important; inset: 0 !important;" +
    " z-index: 2147483647 !important; pointer-events: auto;" +
    ` background: ${BACKDROP} !important;`;

  const shadow = host.attachShadow({ mode: "open" });

  const reset = document.createElement("style");
  reset.id = RESET_ID;
  reset.textContent = SHADOW_RESET;

  const root = document.createElement("div");
  root.id = "retop-root";
  root.style.cssText =
    "width: 100%; height: 100%; pointer-events: auto; background: transparent;";

  shadow.append(reset, root);
  body.appendChild(host);

  return shadow;
}

/**
 * Hands the document back to VTOP.
 *
 * On a taken-over login route the native markup no longer exists: mountSkeleton
 * replaced documentElement's children and window.stop() killed the parser, so
 * there is nothing to reveal. Reloading is the only way back, and the reload is
 * the first load where the takeover does not run, so VTOP renders natively.
 */
function revealNative(takenOver: boolean): void {
  if (takenOver) {
    armBypass();
    window.location.reload();
    return;
  }

  document.getElementById(BOOT_CLOAK_ID)?.remove();
  document.getElementById("retop-host")?.remove();
  if (document.body) {
    document.body.style.opacity = "1";
    document.body.style.display = "block";
    document.body.style.visibility = "visible";
    document.body.classList.add("show-legacy-ui");
  }
}

/**
 * Consumes the bypass marker left by a failed takeover.
 *
 * The recovery reload needs native VTOP exactly once; without consuming it, every
 * later trip to a login route in this tab would stay unstyled.
 */
function consumeBypass(): boolean {
  try {
    if (sessionStorage.getItem(BYPASS_KEY) !== "1") return false;
    sessionStorage.removeItem(BYPASS_KEY);
    return true;
  } catch {
    return false;
  }
}

function armBypass(): void {
  try {
    sessionStorage.setItem(BYPASS_KEY, "1");
  } catch {}
}

/** How long the login entry gets to paint before native VTOP is restored. */
const TAKEOVER_WATCHDOG_MS = 6000;

function takeOverLogin(): void {
  // window.stop() must come AFTER the body exists. Stopping first halts the parser
  // before <body> is created, so the wait below would never resolve and the tab
  // would stay blank. Stopping the moment a body appears still beats letting
  // VTOP finish laying out its Bootstrap page.
  whenBodyReady(
    (body) => {
      window.stop();
      document.title = "retop";

      mountSkeleton(body);
      document.documentElement?.setAttribute("data-retop-takeover", "login");

    // If the entry fails to import, or mounts and then throws, the user would be
    // left staring at an empty shell. Nothing here can recover in place, so the
    // only escape is one clean reload back to native VTOP.
    const watchdog = setTimeout(() => {
      if (!document.getElementById("retop-host")) return;
      console.warn("[retop] Login takeover produced no UI; restoring VTOP.");
      revealNative(true);
    }, TAKEOVER_WATCHDOG_MS);

    loadEntry("login.js")
        .then(() => {
          // Give the entry a moment to render before standing the watchdog down.
          setTimeout(() => {
            const root = document.getElementById("retop-host")?.shadowRoot
              ?.getElementById("retop-root");
            if (root && root.childElementCount > 0) clearTimeout(watchdog);
          }, 1500);
        })
        .catch((err) => {
          console.error("[retop] Login takeover failed to load:", err);
          clearTimeout(watchdog);
          revealNative(true);
        });
    },
    () => {
      // No <body> appeared, so the takeover is abandoned untouched. Nothing was
      // stopped, so VTOP keeps loading natively.
      console.warn("[retop] Login takeover abandoned: no <body> to mount into.");
    },
  );
}

function main(): void {
  if (window.self !== window.top) return;
  if (!VTOP_HOST.test(window.location.hostname)) return;

  const path = window.location.pathname;
  const role = readRoleSync();

  if (matches(path, LOGIN_ROUTES) && isOwnableRole(role) && !consumeBypass()) {
    takeOverLogin();
    return;
  }

  if (matches(path, AUTH_ROUTES) && isOwnableRole(role)) {
    // Only cloak routes retop will actually own. Anything else stays visible so a
    // failed dashboard entry degrades to plain VTOP instead of a blank screen.
    cloakNative();
  }

  loadEntry("dashboard.js").catch((err) => {
    console.error("[retop] Dashboard entry failed to load:", err);
    revealNative(false);
  });
}

main();