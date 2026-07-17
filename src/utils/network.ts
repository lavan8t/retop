import {
  getCachedData,
  setCachedData,
  getCachedDataWithTimestamp,
} from "./cache";
import { useAppStore } from "../store/appStore";

export class VTOPNetwork {
  public csrf: string;
  public authorizedID: string;

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
    const urlStr =
      typeof input === "string"
        ? input
        : (input as any).url || input.toString();
    useAppStore.getState().logNetworkRequest(urlStr);
    await this.enforceRateLimit();
    return fetch(input, init);
  }

  constructor(csrf: string, authorizedID: string) {
    this.csrf = csrf;
    this.authorizedID = authorizedID;
  }

  public updateTokens(csrf?: string | null, authorizedID?: string | null) {
    if (csrf) this.csrf = csrf;
    if (authorizedID) this.authorizedID = authorizedID;
  }

  /**
   * Fetches the latest VTOP native captcha image source.
   */
  async getNativeCaptcha(): Promise<{ captchaImage: string }> {
    try {
      const response = await this.rateLimitedFetch("/vtop/get/new/captcha", {
        method: "GET",
        headers: {
          "Close-Requested-With": "XMLHttpRequest",
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

  public async fetchWithCache(
    key: string,
    fetcher: () => Promise<string>,
    forceRefresh = false,
    customExpiryMs?: number,
  ): Promise<string> {
    const stableId =
      localStorage.getItem("retop_lastAuthId") || this.authorizedID;
    const userScopedKey = `${stableId}_${key}`;

    const doFetchAndCache = async () => {
      try {
        useAppStore.getState().logNetworkRequest(key, userScopedKey);
        const data = await fetcher();

        const isErrorPage =
          data.includes("<title>404") ||
          data.includes("HTTP Status 404") ||
          data.includes("404 Not Found") ||
          data.includes("404 - File or directory not found") ||
          data.includes("<title>Error</title>");

        if (
          data &&
          data.length > 50 &&
          !data.includes("Invalid") &&
          !isErrorPage
        ) {
          setCachedData(userScopedKey, data);
        }
        return data;
      } catch (err) {
        throw err;
      } finally {
        this.inFlightRequests.delete(userScopedKey);
      }
    };

    const cachedInfo = await getCachedDataWithTimestamp<string>(userScopedKey);

    if (cachedInfo && cachedInfo.data) {
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

      const isOffline = (window as any).__RETOP_OFFLINE__;

      if (!isOffline && (forceRefresh || age > EXPIRY_MS)) {
        if (!this.inFlightRequests.has(userScopedKey)) {
          console.log(`[VTOP Network] BG Fetch Triggered: ${userScopedKey}`);
          const promise = doFetchAndCache();
          this.inFlightRequests.set(userScopedKey, promise);
          promise.catch((e) =>
            console.warn(`BG Fetch Failed: ${userScopedKey}`, e),
          );
        }
      }

      return cachedInfo.data;
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
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode?.replaceChild(newScript, oldScript);
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
          "Close-Requested-With": "XMLHttpRequest",
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
    form.action = "/vtop/courseSyllabusDownload1";
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
    const cacheKey = `tt_sem_${semesterSubId}`;
    return this.fetchWithCache(
      cacheKey,
      async () => {
        const url = "academics/common/StudentTimeTable";
        const body = new URLSearchParams();
        body.append("semesterSubId", semesterSubId);
        body.append("authorizedID", this.authorizedID);
        body.append("x", new Date().toUTCString());

        const response = await this.rateLimitedFetch(`/vtop/${url}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
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

  async getMarksView(forceRefresh = false): Promise<string> {
    return this.fetchFragment("examinations/StudentMarkView");
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
            "Close-Requested-With": "XMLHttpRequest",
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
        // Set active semester session
        const sessionBody = new URLSearchParams();
        sessionBody.append("_csrf", this.csrf);
        sessionBody.append("authorizedID", this.authorizedID);
        sessionBody.append("semesterSubId", semesterSubId);

        await this.rateLimitedFetch(`/vtop/examinations/StudentDA`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          body: sessionBody,
        });

        // Fetch courses for semester
        const url = "examinations/doDigitalAssignment";
        const body = new URLSearchParams();
        body.append("_csrf", this.csrf);
        body.append("authorizedID", this.authorizedID);
        body.append("semesterSubId", semesterSubId);

        const response = await this.rateLimitedFetch(`/vtop/${url}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
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

  async getDAForCourse(
    classId: string,
    forceRefresh = false,
    isPastSemester = false,
  ): Promise<string> {
    const cacheKey = `da_class_${classId}`;
    return this.fetchWithCache(
      cacheKey,
      async () => {
        const url = "examinations/processDigitalAssignment";
        const body = new URLSearchParams();
        body.append("_csrf", this.csrf);
        body.append("authorizedID", this.authorizedID);
        body.append("classId", classId);
        body.append("x", new Date().toUTCString());

        const response = await this.rateLimitedFetch(`/vtop/${url}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
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

  async getDAUploadView(classId: string, code: string): Promise<string> {
    const url = "examinations/processDigitalAssignmentUpload";
    const body = new URLSearchParams();
    body.append("_csrf", this.csrf);
    body.append("authorizedID", this.authorizedID);
    body.append("classId", classId);
    body.append("mode", code);
    body.append("x", new Date().toUTCString());

    const response = await this.rateLimitedFetch(`/vtop/${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: body,
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    return await response.text();
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
    return await response.text();
  }

  async getGradesView(forceRefresh = false): Promise<string> {
    return this.fetchFragment("examinations/examGradeView/StudentGradeView");
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
          "Close-Requested-With": "XMLHttpRequest",
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
          "Close-Requested-With": "XMLHttpRequest",
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
        "Close-Requested-With": "XMLHttpRequest",
      },
      body: body,
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    return await response.text();
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
            "Close-Requested-With": "XMLHttpRequest",
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
          "Close-Requested-With": "XMLHttpRequest",
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
        "Close-Requested-With": "XMLHttpRequest",
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
        if (container) container.innerHTML = html;
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
    const path = action.startsWith("http")
      ? action
      : action.startsWith("/")
        ? `https://vtop.vit.ac.in${action}`
        : `https://vtop.vit.ac.in/vtop/${action}`;

    const response = await this.rateLimitedFetch(path, {
      method: "POST",
      headers: { "Close-Requested-With": "XMLHttpRequest" },
      body: formData,
    });
    return response.ok;
  }

  async downloadQP(code: string, classId: string) {
    await this.downloadWithBlob("examinations/doDownloadQuestion/", {
      code: code,
      classIdNumber: classId,
    });
  }

  async downloadStudentDA(classId: string, code: string) {
    await this.downloadWithBlob("examinations/downloadSTudentDA/", {
      code1: code,
      classId1: classId,
    });
  }

  private async downloadWithBlob(
    endpoint: string,
    params: Record<string, string>,
  ) {
    const url = `https://vtop.vit.ac.in/vtop/${endpoint}`;
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
          "Close-Requested-With": "XMLHttpRequest",
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
      let filename = "download.pdf";
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
      }, 100);
    } catch (e) {
      console.error("Download Error:", e);
      alert("Failed to download file. Please check console.");
    }
  }
}
