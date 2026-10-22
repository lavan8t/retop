import { SearchableOption } from "../components/ui/SearchableDropdown";
import { LateHourStatusEntry } from "../types/vtop";
import { parseHTMLFast, validateParsed, Versioned } from "../utils/parser-utils";

export const LATE_HOUR_SCHEMA_VERSION = 1;

/**
 * Pure parser to extract <select> options from VTOP HTML fragments.
 */
export function parseLateHourSelectOpts(
  html: string,
  selectId: string,
): SearchableOption[] {
  if (!html) return [];
  const doc = parseHTMLFast(html);
  const select = doc.getElementById(selectId) as HTMLSelectElement | null;
  if (!select) {
    // Fallback regex if selectId has case/attribute variance
    const re = new RegExp(
      `<select[^>]*id=["']${selectId}["'][^>]*>([\\s\\S]*?)<\\/select>`,
      "i",
    );
    const m = html.match(re);
    if (!m) return [];
    const opts: SearchableOption[] = [];
    const optRe =
      /<option\s+value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi;
    let o: RegExpExecArray | null;
    while ((o = optRe.exec(m[1])) !== null) {
      const val = o[1].trim();
      const lbl = o[2].trim().replace(/&amp;/g, "&").replace(/<[^>]+>/g, "");
      if (
        val &&
        !["-select-", "select", "--select--"].includes(val.toLowerCase())
      ) {
        opts.push({ value: val, label: lbl });
      }
    }
    return opts;
  }

  const options: SearchableOption[] = [];
  for (let i = 0; i < select.options.length; i++) {
    const opt = select.options[i];
    const val = opt.value.trim();
    const lbl = (opt.textContent || "").trim();
    if (
      val &&
      !["-select-", "select", "--select--"].includes(val.toLowerCase())
    ) {
      options.push({ value: val, label: lbl });
    }
  }
  return options;
}

/**
 * Pure parser to extract status and history table rows into typed LateHourStatusEntry.
 */
export function parseLateHourRows(html: string): Versioned<LateHourStatusEntry[]> {
  if (!html) return validateParsed([], "lateHour");
  const doc = parseHTMLFast(html);
  const rows = doc.querySelectorAll("tr");
  const entries: LateHourStatusEntry[] = [];

  const clean = (s: string) => s.replace(/\s+/g, " ").trim();

  rows.forEach((tr) => {
    const rowHtml = tr.innerHTML;
    if (!rowHtml.includes("lateHourId")) return;

    const tds = Array.from(tr.querySelectorAll("td")).map((td) =>
      clean(td.textContent || ""),
    );
    if (tds.length < 8) return;

    const idInput = tr.querySelector(
      'input[name*="lateHourId"]',
    ) as HTMLInputElement | null;
    const idMatch =
      idInput?.value ||
      rowHtml.match(/name=["']lateHourId\d*["'][^>]*value=["']([^"']+)["']/i)?.[1] ||
      rowHtml.match(/value=["'](P\d+)["']/i)?.[1] ||
      rowHtml.match(/lateHourId=([^&"'\s]+)/i)?.[1] ||
      "";

    const hasActionCol = tds.length >= 10;
    const offset = hasActionCol ? 2 : 1;

    entries.push({
      id: idMatch,
      venue: tds[offset] ?? "",
      eventType: tds[offset + 1] ?? "",
      details: tds[offset + 2] ?? "",
      appliedTo: tds[offset + 3] ?? "",
      fromDate: tds[offset + 4] ?? "",
      toDate: tds[offset + 5] ?? "",
      time: tds[offset + 6] ?? "",
      status: tds[offset + 7] ?? tds[tds.length - 1] ?? "",
    });
  });

  return validateParsed(entries, "lateHour");
}

/**
 * Pure parser for VTOP response flash messages.
 */
export function parseLateHourResponseMsg(html: string): Versioned<{
  ok: boolean;
  text: string;
}> {
  if (!html) return validateParsed({ ok: false, text: "No response from server" }, "lateHour");
  const doc = parseHTMLFast(html);
  const dataMsg =
    doc.getElementById("DataBlockMessage")?.textContent?.trim() || "";
  const appMsg =
    doc.getElementById("ApplicationBlockMessage")?.textContent?.trim() || "";
  const statusMsg =
    doc.getElementById("StatusBlockMessage")?.textContent?.trim() || "";
  const historyMsg =
    doc.getElementById("HistoryBlockMessage")?.textContent?.trim() || "";
  const alertMsg =
    doc.querySelector(".alert")?.textContent?.trim() ||
    doc.querySelector(".text-danger")?.textContent?.trim() || "";

  const msg = dataMsg || appMsg || statusMsg || historyMsg || alertMsg;
  const upper = msg.toUpperCase();
  const ok = upper.includes("SUCCESS") || upper.includes("SUBMITTED") || upper.includes("APPROVED") || upper.includes("CANCELLED");
  const failed =
    upper.includes("FAILED") ||
    upper.includes("UNABLE") ||
    upper.includes("ERROR") ||
    upper.includes("INVALID") ||
    upper.includes("NOT ALLOWED");

  return validateParsed({
    ok: ok && !failed,
    text: msg || (ok ? "Submitted successfully" : "Operation completed"),
  }, "lateHour");
}

