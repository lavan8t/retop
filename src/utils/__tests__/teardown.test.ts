import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
  dismantleRetopMods,
  registerAppUnmount,
  teardownRetop,
} from "../teardown";

/**
 * The teardown runs against the live document, so these tests drive a real
 * (bun) DOM rather than a mock: the point is that a VTOP page is left usable.
 */
const makeHost = (id: string) => {
  const el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
};

describe("dismantleRetopMods", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-retop-takeover");
    document.documentElement.removeAttribute("data-scrolling");
    document.documentElement.style.removeProperty("--accent-base");
    document.documentElement.style.removeProperty("font-size");
    document.body.className = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("removes every retop node it injected", () => {
    for (const id of [
      "retop-host",
      "retop-boot-cloak",
      "retop-early-cloak",
      "retop-open-loader",
      "retop-document-sizing",
      "retop-shadow-reset",
      "retop-global-css",
      "retop-dark-stylesheet",
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
    ]) {
      makeHost(id);
    }

    dismantleRetopMods();

    expect(document.getElementById("retop-host")).toBeNull();
    expect(document.getElementById("retop-boot-cloak")).toBeNull();
    expect(document.getElementById("retop-dark-stylesheet")).toBeNull();
    expect(document.getElementById("retop-open-loader")).toBeNull();
    expect(document.getElementById("vtop-login-theme")).toBeNull();
  });

  it("restores the document to a usable VTOP state", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.setAttribute("data-retop-takeover", "login");
    document.documentElement.setAttribute("data-scrolling", "1");
    document.documentElement.style.setProperty("--accent-base", "#123456");
    document.documentElement.style.fontSize = "120%";
    document.body.style.opacity = "0";
    document.body.style.visibility = "hidden";
    document.body.style.overflow = "hidden";
    document.body.classList.remove("show-legacy-ui");

    dismantleRetopMods();

    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(document.documentElement.hasAttribute("data-retop-takeover")).toBe(false);
    expect(document.documentElement.hasAttribute("data-scrolling")).toBe(false);
    expect(
      document.documentElement.style.getPropertyValue("--accent-base"),
    ).toBe("");
    expect(document.documentElement.style.fontSize).toBe("");
    expect(document.body.style.opacity).toBe("1");
    expect(document.body.style.visibility).toBe("visible");
    expect(document.body.style.overflow).toBe("");
    expect(document.body.classList.contains("show-legacy-ui")).toBe(true);
  });

  it("unhides the native header elements it had hidden", () => {
    const btn = makeHost("vtop-search-menu-btn");
    btn.style.setProperty("display", "none", "important");
    const search = makeHost("MG_SEARCH");
    search.style.setProperty("display", "none", "important");

    dismantleRetopMods();

    // The elements must survive: removing them would take VTOP's own search
    // away for good.
    expect(document.getElementById("vtop-search-menu-btn")).not.toBeNull();
    expect(document.getElementById("MG_SEARCH")).not.toBeNull();
    expect(btn.style.getPropertyValue("display")).toBe("");
    expect(search.style.getPropertyValue("display")).toBe("");
  });

  it("restores the monkey-patched fetch and XHR", () => {
    const originalFetch = window.fetch;
    const originalOpen = XMLHttpRequest.prototype.open;
    (window as any).__retopOriginalFetch = originalFetch;
    (window as any).__retopOriginalXhrOpen = originalOpen;

    dismantleRetopMods();

    expect((window as any).__retopOriginalFetch).toBeUndefined();
    expect((window as any).__retopOriginalXhrOpen).toBeUndefined();
    expect(window.fetch).toBe(originalFetch);
    expect(XMLHttpRequest.prototype.open).toBe(originalOpen);
  });

  it("unmounts the React app so its timers stop touching VTOP", async () => {
    let unmounted = false;
    registerAppUnmount(() => {
      unmounted = true;
    });

    dismantleRetopMods();
    // The unmount is deferred: doing it synchronously from inside a React
    // render would make React throw.
    await new Promise((r) => setTimeout(r, 10));

    expect(unmounted).toBe(true);
  });
});

describe("teardownRetop", () => {
  it("reloads with the bypass armed when it owns the login page", () => {
    document.documentElement.setAttribute("data-retop-takeover", "login");
    const originalLocation = window.location;
    // jsdom/bun location cannot be reassigned, so assert on the marker the
    // reload depends on instead.
    let reloaded = false;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        reload: () => {
          reloaded = true;
        },
      },
    });

    teardownRetop();

    expect(sessionStorage.getItem("retop-login-bypass")).toBe("1");
    expect(reloaded).toBe(true);
    sessionStorage.removeItem("retop-login-bypass");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("dismantles in place when it does not own the login page", () => {
    document.documentElement.removeAttribute("data-retop-takeover");
    makeHost("retop-host");

    teardownRetop();

    expect(document.getElementById("retop-host")).toBeNull();
  });
});
