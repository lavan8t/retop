/**
 * VTOP HTTP Client & State Machine.
 * Handles authentication negotiation, session cookies, and authenticated module requests.
 */

import { executeVtopRequest, clearNativeCookies, VtopResponse } from "./vtopBridge";

export type VtopCampus = "vellore" | "chennai";

export function getVtopBaseUrl(campus: VtopCampus = "vellore"): string {
  return campus === "chennai" ? "https://vtopcc.vit.ac.in" : "https://vtop.vit.ac.in";
}

export function extractJSessionId(setCookies: string[] | string | null | undefined): string | null {
  if (!setCookies) return null;
  const list = Array.isArray(setCookies) ? setCookies : [setCookies];
  for (const c of list) {
    const match = c.match(/JSESSIONID=([^;,\s]+)/);
    if (match) return match[1];
  }
  return null;
}

export function extractServerId(setCookies: string[] | string | null | undefined): string | null {
  if (!setCookies) return null;
  const list = Array.isArray(setCookies) ? setCookies : [setCookies];
  for (const c of list) {
    const match = c.match(/SERVERID=([^;,\s]+)/);
    if (match) return match[1];
  }
  return null;
}

export function extractCSRFToken(html: string): string | null {
  const inputMatch = html.match(/<input[^>]*name="_csrf"[^>]*value="([^"]+)"/i);
  if (inputMatch) return inputMatch[1];
  const metaMatch = html.match(/<meta[^>]*name="_csrf"[^>]*content="([^"]+)"/i);
  if (metaMatch) return metaMatch[1];
  const varMatch = html.match(/csrfValue\s*=\s*['"]([^'"]+)['"]/);
  if (varMatch) return varMatch[1];
  return null;
}

export function isSessionExpiredResponse(html: string): boolean {
  return (
    html.includes("vtop/open/page") ||
    html.includes("captchaStr") ||
    html.includes("prelogin/setup") ||
    html.includes("sessionExpiredCall") ||
    (html.includes("stdForm") && html.includes("empForm") && html.includes("parentForm")) ||
    html.includes("HTTP Status 404") ||
    html.includes("Your session has timed out")
  );
}

export interface CaptchaData {
  captchaImage: string;
  csrf: string;
  jsessionid: string;
  serverId: string | null;
}

export interface LoginParams {
  campus?: VtopCampus;
  username: string;
  password: string;
  captcha: string;
  csrf: string;
  jsessionid: string;
  serverId?: string | null;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  user?: {
    registrationNumber: string;
    name: string;
  };
  client?: VtopClient;
}

export class VtopClient {
  public campus: VtopCampus;
  public jsessionid: string;
  public serverId: string | null;
  public csrf: string;
  public registrationNumber: string;
  public studentName: string;

  constructor(options: {
    campus?: VtopCampus;
    jsessionid: string;
    serverId?: string | null;
    csrf: string;
    registrationNumber: string;
    studentName?: string;
  }) {
    this.campus = options.campus || "vellore";
    this.jsessionid = options.jsessionid;
    this.serverId = options.serverId || null;
    this.csrf = options.csrf;
    this.registrationNumber = options.registrationNumber;
    this.studentName = options.studentName || options.registrationNumber;
  }

  private get baseUrl(): string {
    return getVtopBaseUrl(this.campus);
  }

  private get cookieHeader(): string {
    let str = `JSESSIONID=${this.jsessionid}`;
    if (this.serverId) {
      str += `; SERVERID=${this.serverId}`;
    }
    return str;
  }

