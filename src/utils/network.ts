import { getCachedData, setCachedData } from "./cache";

export class VTOPNetwork {
  public csrf: string;
  public authorizedID: string;

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
      const response = await fetch("/vtop/get/new/captcha", {
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
  ): Promise<string> {
    // Automatically scope all cache keys to the current user to prevent data leaks on new logins
    const userScopedKey = `${this.authorizedID}_${key}`;

    if (!forceRefresh) {
      const cached = await getCachedData<string>(userScopedKey);
      if (cached) {
        // Stale-while-revalidate: return cached but fetch latest in background to update cache
        fetcher().then(data => {
          if (data && data.length > 50 && !data.includes("Invalid")) {
            setCachedData(userScopedKey, data);
          }
        }).catch(err => {
          console.error(`[VTOP Network] Background cache update failed for ${userScopedKey}`, err);
        });

        return cached;
      }
    }

    console.log(`[VTOP Network] Fetching: ${userScopedKey}`);
    try {
      const data = await fetcher();

      if (data && data.length > 50 && !data.includes("Invalid")) {
        setCachedData(userScopedKey, data);
      }
      return data;
    } catch (err) {
      console.error(`[VTOP Network] Failed: ${userScopedKey}`, err);
      throw err;
    }
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
    return this.fetchFragment("academics/common/Curriculum");
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

      const response = await fetch(`/vtop/${url}`, {
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

  async getMarksView(): Promise<string> {
    return this.fetchFragment("examinations/StudentMarkView");
  }

  async getStudentMarks(semesterSubId: string): Promise<string> {
    const cacheKey = `marks_data_${semesterSubId}`;

    return this.fetchWithCache(cacheKey, async () => {
      const url = "examinations/doStudentMarkView";
      const body = new URLSearchParams();
      body.append("_csrf", this.csrf);
      body.append("authorizedID", this.authorizedID);
      body.append("semesterSubId", semesterSubId);
      body.append("x", new Date().toUTCString());

      const response = await fetch(`/vtop/${url}`, {
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

  async getGradesView(): Promise<string> {
    return this.fetchFragment("examinations/examGradeView/StudentGradeView");
  }

  async getStudentGrades(semesterSubId: string): Promise<string> {
    const cacheKey = `grades_data_${semesterSubId}`;

    return this.fetchWithCache(cacheKey, async () => {
      const url = "examinations/examGradeView/doStudentGradeView";
      const body = new URLSearchParams();
      body.append("_csrf", this.csrf);
      body.append("authorizedID", this.authorizedID);
      body.append("semesterSubId", semesterSubId);
      body.append("x", new Date().toUTCString());

      const response = await fetch(`/vtop/${url}`, {
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

      const response = await fetch(`/vtop/${url}`, {
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

  async getGradeDetails(semesterSubId: string, courseId: string): Promise<string> {
    const url = "examinations/examGradeView/getGradeViewDetails";
    const body = new URLSearchParams();
    body.append("_csrf", this.csrf);
    body.append("authorizedID", this.authorizedID);
    body.append("semesterSubId", semesterSubId);
    body.append("courseId", courseId);
    body.append("x", new Date().toUTCString());

    const response = await fetch(`/vtop/${url}`, {
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

      const response = await fetch(
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

      const response = await fetch(`/vtop/${url}`, {
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

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Close-Requested-With": "XMLHttpRequest",
      },
      body: body,
    });

    return await res.text();
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

    const response = await fetch(path, {
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

  async downloadStudentDA(code: string, classId: string) {
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
      const response = await fetch(url, {
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
