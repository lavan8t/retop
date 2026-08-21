import {
  getCachedData,
  setCachedData,
  getCachedDataWithTimestamp,
} from "./cache";
import { useAppStore } from "../store/appStore";
import { showAlertDialog } from "../components/ui/AlertDialog";
import { parseAcademicStats, parseCourseDetails, parseDigitalAssignments } from "../parsers/dashboard";
import { parseEvents } from "../parsers/events";
import { parseSemesters, parseTimetable } from "../parsers/timetable";
import { parseCalendarSemesters, parseCalendarGroupsAndMonths } from "../parsers/calendar";
import { parseMarksSemesters, parseStudentMarks } from "../parsers/marks";
import { parseGradesSemesters, parseGrades, parseGradeHistory, parseGradeDetails } from "../parsers/grades";
import { parseDASemesters, parseDACourses, parseDAAssignments } from "../parsers/digital-assignments";
import { parseStudentAttendance, parseAttendanceDetail } from "../parsers/attendance";
import { parseExamSemesters, parseExamScheduleData } from "../parsers/exam-schedule";
import { parseStudentProfile } from "../parsers/profile";
import { parseCurriculumDashboard, parseCurriculumCourses } from "../parsers/curriculum";
import { parseLateHourRows } from "../parsers/late-hour";

export const getParserForKey = (key: string): ((html: string) => any) | null => {
  if (key === "dashboard_stats") return parseAcademicStats;
  if (key === "dashboard_attendance") return parseCourseDetails;
  if (key === "dashboard_da") return parseDigitalAssignments;
  if (key === "dashboard_events") return parseEvents;
  if (key === "tt_semester_list" || key === "tt_semesters") return parseSemesters;
  if (key === "cal_semester_list" || key === "cal_semesters") return parseCalendarSemesters;
  if (key === "exam_schedule_view" || key === "exam_semesters") return parseExamSemesters;
  if (key === "marks_view" || key === "marks_view_initial" || key === "marks_semesters" || key === "marks_semester_list") return parseMarksSemesters;
  if (key === "grades_view" || key === "grades_semesters" || key === "grades_semester_list") return parseGradesSemesters;
  if (key === "grade_history_data" || key === "student_grade_history") return parseGradeHistory;
  if (key === "curriculum_dashboard" || key === "curriculum") return parseCurriculumDashboard;
  if (key === "student_profile_data" || key === "student_profile") return parseStudentProfile;
  if (key === "late_hour_status" || key === "late_hour_history") return parseLateHourRows;
  if (key === "da_semester_list" || key === "da_semesters") return parseDASemesters;

  if (key.startsWith("attendance_detailed_")) return parseStudentAttendance;
  if (key.startsWith("attendance_records_")) return parseAttendanceDetail;
  if (key.startsWith("tt_") || key.startsWith("timetable_")) return parseTimetable;
  if (key.startsWith("marks_data_")) return parseStudentMarks;
  if (key.startsWith("grades_data_")) return parseGrades;
  if (key.startsWith("grade_details_")) return parseGradeDetails;
  if (key.startsWith("da_courses_")) return parseDACourses;
  if (key.startsWith("da_class_") || key.startsWith("da_view_")) return parseDAAssignments;
  if (key.startsWith("exam_schedule_data_")) return parseExamScheduleData;
  if (key.startsWith("curriculum_cat_")) return parseCurriculumCourses;
  if (key.startsWith("cal_groups_")) return parseCalendarGroupsAndMonths;

  return null;
};

