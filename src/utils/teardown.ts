/**
 * Teardown — the one place that knows how to undo everything retop did to a
 * VTOP page.
 *
 * The rule the extension lives by: if anything goes wrong, retop must leave no
 * trace. VTOP has to stay usable no matter what the extension did, so every
 * mutation (injected nodes, inline styles, monkey-patched APIs, observers) is
 * undone here rather than at each call site.
 */

import { RETOP_NODE_IDS } from './retopIds';

const TAKEOVER_ATTR = 'data-retop-takeover';
const BYPASS_KEY = 'retop-login-bypass';
/** URL fallback for the bypass marker, used when sessionStorage is unavailable. */
const BYPASS_PARAM = 'retop_bypass';

/** VTOP's own header elements retop hides. They are unhidden, never removed. */
const NATIVE_HEADER_IDS = ['vtop-search-menu-btn', 'MG_SEARCH'];

let unmountApp: (() => void) | null = null;

/**
 * Registers the React root's unmount so teardown can stop the app.
 *
 * Without this the React tree keeps running after its host is removed from the
 * document: its timers keep firing and re-inject retop markup into VTOP.
 */
export function registerAppUnmount(fn: () => void): void {
  unmountApp = fn;
}

function restorePatchedApis(): void {
  try {
    if ((window as any).__retopOriginalFetch) {
      window.fetch = (window as any).__retopOriginalFetch;
      delete (window as any).__retopOriginalFetch;
    }
  } catch {}
  try {
    if ((window as any).__retopOriginalXhrOpen) {
      XMLHttpRequest.prototype.open = (window as any).__retopOriginalXhrOpen;
      delete (window as any).__retopOriginalXhrOpen;
    }
  } catch {}
  try {
    const descriptor = (window as any).__retopOriginalXhrResponseType;
    if (descriptor) {
      Object.defineProperty(
        XMLHttpRequest.prototype,
        'responseType',
        descriptor,
      );
      delete (window as any).__retopOriginalXhrResponseType;
    }
  } catch {}
  try {
    if ((window as any).__retopProcessObserver) {
      (window as any).__retopProcessObserver.disconnect();
      delete (window as any).__retopProcessObserver;
    }
  } catch {}
}

/**
 * Completely and silently removes all retop modifications from native VTOP.
 * Restores DOM, attributes, styles, observers, and monkey-patched APIs without
 * leaving any banners or trapping the user.
 */
export function dismantleRetopMods(): void {
  // Once retop has stepped aside it must not come back on this page load: a
  // deferred entry that is still starting up would otherwise re-mount itself
  // over the native VTOP page that was just handed back.
  window.__retopAborted = true;

  for (const id of RETOP_NODE_IDS) {
    try {
      document.getElementById(id)?.remove();
    } catch {}
  }

  try {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute(TAKEOVER_ATTR);
    document.documentElement.removeAttribute('data-scrolling');
  } catch {}

  // Retop's own theme variables and font scale live on <html>; VTOP must not
  // inherit them. Only remove retop-owned properties: a blanket `--*` sweep
  // could delete custom properties VTOP itself owns.
  try {
    const docStyle = document.documentElement.style;
    const isRetopVar = (prop: string) =>
      prop.startsWith('--accent-') ||
      prop.startsWith('--md-sys-color-') ||
      prop.startsWith('--retop-') ||
      prop === '--app-font-wght' ||
      prop === '--anim-scale';
    for (const prop of Array.from(docStyle)) {
      if (isRetopVar(prop)) docStyle.removeProperty(prop);
    }
    docStyle.removeProperty('font-size');
  } catch {}

  for (const id of NATIVE_HEADER_IDS) {
    try {
      const el = document.getElementById(id);
      (el as HTMLElement | null)?.style.removeProperty('display');
    } catch {}
  }

  if (document.body) {
    try {
      document.body.style.opacity = '1';
      document.body.style.display = 'block';
      document.body.style.visibility = 'visible';
      document.body.style.overflow = '';
      document.body.classList.add('show-legacy-ui');
    } catch {}
  }

  try {
    document
      .querySelectorAll<HTMLElement>(
        '#page-wrapper, #page_outline, #vtop-body-content, .wrapper, body > table, body > form',
      )
      .forEach((el) => {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      });
  } catch {}

  // Stop the React app before its host is gone, otherwise its effects keep
  // writing to the VTOP page.
  const unmount = unmountApp;
  unmountApp = null;
  if (unmount) {
    try {
      // Deferred: unmounting synchronously from inside a React render (the
      // error boundary path) makes React throw.
      setTimeout(() => {
        try {
          unmount();
        } catch {}
      }, 0);
    } catch {}
  }

  restorePatchedApis();
}

function isLoginTakeover(): boolean {
  try {
    return document.documentElement.getAttribute(TAKEOVER_ATTR) === 'login';
  } catch {
    return false;
  }
}

/**
 * Hands the page back to VTOP.
 *
 * On a taken-over login route the native markup no longer exists — retop
 * replaced the document — so the only way back is one reload with the bypass
 * armed, which is the first load where the takeover does not run.
 */
export function teardownRetop(): void {
  if (isLoginTakeover()) {
    // The marker must survive the reload, or the takeover runs again and the
    // user is stuck in an endless reload loop. A URL marker is the fallback
    // for when sessionStorage is unavailable.
    let armed = false;
    try {
      window.sessionStorage.setItem(BYPASS_KEY, '1');
      armed = true;
    } catch {}
    if (!armed) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set(BYPASS_PARAM, '1');
        window.history.replaceState(null, '', url.toString());
      } catch {}
    }
    window.location.reload();
    return;
  }
  dismantleRetopMods();
}

const isExtensionSource = (source: string) =>
  source.startsWith('chrome-extension://') ||
  source.startsWith('moz-extension://');

/** A failed request is not a crash: the page keeps working without retop. */
const isNetworkFailure = (reason: any) =>
  /failed to fetch|networkerror|load failed|network request failed|aborted|timed? ?out|timeout/i.test(
    String(reason?.message || reason || ''),
  );

/**
 * Global safety net.
 *
 * React error boundaries only catch render-phase errors. Event handlers, timer
 * callbacks and promise rejections slip past them, and an uncaught one of those
 * used to leave a half-built retop covering the page. This listener catches
 * every uncaught error that came from the extension and hands VTOP back.
 */
export function installErrorNet(): void {
  if ((window as any).__retopErrorNet) return;
  (window as any).__retopErrorNet = true;

  window.addEventListener('error', (event) => {
    try {
      // VTOP's own page errors are not retop's problem.
      if (!event.filename || !isExtensionSource(event.filename)) return;
      console.error(
        '[retop] Uncaught error in the extension; stepping aside from VTOP.',
        event.error || event.message,
      );
      teardownRetop();
    } catch {}
  });

  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason;
      if (isNetworkFailure(reason)) return;
      const stack = String(reason?.stack || '');
      const fromRetop =
        isExtensionSource(stack.split('\n')[0] || '') ||
        stack.includes('chrome-extension://') ||
        stack.includes('moz-extension://');
      if (!fromRetop) return;
      console.error(
        '[retop] Unhandled rejection in the extension; stepping aside from VTOP.',
        reason,
      );
      try {
        event.preventDefault();
      } catch {}
      teardownRetop();
    } catch {}
  });
}
