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

// -- HTML Parsers -------------------------------------------------------------

function parseSelectOptions(html: string, selectId: string): { value: string; label: string }[] {
  const re = new RegExp(
    `<select[^>]*id=["']${selectId}["'][^>]*>([\\s\\S]*?)<\\/select>`,
    "i",
  );
  const match = html.match(re);
  if (!match) return [];
  const optRe = /<option\s+value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi;
  const opts: { value: string; label: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = optRe.exec(match[1])) !== null) {
    if (m[1]) opts.push({ value: m[1], label: m[2].trim().replace(/&amp;/g, "&") });
  }
  return opts;
}

interface HistoryEntry {
  id: string;
  venue: string;
  eventType: string;
  details: string;
  appliedTo: string;
  fromDate: string;
  toDate: string;
  time: string;
  status: string;
}

function parseHistoryRows(html: string): HistoryEntry[] {
  const rows: HistoryEntry[] = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/gi;
  let rowM: RegExpExecArray | null;
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const hiddenRe = /value=["']([^"']+)["']/i;

  while ((rowM = rowRe.exec(html)) !== null) {
    const rowHtml = rowM[1];
    if (!rowHtml.includes("lateHourId")) continue;
    const tds: string[] = [];
    let tdM: RegExpExecArray | null;
    while ((tdM = tdRe.exec(rowHtml)) !== null) {
      tds.push(tdM[1].trim());
    }
    if (tds.length < 8) continue;
    const idMatch = tds[0].match(hiddenRe);
    const clean = (s: string) => s.replace(/<[^>]+>/g, "").trim();
    rows.push({
      id: idMatch?.[1] ?? "",
      venue: clean(tds[1] ?? ""),
      eventType: clean(tds[2] ?? ""),
      details: clean(tds[3] ?? ""),
      appliedTo: clean(tds[4] ?? ""),
      fromDate: clean(tds[5] ?? ""),
      toDate: clean(tds[6] ?? ""),
      time: clean(tds[7] ?? ""),
      status: clean(tds[8] ?? ""),
    });
  }
  return rows;
}

// -- Status Badge -------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s.includes("approved")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-safe-container) text-(--att-safe)">
        <CheckCircle className="w-3 h-3" /> Approved
      </span>
    );
  }
  if (s.includes("cancel")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-danger-container) text-(--att-danger)">
        <Cancel className="w-3 h-3" /> Cancelled
      </span>
    );
  }
  if (s.includes("pending") || s.includes("submitted")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-warn-container) text-(--att-warn)">
        <HourglassEmpty className="w-3 h-3" /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--bg-highlight) text-(--text-muted)">
      {status}
    </span>
  );
}

