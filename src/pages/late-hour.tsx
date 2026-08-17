import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Add,
  History,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Schedule,
  Person,
  Category,
  Send,
  Refresh,
  Warning,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { VTOPNetwork } from "../utils/network";
import { EmptyState } from "../components/EmptyState";

interface LateHourPageProps {
  network: VTOPNetwork;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Opt { value: string; label: string }

interface StatusEntry {
  id: string;         // lateHourId value (e.g. P170826404414)
  venue: string;
  eventType: string;
  details: string;
  appliedTo: string;
  fromDate: string;
  toDate: string;
  time: string;       // combined "21:00 to 01:00"
  status: string;
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseOpts(html: string, selectId: string): Opt[] {
  const re = new RegExp(`<select[^>]*id=["']${selectId}["'][^>]*>([\\s\\S]*?)<\\/select>`, "i");
  const m = html.match(re);
  if (!m) return [];
  const opts: Opt[] = [];
  const optRe = /<option\s+value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi;
  let o: RegExpExecArray | null;
  while ((o = optRe.exec(m[1])) !== null) {
    if (o[1]) opts.push({ value: o[1], label: o[2].trim().replace(/&amp;/g, "&") });
  }
  return opts;
}

/**
 * Parse status/history table rows.
 * Table columns (from real VTOP HTML):
 *   td[0] = hidden lateHourId input
 *   td[1] = cancel button (status) or empty (history)
 *   td[2] = Venue
 *   td[3] = Event Type
 *   td[4] = Details
 *   td[5] = Applied To
 *   td[6] = From Date
 *   td[7] = To Date
 *   td[8] = From/to Time (combined, e.g. "21:00 to 01:00")
 *   td[9] = Status
 */
function parseRows(html: string): StatusEntry[] {
  const rows: StatusEntry[] = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/gi;
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const clean = (s: string) => s.replace(/<[^>]+>/g, "").trim();

  let rowM: RegExpExecArray | null;
  while ((rowM = rowRe.exec(html)) !== null) {
    const rowHtml = rowM[1];
    // Only rows that contain a lateHourId hidden input
    if (!rowHtml.match(/id=["']lateHourId\d+["']/i)) continue;

    const tds: string[] = [];
    let tdM: RegExpExecArray | null;
    while ((tdM = tdRe.exec(rowHtml)) !== null) {
      tds.push(tdM[1].trim());
    }
    if (tds.length < 9) continue;

    // Extract the hidden id value from td[0]
    const idMatch = tds[0].match(/value=["']([^"']+)["']/i);

    rows.push({
      id: idMatch?.[1] ?? "",
      venue: clean(tds[2] ?? ""),
      eventType: clean(tds[3] ?? ""),
      details: clean(tds[4] ?? ""),
      appliedTo: clean(tds[5] ?? ""),
      fromDate: clean(tds[6] ?? ""),
      toDate: clean(tds[7] ?? ""),
      time: clean(tds[8] ?? ""),
      status: clean(tds[9] ?? ""),
    });
  }
  return rows;
}

/**
 * Parse submit/cancel response.
 * Success: DataBlockMessage contains "SUCCESSFUL"
 * Failure: ApplicationBlockMessage or DataBlockMessage contains "FAILED"
 */
function parseResponseMsg(html: string): { ok: boolean; text: string } {
  const dataMsg = html.match(/id=["']DataBlockMessage["'][^>]*>\s*([\s\S]*?)\s*<\/p>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  const appMsg = html.match(/id=["']ApplicationBlockMessage["'][^>]*>\s*([\s\S]*?)\s*<\/p>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  const msg = dataMsg || appMsg;
  const ok = msg.toUpperCase().includes("SUCCESSFUL");
  const failed = msg.toUpperCase().includes("FAILED");
  return { ok: ok || (!failed && !msg), text: msg || (ok ? "Request submitted successfully." : "An error occurred.") };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s.includes("approved") || s.includes("successful"))
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-safe-container) text-(--att-safe)"><CheckCircle className="w-3 h-3" />Approved</span>;
  if (s.includes("cancel"))
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-danger-container) text-(--att-danger)"><Cancel className="w-3 h-3" />Cancelled</span>;
  if (s.includes("pending") || s.includes("raised"))
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-warn-container) text-(--att-warn)"><HourglassEmpty className="w-3 h-3" />Pending</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--bg-highlight) text-(--text-muted)">{status || "—"}</span>;
}

function EntryCard({ entry, onCancel }: { entry: StatusEntry; onCancel?: (id: string) => void }) {
  const isPending = entry.status.toLowerCase().includes("pending") || entry.status.toLowerCase().includes("raised");
  return (
    <div className="bg-(--bg-surface) border border-(--border-dim)/40 rounded-3xl p-4 md:p-5 flex flex-col gap-3 hover:bg-(--bg-highlight) transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-(--text-main) truncate">{entry.venue || "—"}</p>
          <p className="text-xs text-(--text-muted) mt-0.5 line-clamp-2">{entry.details || "—"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={entry.status} />
          {onCancel && isPending && (
            <button
              onClick={() => onCancel(entry.id)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-danger-container) text-(--att-danger) hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Cancel className="w-3 h-3" /> Cancel
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-(--text-muted)">
          <Category className="w-3 h-3 text-(--accent-base)" />{entry.eventType || "—"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-(--text-muted)">
          <Person className="w-3 h-3 text-(--accent-base)" />{entry.appliedTo || "—"}
        </span>
      </div>

      {/* Date + time timeline pill */}
      <div className="flex items-center gap-0 w-full">
        <div className="px-3.5 py-2 rounded-full bg-(--bg-main) border border-r-0 border-(--border-dim)/60 text-xs font-mono font-bold flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-(--text-muted) uppercase leading-none mb-0.5">From</span>
          <span className="text-(--text-main) leading-none">{entry.fromDate || "—"}</span>
        </div>
        <div className="flex-1 flex items-center justify-between py-2 px-4 rounded-2xl bg-(--bg-main)/60 border border-(--border-dim)/40 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-(--text-muted) uppercase">To</span>
            <span className="font-bold text-(--text-main)">{entry.toDate || "—"}</span>
          </div>
          {entry.time && (
            <div className="flex items-center gap-1.5 text-(--text-muted) shrink-0">
              <Schedule className="w-3 h-3 text-(--accent-base)" />
              <span className="font-bold">{entry.time}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, options, disabled = false, loading = false, onChange }: {
  label: string; value: string; options: Opt[];
  disabled?: boolean; loading?: boolean; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide flex items-center gap-1.5">
        {label}
        {loading && <span className="text-(--accent-base) animate-pulse normal-case tracking-normal font-normal">loading…</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading || options.length === 0}
        className="w-full h-10 px-3.5 rounded-2xl bg-(--bg-main) border border-(--border-dim) text-sm font-medium text-(--text-main) focus:outline-none focus:border-(--accent-base) transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <option value="">— Select —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Static option lists (from VTOP HTML) ─────────────────────────────────────

const VENUE_TYPE_OPTS: Opt[] = [
  { value: "2", label: "Lab" },
  { value: "1", label: "Class Room" },
  { value: "9", label: "Foodys" },
  { value: "10", label: "SMV Portico" },
  { value: "11", label: "MH-B Block Workshop" },
  { value: "12", label: "Cell" },
  { value: "14", label: "MH-Music Room" },
  { value: "15", label: "MH-Dance Room" },
];

const EVENT_TYPE_OPTS: Opt[] = [
  { value: "LHE1", label: "LAB" },
  { value: "LHE2", label: "Clubs and Chapters" },
  { value: "LHE3", label: "Cultural Events" },
  { value: "LHE4", label: "Workshop and Conferences" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "request" | "status" | "history";

export const LateHourPage: React.FC<LateHourPageProps> = ({ network }) => {
  const [activeTab, setActiveTab] = useState<Tab>("request");

  // form field values
  const [school, setSchool] = useState("");
  const [faculty, setFaculty] = useState("");
  const [venueType, setVenueType] = useState("");
  const [block, setBlock] = useState("");
  const [venue, setVenue] = useState("");
  const [eventType, setEventType] = useState("");
  const [details, setDetails] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");

  // cascading option lists
  const [schoolOpts, setSchoolOpts] = useState<Opt[]>([]);
  const [facultyOpts, setFacultyOpts] = useState<Opt[]>([]);
  const [blockOpts, setBlockOpts] = useState<Opt[]>([]);
  const [venueOpts, setVenueOpts] = useState<Opt[]>([]);
  const [fromTimeOpts, setFromTimeOpts] = useState<Opt[]>([]);
  const [toTimeOpts, setToTimeOpts] = useState<Opt[]>([]);

  // loading states
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [loadingFromTimes, setLoadingFromTimes] = useState(false);
  const [loadingToTimes, setLoadingToTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // status / history
  const [statusEntries, setStatusEntries] = useState<StatusEntry[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<StatusEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Sync full form state into network object before each cascade step
  const syncFormState = useCallback((overrides: Record<string, string> = {}) => {
    network.setLHFormState({
      costCentreId: school,
      appliedTo: faculty,
      roomTypeId: venueType,
      buildingId: block,
      venue,
      lateHourEventId: eventType,
      details,
      lateHourFromDate: fromDate,
      fromTime,
      lateHourToDate: toDate,
      toTime,
      ...overrides,
    });
  }, [network, school, faculty, venueType, block, venue, eventType, details, fromDate, fromTime, toDate, toTime]);

  // ── Init: load form options ───────────────────────────────────────────────
  useEffect(() => {
    network.getLateHourRequestForm().then((html) => {
      setSchoolOpts(parseOpts(html, "costCentreId"));
    }).catch(() => {});
  }, [network]);

  // ── School → Faculty ──────────────────────────────────────────────────────
  const handleSchoolChange = useCallback(async (v: string) => {
    setSchool(v);
    setFaculty(""); setFacultyOpts([]);
    if (!v) return;
    setLoadingFaculty(true);
    try {
      const html = await network.getLateHourFaculties(v);
      setFacultyOpts(parseOpts(html, "appliedTo"));
    } catch {} finally { setLoadingFaculty(false); }
  }, [network]);

  // ── VenueType → Blocks ────────────────────────────────────────────────────
  const handleVenueTypeChange = useCallback(async (v: string) => {
    setVenueType(v);
    setBlock(""); setBlockOpts([]);
    setVenue(""); setVenueOpts([]);
    setFromTime(""); setFromTimeOpts([]);
    setToTime(""); setToTimeOpts([]);
    if (!v) return;
    setLoadingBlocks(true);
    try {
      syncFormState({ roomTypeId: v, buildingId: "", venue: "" });
      const html = await network.getLateHourAcademicBlocks(v);
      setBlockOpts(parseOpts(html, "buildingId"));
    } catch {} finally { setLoadingBlocks(false); }
  }, [network, syncFormState]);

  // ── Block → Venues ────────────────────────────────────────────────────────
  const handleBlockChange = useCallback(async (v: string) => {
    setBlock(v);
    setVenue(""); setVenueOpts([]);
    setFromTime(""); setFromTimeOpts([]);
    setToTime(""); setToTimeOpts([]);
    if (!v) return;
    setLoadingVenues(true);
    try {
      syncFormState({ buildingId: v, venue: "" });
      const html = await network.getLateHourVenues(v);
      setVenueOpts(parseOpts(html, "venue"));
    } catch {} finally { setLoadingVenues(false); }
  }, [network, syncFormState]);

  // ── EventType → From Times ────────────────────────────────────────────────
  // From times come back as soon as venue + event type are both set (date is not required)
  const fetchFromTimes = useCallback(async (et: string, currentVenue: string) => {
    if (!et || !currentVenue) return;
    setFromTime(""); setFromTimeOpts([]);
    setToTime(""); setToTimeOpts([]);
    setLoadingFromTimes(true);
    try {
      syncFormState({ lateHourEventId: et, venue: currentVenue, fromTime: "", toTime: "" });
      const html = await network.getLateHourFromTimes(et);
      setFromTimeOpts(parseOpts(html, "fromTime"));
    } catch {} finally { setLoadingFromTimes(false); }
  }, [network, syncFormState]);

  const handleVenueChange = (v: string) => {
    setVenue(v);
    setFromTime(""); setFromTimeOpts([]);
    setToTime(""); setToTimeOpts([]);
    if (eventType && v) fetchFromTimes(eventType, v);
  };

  const handleEventTypeChange = (v: string) => {
    setEventType(v);
    setFromTime(""); setFromTimeOpts([]);
    setToTime(""); setToTimeOpts([]);
    if (v && venue) fetchFromTimes(v, venue);
  };

  // ── FromTime → To Times ───────────────────────────────────────────────────
  const handleFromTimeChange = useCallback(async (v: string) => {
    setFromTime(v);
    setToTime(""); setToTimeOpts([]);
    if (!v) return;
    setLoadingToTimes(true);
    try {
      syncFormState({ fromTime: v, toTime: "" });
      const html = await network.getLateHourToTimes(v);
      setToTimeOpts(parseOpts(html, "toTime"));
    } catch {} finally { setLoadingToTimes(false); }
  }, [network, syncFormState]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const canSubmit = useMemo(() =>
    !!(school && faculty && venueType && block && venue && eventType && fromDate && toDate && fromTime && toTime),
    [school, faculty, venueType, block, venue, eventType, fromDate, toDate, fromTime, toTime],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setSubmitMsg(null);
    try {
      syncFormState();
      const html = await network.submitLateHourRequest();
      const result = parseResponseMsg(html);
      setSubmitMsg(result);
      if (result.ok) {
        // Switch to status tab after a brief pause
        setTimeout(() => setActiveTab("status"), 1200);
      }
    } catch (e: any) {
      setSubmitMsg({ ok: false, text: e.message || "Failed to submit." });
    } finally { setSubmitting(false); }
  };

  // ── Status ────────────────────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const html = await network.getLateHourStatus();
      setStatusEntries(parseRows(html));
    } catch {} finally { setStatusLoading(false); }
  }, [network]);

  const handleCancel = useCallback(async (id: string) => {
    setCancelling(id);
    try {
      const html = await network.cancelLateHourRequest(id);
      const result = parseResponseMsg(html);
      if (result.ok) {
        // Refresh status list
        const refreshHtml = await network.getLateHourStatus();
        setStatusEntries(parseRows(refreshHtml));
      }
    } catch {} finally { setCancelling(null); }
  }, [network]);

  // ── History ───────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const html = await network.getLateHourHistory();
      setHistoryEntries(parseRows(html));
    } catch {} finally { setHistoryLoading(false); }
  }, [network]);

  useEffect(() => {
    if (activeTab === "status") loadStatus();
    if (activeTab === "history") loadHistory();
  }, [activeTab]);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "request", label: "New Request", icon: Add },
    { id: "status", label: "My Requests", icon: HourglassEmpty },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar bg-(--bg-main) text-(--text-main) px-4 md:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="pt-20 md:pt-23 lg:pt-25" />

      {/* Tab switcher */}
      <div className="flex items-center gap-2 pb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border shrink-0 ${
              activeTab === id
                ? "bg-(--text-main) text-(--bg-main) border-(--text-main)"
                : "bg-(--bg-surface) text-(--text-muted) border-(--border-dim)/60 hover:text-(--text-main) hover:border-(--border-dim)"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── NEW REQUEST ──────────────────────────────────────────────────── */}
      {activeTab === "request" && (
        <div className="flex flex-col gap-5 pb-24">

          {/* Feedback banner */}
          {submitMsg && (
            <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm font-medium ${
              submitMsg.ok
                ? "bg-(--att-safe-container) border-(--att-safe)/30 text-(--att-safe)"
                : "bg-(--att-danger-container) border-(--att-danger)/30 text-(--att-danger)"
            }`}>
              {submitMsg.ok
                ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                : <Warning className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{submitMsg.text}</span>
            </div>
          )}

          {/* Apply To */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[11px] font-black font-expanded uppercase text-(--text-muted) tracking-widest">Apply To</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField label="School / Department" value={school} options={schoolOpts} onChange={handleSchoolChange} />
              <SelectField label="Faculty" value={faculty} options={facultyOpts} disabled={!school} loading={loadingFaculty} onChange={setFaculty} />
            </div>
          </section>

          <div className="h-px bg-(--border-dim)/40" />

          {/* Venue */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[11px] font-black font-expanded uppercase text-(--text-muted) tracking-widest">Venue</h2>
            <SelectField label="Venue Type" value={venueType} options={VENUE_TYPE_OPTS} onChange={handleVenueTypeChange} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField label="Academic Block" value={block} options={blockOpts} disabled={!venueType} loading={loadingBlocks} onChange={handleBlockChange} />
              <SelectField label="Venue" value={venue} options={venueOpts} disabled={!block} loading={loadingVenues} onChange={handleVenueChange} />
            </div>
          </section>

          <div className="h-px bg-(--border-dim)/40" />

          {/* Work Details */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[11px] font-black font-expanded uppercase text-(--text-muted) tracking-widest">Work Details</h2>
            <SelectField label="Work Related To" value={eventType} options={EVENT_TYPE_OPTS} onChange={handleEventTypeChange} />
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide">Brief Details</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={2}
                placeholder="Describe the purpose…"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-(--bg-main) border border-(--border-dim) text-sm font-sans text-(--text-main) placeholder:text-(--text-muted)/50 focus:outline-none focus:border-(--accent-base) resize-none transition-colors"
              />
            </div>
          </section>

          <div className="h-px bg-(--border-dim)/40" />

          {/* Date & Time */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[11px] font-black font-expanded uppercase text-(--text-muted) tracking-widest">Date &amp; Time</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-2xl bg-(--bg-main) border border-(--border-dim) text-sm font-mono text-(--text-main) focus:outline-none focus:border-(--accent-base) transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide">To Date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-2xl bg-(--bg-main) border border-(--border-dim) text-sm font-mono text-(--text-main) focus:outline-none focus:border-(--accent-base) transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Time From"
                value={fromTime}
                options={fromTimeOpts}
                disabled={!venue || !eventType}
                loading={loadingFromTimes}
                onChange={handleFromTimeChange}
              />
              <SelectField
                label="Time To"
                value={toTime}
                options={toTimeOpts}
                disabled={!fromTime}
                loading={loadingToTimes}
                onChange={setToTime}
              />
            </div>
            {!venue || !eventType ? (
              <p className="text-[11px] text-(--text-muted) font-medium">
                Select a venue and work type first to load available time slots.
              </p>
            ) : null}
          </section>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="mt-2 h-12 rounded-full bg-(--accent-base) text-(--text-inverse) font-bold text-sm uppercase flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      )}

      {/* ── STATUS ───────────────────────────────────────────────────────── */}
      {activeTab === "status" && (
        <div className="flex flex-col gap-4 pb-24">
          <div className="flex items-center justify-between">
            <span className="text-xs text-(--text-muted) font-medium">Current &amp; pending requests</span>
            <button onClick={loadStatus} disabled={statusLoading}
              className="flex items-center gap-1.5 text-xs font-bold text-(--text-muted) hover:text-(--text-main) cursor-pointer disabled:opacity-50 transition-colors">
              <Refresh className={`w-3.5 h-3.5 ${statusLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {statusLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => <div key={i} className="h-36 rounded-3xl bg-(--bg-surface) border border-(--border-dim)/40 animate-pulse" />)}
            </div>
          ) : statusEntries.length > 0 ? (
            <div className="flex flex-col gap-3">
              {statusEntries.map((e) => (
                <div key={e.id} className={cancelling === e.id ? "opacity-50 pointer-events-none" : ""}>
                  <EntryCard entry={e} onCancel={handleCancel} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={HourglassEmpty} msg="No Active Requests" subMsg="You have no pending late hour permission requests." size="md" />
          )}
        </div>
      )}

      {/* ── HISTORY ──────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4 pb-24">
          <div className="flex items-center justify-between">
            <span className="text-xs text-(--text-muted) font-medium">
              {historyEntries.length > 0 ? `${historyEntries.length} past requests` : "Past requests"}
            </span>
            <button onClick={loadHistory} disabled={historyLoading}
              className="flex items-center gap-1.5 text-xs font-bold text-(--text-muted) hover:text-(--text-main) cursor-pointer disabled:opacity-50 transition-colors">
              <Refresh className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {historyLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-3xl bg-(--bg-surface) border border-(--border-dim)/40 animate-pulse" />)}
            </div>
          ) : historyEntries.length > 0 ? (
            <div className="flex flex-col gap-3">
              {historyEntries.map((e) => <EntryCard key={e.id} entry={e} />)}
            </div>
          ) : (
            <EmptyState icon={History} msg="No History Found" subMsg="Your late hour permission history will appear here." size="md" />
          )}
        </div>
      )}
    </div>
  );
};
