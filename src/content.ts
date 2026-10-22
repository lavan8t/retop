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
];

/** Routes retop must never own: users need VTOP's own recovery forms. */
const PASSTHROUGH_ROUTES = ["/vtop/forgotPassword", "/vtop/forgotUsername"];

/** Routes that carry an authenticated VTOP session. */
const AUTH_ROUTES = ["/vtop/content", "/vtop/main", "/vtop/process"];

/** Marker written when the user turns retop off from the login wordmark. */
const DISABLED_KEY = "retop_disabled";

const BACKDROP = "#09090b";

/**
 * Pre-paint cloak installed by the bootstrapper. Distinct id from the splash
 * screen's own cloak because both stylesheets declare `#retop-open-loader`;
 * removeSplashScreen clears them together.
 */
const BOOT_CLOAK_ID = "retop-boot-cloak";

const BYPASS_KEY = "retop-login-bypass";

/** URL fallback for the bypass marker, used when sessionStorage is unavailable. */
const BYPASS_PARAM = "retop_bypass";

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
  // The callback tears the page down and mounts retop over it. If it throws
  // halfway through, the page is left half-destroyed, so it must never throw.
  const run = (body: HTMLElement) => {
    try {
      cb(body);
    } catch (err) {
      console.error("[retop] Bootstrapper step failed:", err);
      revealNative(false);
    }
  };

  const body = currentBody();
  if (body) {
    run(body);
    return;
  }

  let done = false;
  const obs = new MutationObserver(() => {
    const ready = currentBody();
    if (!ready || done) return;
    done = true;
    obs.disconnect();
    run(ready);
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

  // Build everything before the native markup is cleared. A throw after
  // replaceChildren() but before the host is attached would leave the page
  // blank with nothing to show.
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

  body.replaceChildren();
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
    // A reload without the bypass would run the takeover again: an endless
    // reload loop on a blank page. Nothing can be recovered in place, so the
    // marker has to survive the reload.
    if (!armBypass()) {
      console.error("[retop] Cannot arm the login bypass; leaving VTOP in place.");
      document.getElementById("retop-host")?.remove();
      document.getElementById(BOOT_CLOAK_ID)?.remove();
      return;
    }
    window.location.reload();
    return;
  }

  // The dashboard entry publishes the full teardown (DOM, styles, patched
  // APIs, observers). Prefer it so there is exactly one teardown path; the
  // local list below is the fallback for when the entry never loaded.
  const dismantle = (window as any).__retopDismantle;
  if (typeof dismantle === "function") {
    try {
      dismantle();
      return;
    } catch (err) {
      console.error("[retop] Teardown failed; falling back to the local cleanup.", err);
    }
  }

  const ids = [
    BOOT_CLOAK_ID,
    "retop-early-cloak",
    "retop-open-loader",
    "retop-host",
    DOCUMENT_SIZING_ID,
    RESET_ID,
    "retop-dark-stylesheet",
    "retop-global-css",
    "retop-material-symbols-style",
    "retop-native-portals",
    "retop-legacy-menu-search-wrapper",
    "retop-session-dialog",
    "retop-halted-banner",
    "retop-hmenu-search-toggle",
    "retop-vtop-search-menu",
    "retop-splash-style",
    "vtop-prelogin-theme",
    "vtop-login-theme",
    "vtop-early-theme",
  ];
  for (const id of ids) {
    try {
      document.getElementById(id)?.remove();
    } catch {}
  }
  try {
    document.documentElement?.removeAttribute("data-theme");
    document.documentElement?.removeAttribute("data-retop-takeover");
    document.documentElement?.removeAttribute("data-scrolling");
  } catch {}

  if (document.body) {
    try {
      document.body.style.opacity = "1";
      document.body.style.display = "block";
      document.body.style.visibility = "visible";
      document.body.style.overflow = "";
      document.body.classList.add("show-legacy-ui");
    } catch {}
  }
  try {
    const nativeEls = document.querySelectorAll<HTMLElement>(
      "#page-wrapper, #page_outline, #vtop-body-content, .wrapper, body > table, body > form",
    );
    nativeEls.forEach((el) => {
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
    });
  } catch {}
}

/**
 * Consumes the bypass marker left by a failed takeover.
 *
 * The recovery reload needs native VTOP exactly once; without consuming it, every
 * later trip to a login route in this tab would stay unstyled.
 */
function consumeBypass(): boolean {
  try {
    if (sessionStorage.getItem(BYPASS_KEY) === "1") {
      sessionStorage.removeItem(BYPASS_KEY);
      return true;
    }
  } catch {}
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(BYPASS_PARAM) === "1") {
      url.searchParams.delete(BYPASS_PARAM);
      window.history.replaceState(null, "", url.toString());
      return true;
    }
  } catch {}
  return false;
}

