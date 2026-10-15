/**
 * Network transport bridge for VTOP requests.
 * Routes requests through:
 * 1. Native Android OkHttp Bridge (bypasses CORS in Android WebView)
 * 2. Standard fetch (browser extension or server/test environment)
 */

export interface VtopRequestOptions {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  followRedirects?: boolean;
  timeoutMs?: number;
}

export interface VtopResponse {
  status: number;
  headers: Record<string, string>;
  /** Populated by the Android bridge only; Set-Cookie is a forbidden fetch header. */
  setCookies: string[];
  /** Response body as text. Empty when isBinaryImage is true. */
  body: string;
  /** Base64 of the raw bytes. Populated only when isBinaryImage is true. */
  bodyBase64: string;
  isBinaryImage: boolean;
  imageMime: string;
  url: string;
}

export function isNativeAndroidBridgeAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as any).VtopNativeBridge && typeof (window as any).VtopNativeBridge.request === "function")
  );
}

/**
 * True when the request runs from a content script sitting on a live VTOP page.
 *
 * Same-origin requests get the browser's own JSESSIONID/SERVERID cookies, so the
 * Cookie header is a forbidden no-op. More importantly `redirect: "manual"`
 * resolves to an opaque redirect there — status 0, no Location header — which
 * would break the whole login state machine, so redirects must be followed.
 */
export function isLiveVtopContext(): boolean {
  try {
    return /(^|\.)vtop(cc)?\.vit\.ac\.in$/.test(window.location.hostname);
  } catch {
    return false;
  }
}

/**
 * True when this context is a plain web page rather than an extension surface.
 *
 * getretop.web.app is an ordinary web origin: VTOP sends no CORS headers, so it
 * can never reach VTOP, and the PWA is offline-only by design. There is
 * deliberately no bridge for it — see agents.md trap 8.
 */
export function isWebPageContext(): boolean {
  try {
    const h = window.location.hostname;
    return h.endsWith("web.app") || h === "localhost" || h === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Ambient-cookie contexts: the browser owns the session itself.
 *
 * Only same-origin VTOP pages qualify. Extension pages get host_permissions and
 * therefore bypass CORS, but they run on a different origin, so they keep the
 * cookie-jar handshake.
 */
export function isAmbientSessionContext(): boolean {
  return isLiveVtopContext();
}

export async function executeVtopRequest(options: VtopRequestOptions): Promise<VtopResponse> {
  const method = (options.method || "GET").toUpperCase() as "GET" | "POST";
  const timeoutMs = options.timeoutMs ?? 30000;

  // 1. Android Native OkHttp Bridge
  if (isNativeAndroidBridgeAvailable()) {
    try {
      const rawResult = (window as any).VtopNativeBridge.request(
        JSON.stringify({
          url: options.url,
          method,
          headers: options.headers || {},
          body: options.body || null,
          followRedirects: Boolean(options.followRedirects),
        })
      );

      const parsed = JSON.parse(rawResult);
      if (parsed.error) {
        throw new Error(parsed.message || "Native Android request failed");
      }

      return {
        status: parsed.status,
        headers: parsed.headers || {},
        setCookies: parsed.setCookies || [],
        body: parsed.body || "",
        bodyBase64: parsed.bodyBase64 || "",
        isBinaryImage: Boolean(parsed.isBinaryImage),
        imageMime: parsed.imageMime || "",
        url: parsed.url || options.url,
      };
    } catch (e: any) {
      throw new Error(`[VtopNativeBridge] ${e?.message || String(e)}`);
    }
  }

  // 2. Web or Extension Fetch
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Guard rail: a plain web origin cannot reach VTOP at all. Fail with an
    // actionable message instead of an opaque CORS "TypeError: Failed to fetch".
    if (isWebPageContext()) {
      throw new Error(
        "Live VTOP is not available on this page. Sign in on vtop.vit.ac.in — cached data syncs here automatically.",
      );
    }

    const ambient = isAmbientSessionContext();
    const fetchHeaders: Record<string, string> = {
      ...(options.headers || {}),
    };
    if (ambient) {
      delete fetchHeaders["Cookie"];
      delete fetchHeaders["User-Agent"];
    }

    const response = await fetch(options.url, {
      method,
      headers: fetchHeaders,
      body: method === "POST" ? options.body : undefined,
      redirect: ambient || options.followRedirects ? "follow" : "manual",
      credentials: ambient ? "include" : undefined,
      signal: controller.signal,
    });

    const headers: Record<string, string> = {};
    const setCookies: string[] = [];

    response.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
      if (key.toLowerCase() === "set-cookie") {
        setCookies.push(val);
      }
    });

    const contentType = headers["content-type"] || "";
    const isBinaryImage = contentType.startsWith("image/");

    // /vtop/get/new/captcha answers with raw image bytes on some deployments and
    // with HTML containing a data URI on others. Decoding bytes as text corrupts
    // the image, so branch on Content-Type and keep both representations.
    if (isBinaryImage) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      return {
        status: response.status,
        headers,
        setCookies,
        body: "",
        bodyBase64: bytesToBase64(bytes),
        isBinaryImage: true,
        imageMime: contentType.split(";")[0],
        url: response.url || options.url,
      };
    }

    const body = await response.text();
    return {
      status: response.status,
      headers,
      setCookies,
      body,
      bodyBase64: "",
      isBinaryImage: false,
      imageMime: "",
      url: response.url || options.url,
    };
  } finally {
    clearTimeout(timer);
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  // Chunked to stay under the argument limit of String.fromCharCode.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + 0x8000)),
    );
  }
  return btoa(binary);
}

export function clearNativeCookies(): void {
  if (isNativeAndroidBridgeAvailable()) {
    try {
      (window as any).VtopNativeBridge.clearCookies();
    } catch (e) {
      console.warn("Failed to clear native cookies", e);
    }
  }
}
