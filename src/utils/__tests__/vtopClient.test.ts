import { describe, expect, it } from "bun:test";
import {
  extractCSRFToken,
  extractJSessionId,
  extractServerId,
  getVtopBaseUrl,
  isSessionExpiredResponse,
} from "../vtopClient";

describe("vtopClient unit helpers", () => {
  it("resolves base URLs for campuses correctly", () => {
    expect(getVtopBaseUrl("vellore")).toBe("https://vtop.vit.ac.in");
    expect(getVtopBaseUrl("chennai")).toBe("https://vtopcc.vit.ac.in");
    expect(getVtopBaseUrl()).toBe("https://vtop.vit.ac.in");
  });

  it("extracts JSESSIONID and SERVERID from cookie arrays and headers", () => {
    const cookiesArray = [
      "JSESSIONID=ABCD1234EFGH5678.vtop_inst; Path=/vtop; Secure; HttpOnly",
      "SERVERID=s1|Z1234; Path=/",
    ];
    expect(extractJSessionId(cookiesArray)).toBe("ABCD1234EFGH5678.vtop_inst");
    expect(extractServerId(cookiesArray)).toBe("s1|Z1234");

    const singleString = "JSESSIONID=XYZ999; SERVERID=s2";
    expect(extractJSessionId(singleString)).toBe("XYZ999");
    expect(extractServerId(singleString)).toBe("s2");

    expect(extractJSessionId(null)).toBeNull();
    expect(extractServerId(undefined)).toBeNull();
  });

  it("extracts CSRF tokens from input tags, meta tags, and javascript variables", () => {
    const inputHtml = `<form><input type="hidden" name="_csrf" value="csrf-token-abc-123" /></form>`;
    expect(extractCSRFToken(inputHtml)).toBe("csrf-token-abc-123");

    const metaHtml = `<html><head><meta name="_csrf" content="csrf-token-meta-456" /></head></html>`;
    expect(extractCSRFToken(metaHtml)).toBe("csrf-token-meta-456");

    const jsVarHtml = `<script>var csrfValue = 'csrf-token-var-789';</script>`;
    expect(extractCSRFToken(jsVarHtml)).toBe("csrf-token-var-789");

    expect(extractCSRFToken("<div>No token here</div>")).toBeNull();
  });

  it("detects expired session HTML patterns accurately", () => {
    expect(isSessionExpiredResponse("<html>Redirecting to vtop/open/page</html>")).toBe(true);
    expect(isSessionExpiredResponse("<div>sessionExpiredCall()</div>")).toBe(true);
    expect(isSessionExpiredResponse("<h3>HTTP Status 404</h3>")).toBe(true);
    expect(isSessionExpiredResponse("<p>Your session has timed out</p>")).toBe(true);
    expect(isSessionExpiredResponse("<table id='AttendanceDetailDataTable'>Valid Data</table>")).toBe(false);
  });
});