/**
 * Arms the marker that makes the next load skip the takeover.
 *
 * Returns false when the marker could not be written at all. The caller must
 * not reload in that case: the reload would run the takeover again and the
 * user would sit in an endless reload loop on a blank page.
 */
function armBypass(): boolean {
  try {
    sessionStorage.setItem(BYPASS_KEY, "1");
    return true;
  } catch {}
  // sessionStorage can be unavailable (storage blocked, some private modes).
  // A URL marker survives the reload just as well.
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(BYPASS_PARAM, "1");
    window.history.replaceState(null, "", url.toString());
    return true;
  } catch {
    return false;
  }
}

/** True when the bypass marker can actually be written and read back. */
function canArmBypass(): boolean {
  try {
    sessionStorage.setItem(BYPASS_KEY, "1");
    const ok = sessionStorage.getItem(BYPASS_KEY) === "1";
    sessionStorage.removeItem(BYPASS_KEY);
    if (ok) return true;
  } catch {}
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(BYPASS_PARAM, "1");
    window.history.replaceState(null, "", url.toString());
    const ok = new URL(window.location.href).searchParams.get(BYPASS_PARAM) === "1";
    url.searchParams.delete(BYPASS_PARAM);
    window.history.replaceState(null, "", url.toString());
    return ok;
  } catch {
    return false;
  }
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
      // Without a way to arm the bypass, a failure could only be recovered by
      // reloading into the takeover again. Leave VTOP's own login alone.
      if (!canArmBypass()) {
        console.warn("[retop] Cannot arm the login bypass; leaving VTOP's login page alone.");
        return;
      }

      window.stop();
      document.title = "retop";

      mountSkeleton(body);
      document.documentElement?.setAttribute("data-retop-takeover", "login");

    // If the entry fails to import, or mounts and then throws, the user would be
    // left staring at an empty shell. Nothing here can recover in place, so the
    // only escape is one clean reload back to native VTOP. The render deadline
    // only starts once the entry has arrived: a slow download is not a failure.
    let gaveUp = false;
    const giveUp = () => {
      if (gaveUp) return;
      gaveUp = true;
      console.warn("[retop] Login takeover produced no UI; restoring VTOP.");
      revealNative(true);
    };

    const loadTimeout = setTimeout(giveUp, 45000);

    loadEntry("login.js")
        .then(() => {
          clearTimeout(loadTimeout);
          const renderTimeout = setTimeout(giveUp, TAKEOVER_WATCHDOG_MS);
          const poll = setInterval(() => {
            const root = document.getElementById("retop-host")?.shadowRoot
              ?.querySelector("#retop-root");
            if (root && root.childElementCount > 0) {
              clearTimeout(renderTimeout);
              clearInterval(poll);
            }
          }, 250);
        })
        .catch((err) => {
          console.error("[retop] Login takeover failed to load:", err);
          clearTimeout(loadTimeout);
          giveUp();
        });
    },
    () => {
      // No <body> appeared, so the takeover is abandoned untouched. Nothing was
      // stopped, so VTOP keeps loading natively.
      console.warn("[retop] Login takeover abandoned: no <body> to mount into.");
    },
  );
}

/**
 * True while the user has turned retop off. The marker lives in the page's own
 * localStorage so the document_start bootstrapper can read it synchronously
 * and hand VTOP back without waiting for any extension round-trip.
 */
function isDisabled(): boolean {
  try {
    return localStorage.getItem(DISABLED_KEY) === "1";
  } catch {
    return false;
  }
}

const RECOVERY_BACK_ID = "retop-recovery-back";

/** Marker set by the retop login card before handing recovery to the native page. */
const FORGOT_KEY = "retop-forgot-intent";

function consumeForgotIntent(): "password" | "username" | null {
  try {
    const value = sessionStorage.getItem(FORGOT_KEY);
    if (value !== "password" && value !== "username") return null;
    sessionStorage.removeItem(FORGOT_KEY);
    return value;
  } catch {
    return null;
  }
}

/**
 * VTOP's recovery forms are POST-only and only open through JS handlers on its
 * own login page, so a plain link cannot reach them. The card sets an intent and
 * lands here with the bypass armed; click the native link once the page is parsed.
 */
function openNativeRecovery(kind: "password" | "username"): void {
  const selector =
    kind === "username"
      ? 'a[onclick*="forgotUserID"]'
      : 'a[onclick*="resetPassword"]';
  const click = () => {
    (document.querySelector(selector) as HTMLElement | null)?.click();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", click, { once: true });
  } else {
    click();
  }
}

/**
 * Native recovery pages stay VTOP's, but a user who followed a link from retop
 * must not be stranded there. Plain inline styles so the bootstrapper stays
 * import free and does not load the dashboard on these routes.
 */