// -- History Card -------------------------------------------------------------

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  return (
    <div className="bg-(--bg-surface) border border-(--border-dim)/40 rounded-3xl p-4 md:p-5 flex flex-col gap-3 hover:bg-(--bg-highlight) transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-(--text-main) truncate">{entry.venue}</p>
          <p className="text-xs text-(--text-muted) mt-0.5">{entry.details || "—"}</p>
        </div>
        <StatusBadge status={entry.status} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-(--text-muted)">
          <Category className="w-3 h-3 text-(--accent-base)" />
          {entry.eventType}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-(--text-muted)">
          <Person className="w-3 h-3 text-(--accent-base)" />
          {entry.appliedTo || "—"}
        </span>
      </div>
      <div className="flex items-center gap-0 w-full">
        <div className="px-3.5 py-2 rounded-full bg-(--bg-main) border border-r-0 border-(--border-dim)/60 text-xs font-mono font-bold flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-(--text-muted) uppercase leading-none mb-0.5">From</span>
          <span className="text-(--text-main) leading-none">{entry.fromDate}</span>
        </div>
        <div className="flex-1 flex items-center justify-between py-2 px-4 rounded-2xl bg-(--bg-main)/60 border border-(--border-dim)/40 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-(--text-muted) uppercase">To</span>
            <span className="font-bold text-(--text-main)">{entry.toDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-(--text-muted)">
            <Schedule className="w-3 h-3 text-(--accent-base)" />
            <span className="font-bold">{entry.time}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Select Field --------------------------------------------------------------

function SelectField({
  label,
  value,
  options,
  disabled = false,
  loading = false,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  loading?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide flex items-center gap-1">
        {label}
        {loading && <span className="text-(--accent-base) animate-pulse normal-case tracking-normal">loading…</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading || options.length === 0}
        className="w-full h-10 px-3.5 rounded-2xl bg-(--bg-main) border border-(--border-dim) text-sm font-medium text-(--text-main) focus:outline-none focus:border-(--accent-base) transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <option value="">— Select —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// -- Main Page -----------------------------------------------------------------

type Tab = "request" | "status" | "history";

const VENUE_TYPE_OPTS = [
  { value: "2", label: "Lab" },
  { value: "1", label: "Class Room" },
  { value: "9", label: "Foodys" },
  { value: "10", label: "SMV Portico" },
  { value: "11", label: "MH-B Block Workshop" },
  { value: "12", label: "Cell" },
  { value: "14", label: "MH-Music Room" },
  { value: "15", label: "MH-Dance Room" },
];

const EVENT_TYPE_OPTS = [
  { value: "LHE1", label: "LAB" },
  { value: "LHE2", label: "Clubs and Chapters" },
  { value: "LHE3", label: "Cultural Events" },
  { value: "LHE4", label: "Workshop and Conferences" },
];

export const LateHourPage: React.FC<LateHourPageProps> = ({ network }) => {
  const [activeTab, setActiveTab] = useState<Tab>("request");

  const [schoolOpts, setSchoolOpts] = useState<{ value: string; label: string }[]>([]);
  const [facultyOpts, setFacultyOpts] = useState<{ value: string; label: string }[]>([]);
  const [blockOpts, setBlockOpts] = useState<{ value: string; label: string }[]>([]);
  const [venueOpts, setVenueOpts] = useState<{ value: string; label: string }[]>([]);
  const [fromTimeOpts, setFromTimeOpts] = useState<{ value: string; label: string }[]>([]);
  const [toTimeOpts, setToTimeOpts] = useState<{ value: string; label: string }[]>([]);

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

  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [loadingFromTimes, setLoadingFromTimes] = useState(false);
  const [loadingToTimes, setLoadingToTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [status, setStatus] = useState<HistoryEntry[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);

  // load form on mount
  useEffect(() => {
    network.getLateHourRequestForm().then((html) => {
      setSchoolOpts(parseSelectOptions(html, "costCentreId"));
    }).catch(() => {});
  }, [network]);

  const handleSchoolChange = useCallback(async (v: string) => {
    setSchool(v); setFaculty(""); setFacultyOpts([]);
    if (!v) return;
    setLoadingFaculty(true);
    try { setFacultyOpts(parseSelectOptions(await network.getLateHourFaculties(v), "appliedTo")); } catch {} finally { setLoadingFaculty(false); }
  }, [network]);

  const handleVenueTypeChange = useCallback(async (v: string) => {
    setVenueType(v); setBlock(""); setBlockOpts([]); setVenue(""); setVenueOpts([]);
    if (!v) return;
    setLoadingBlocks(true);
    try { setBlockOpts(parseSelectOptions(await network.getLateHourAcademicBlocks(v), "buildingId")); } catch {} finally { setLoadingBlocks(false); }
  }, [network]);

  const handleBlockChange = useCallback(async (v: string) => {
    setBlock(v); setVenue(""); setVenueOpts([]);
    if (!v) return;
    setLoadingVenues(true);
    try { setVenueOpts(parseSelectOptions(await network.getLateHourVenues(v, venueType), "venue")); } catch {} finally { setLoadingVenues(false); }
  }, [network, venueType]);

  const fetchFromTimes = useCallback(async (fd: string, et: string) => {
    if (!fd || !et || !block || !venue || !venueType) return;
    setFromTimeOpts([]); setFromTime(""); setToTimeOpts([]); setToTime("");
    setLoadingFromTimes(true);
    try { setFromTimeOpts(parseSelectOptions(await network.getLateHourTimes(fd, et, block, venue, venueType), "fromTime")); } catch {} finally { setLoadingFromTimes(false); }
  }, [network, block, venue, venueType]);

  const handleFromDateChange = (v: string) => { setFromDate(v); fetchFromTimes(v, eventType); };
  const handleEventTypeChange = (v: string) => { setEventType(v); fetchFromTimes(fromDate, v); };

  const handleFromTimeChange = useCallback(async (v: string) => {
    setFromTime(v); setToTime(""); setToTimeOpts([]);
    if (!v) return;
    setLoadingToTimes(true);
    try { setToTimeOpts(parseSelectOptions(await network.getLateHourToTimes(v, fromDate, eventType), "toTime")); } catch {} finally { setLoadingToTimes(false); }
  }, [network, fromDate, eventType]);

  const canSubmit = useMemo(() =>
    !!(school && faculty && venueType && block && venue && eventType && fromDate && toDate && fromTime && toTime),
    [school, faculty, venueType, block, venue, eventType, fromDate, toDate, fromTime, toTime],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setSubmitMsg(null);
    try {
      const html = await network.submitLateHourRequest({ costCentreId: school, appliedTo: faculty, roomTypeId: venueType, buildingId: block, venue, lateHourEventId: eventType, details, lateHourFromDate: fromDate, lateHourToDate: toDate, fromTime, toTime });
      const msg = html.match(/id=["']pageMessage["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
      setSubmitMsg({ type: msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error") ? "error" : "success", text: msg || "Request submitted successfully." });
    } catch (e: any) {
      setSubmitMsg({ type: "error", text: e.message || "Failed to submit." });
    } finally { setSubmitting(false); }
  };

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try { setStatus(parseHistoryRows(await network.getLateHourStatus())); } catch {} finally { setStatusLoading(false); }
  }, [network]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try { setHistory(parseHistoryRows(await network.getLateHourHistory())); } catch {} finally { setHistoryLoading(false); }
  }, [network]);

  useEffect(() => {
    if (activeTab === "status") loadStatus();
    if (activeTab === "history") loadHistory();
  }, [activeTab]);

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

      {/* -- NEW REQUEST --------------------------------------------------- */}
      {activeTab === "request" && (
        <div className="flex flex-col gap-5 pb-24">
          {submitMsg && (
            <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm font-medium ${
              submitMsg.type === "success"
                ? "bg-(--att-safe-container) border-(--att-safe)/30 text-(--att-safe)"
                : "bg-(--att-danger-container) border-(--att-danger)/30 text-(--att-danger)"
            }`}>
              {submitMsg.type === "success"
                ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                : <Warning className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{submitMsg.text}</span>
            </div>
          )}

          <section className="flex flex-col gap-4">
            <h2 className="text-[11px] font-black font-expanded uppercase text-(--text-muted) tracking-widest">Apply To</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField label="School / Department" value={school} options={schoolOpts} onChange={handleSchoolChange} />
              <SelectField label="Faculty" value={faculty} options={facultyOpts} disabled={!school} loading={loadingFaculty} onChange={setFaculty} />
            </div>
          </section>

          <div className="h-px bg-(--border-dim)/40" />

          <section className="flex flex-col gap-4">
            <h2 className="text-[11px] font-black font-expanded uppercase text-(--text-muted) tracking-widest">Venue</h2>
            <SelectField label="Venue Type" value={venueType} options={VENUE_TYPE_OPTS} onChange={handleVenueTypeChange} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField label="Academic Block" value={block} options={blockOpts} disabled={!venueType} loading={loadingBlocks} onChange={handleBlockChange} />
              <SelectField label="Venue" value={venue} options={venueOpts} disabled={!block} loading={loadingVenues} onChange={setVenue} />
            </div>
          </section>

          <div className="h-px bg-(--border-dim)/40" />

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

          <section className="flex flex-col gap-4">
            <h2 className="text-[11px] font-black font-expanded uppercase text-(--text-muted) tracking-widest">Date &amp; Time</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => handleFromDateChange(e.target.value)} className="w-full h-10 px-3.5 rounded-2xl bg-(--bg-main) border border-(--border-dim) text-sm font-mono text-(--text-main) focus:outline-none focus:border-(--accent-base) transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide">To Date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full h-10 px-3.5 rounded-2xl bg-(--bg-main) border border-(--border-dim) text-sm font-mono text-(--text-main) focus:outline-none focus:border-(--accent-base) transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField label="Time From" value={fromTime} options={fromTimeOpts} disabled={!fromDate || !eventType || !venue} loading={loadingFromTimes} onChange={handleFromTimeChange} />
              <SelectField label="Time To" value={toTime} options={toTimeOpts} disabled={!fromTime} loading={loadingToTimes} onChange={setToTime} />
            </div>
          </section>

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

      {/* -- STATUS -------------------------------------------------------- */}
      {activeTab === "status" && (
        <div className="flex flex-col gap-4 pb-24">
          <div className="flex items-center justify-between">
            <span className="text-xs text-(--text-muted) font-medium">Current requests</span>
            <button onClick={loadStatus} disabled={statusLoading} className="flex items-center gap-1.5 text-xs font-bold text-(--text-muted) hover:text-(--text-main) cursor-pointer disabled:opacity-50 transition-colors">
              <Refresh className={`w-3.5 h-3.5 ${statusLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          {statusLoading ? (
            <div className="flex flex-col gap-3">{[1, 2].map((i) => <div key={i} className="h-32 rounded-3xl bg-(--bg-surface) border border-(--border-dim)/40 animate-pulse" />)}</div>
          ) : status.length > 0 ? (
            <div className="flex flex-col gap-3">{status.map((e) => <HistoryCard key={e.id} entry={e} />)}</div>
          ) : (
            <EmptyState icon={HourglassEmpty} msg="No Active Requests" subMsg="You have no pending late hour permission requests." size="md" />
          )}
        </div>
      )}

      {/* -- HISTORY ------------------------------------------------------- */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4 pb-24">
          <div className="flex items-center justify-between">
            <span className="text-xs text-(--text-muted) font-medium">{history.length > 0 ? `${history.length} past requests` : "Past requests"}</span>
            <button onClick={loadHistory} disabled={historyLoading} className="flex items-center gap-1.5 text-xs font-bold text-(--text-muted) hover:text-(--text-main) cursor-pointer disabled:opacity-50 transition-colors">
              <Refresh className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          {historyLoading ? (
            <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-3xl bg-(--bg-surface) border border-(--border-dim)/40 animate-pulse" />)}</div>
          ) : history.length > 0 ? (
            <div className="flex flex-col gap-3">{history.map((e) => <HistoryCard key={e.id} entry={e} />)}</div>
          ) : (
            <EmptyState icon={History} msg="No History Found" subMsg="Your late hour permission history will appear here." size="md" />
          )}
        </div>
      )}
    </div>
  );
};