export function extractCsrfTokenFromHTML(html: string): string | null {
  if (!html || typeof html !== "string") return null;

  // 1. Hidden input name="_csrf" value="..."
  const inputMatch =
    html.match(/<input[^>]*name=["']_csrf["'][^>]*value=["']([^"']+)["']/i) ||
    html.match(/<input[^>]*value=["']([^"']+)["'][^>]*name=["']_csrf["']/i);
  if (inputMatch && inputMatch[1] && inputMatch[1].length > 5) return inputMatch[1];

  // 2. JS variable csrfValue = "..." or _csrf = "..." or _csrf: "..."
  const jsMatch = html.match(/(?:csrfValue|_csrf)\s*[:=]\s*["']([^"']+)["']/i);
  if (jsMatch && jsMatch[1] && jsMatch[1].length > 5) return jsMatch[1];

  return null;
}

export function extractAuthIdFromHTML(html: string): string | null {
  if (!html || typeof html !== "string") return null;

  const match =
    html.match(/<input[^>]*id=["']authorizedIDX["'][^>]*value=["']([^"']+)["']/i) ||
    html.match(/<input[^>]*name=["']authorizedID["'][^>]*value=["']([^"']+)["']/i) ||
    html.match(/<input[^>]*value=["']([^"']+)["'][^>]*id=["']authorizedIDX["']/i);
  if (match && match[1] && match[1].length > 3) return match[1];

  return null;
}

export async function diagnoseNetworkError(): Promise<string> {
  // 1. Check internet connectivity first
  let hasInternet = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (hasInternet) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      await window.fetch("https://www.google.com/generate_204", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      hasInternet = true;
    } catch {
      hasInternet = false;
    }
  }

  if (!hasInternet) {
    return "No internet connection. Please check your network.";
  }

  // 2. Internet is working, now test VTOP server & session status
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await window.fetch("/vtop/open/page", {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return "VTOP session expired. You may need to log in again.";
      }
      return "VTOP server is slow or unreachable. You may need to log in again.";
    }

    const html = await res.text();
    if (
      html.includes("login") ||
      html.includes("authorizedID") ||
      html.includes("vtopLogin") ||
      html.includes("Session Expired")
    ) {
      return "VTOP session expired. You may need to log in again.";
    }
  } catch {
    return "VTOP is slow or unreachable. You may need to log in again.";
  }

  return "VTOP is slow or unreachable. You may need to log in again.";
}

export class VTOPNetwork {
  public csrf: string;
  public authorizedID: string;

  public static has404Error = false;
  private static hasDiagnosticRun = false;
  private static activeInstances: Set<VTOPNetwork> = new Set();
  private static domObserverInitialized = false;

  public static handleNetworkFailure(reason?: string, isFatal = false) {
    // Never trigger fatal lock if device is offline
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    if (isFatal) {
      VTOPNetwork.has404Error = true;

      if (!VTOPNetwork.hasDiagnosticRun) {
        VTOPNetwork.hasDiagnosticRun = true;

        diagnoseNetworkError().then((msg) => {
          window.dispatchEvent(
            new CustomEvent("retop-toast", {
              detail: { message: msg, type: "error" },
            }),
          );
        });
      }
    }
  }

  public static resetNetworkErrorState() {
    VTOPNetwork.has404Error = false;
    VTOPNetwork.hasDiagnosticRun = false;
  }

  private static setupDOMTokenObserver() {
    if (typeof window !== "undefined" && !VTOPNetwork.domObserverInitialized) {
      VTOPNetwork.domObserverInitialized = true;
      window.addEventListener("online", () => {
        VTOPNetwork.resetNetworkErrorState();
      });
    }
  }

  public syncTokensFromDOM() {
    VTOPNetwork.setupDOMTokenObserver();
    if (typeof document === "undefined") return;

    const csrfInput = document.querySelector('input[name="_csrf"]') as HTMLInputElement;
    const domCsrf = csrfInput?.value || (window as any).csrfValue;
    if (domCsrf && domCsrf !== this.csrf && domCsrf.length > 5) {
      this.csrf = domCsrf;
      (window as any).csrfValue = domCsrf;
    }

    const authInput =
      (document.getElementById("authorizedIDX") as HTMLInputElement) ||
      (document.querySelector('input[name="authorizedID"]') as HTMLInputElement);
    const domAuth = authInput?.value || (window as any).authorizedID;
    if (domAuth && domAuth !== this.authorizedID && domAuth.length > 3) {
      this.authorizedID = domAuth;
      (window as any).authorizedID = domAuth;
      try {
        localStorage.setItem("retop_lastAuthId", domAuth);
      } catch {}
    }
  }

  private static requestTimestamps: number[] = [];

  private inFlightRequests: Map<string, Promise<string>> = new Map();

  private async enforceRateLimit() {
    const MIN_COOLDOWN = 500; // 0.5s minimum between requests
    const MAX_REQUESTS = 60; // 60 requests per minute
    const WINDOW_MS = 60000; // 1 minute

    const now = Date.now();
    let projectedTime = now;

    // Keep only timestamps within the rolling window (or in the future)
    VTOPNetwork.requestTimestamps = VTOPNetwork.requestTimestamps.filter(
      (t) => now - t < WINDOW_MS,
    );

    // 1. Enforce minimum cooldown of 1s
    const lastProjectedTime =
      VTOPNetwork.requestTimestamps.length > 0
        ? VTOPNetwork.requestTimestamps[
            VTOPNetwork.requestTimestamps.length - 1
          ]
        : 0;

    if (projectedTime - lastProjectedTime < MIN_COOLDOWN) {
      projectedTime = lastProjectedTime + MIN_COOLDOWN;
    }

    // 2. Enforce max requests per minute window
    if (VTOPNetwork.requestTimestamps.length >= MAX_REQUESTS) {
      const oldestRelevantRequest =
        VTOPNetwork.requestTimestamps[
          VTOPNetwork.requestTimestamps.length - MAX_REQUESTS
        ];
      if (projectedTime - oldestRelevantRequest < WINDOW_MS) {
        projectedTime = oldestRelevantRequest + WINDOW_MS;
      }
    }

    VTOPNetwork.requestTimestamps.push(projectedTime);

    const waitTime = projectedTime - now;
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  private async rateLimitedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    if (VTOPNetwork.has404Error) {
      throw new Error("Network requests halted due to previous VTOP error.");
    }

    const urlStr =
      typeof input === "string"
        ? input
        : (input as any).url || input.toString();

    const isOfflineMode =
      (typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) ||
      (typeof location !== "undefined" &&
        !location.hostname.includes("vit.ac.in") &&
        !location.protocol.includes("chrome-extension") &&
        !location.protocol.includes("moz-extension"));

    if (isOfflineMode) {
      return new Response("", { status: 200 });
    }

    useAppStore.getState().logNetworkRequest(urlStr);
    await this.enforceRateLimit();

    try {
      const response = await window.fetch(input, init);
      if (!response.ok) {
        const isFatalEndpoint =
          urlStr.includes("open/page") ||
          urlStr.includes("vtopLogin");
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

        if (isFatalEndpoint && !isOffline && (response.status === 401 || response.status === 403)) {
          VTOPNetwork.handleNetworkFailure(`HTTP Status ${response.status}`, true);
        }
        throw new Error(`HTTP Status ${response.status}`);
      }
      return response;
    } catch (err: any) {
      throw err;
    }
  }

  async fetchVtopApi(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<string> {
    const isOfflineMode =
      (typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) ||
      (typeof location !== "undefined" &&
        !location.hostname.includes("vit.ac.in") &&
        !location.protocol.includes("chrome-extension") &&
        !location.protocol.includes("moz-extension"));

    if (isOfflineMode) {
      return "";
    }

    // 1. Sync live tokens from DOM prior to sending request
    this.syncTokensFromDOM();

    const url = endpoint.startsWith("/") ? endpoint : `/vtop/${endpoint}`;
    const body = new URLSearchParams();

    // 2. Always use current active instance tokens
    const activeCsrf = params._csrf || this.csrf;
    const activeAuthId = params.authorizedID || this.authorizedID;

    body.append("_csrf", activeCsrf);
    body.append("authorizedID", activeAuthId);

    for (const [key, value] of Object.entries(params)) {
      if (key !== "_csrf" && key !== "authorizedID") {
        body.append(key, value);
      }
    }
    
    // Auto-append timestamp for cache busting if not specified
    if (!params.x && !params.nocache) body.append("x", new Date().toUTCString());

    const response = await this.rateLimitedFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: body,
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    const text = await response.text();

    // 3. Self-healing token update from response payload
    const newCsrf = extractCsrfTokenFromHTML(text);
    if (newCsrf && newCsrf !== this.csrf) {
      console.log("[VTOPNetwork] Dynamic CSRF token self-healed from API response");
      this.updateTokens(newCsrf, null);
    }
    const newAuthId = extractAuthIdFromHTML(text);
    if (newAuthId && newAuthId !== this.authorizedID) {
      this.updateTokens(null, newAuthId);
    }

    return text;
  }

  constructor(csrf: string, authorizedID: string) {
    this.csrf = csrf;
    this.authorizedID = authorizedID;
    VTOPNetwork.activeInstances.clear();
    VTOPNetwork.activeInstances.add(this);
  }

  public updateTokens(csrf?: string | null, authorizedID?: string | null) {
    if (csrf && csrf !== this.csrf && csrf.length > 5) {
      this.csrf = csrf;
      (window as any).csrfValue = csrf;
    }
    if (authorizedID && authorizedID !== this.authorizedID && authorizedID.length > 3) {
      this.authorizedID = authorizedID;
      (window as any).authorizedID = authorizedID;
      try {
        localStorage.setItem("retop_lastAuthId", authorizedID);
      } catch {}
    }
  }

  /**
   * Fetches the latest VTOP native captcha image source.
   */
  async getNativeCaptcha(): Promise<{ captchaImage: string }> {
    try {
      const response = await this.rateLimitedFetch("/vtop/get/new/captcha", {
        method: "GET",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch captcha");

      const text = await response.text();
      const match = text.match(/src="([^"]+)"/);
      const captchaImage = match ? match[1] : "";

      return { captchaImage };
    } catch (err) {
      console.error("[VTOP Network] Captcha Fetch Failed", err);
      throw err;
    }
  }

  public async fetchWithCache<T = any>(
    key: string,
    fetcher: () => Promise<string>,
    forceRefresh = false,
    customExpiryMs?: number,
    validate?: (data: string) => boolean,
    customParser?: (html: string) => T,
  ): Promise<any> {
    const stableId =
      localStorage.getItem("retop_lastAuthId") || this.authorizedID;
    const userScopedKey = `${stableId}_${key}`;
    const parser = customParser || getParserForKey(key);

    const doFetchAndCache = async () => {
      try {
        useAppStore.getState().logNetworkRequest(key, userScopedKey);
        const data = await fetcher();

        const isErrorPage =
          typeof data === "string" &&
          (data.includes("<title>404") ||
            data.includes("HTTP Status 404") ||
            data.includes("404 Not Found") ||
            data.includes("404 - File or directory not found") ||
            data.includes("<title>Error</title>"));

        if (isErrorPage) {
          console.warn(`[VTOP Network] 404/Error response for ${key}`);
        } else if (
          data &&
          (typeof data !== "string" || data.length > 50) &&
          (typeof data !== "string" || !data.includes("Invalid")) &&
          (!validate || (typeof data === "string" && validate(data)))
        ) {
          if (parser && typeof data === "string") {
            try {
              const parsed = parser(data);
              setCachedData(userScopedKey, parsed);
              return parsed;
            } catch (err) {
              console.warn(`[retop] Parsing before cache failed for ${key}:`, err);
              setCachedData(userScopedKey, data);
            }
          } else {
            setCachedData(userScopedKey, data);
          }
        }
        return data;
      } catch (err) {
        throw err;
      } finally {
        this.inFlightRequests.delete(userScopedKey);
      }
    };

    const cachedInfo = await getCachedDataWithTimestamp<any>(userScopedKey);

    if (cachedInfo && cachedInfo.data !== undefined && cachedInfo.data !== null) {
      let EXPIRY_MS =
        customExpiryMs !== undefined ? customExpiryMs : 5 * 24 * 60 * 60 * 1000;

      if (customExpiryMs === undefined) {
        if (
          key.includes("tt_") ||
          key.includes("cal_") ||
          key.includes("timetable") ||
          key.includes("calendar")
        ) {
          EXPIRY_MS = 5 * 24 * 60 * 60 * 1000; // 5 days
        } else if (key.includes("menu")) {
          EXPIRY_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
        } else {
          EXPIRY_MS = 1 * 24 * 60 * 60 * 1000; // 1 day default for others
        }
      }

      const age = Date.now() - (cachedInfo.timestamp || 0);

      const isOffline =
        (typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) ||
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        (typeof location !== "undefined" &&
          !location.hostname.includes("vit.ac.in") &&
          !location.protocol.includes("chrome-extension") &&
          !location.protocol.includes("moz-extension"));

      let resolvedData = cachedInfo.data;
      if (typeof resolvedData === "string" && parser) {
        try {
          resolvedData = parser(resolvedData);
          setCachedData(userScopedKey, resolvedData);
        } catch {}
      }

      if (isOffline) {
        return resolvedData;
      }

      if (forceRefresh) {
        if (this.inFlightRequests.has(userScopedKey)) {
          return await this.inFlightRequests.get(userScopedKey)!;
        }
        const promise = doFetchAndCache();
        this.inFlightRequests.set(userScopedKey, promise);
        return await promise;
      }

      if (age > EXPIRY_MS) {
        if (!this.inFlightRequests.has(userScopedKey)) {
          console.log(`[VTOP Network] BG Fetch Triggered: ${userScopedKey}`);
          const promise = doFetchAndCache();
          this.inFlightRequests.set(userScopedKey, promise);
          promise.catch((e) =>
            console.warn(`BG Fetch Failed: ${userScopedKey}`, e),
          );
        }
      }

      return resolvedData;
    }

    const isOffline =
      (typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) ||
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      (typeof location !== "undefined" &&
        !location.hostname.includes("vit.ac.in") &&
        !location.protocol.includes("chrome-extension") &&
        !location.protocol.includes("moz-extension"));

    if (isOffline) {
      // One final attempt: check un-prefixed key in cache
      const unPrefixed = await getCachedDataWithTimestamp<any>(key);
      if (unPrefixed && unPrefixed.data !== undefined && unPrefixed.data !== null) {
        let res = unPrefixed.data;
        if (typeof res === "string" && parser) {
          try {
            res = parser(res);
            setCachedData(userScopedKey, res);
          } catch {}
        }
        return res;
      }
      console.warn(`[VTOP Network] Offline cache miss for: ${userScopedKey}`);
      throw new Error("OFFLINE_CACHE_MISS");
    }

    if (this.inFlightRequests.has(userScopedKey)) {
      return await this.inFlightRequests.get(userScopedKey)!;
    }

    console.log(`[VTOP Network] Fetching: ${userScopedKey}`);
    const promise = doFetchAndCache();
    this.inFlightRequests.set(userScopedKey, promise);
    return promise;
  }

  private async waitForLegacyLoad() {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const checkInterval = setInterval(() => {
          const loader = document.getElementById("progressGIF");

          const isHidden =
            !loader ||
            loader.style.display === "none" ||
            loader.classList.contains("d-none");

          if (isHidden) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      }, 300);
    });
  }

  private executeScripts(container: HTMLElement) {
    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value),
      );
      newScript.appendChild(document.createTextNode(oldScript.textContent || ""));
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }

  async getExamScheduleView(): Promise<string> {
    return this.fetchWithCache("exam_schedule_view", async () => {
      return this.fetchVtopApi("examinations/StudExamSchedule", {
        verifyMenu: "true",
      });
    });
  }

  async getExamScheduleData(semesterSubId: string): Promise<string> {
    return this.fetchWithCache(`exam_schedule_data_${semesterSubId}`, async () => {
      return this.fetchVtopApi("examinations/doSearchExamScheduleForStudent", {
        semesterSubId,
      });
    });
  }

  async getCurriculumDashboard(): Promise<string> {
    const cacheKey = "curriculum_dashboard";
    return this.fetchWithCache(cacheKey, async () => {
      return this.fetchFragment("academics/common/Curriculum");
    });
  }

  async getCurriculumCategory(categoryId: string): Promise<string> {
    const cacheKey = `curriculum_cat_${categoryId}`;

    return this.fetchWithCache(cacheKey, async () => {
      const url = "academics/common/curriculumCategoryView";
      const params = new URLSearchParams();
      params.append("_csrf", this.csrf);
      params.append("authorizedID", this.authorizedID);
      params.append("categoryId", categoryId);
      params.append("x", new Date().toUTCString());

      const response = await this.rateLimitedFetch(`/vtop/${url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: params,
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.text();
    });
  }

  downloadSyllabus(courseCode: string) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/vtop/academics/common/courseSyllabusDownload1";
    form.target = "_blank";
    form.style.display = "none";

    const inputs = {
      _csrf: this.csrf,
      authorizedID: this.authorizedID,
      courseCode: courseCode,
    };

    for (const [key, value] of Object.entries(inputs)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 1000);
  }

  async getDASemesters(forceRefresh = false): Promise<string> {
    return this.fetchWithCache(
      "da_semesters",
      async () => {
        return this.fetchFragment("examinations/StudentDA", {
          verifyMenu: "true",
          nocache: `@(${new Date().getTime()})`,
        });
      },
      forceRefresh,
    );
  }

  async getTimetable(
    semesterSubId: string,
    forceRefresh = false,
    isPastSemester = false,
  ): Promise<string> {
    const cacheKey = `tt_${semesterSubId}`;
    return this.fetchWithCache(
      cacheKey,
      async () => {
        return await this.fetchVtopApi("processViewTimeTable", {
          semesterSubId: semesterSubId,
        });
      },
      forceRefresh,
      isPastSemester ? Infinity : undefined,
    );
  }

  async getMarksView(forceRefresh = false): Promise<string> {
    return this.fetchWithCache(
      "marks_view_initial",
      () => this.fetchFragment("examinations/StudentMarkView"),
      forceRefresh,
    );
  }

  async getStudentMarks(
    semesterSubId: string,
    forceRefresh = false,
    isPastSemester = false,
  ): Promise<string> {
    const cacheKey = `marks_data_${semesterSubId}`;

    return this.fetchWithCache(
      cacheKey,
      async () => {
        const url = "examinations/doStudentMarkView";
        const body = new URLSearchParams();
        body.append("_csrf", this.csrf);
        body.append("authorizedID", this.authorizedID);
        body.append("semesterSubId", semesterSubId);
        body.append("x", new Date().toUTCString());

        const response = await this.rateLimitedFetch(`/vtop/${url}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: body,
        });

        if (!response.ok) throw new Error(`Status ${response.status}`);
        return await response.text();
      },
      forceRefresh,
      isPastSemester ? Infinity : undefined,
    );
  }

  async getDACourses(
    semesterSubId: string,
    forceRefresh = false,
    isPastSemester = false,
  ): Promise<string> {
    const cacheKey = `da_courses_${semesterSubId}`;
    return this.fetchWithCache(
      cacheKey,
      async () => {
        return this.fetchVtopApi("examinations/doDigitalAssignment", {
          semesterSubId,
        });
      },
      forceRefresh,
      isPastSemester ? Infinity : undefined,
    );
  }

  async getDAForCourse(
    classId: string,
    forceRefresh = false,
    isPastSemester = false,
  ): Promise<string> {
    const cacheKey = `da_class_${classId}`;
    return this.fetchWithCache(
      cacheKey,
      async () => {
        return this.fetchVtopApi("examinations/processDigitalAssignment", {
          classId,
        });
      },
      forceRefresh,
      isPastSemester ? Infinity : undefined,
    );
  }

  async getDAUploadView(classId: string, code: string): Promise<string> {
    const cacheKey = `da_upload_view_${classId}_${code}`;
    return this.fetchWithCache(cacheKey, async () => {
      return this.fetchVtopApi("examinations/processDigitalAssignmentUpload", {
        classId,
        mode: code,
      });
    });
  }

  async uploadStudentDA(
    classId: string,
    code: string,
    title: string,
    file: File,
  ): Promise<string> {
    const url = "examinations/doDAssignmentUploadMethod";
    const formData = new FormData();
    formData.append("_csrf", this.csrf);
    formData.append("authorizedID", this.authorizedID);
    formData.append("classId", classId);
    formData.append("code", code);
    formData.append("mCode", code);
    formData.append("opt", title);
    formData.append("studDaUpload", file);

    const response = await this.rateLimitedFetch(`/vtop/${url}`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const html = await response.text();
    const newCsrf = extractCsrfTokenFromHTML(html);
    if (newCsrf) this.csrf = newCsrf;
    return html;
  }

  async submitDAUploadOtp(otp: string): Promise<string> {
    const url = "examinations/doDAssignmentOtpUpload";
    const formData = new FormData();
    formData.append("_csrf", this.csrf);
    formData.append("authorizedID", this.authorizedID);
    formData.append("otpEmail", otp.trim());

    const response = await this.rateLimitedFetch(`/vtop/${url}`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const html = await response.text();
    const newCsrf = extractCsrfTokenFromHTML(html);
    if (newCsrf) this.csrf = newCsrf;
    return html;
  }

  async getGradesView(forceRefresh = false): Promise<string> {
    return this.fetchWithCache(
      "grades_view_initial",
      () => this.fetchFragment("examinations/examGradeView/StudentGradeView"),
      forceRefresh,
    );
  }

  async getStudentGrades(
    semesterSubId: string,
    forceRefresh = false,
    isPastSemester = false,
  ): Promise<string> {
    const cacheKey = `grades_data_${semesterSubId}`;

    return this.fetchWithCache(cacheKey, async () => {
      const url = "examinations/examGradeView/doStudentGradeView";
      const body = new URLSearchParams();
      body.append("_csrf", this.csrf);
      body.append("authorizedID", this.authorizedID);
      body.append("semesterSubId", semesterSubId);
      body.append("x", new Date().toUTCString());

      const response = await this.rateLimitedFetch(`/vtop/${url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: body,
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.text();
    });
  }

  async getStudentGradeHistory(): Promise<string> {
    const cacheKey = "grade_history_data";

    return this.fetchWithCache(cacheKey, async () => {
      const url = "examinations/examGradeView/StudentGradeHistory";
      const body = new URLSearchParams();
      body.append("_csrf", this.csrf);
      body.append("authorizedID", this.authorizedID);
      body.append("verifyMenu", "true");
      body.append("x", new Date().toUTCString());

      const response = await this.rateLimitedFetch(`/vtop/${url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: body,
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.text();
    });
  }

  async getGradeDetails(
    semesterSubId: string,
    courseId: string,
  ): Promise<string> {
    const cacheKey = `grade_details_${semesterSubId}_${courseId}`;
    return this.fetchWithCache(cacheKey, async () => {
      const url = "examinations/examGradeView/getGradeViewDetails";
      const body = new URLSearchParams();
      body.append("_csrf", this.csrf);
      body.append("authorizedID", this.authorizedID);
      body.append("semesterSubId", semesterSubId);
      body.append("courseId", courseId);
      body.append("x", new Date().toUTCString());

      const response = await this.rateLimitedFetch(`/vtop/${url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: body,
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.text();
    });
  }

  async getCoursePage(): Promise<string> {
    const cacheKey = "course_page_consolidated";

    return this.fetchWithCache(cacheKey, async () => {
      const body = new URLSearchParams();
      body.append("_csrf", this.csrf);
      body.append("authorizedID", this.authorizedID);
      body.append("verifyMenu", "true");
      body.append("nocache", "@(new Date().getTime())");

      const response = await this.rateLimitedFetch(
        "/vtop/academics/common/CoursePageConsolidated",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: body,
        },
      );

      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.text();
    });
  }

  async getCourseDetails(
    semester: string,
    courseId: string,
    courseType: string,
  ): Promise<string> {
    const cacheKey = `course_details_${semester}_${courseId}_${courseType}`;

    return this.fetchWithCache(cacheKey, async () => {
      const url = "academics/CoursePageConsolidated/getCourseDetail";
      const body = new URLSearchParams();
      body.append("_csrf", this.csrf);
      body.append("authorizedID", this.authorizedID);
      body.append("semester", semester);
      body.append("CourseId", courseId);
      body.append("CoursType", courseType);
      body.append("x", new Date().toUTCString());

      const response = await this.rateLimitedFetch(`/vtop/${url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: body,
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.text();
    });
  }

  downloadCourseMaterial(fileId: string) {
    const form = document.createElement("form");
    form.method = "POST";

    form.action = "/vtop/downloadCourseMaterialFacultyPdf";
    form.target = "_blank";
    form.style.display = "none";

    const inputs = {
      _csrf: this.csrf,
      authorizedID: this.authorizedID,
      fileId: fileId,
    };

    for (const [key, value] of Object.entries(inputs)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 1000);
  }

  private injectScript(code: string) {
    const script = document.createElement("script");
    script.textContent = code;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  // Update this method in src/utils/network.ts
  async fetchFragment(
    endpoint: string,
    data?: Record<string, string>, // Add this optional parameter
  ): Promise<string> {
    const url = endpoint.startsWith("http") ? endpoint : `/vtop/${endpoint}`;

    const body = new URLSearchParams();
    body.append("_csrf", this.csrf);
    body.append("authorizedID", this.authorizedID);
    body.append("x", new Date().toUTCString()); // Browser cache-buster

    // Append custom parameters if they exist
    if (data) {
      Object.entries(data).forEach(([key, value]) => body.append(key, value));
    }

    const res = await this.rateLimitedFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: body,
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    return text;
  }

  async getDigitalAssignmentLanding(): Promise<string> {
    const sidebarLinks = Array.from(document.querySelectorAll("a"));
    const daLink = sidebarLinks.find(
      (l) =>
        l.textContent?.includes("Digital Assignment Upload") ||
        l.getAttribute("onclick")?.includes("StudentDA"),
    );

    if (daLink) {
      daLink.click();
      await this.waitForLegacyLoad();
    } else {
      if (!document.getElementById("semesterSubId")) {
        const html = await this.fetchFragment("examinations/StudentDA");
        const container = document.getElementById("main-section");
        if (container) {
          container.replaceChildren();
          const doc = new DOMParser().parseFromString(html, "text/html");
          Array.from(doc.body.childNodes).forEach((node) => container.appendChild(node.cloneNode(true)));
        }
      }
    }
    return document.documentElement.outerHTML;
  }

  async getDigitalAssignmentCourses(semesterSubId: string): Promise<string> {
    const select = document.getElementById(
      "semesterSubId",
    ) as HTMLSelectElement;
    if (!select) {
      await this.getDigitalAssignmentLanding();
    }

    this.injectScript(`
        (function() {
            var select = document.getElementById('semesterSubId');
            if (select) {
                select.value = '${semesterSubId}';
            
                select.dispatchEvent(new Event('change', { bubbles: true }));
                
            
                if (typeof dAOnChange === 'function') {
                    dAOnChange();
                } else if (window.jQuery) {
                
                    window.jQuery('#semesterSubId').trigger('change');
                }
            }
        })();
    `);

    await this.waitForLegacyLoad();
    return document.documentElement.outerHTML;
  }

  async getDigitalAssignmentDetails(classId: string): Promise<string> {
    this.injectScript(`
        (function() {
        
            var buttons = document.querySelectorAll('button');
            for (var i = 0; i < buttons.length; i++) {
                var onClick = buttons[i].getAttribute('onclick');
                if (onClick && onClick.indexOf('${classId}') !== -1) {
                    buttons[i].click();
                    break;
                }
            }
        })();
    `);

    await this.waitForLegacyLoad();
    return document.documentElement.outerHTML;
  }

  async getDAUploadPage(
    classId: string,
    assignmentCode: string,
  ): Promise<string> {
    this.injectScript(`
        (function() {
            var buttons = document.querySelectorAll('button');
            for (var i = 0; i < buttons.length; i++) {
                var onClick = buttons[i].getAttribute('onclick');
            
                if (onClick && onClick.indexOf('processDigitalAssignmentUpload') !== -1 && onClick.indexOf('${assignmentCode}') !== -1) {
                    buttons[i].click();
                    break;
                }
            }
        })();
    `);

    await this.waitForLegacyLoad();
    return document.documentElement.outerHTML;
  }

  async uploadDA(action: string, formData: FormData): Promise<boolean> {
    const origin = typeof window !== "undefined" && window.location.origin.includes("vit.ac.in") ? window.location.origin : "https://vtop.vit.ac.in";
    const path = action.startsWith("http")
      ? action
      : action.startsWith("/")
        ? `${origin}${action}`
        : `${origin}/vtop/${action}`;

    const response = await this.rateLimitedFetch(path, {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      body: formData,
    });
    return response.ok;
  }

  async downloadQP(classId: string, code: string, defaultFilename?: string) {
    await this.downloadWithBlob(
      "examinations/doDownloadQuestion/",
      {
        code: code,
        classIdNumber: classId,
      },
      defaultFilename || `${classId}_${code}_QuestionPaper.pdf`,
    );
  }

  async downloadStudentDA(classId: string, code: string, defaultFilename?: string) {
    await this.downloadWithBlob(
      "examinations/downloadSTudentDA/",
      {
        code1: code,
        classId1: classId,
      },
      defaultFilename || `${classId}_${code}_Submission.pdf`,
    );
  }

  private async downloadWithBlob(
    endpoint: string,
    params: Record<string, string>,
    defaultFilename = "download.pdf",
  ) {
    const origin = typeof window !== "undefined" && window.location.origin.includes("vit.ac.in") ? window.location.origin : "https://vtop.vit.ac.in";
    const url = `${origin}/vtop/${endpoint}`;
    const body = new URLSearchParams();

    const domCsrf = document.querySelector(
      'input[name="_csrf"]',
    ) as HTMLInputElement;
    const domAuth = document.querySelector(
      'input[name="authorizedID"]',
    ) as HTMLInputElement;

    body.append("_csrf", domCsrf?.value || this.csrf);
    body.append("authorizedID", domAuth?.value || this.authorizedID);

    Object.entries(params).forEach(([key, value]) => body.append(key, value));

    try {
      const response = await this.rateLimitedFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: body,
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;

      const disposition = response.headers.get("Content-Disposition");
      let filename = defaultFilename;
      if (disposition && disposition.includes("filename=")) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
          disposition,
        );
        if (matches?.[1]) filename = matches[1].replace(/['"]/g, "");
      }
      a.download = filename;

      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }, 1000);
    } catch (e) {
      console.error("Download Error:", e);
      showAlertDialog({
        title: "Download Failed",
        message: "Failed to download file. Please check console.",
      });
    }
  }

  // ── Late Hour Permission ──────────────────────────────────────────────────

  /** Step 1 & 2: Initialize Late Hour session and get Request Form with School options */
  async getLateHourInit(): Promise<string> {
    try {
      // Warm up menu context
      await this.fetchVtopApi("hostels/late/hour/student/request/1", {
        verifyMenu: "true",
      });
    } catch (_) {}
    return this.fetchVtopApi("hostels/late/hour/student/request/2", {
      apply: "",
      form: "undefined",
      control: "apply",
    });
  }

  /** Step 3: Get faculties for school (costCentreId) */
  async getLateHourFaculties(costCentreId: string): Promise<string> {
    return this.fetchVtopApi("hostels/late/hour/student/request/3", {
      costCentreId,
      form: "undefined",
      control: "costCentreId",
    });
  }

  /** Step 4: Academic blocks for roomTypeId (Lab, Class Room, etc.) */
  async getLateHourAcademicBlocks(params: {
    costCentreId: string;
    appliedTo: string;
    roomTypeId: string;
  }): Promise<string> {
    return this.fetchVtopApi("hostels/late/hour/student/request/4", {
      costCentreId: params.costCentreId,
      appliedTo: params.appliedTo,
      roomTypeId: params.roomTypeId,
      lateHourEventId: "",
      details: "",
      lateHourFromDate: "",
      fromTime: "",
      lateHourToDate: "",
      toTime: "",
      form: "LateHourRequestForm",
      control: "roomTypeId",
    });
  }

  /** Step 5: Venues for buildingId */
  async getLateHourVenues(params: {
    costCentreId: string;
    appliedTo: string;
    roomTypeId: string;
    buildingId: string;
  }): Promise<string> {
    return this.fetchVtopApi("hostels/late/hour/student/request/5", {
      costCentreId: params.costCentreId,
      appliedTo: params.appliedTo,
      roomTypeId: params.roomTypeId,
      buildingId: params.buildingId,
      venue: "",
      lateHourEventId: "",
      details: "",
      lateHourFromDate: "",
      fromTime: "",
      lateHourToDate: "",
      toTime: "",
      form: "LateHourRequestForm",
      control: "buildingId",
    });
  }

  /** Step 6: Get time slots and date block */
  async getLateHourDateBlock(params: {
    costCentreId: string;
    appliedTo: string;
    roomTypeId: string;
    buildingId?: string;
    venue?: string;
    lateHourEventId: string;
    details?: string;
    lateHourFromDate?: string;
    fromTime?: string;
    lateHourToDate?: string;
    toTime?: string;
  }): Promise<string> {
    const payload: Record<string, string> = {
      costCentreId: params.costCentreId,
      appliedTo: params.appliedTo,
      roomTypeId: params.roomTypeId,
      lateHourEventId: params.lateHourEventId,
      details: params.details || "",
      lateHourFromDate: params.lateHourFromDate || "",
      fromTime: params.fromTime || "",
      lateHourToDate: params.lateHourToDate || "",
      toTime: params.toTime || "",
      form: "LateHourRequestForm",
      control: "lateHourEventId",
    };

    if (params.buildingId) payload.buildingId = params.buildingId;
    if (params.venue) payload.venue = params.venue;

    return this.fetchVtopApi("hostels/late/hour/student/request/6", payload);
  }

  /** Step 7: Get To Time options based on selected From Time */
  async getLateHourToTimeOptions(params: {
    costCentreId: string;
    appliedTo: string;
    roomTypeId: string;
    buildingId?: string;
    venue?: string;
    lateHourEventId: string;
    details?: string;
    lateHourFromDate: string;
    fromTime: string;
    lateHourToDate?: string;
  }): Promise<string> {
    const payload: Record<string, string> = {
      costCentreId: params.costCentreId,
      appliedTo: params.appliedTo,
      roomTypeId: params.roomTypeId,
      lateHourEventId: params.lateHourEventId,
      details: params.details || "",
      lateHourFromDate: params.lateHourFromDate,
      fromTime: params.fromTime,
      lateHourToDate: params.lateHourToDate || "",
      toTime: "",
      form: "LateHourRequestForm",
      control: "fromTime",
    };

    if (params.buildingId) payload.buildingId = params.buildingId;
    if (params.venue) payload.venue = params.venue;

    return this.fetchVtopApi("hostels/late/hour/student/request/7", payload);
  }

  /** Step 8: Submit Late Hour Request */
  async submitLateHourRequest(params: {
    costCentreId: string;
    appliedTo: string;
    roomTypeId: string;
    buildingId?: string;
    venue?: string;
    lateHourEventId: string;
    details: string;
    lateHourFromDate: string;
    fromTime: string;
    lateHourToDate: string;
    toTime: string;
  }): Promise<string> {
    const payload: Record<string, string> = {
      costCentreId: params.costCentreId,
      appliedTo: params.appliedTo,
      roomTypeId: params.roomTypeId,
      lateHourEventId: params.lateHourEventId,
      details: params.details,
      lateHourFromDate: params.lateHourFromDate,
      fromTime: params.fromTime,
      lateHourToDate: params.lateHourToDate,
      toTime: params.toTime,
      submitButton1: "",
      form: "LateHourRequestForm",
      control: "submitButton1",
    };

    if (params.buildingId) payload.buildingId = params.buildingId;
    if (params.venue) payload.venue = params.venue;

    return this.fetchVtopApi("hostels/late/hour/student/request/8", payload);
  }

  /** Step 9: Get Late Hour status list (cached) */
  async getLateHourStatus(forceRefresh = false): Promise<string> {
    return this.fetchWithCache(
      "late_hour_status",
      () =>
        this.fetchVtopApi("hostels/late/hour/student/request/9", {
          status: "",
          form: "undefined",
          control: "status",
        }),
      forceRefresh,
    );
  }

  /** Step 10: Cancel Late Hour Request */
  async cancelLateHourRequest(lateHourId: string): Promise<string> {
    return this.fetchVtopApi("hostels/late/hour/student/request/10", {
      cancelButton: "",
      lateHourId,
      form: "undefined",
      control: "cancelButton",
    });
  }

  /** Step 11: Permissions history (cached) */
  async getLateHourHistory(forceRefresh = false): Promise<string> {
    return this.fetchWithCache(
      "late_hour_history",
      () =>
        this.fetchVtopApi("hostels/late/hour/student/request/11", {
          history: "",
          form: "undefined",
          control: "history",
        }),
      forceRefresh,
    );
  }
}