function showRecoveryBackLink(): void {
  if (document.getElementById(RECOVERY_BACK_ID)) return;
  const back = document.createElement("a");
  back.id = RECOVERY_BACK_ID;
  back.href = "/vtop/login";
  back.textContent = "re.";
  back.setAttribute("aria-label", "Back to retop");
  back.title = "Back to retop";
  back.style.cssText = `
    position: fixed !important; bottom: 20px !important; left: 50% !important;
    transform: translateX(-50%) !important; z-index: 2147483647 !important;
    display: inline-flex !important; align-items: center !important; justify-content: center !important;
    padding: 12px 30px !important; border-radius: 9999px !important;
    background: #09090b !important; color: #ffffff !important;
    font: 700 15px/1 'Google Sans Flex', system-ui, sans-serif !important;
    font-variation-settings: 'slnt' -10, 'wdth' 151, 'wght' 700 !important;
    text-decoration: none !important; box-shadow: 0 1px 4px rgba(0,0,0,.4) !important;
    transition: border-radius 90ms cubic-bezier(0.2, 0, 0, 1), transform 90ms cubic-bezier(0.2, 0, 0, 1) !important;
  `;

  const style = document.createElement("style");
  style.textContent = `
    #${RECOVERY_BACK_ID}:active {
      border-radius: 16px !important;
      transform: translateX(-50%) scale(0.985) !important;
    }
  `;

  whenBodyReady((body) => {
    body.appendChild(style);
    body.appendChild(back);
  });
}

/**
 * Watches for retop being turned back on. The extension owns the real switch
 * (chrome.storage), the page marker is only the fast path, so a stale marker
 * must not keep VTOP's own UI away forever.
 */
function watchForReEnable(): void {
  const clear = () => {
    try {
      localStorage.removeItem(DISABLED_KEY);
    } catch {}
    window.location.reload();
  };

  try {
    chrome.runtime.sendMessage({ action: "IS_DISABLED" }, (res) => {
      if (chrome.runtime.lastError) return;
      if (!res?.disabled) clear();
    });
  } catch {}

  try {
    chrome.runtime.onMessage.addListener((message: any) => {
      if (message?.type === "RETOP_REENABLED") clear();
    });
  } catch {}
}

function main(): void {
  if (window.self !== window.top) return;
  if (!VTOP_HOST.test(window.location.hostname)) return;

  // The user asked for plain VTOP: touch nothing.
  if (isDisabled()) {
    watchForReEnable();
    return;
  }

  const path = window.location.pathname;

  // Recovery is delegated to VTOP's native login page; click its own link once
  // that page is parsed, and leave a way back to retop.
  if (matches(path, LOGIN_ROUTES)) {
    const forgot = consumeForgotIntent();
    if (forgot) {
      openNativeRecovery(forgot);
      showRecoveryBackLink();
    }
  }

  // Never take over account recovery: the native form must stay usable, but
  // leave a way back to retop's sign-in.
  if (matches(path, PASSTHROUGH_ROUTES)) {
    showRecoveryBackLink();
    return;
  }

  if (matches(path, LOGIN_ROUTES) && !consumeBypass()) {
    takeOverLogin();
    return;
  }

  if (matches(path, AUTH_ROUTES)) {
    // Only cloak routes retop will actually own. Anything else stays visible so a
    // failed dashboard entry degrades to plain VTOP instead of a blank screen.
    cloakNative();

    // The dashboard entry is a megabyte of JavaScript and campus links are
    // slow: it regularly takes longer to arrive than the old 8s budget, and
    // the watchdog then handed VTOP back and aborted a dashboard that was
    // about to work. So it only fires once the entry has loaded and still
    // produced no UI.
    let gaveUp = false;

    const giveUp = () => {
      if (gaveUp) return;
      gaveUp = true;
      console.warn("[retop] Auth dashboard produced no UI; revealing native VTOP.");
      // The entry may still be starting up. Tell it to stop, or it would
      // mount the dashboard over the page we just handed back.
      (window as any).__retopAborted = true;
      revealNative(false);
    };

    // A download that never arrives would leave the page cloaked forever.
    const loadTimeout = setTimeout(giveUp, 45000);

    loadEntry("dashboard.js")
      .then(() => {
        clearTimeout(loadTimeout);
        // The entry is up and now owns the "did it paint?" question: it hands
        // VTOP back itself if it cannot render.
      })
      .catch((err) => {
        console.error("[retop] Dashboard entry failed to load:", err);
        clearTimeout(loadTimeout);
        giveUp();
      });
    return;
  }

  loadEntry("dashboard.js").catch((err) => {
    console.error("[retop] Dashboard entry failed to load:", err);
    revealNative(false);
  });
}

try {
  main();
} catch (err) {
  console.error("[retop] Bootstrapper error:", err);
  revealNative(false);
}