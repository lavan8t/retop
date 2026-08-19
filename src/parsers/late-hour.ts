import { SearchableOption } from "../components/ui/SearchableDropdown";
import { LateHourStatusEntry } from "../types/vtop";
import { parseHTMLFast, validateParsed, Versioned } from "../utils/parser-utils";
import { LateHourStatusListSchema, LateHourResponseMsgSchema } from "../schemas";

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
  if (!html) return validateParsed(LateHourStatusListSchema, [], "lateHour");
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

    entries.push({
      id: idMatch,
      venue: tds[2] ?? tds[1] ?? "",
      eventType: tds[3] ?? tds[2] ?? "",
      details: tds[4] ?? tds[3] ?? "",
      appliedTo: tds[5] ?? tds[4] ?? "",
      fromDate: tds[6] ?? tds[5] ?? "",
      toDate: tds[7] ?? tds[6] ?? "",
      time: tds[8] ?? tds[7] ?? "",
      status: tds[9] ?? tds[8] ?? tds[tds.length - 1] ?? "",
    });
  });

  return validateParsed(LateHourStatusListSchema, entries, "lateHour");
}

/**
 * Pure parser for VTOP response flash messages.
 */
export function parseLateHourResponseMsg(html: string): Versioned<{
  ok: boolean;
  text: string;
}> {
  if (!html) return validateParsed(LateHourResponseMsgSchema, { ok: false, text: "No response from server" }, "lateHour");
  const doc = parseHTMLFast(html);
  const dataMsg =
    doc.getElementById("DataBlockMessage")?.textContent?.trim() || "";
  const appMsg =
    doc.getElementById("ApplicationBlockMessage")?.textContent?.trim() || "";

  const msg = dataMsg || appMsg;
  const ok = msg.toUpperCase().includes("SUCCESSFUL");
  const failed =
    msg.toUpperCase().includes("FAILED") ||
    msg.toLowerCase().includes("unable to process");

  return validateParsed(LateHourResponseMsgSchema, {
    ok: ok && !failed,
    text: msg || (ok ? "Submitted successfully" : "Operation completed"),
  }, "lateHour");
}