  private get standardHeaders(): Record<string, string> {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Cookie: this.cookieHeader,
      Origin: this.baseUrl,
      Referer: `${this.baseUrl}/vtop/content`,
    };
  }

  /**
   * Performs an authenticated POST request to VTOP and verifies session liveness.
   * Follows up to 3 redirects — VTOP uses 302s for verifyMenu navigation calls.
   */
  public async authenticatedPost(endpoint: string, bodyObj?: Record<string, string>): Promise<string> {
    const fullUrl = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    const payload = {
      ...(bodyObj || {}),
      nocache: Date.now().toString(),
    };

    const formBody = new URLSearchParams(payload).toString();

    const response = await executeVtopRequest({
      url: fullUrl,
      method: "POST",
      headers: {
        ...this.standardHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
      followRedirects: false,
    });

    const newJSession = extractJSessionId(response.setCookies);
    if (newJSession) this.jsessionid = newJSession;
    const newServerId = extractServerId(response.setCookies);
    if (newServerId) this.serverId = newServerId;

    // Follow redirects (VTOP uses 302 for verifyMenu navigation, not just session expiry)
    if (response.status === 302 || response.status === 301) {
      const location = response.headers["location"] || response.headers["Location"] || "";

      // Login/error redirect = real session expiry
      if (
        location.includes("/login") ||
        location.includes("/error") ||
        location.includes("open/page") ||
        location.includes("prelogin")
      ) {
        throw new Error("SESSION_EXPIRED");
      }

      // Navigation redirect — follow it with GET
      if (location) {
        const redirectUrl = location.startsWith("http") ? location : `${this.baseUrl}${location}`;
        const redirectResp = await executeVtopRequest({
          url: redirectUrl,
          method: "GET",
          headers: this.standardHeaders,
        });

        const rJSession = extractJSessionId(redirectResp.setCookies);
        if (rJSession) this.jsessionid = rJSession;
        const rServerId = extractServerId(redirectResp.setCookies);
        if (rServerId) this.serverId = rServerId;

        if (isSessionExpiredResponse(redirectResp.body)) {
          throw new Error("SESSION_EXPIRED");
        }

        const newCsrf = extractCSRFToken(redirectResp.body);
        if (newCsrf) this.csrf = newCsrf;

        return redirectResp.body;
      }

      throw new Error("SESSION_EXPIRED");
    }

    if (response.status !== 200) {
      throw new Error(`VTOP_ERROR: ${response.status}`);
    }

    if (isSessionExpiredResponse(response.body)) {
      throw new Error("SESSION_EXPIRED");
    }

    const newCsrf = extractCSRFToken(response.body);
    if (newCsrf) this.csrf = newCsrf;

    return response.body;
  }

  /**
   * Step 1 to 5: Initialize session cookies, establish prelogin setup, and retrieve CAPTCHA.
   */
  public static async getCaptcha(campus: VtopCampus = "vellore"): Promise<CaptchaData> {
    clearNativeCookies();
    const baseUrl = getVtopBaseUrl(campus);

    // Step 1: Open initial page
    const openPageResp = await executeVtopRequest({
      url: `${baseUrl}/vtop/open/page`,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      followRedirects: false,
    });

    let jsessionid = extractJSessionId(openPageResp.setCookies);
    let serverId = extractServerId(openPageResp.setCookies);

    if (!jsessionid) {
      throw new Error("Failed to initialize session with VTOP");
    }

    const initialCsrf = extractCSRFToken(openPageResp.body) || "";
    let cookieStr = serverId ? `JSESSIONID=${jsessionid}; SERVERID=${serverId}` : `JSESSIONID=${jsessionid}`;

    // Step 2: Prelogin setup
    const setupResp = await executeVtopRequest({
      url: `${baseUrl}/vtop/prelogin/setup`,
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: `${baseUrl}/vtop/open/page`,
        Cookie: cookieStr,
      },
      body: new URLSearchParams({
        flag: "VTOP",
        _csrf: initialCsrf,
      }).toString(),
      followRedirects: false,
    });

    const setupJSession = extractJSessionId(setupResp.setCookies);
    if (setupJSession) jsessionid = setupJSession;
    const setupServerId = extractServerId(setupResp.setCookies);
    if (setupServerId) serverId = setupServerId;
    cookieStr = serverId ? `JSESSIONID=${jsessionid}; SERVERID=${serverId}` : `JSESSIONID=${jsessionid}`;

    // Step 3: Follow redirect chain to login page
    let loginHtml = "";
    let currentUrl: string | null = setupResp.headers["location"] || null;
    let currentReferer = `${baseUrl}/vtop/prelogin/setup`;

    for (let hop = 0; hop < 3 && currentUrl; hop++) {
      const fullUrl = currentUrl.startsWith("http") ? currentUrl : `${baseUrl}${currentUrl}`;

      const hopResp = await executeVtopRequest({
        url: fullUrl,
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          Cookie: cookieStr,
          Referer: currentReferer,
        },
        followRedirects: false,
      });

      const hopJSession = extractJSessionId(hopResp.setCookies);
      if (hopJSession) jsessionid = hopJSession;
      const hopServerId = extractServerId(hopResp.setCookies);
      if (hopServerId) serverId = hopServerId;
      cookieStr = serverId ? `JSESSIONID=${jsessionid}; SERVERID=${serverId}` : `JSESSIONID=${jsessionid}`;

      if (hopResp.status === 302 || hopResp.status === 301) {
        currentReferer = fullUrl;
        currentUrl = hopResp.headers["location"] || null;
      } else {
        loginHtml = hopResp.body;
        currentUrl = null;
      }
    }

    // Step 4: Extract CSRF and CAPTCHA from login page
    const loginCsrf = extractCSRFToken(loginHtml);
    let effectiveCsrf = loginCsrf || initialCsrf;

    // Check if loginHtml already contains the CAPTCHA image
    const loginCaptchaMatch = loginHtml.match(/src=["'](data:image\/[^"']+)["']/i);
    let captchaImage = loginCaptchaMatch ? loginCaptchaMatch[1] : null;

    // Fallback: If loginHtml did not embed the captcha image, fetch it via /vtop/get/new/captcha
    if (!captchaImage) {
      const captchaResp = await executeVtopRequest({
        url: `${baseUrl}/vtop/get/new/captcha`,
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          Cookie: cookieStr,
          Referer: `${baseUrl}/vtop/login`,
        },
      });

      const fallbackMatch = captchaResp.body.match(/src=["'](data:image\/[^"']+)["']/i);
      captchaImage = fallbackMatch ? fallbackMatch[1] : null;

      const fallbackCsrf = extractCSRFToken(captchaResp.body);
      if (fallbackCsrf) effectiveCsrf = fallbackCsrf;

      const newJSession = extractJSessionId(captchaResp.setCookies);
      if (newJSession) jsessionid = newJSession;
      const newServerId = extractServerId(captchaResp.setCookies);
      if (newServerId) serverId = newServerId;
    }

    if (!captchaImage) {
      throw new Error("Unable to parse CAPTCHA image from VTOP response");
    }

    return {
      captchaImage,
      csrf: effectiveCsrf,
      jsessionid,
      serverId,
    };
  }

  /**
   * Refreshes the CAPTCHA for an existing session without tearing down session cookies.
   */
  public static async refreshCaptcha(
    campus: VtopCampus,
    jsessionid: string,
    serverId: string | null,
    csrf: string
  ): Promise<{ captchaImage: string; csrf: string; jsessionid: string; serverId: string | null }> {
    const baseUrl = getVtopBaseUrl(campus);
    let currentJSession = jsessionid;
    let currentServerId = serverId;
    let cookieStr = currentServerId
      ? `JSESSIONID=${currentJSession}; SERVERID=${currentServerId}`
      : `JSESSIONID=${currentJSession}`;

    const resp = await executeVtopRequest({
      url: `${baseUrl}/vtop/get/new/captcha`,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Cookie: cookieStr,
        Referer: `${baseUrl}/vtop/login`,
      },
    });

    const match = resp.body.match(/src=["'](data:image\/[^"']+)["']/i);
    const captchaImage = match ? match[1] : null;

    if (!captchaImage) {
      throw new Error("Unable to refresh CAPTCHA from VTOP response");
    }

    const newCsrf = extractCSRFToken(resp.body) || csrf;
    const newJSession = extractJSessionId(resp.setCookies);
    if (newJSession) currentJSession = newJSession;
    const newServerId = extractServerId(resp.setCookies);
    if (newServerId) currentServerId = newServerId;

    return {
      captchaImage,
      csrf: newCsrf,
      jsessionid: currentJSession,
      serverId: currentServerId,
    };
  }

  /**
   * Step 6 & 7: Submit credentials, process redirect or error response, and instantiate VtopClient.
   */
  public static async login(params: LoginParams): Promise<LoginResult> {
    const campus = params.campus || "vellore";
    const baseUrl = getVtopBaseUrl(campus);
    const username = params.username.trim().toUpperCase();

    let jsessionid = params.jsessionid;
    let serverId = params.serverId || null;
    let cookieStr = serverId ? `JSESSIONID=${jsessionid}; SERVERID=${serverId}` : `JSESSIONID=${jsessionid}`;

    const formBody = new URLSearchParams({
      _csrf: params.csrf,
      username,
      password: params.password,
      captchaStr: params.captcha.trim(),
    }).toString();

    const response = await executeVtopRequest({
      url: `${baseUrl}/vtop/login`,
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: baseUrl,
        Referer: `${baseUrl}/vtop/login`,
        Cookie: cookieStr,
      },
      body: formBody,
      followRedirects: false,
    });

    const postJSession = extractJSessionId(response.setCookies);
    if (postJSession) jsessionid = postJSession;
    const postServerId = extractServerId(response.setCookies);
    if (postServerId) serverId = postServerId;
    cookieStr = serverId ? `JSESSIONID=${jsessionid}; SERVERID=${serverId}` : `JSESSIONID=${jsessionid}`;

    let responseText = response.body;
    let currentCsrf = extractCSRFToken(responseText) || params.csrf;

    // Follow redirect if present
    if (response.status === 302 || response.status === 301) {
      const redirectUrl = response.headers["location"];

      if (redirectUrl?.includes("/login/error") || redirectUrl?.includes("/error")) {
        const fullErrUrl = redirectUrl.startsWith("http") ? redirectUrl : `${baseUrl}${redirectUrl}`;
        const errResp = await executeVtopRequest({
          url: fullErrUrl,
          method: "GET",
          headers: { Cookie: cookieStr },
        });
        const errHtml = errResp.body.toLowerCase();

        if (errHtml.includes("invalid captcha") || errHtml.includes("not match")) {
          return { success: false, message: "Invalid CAPTCHA. Please try again." };
        }
        if (
          errHtml.includes("invalid user") ||
          errHtml.includes("invalid password") ||
          errHtml.includes("user does not exist")
        ) {
          return { success: false, message: "Invalid username or password." };
        }
        if (errHtml.includes("locked") || errHtml.includes("disabled")) {
          return { success: false, message: "Account is disabled or locked." };
        }
        return { success: false, message: "Login failed. Please check your credentials." };
      }

      if (redirectUrl) {
        const fullTargetUrl = redirectUrl.startsWith("http") ? redirectUrl : `${baseUrl}${redirectUrl}`;
        const dashResp = await executeVtopRequest({
          url: fullTargetUrl,
          method: "GET",
          headers: {
            Cookie: cookieStr,
            Referer: `${baseUrl}/vtop/login`,
          },
        });

        const dashJSession = extractJSessionId(dashResp.setCookies);
        if (dashJSession) jsessionid = dashJSession;
        const dashServerId = extractServerId(dashResp.setCookies);
        if (dashServerId) serverId = dashServerId;

        responseText = dashResp.body;
        const dashCsrf = extractCSRFToken(responseText);
        if (dashCsrf) currentCsrf = dashCsrf;
      }
    }

    const lower = responseText.toLowerCase();

    // Check specific error messages
    if (lower.includes("invalid captcha") || lower.includes("captcha not match")) {
      return { success: false, message: "Invalid CAPTCHA. Please try again." };
    }
    if (
      lower.includes("invalid username") ||
      lower.includes("invalid password") ||
      lower.includes("user does not exist")
    ) {
      return { success: false, message: "Invalid username or password." };
    }
    if (lower.includes("account locked") || lower.includes("user disabled")) {
      return { success: false, message: "Account is disabled or locked." };
    }

    // Success detection
    const isSuccess =
      response.status === 302 ||
      responseText.includes("dashboard") ||
      responseText.includes("Welcome") ||
      responseText.includes("authorizedIDX") ||
      responseText.includes("authorizedID");

    if (isSuccess) {
      let regNo = "";
      const regMatch1 = responseText.match(/id="authorizedIDX"[^>]*value="([^"]+)"/i);
      if (regMatch1) regNo = regMatch1[1].trim();

      if (!regNo) {
        const regMatch2 = responseText.match(/id="authorizedID"[^>]*value="([^"]+)"/i);
        if (regMatch2) regNo = regMatch2[1].trim();
      }

      if (!regNo) {
        const regMatch3 = responseText.match(/(\d{2}[A-Z]{2,5}\d{4,5})\s*\(STUDENT\)/i);
        if (regMatch3) regNo = regMatch3[1].trim();
      }

      if (!regNo) {
        regNo = username;
      }

      let studentName = "";
      const nameMatch = responseText.match(/navbar-text[^>]*>\s*([A-Za-z0-9]+)\s*-\s*([^<]+)</i);
      if (nameMatch && nameMatch[2]) {
        studentName = nameMatch[2].trim();
      }

      const client = new VtopClient({
        campus,
        jsessionid,
        serverId,
        csrf: currentCsrf,
        registrationNumber: regNo,
        studentName: studentName || regNo,
      });

      return {
        success: true,
        user: {
          registrationNumber: regNo,
          name: studentName || regNo,
        },
        client,
      };
    }

    return {
      success: false,
      message: "Login failed. Please verify credentials and try again.",
    };
  }

  /* ── Authenticated VTOP Module Endpoints ── */

  /**
   * Fetches the student attendance page to parse semester options.
   */
  public async getSemesters(): Promise<string> {
    return this.authenticatedPost("/vtop/academics/common/StudentAttendance", {
      verifyMenu: "true",
      authorizedID: this.registrationNumber,
      _csrf: this.csrf,
    });
  }

  /**
   * Fetches detailed student attendance HTML for a given semesterSubId.
   */
  public async getAttendance(semesterSubId: string): Promise<string> {
    await this.authenticatedPost("/vtop/academics/common/StudentAttendance", {
      verifyMenu: "true",
      authorizedID: this.registrationNumber,
      _csrf: this.csrf,
    });

    return this.authenticatedPost("/vtop/processViewStudentAttendance", {
      _csrf: this.csrf,
      semesterSubId,
      authorizedID: this.registrationNumber,
      x: new Date().toUTCString(),
    });
  }

  /**
   * Fetches timetable HTML for a given semesterSubId.
   */
  public async getTimetable(semesterSubId: string): Promise<string> {
    await this.authenticatedPost("/vtop/academics/common/StudentTimeTable", {
      verifyMenu: "true",
      authorizedID: this.registrationNumber,
      _csrf: this.csrf,
    });

    return this.authenticatedPost("/vtop/processViewTimeTable", {
      semesterSubId,
      authorizedID: this.registrationNumber,
      _csrf: this.csrf,
      x: new Date().toUTCString(),
    });
  }

  /**
   * Fetches student internal marks HTML for a given semesterSubId.
   */
  public async getMarks(semesterSubId: string): Promise<string> {
    return this.authenticatedPost("/vtop/examinations/doStudentMarkView", {
      semesterSubId,
      authorizedID: this.registrationNumber,
      _csrf: this.csrf,
    });
  }

  /**
   * Fetches grade history HTML for a given semesterSubId.
   */
  public async getGrades(semesterSubId: string): Promise<string> {
    await this.authenticatedPost("/vtop/examinations/examGradeView/StudentGradeHistory", {
      verifyMenu: "true",
      authorizedID: this.registrationNumber,
      _csrf: this.csrf,
    });

    return this.authenticatedPost("/vtop/examinations/examGradeView/doStudentGradeView", {
      semesterSubId,
      authorizedID: this.registrationNumber,
      _csrf: this.csrf,
    });
  }

  /**
   * Fetches complete student profile HTML.
   */
  public async getProfile(): Promise<string> {
    return this.authenticatedPost("/vtop/studentsRecord/StudentProfileAllView", {
      verifyMenu: "true",
      authorizedID: this.registrationNumber,
      _csrf: this.csrf,
      x: new Date().toUTCString(),
    });
  }

  /**
   * Fetches exam schedule HTML for a given semesterSubId.
   */
  public async getExamSchedule(semesterSubId: string): Promise<string> {
    return this.authenticatedPost("/vtop/examinations/doSearchExamScheduleForStudent", {
      semesterSubId,
      authorizedID: this.registrationNumber,
      _csrf: this.csrf,
    });
  }

  /**
   * Fetches digital assignment listing HTML for a given semesterSubId.
   */
  public async getDigitalAssignments(semesterSubId: string): Promise<string> {
    return this.authenticatedPost("/vtop/examinations/doDigitalAssignment", {
      semesterSubId,
      authorizedID: this.registrationNumber,
      _csrf: this.csrf,
    });
  }

  /**
   * Fetches full grade history HTML (contains CGPA/credits summary).
   */
  public async getGradeHistory(): Promise<string> {
    return this.authenticatedPost("/vtop/examinations/examGradeView/StudentGradeHistory", {
      verifyMenu: "true",
      authorizedID: this.registrationNumber,
      _csrf: this.csrf,
    });
  }
}
