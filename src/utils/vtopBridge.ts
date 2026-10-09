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
  setCookies: string[];
  body: string;
  url: string;
}

export function isNativeAndroidBridgeAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as any).VtopNativeBridge && typeof (window as any).VtopNativeBridge.request === "function")
  );
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
    const fetchHeaders: Record<string, string> = {
      ...(options.headers || {}),
    };

    const response = await fetch(options.url, {
      method,
      headers: fetchHeaders,
      body: method === "POST" ? options.body : undefined,
      redirect: options.followRedirects ? "follow" : "manual",
      signal: controller.signal,
    });

    const body = await response.text();
    const headers: Record<string, string> = {};
    const setCookies: string[] = [];

    response.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
      if (key.toLowerCase() === "set-cookie") {
        setCookies.push(val);
      }
    });

    return {
      status: response.status,
      headers,
      setCookies,
      body,
      url: response.url || options.url,
    };
  } finally {
    clearTimeout(timer);
  }
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
