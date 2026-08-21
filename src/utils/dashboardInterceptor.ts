import { setCachedData } from "./cache";
import {
  parseAcademicStats,
  parseCourseDetails,
  parseDigitalAssignments,
} from "../parsers/dashboard";
import { parseEvents } from "../parsers/events";
import { useDataStore } from "../store/dataStore";

// ── Intercept Signal Registry ─────────────────────────────────────────────────
// Resolvers keyed by cache key. Allows waitForIntercepted() to await VTOP's own
// native XHR/fetch rather than firing a duplicate request.
const interceptSignals: Map<string, Array<(html: string) => void>> = new Map();

/** Called by fetchDashboardData to wait for VTOP's home XHR to arrive.
 *  Resolves with the HTML text if intercepted within `timeoutMs`, else "".
 */
export function waitForIntercepted(key: string, timeoutMs = 2500): Promise<string> {
  const isOffline =
    (typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (typeof location !== "undefined" &&
      !location.hostname.includes("vit.ac.in") &&
      !location.protocol.includes("chrome-extension") &&
      !location.protocol.includes("moz-extension"));

  if (isOffline) {
    return Promise.resolve("");
  }

  return new Promise((resolve) => {
    const listeners = interceptSignals.get(key) ?? [];
    listeners.push(resolve);
    interceptSignals.set(key, listeners);
    setTimeout(() => resolve(""), timeoutMs);
  });
}

function notifyIntercepted(key: string, html: string) {
  const listeners = interceptSignals.get(key);
  if (listeners && listeners.length > 0) {
    interceptSignals.set(key, []);
    listeners.forEach((fn) => fn(html));
  }
}

export function interceptDashboardResponse(url: string, htmlText: string) {
  if (!htmlText || typeof htmlText !== "string" || htmlText.length < 20) return;

  const authId =
    (window as any).authorizedID ||
    (document.getElementById("authorizedIDX") as HTMLInputElement)?.value ||
    (document.querySelector('input[name="authorizedID"]') as HTMLInputElement)?.value ||
    localStorage.getItem("retop_lastAuthId") ||
    localStorage.getItem("retop_active_user") ||
    "";

  const saveCache = (keyBase: string, data: any) => {
    if (authId) {
      setCachedData(`${authId}_${keyBase}`, data);
    }
    setCachedData(keyBase, data);
  };

  if (url.includes("get/dashboard/current/cgpa/credits")) {
    try {
      const stats = parseAcademicStats(htmlText);
      saveCache("dashboard_stats", stats);
      notifyIntercepted("dashboard_stats", htmlText);
      useDataStore.setState({ stats });
    } catch (e) {
      console.warn("[retop] Error parsing intercepted dashboard stats:", e);
    }
  } else if (url.includes("get/dashboard/current/semester/course/details")) {
    try {
      const attendance = parseCourseDetails(htmlText);
      saveCache("dashboard_attendance", attendance);
      notifyIntercepted("dashboard_attendance", htmlText);
      useDataStore.setState({ attendance });
    } catch (e) {
      console.warn("[retop] Error parsing intercepted dashboard attendance:", e);
    }
  } else if (url.includes("get/upcoming/digital/assignments")) {
    try {
      const assignments = parseDigitalAssignments(htmlText);
      saveCache("dashboard_da", assignments);
      notifyIntercepted("dashboard_da", htmlText);
      useDataStore.setState({ assignments });
    } catch (e) {
      console.warn("[retop] Error parsing intercepted dashboard DA:", e);
    }
  } else if (url.includes("get/scheduled/events")) {
    try {
      const events = parseEvents(htmlText);
      saveCache("dashboard_events", events);
      notifyIntercepted("dashboard_events", htmlText);
      useDataStore.setState({ events });
    } catch (e) {
      console.warn("[retop] Error parsing intercepted dashboard events:", e);
    }
  }
}
