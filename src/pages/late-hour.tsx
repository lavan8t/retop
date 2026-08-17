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
  Warning,
  CalendarMonth,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { VTOPNetwork } from "../utils/network";
import { EmptyState } from "../components/EmptyState";
import {
  SearchableDropdown,
  SearchableOption,
} from "../components/ui/SearchableDropdown";

interface LateHourPageProps {
  network: VTOPNetwork;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatusEntry {
  id: string; // lateHourId value (e.g. P170826404414)
  venue: string;
  eventType: string;
  details: string;
  appliedTo: string;
  fromDate: string;
  toDate: string;
  time: string; // combined "21:00 to 01:00"
  status: string;
}

// ── Static Option Lists ───────────────────────────────────────────────────────

const DEFAULT_TIME_OPTS: SearchableOption[] = [
  { value: "08:30 PM", label: "08:30 PM" },
  { value: "08:45 PM", label: "08:45 PM" },
  { value: "09:00 PM", label: "09:00 PM" },
  { value: "09:15 PM", label: "09:15 PM" },
  { value: "09:30 PM", label: "09:30 PM" },
  { value: "09:45 PM", label: "09:45 PM" },
  { value: "10:00 PM", label: "10:00 PM" },
  { value: "10:15 PM", label: "10:15 PM" },
  { value: "10:30 PM", label: "10:30 PM" },
  { value: "10:45 PM", label: "10:45 PM" },
  { value: "11:00 PM", label: "11:00 PM" },
  { value: "11:15 PM", label: "11:15 PM" },
  { value: "11:30 PM", label: "11:30 PM" },
  { value: "11:45 PM", label: "11:45 PM" },
  { value: "12:00 AM", label: "12:00 AM" },
  { value: "12:15 AM", label: "12:15 AM" },
  { value: "12:30 AM", label: "12:30 AM" },
  { value: "12:45 AM", label: "12:45 AM" },
  { value: "01:00 AM", label: "01:00 AM" },
];

const VENUE_TYPE_OPTS: SearchableOption[] = [
  { value: "2", label: "Lab" },
  { value: "1", label: "Class Room" },
  { value: "9", label: "Foodys" },
  { value: "10", label: "SMV Portico" },
  { value: "11", label: "MH-B Block Workshop" },
  { value: "12", label: "Cell" },
  { value: "14", label: "MH-Music Room" },
  { value: "15", label: "MH-Dance Room" },
];

const EVENT_TYPE_OPTS: SearchableOption[] = [
  { value: "LHE1", label: "LAB" },
  { value: "LHE2", label: "Clubs and Chapters" },
  { value: "LHE3", label: "Cultural Events" },
  { value: "LHE4", label: "Workshop and Conferences" },
];

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseOpts(html: string, selectId: string): SearchableOption[] {
  const re = new RegExp(
    `<select[^>]*id=["']${selectId}["'][^>]*>([\\s\\S]*?)<\\/select>`,
    "i",
  );
  const m = html.match(re);
  if (!m) return [];
  const opts: SearchableOption[] = [];
  const optRe = /<option\s+value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi;
  let o: RegExpExecArray | null;
  while ((o = optRe.exec(m[1])) !== null) {
    const val = o[1].trim();
    const lbl = o[2].trim().replace(/&amp;/g, "&").replace(/<[^>]+>/g, "");
    if (val && !["-select-", "select", "--select--"].includes(val.toLowerCase())) {
      opts.push({ value: val, label: lbl });
    }
  }
  return opts;
}

function parseRows(html: string): StatusEntry[] {
  const rows: StatusEntry[] = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/gi;
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const clean = (s: string) => s.replace(/<[^>]+>/g, "").trim();

  let rowM: RegExpExecArray | null;
  while ((rowM = rowRe.exec(html)) !== null) {
    const rowHtml = rowM[1];
    if (!rowHtml.includes("lateHourId")) continue;

    const tds: string[] = [];
    let tdM: RegExpExecArray | null;
    while ((tdM = tdRe.exec(rowHtml)) !== null) {
      tds.push(tdM[1].trim());
    }
    if (tds.length < 8) continue;

    const idMatch =
      rowHtml.match(/name=["']lateHourId\d*["'][^>]*value=["']([^"']+)["']/i) ||
      rowHtml.match(/value=["'](P\d+)["']/i) ||
      rowHtml.match(/lateHourId=([^&"'\s]+)/i);

    rows.push({
      id: idMatch?.[1] ?? "",
      venue: clean(tds[2] ?? tds[1] ?? ""),
      eventType: clean(tds[3] ?? tds[2] ?? ""),
      details: clean(tds[4] ?? tds[3] ?? ""),
      appliedTo: clean(tds[5] ?? tds[4] ?? ""),
      fromDate: clean(tds[6] ?? tds[5] ?? ""),
      toDate: clean(tds[7] ?? tds[6] ?? ""),
      time: clean(tds[8] ?? tds[7] ?? ""),
      status: clean(tds[9] ?? tds[8] ?? tds[tds.length - 1] ?? ""),
    });
  }
  return rows;
}

function parseResponseMsg(html: string): { ok: boolean; text: string } {
  const dataMsg =
    html
      .match(/id=["']DataBlockMessage["'][^>]*>\s*([\s\S]*?)\s*<\/p>/i)?.[1]
      ?.replace(/<[^>]+>/g, "")
      .trim() ?? "";
  const appMsg =
    html
      .match(/id=["']ApplicationBlockMessage["'][^>]*>\s*([\s\S]*?)\s*<\/p>/i)?.[1]
      ?.replace(/<[^>]+>/g, "")
      .trim() ?? "";

  const msg = dataMsg || appMsg;
  const ok = msg.toUpperCase().includes("SUCCESSFUL");
  const failed =
    msg.toUpperCase().includes("FAILED") ||
    msg.toLowerCase().includes("unable to process");

  return {
    ok: ok || (!failed && !msg),
    text:
      msg ||
      (ok
        ? "Request submitted successfully."
        : "Unable to process request on VTOP."),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s.includes("approved") || s.includes("successful")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-safe-container) text-(--att-safe)">
        <CheckCircle className="w-3 h-3" />
        Approved
      </span>
    );
  }
  if (s.includes("cancel") || s.includes("reject")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-danger-container) text-(--att-danger)">
        <Cancel className="w-3 h-3" />
        Cancelled
      </span>
    );
  }
  if (s.includes("pending") || s.includes("raised")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-warn-container) text-(--att-warn)">
        <HourglassEmpty className="w-3 h-3" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--bg-highlight) text-(--text-muted)">
      {status || "—"}
    </span>
  );
}

function EntryCard({
  entry,
  onCancel,
  cancelling = false,
}: {
  entry: StatusEntry;
  onCancel?: (id: string) => void;
  cancelling?: boolean;
}) {
  const isPending =
    entry.status.toLowerCase().includes("pending") ||
    entry.status.toLowerCase().includes("raised");

  return (
    <div className="bg-(--bg-surface) border border-(--border-dim)/40 rounded-3xl p-4 md:p-5 flex flex-col gap-3 hover:bg-(--bg-highlight) transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-(--text-main) truncate">
            {entry.venue || "—"}
          </p>
          <p className="text-xs text-(--text-muted) mt-0.5 line-clamp-2">
            {entry.details || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={entry.status} />
          {onCancel && isPending && entry.id && (
            <button
              onClick={() => onCancel(entry.id)}
              disabled={cancelling}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-danger-container) text-(--att-danger) hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50">
              <Cancel className="w-3 h-3" />
              {cancelling ? "Cancelling..." : "Cancel"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-(--text-muted)">
          <Category className="w-3 h-3 text-(--accent-base)" />
          {entry.eventType || "—"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-(--text-muted)">
          <Person className="w-3 h-3 text-(--accent-base)" />
          {entry.appliedTo || "—"}
        </span>
      </div>

      {/* Date + time timeline pill */}
      <div className="flex items-center gap-0 w-full">
        <div className="px-3.5 py-2 rounded-full bg-(--bg-main) border border-r-0 border-(--border-dim)/60 text-xs font-mono font-bold flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-(--text-muted) uppercase leading-none mb-0.5">
            From
          </span>
          <span className="text-(--text-main) leading-none">
            {entry.fromDate || "—"}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-between py-2 px-4 rounded-2xl bg-(--bg-main)/60 border border-(--border-dim)/40 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-(--text-muted) uppercase">
              To
            </span>
            <span className="font-bold text-(--text-main)">
              {entry.toDate || "—"}
            </span>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "request" | "status" | "history";

export const LateHourPage: React.FC<LateHourPageProps> = ({ network }) => {
  const [activeTab, setActiveTab] = useState<Tab>("request");

  // Form values
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

  // Touch tracking for validation
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Cascading options
  const [schoolOpts, setSchoolOpts] = useState<SearchableOption[]>([]);
  const [facultyOpts, setFacultyOpts] = useState<SearchableOption[]>([]);
  const [blockOpts, setBlockOpts] = useState<SearchableOption[]>([]);
  const [venueOpts, setVenueOpts] = useState<SearchableOption[]>([]);
  const [fromTimeOpts, setFromTimeOpts] =
    useState<SearchableOption[]>(DEFAULT_TIME_OPTS);
  const [toTimeOpts, setToTimeOpts] =
    useState<SearchableOption[]>(DEFAULT_TIME_OPTS);

  // Loading states
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [loadingDateBlock, setLoadingDateBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  // Status / History
  const [statusEntries, setStatusEntries] = useState<StatusEntry[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<StatusEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const needsBuilding = venueType === "1" || venueType === "2";
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ── Validation Errors ─────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!school) errs.school = "Please select a school";
    if (!faculty) errs.faculty = "Please select a faculty";
    if (!venueType) errs.venueType = "Please select a venue type";
    if (needsBuilding) {
      if (!block) errs.block = "Please select an academic block";
      if (!venue) errs.venue = "Please select a venue";
    }
    if (!eventType) errs.eventType = "Please select category";
    if (!details.trim()) {
      errs.details = "Please enter brief details on work";
    } else if (details.trim().length < 4) {
      errs.details = "Details should be at least 4 characters";
    }
    if (!fromDate) {
      errs.fromDate = "Please select from date";
    }
    if (!toDate) {
      errs.toDate = "Please select to date";
    } else if (fromDate && toDate < fromDate) {
      errs.toDate = "To date cannot be earlier than From date";
    }
    if (!fromTime) errs.fromTime = "Please select from time";
    if (!toTime) errs.toTime = "Please select to time";

    return errs;
  }, [
    school,
    faculty,
    venueType,
    needsBuilding,
    block,
    venue,
    eventType,
    details,
    fromDate,
    toDate,
    fromTime,
    toTime,
  ]);

  const canSubmit = Object.keys(errors).length === 0;

  // Mark field as touched
  const touch = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  // ── Step 1 Init: load school options ──────────────────────────────────────
  useEffect(() => {
    setLoadingSchool(true);
    network
      .getLateHourInit()
      .then((html) => {
        const opts = parseOpts(html, "costCentreId");
        if (opts.length > 0) setSchoolOpts(opts);
      })
      .catch((e) => console.error("Late Hour Init Error:", e))
      .finally(() => setLoadingSchool(false));
  }, [network]);

  // ── Step 3: School → Faculty ──────────────────────────────────────────────
  const handleSchoolChange = useCallback(
    async (v: string) => {
      setSchool(v);
      touch("school");
      setFaculty("");
      setFacultyOpts([]);
      if (!v) return;

      setLoadingFaculty(true);
      try {
        const html = await network.getLateHourFaculties(v);
        setFacultyOpts(parseOpts(html, "appliedTo"));
      } catch (e) {
        console.error("Fetch Faculty Error:", e);
      } finally {
        setLoadingFaculty(false);
      }
    },
    [network],
  );

  // ── Step 4: VenueType → Academic Blocks ───────────────────────────────────
  const handleVenueTypeChange = useCallback(
    async (v: string) => {
      setVenueType(v);
      touch("venueType");
      setBlock("");
      setBlockOpts([]);
      setVenue("");
      setVenueOpts([]);

      if (!v) return;

      if (v === "1" || v === "2") {
        setLoadingBlocks(true);
        try {
          const html = await network.getLateHourAcademicBlocks({
            costCentreId: school,
            appliedTo: faculty,
            roomTypeId: v,
          });
          setBlockOpts(parseOpts(html, "buildingId"));
        } catch (e) {
          console.error("Fetch Blocks Error:", e);
        } finally {
          setLoadingBlocks(false);
        }
      }
    },
    [network, school, faculty],
  );

  // ── Step 5: Academic Block → Venues ───────────────────────────────────────
  const handleBlockChange = useCallback(
    async (v: string) => {
      setBlock(v);
      touch("block");
      setVenue("");
      setVenueOpts([]);
      if (!v) return;

      setLoadingVenues(true);
      try {
        const html = await network.getLateHourVenues({
          costCentreId: school,
          appliedTo: faculty,
          roomTypeId: venueType,
          buildingId: v,
        });
        setVenueOpts(parseOpts(html, "venue"));
      } catch (e) {
        console.error("Fetch Venues Error:", e);
      } finally {
        setLoadingVenues(false);
      }
    },
    [network, school, faculty, venueType],
  );

  // ── Step 6: Event Type → Date & Time Slots ────────────────────────────────
  const handleEventTypeChange = useCallback(
    async (v: string) => {
      setEventType(v);
      touch("eventType");
      if (!v) return;

      setLoadingDateBlock(true);
      try {
        const html = await network.getLateHourDateBlock({
          costCentreId: school,
          appliedTo: faculty,
          roomTypeId: venueType,
          buildingId: needsBuilding ? block : undefined,
          venue: needsBuilding ? venue : undefined,
          lateHourEventId: v,
        });

        const fromOpts = parseOpts(html, "fromTime");
        const toOpts = parseOpts(html, "toTime");

        if (fromOpts.length > 0) setFromTimeOpts(fromOpts);
        if (toOpts.length > 0) setToTimeOpts(toOpts);
      } catch (e) {
        console.error("Fetch DateBlock Error:", e);
      } finally {
        setLoadingDateBlock(false);
      }
    },
    [network, school, faculty, venueType, needsBuilding, block, venue],
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Touch all fields to trigger full validation display
    setTouched({
      school: true,
      faculty: true,
      venueType: true,
      block: true,
      venue: true,
      eventType: true,
      details: true,
      fromDate: true,
      toDate: true,
      fromTime: true,
      toTime: true,
    });

    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitMsg(null);

    try {
      const html = await network.submitLateHourRequest({
        costCentreId: school,
        appliedTo: faculty,
        roomTypeId: venueType,
        buildingId: needsBuilding ? block : undefined,
        venue: needsBuilding ? venue : undefined,
        lateHourEventId: eventType,
        details: details.trim(),
        lateHourFromDate: fromDate,
        fromTime,
        lateHourToDate: toDate,
        toTime,
      });

      const result = parseResponseMsg(html);
      setSubmitMsg(result);

      if (result.ok) {
        setDetails("");
        setTouched({});
        setTimeout(() => setActiveTab("status"), 1200);
      }
    } catch (e: any) {
      setSubmitMsg({
        ok: false,
        text: e.message || "Failed to submit request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status ────────────────────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const html = await network.getLateHourStatus();
      setStatusEntries(parseRows(html));
    } catch (e) {
      console.error("Fetch Status Error:", e);
    } finally {
      setStatusLoading(false);
    }
  }, [network]);

  const handleCancel = useCallback(
    async (id: string) => {
      setCancelling(id);
      try {
        const html = await network.cancelLateHourRequest(id);
        const result = parseResponseMsg(html);
        if (result.ok) {
          await loadStatus();
        } else {
          alert(result.text || "Failed to cancel request.");
        }
      } catch (e) {
        alert("Failed to cancel request. Please try again.");
      } finally {
        setCancelling(null);
      }
    },
    [network, loadStatus],
  );

  // ── History ───────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const html = await network.getLateHourHistory(true);
      setHistoryEntries(parseRows(html));
    } catch (e) {
      console.error("Fetch History Error:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, [network]);

  useEffect(() => {
    if (activeTab === "status") loadStatus();
    if (activeTab === "history") loadHistory();
  }, [activeTab, loadStatus, loadHistory]);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "request", label: "New Request", icon: Add },
    { id: "status", label: "My Requests", icon: HourglassEmpty },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar bg-(--bg-main) text-(--text-main) px-4 md:px-8 lg:px-12">
      <div className="pt-20 md:pt-23 lg:pt-25" />

      {/* Header */}
      <div className="pb-4 border-b border-(--border-dim)/40">
        <h1 className="text-xl md:text-2xl font-expanded font-black text-(--text-main)">
          Late Hour Permission
        </h1>
        <p className="text-xs text-(--text-muted) mt-0.5">
          Apply and track hostel late hour campus permissions
        </p>
      </div>

      {/* Segmented Tab Bar - LEFT ALIGNED */}
      <div className="flex items-center gap-1.5 p-1 bg-(--bg-surface) rounded-2xl border border-(--border-dim)/40 my-4 self-start">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
                isActive
                  ? "bg-(--accent-base) text-(--text-inverse) shadow-sm"
                  : "text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight)/50"
              }`}>
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Layout: Left side has content/form, Right side is empty */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-24 flex-1">
        <div className="lg:col-span-8 xl:col-span-7 flex flex-col gap-4">
          {/* TAB 1: NEW REQUEST */}
          {activeTab === "request" && (
            <div className="bg-(--bg-surface) border border-(--border-dim)/40 rounded-3xl p-5 md:p-7 flex flex-col gap-5">
              <div>
                <h2 className="text-xs font-mono font-black uppercase tracking-wider text-(--text-muted)">
                  Permission Details
                </h2>
                <p className="text-xs text-(--text-muted)/80 mt-0.5">
                  Select school, faculty, venue and time interval for the permission
                </p>
              </div>

              {/* School & Faculty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SearchableDropdown
                  label="Select School"
                  required
                  placeholder="— Choose School —"
                  searchPlaceholder="Search schools..."
                  options={schoolOpts}
                  value={school}
                  loading={loadingSchool}
                  error={touched.school ? errors.school : undefined}
                  onChange={handleSchoolChange}
                />
                <SearchableDropdown
                  label="Select Faculty"
                  required
                  placeholder="— Choose Faculty —"
                  searchPlaceholder="Search faculty name or ID..."
                  options={facultyOpts}
                  value={faculty}
                  disabled={!school}
                  loading={loadingFaculty}
                  error={touched.faculty ? errors.faculty : undefined}
                  helperText={!school ? "Select a school first" : undefined}
                  onChange={(v) => {
                    setFaculty(v);
                    touch("faculty");
                  }}
                />
              </div>

              {/* Venue Type & Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SearchableDropdown
                  label="Venue Type"
                  required
                  placeholder="— Choose Type —"
                  options={VENUE_TYPE_OPTS}
                  value={venueType}
                  disabled={!faculty}
                  error={touched.venueType ? errors.venueType : undefined}
                  helperText={!faculty ? "Select faculty first" : undefined}
                  onChange={handleVenueTypeChange}
                />
                {needsBuilding ? (
                  <>
                    <SearchableDropdown
                      label="Academic Block"
                      required
                      placeholder="— Choose Block —"
                      searchPlaceholder="Search block..."
                      options={blockOpts}
                      value={block}
                      disabled={!venueType}
                      loading={loadingBlocks}
                      error={touched.block ? errors.block : undefined}
                      onChange={handleBlockChange}
                    />
                    <SearchableDropdown
                      label="Select Venue"
                      required
                      placeholder="— Choose Venue —"
                      searchPlaceholder="Search venue code..."
                      options={venueOpts}
                      value={venue}
                      disabled={!block}
                      loading={loadingVenues}
                      error={touched.venue ? errors.venue : undefined}
                      onChange={(v) => {
                        setVenue(v);
                        touch("venue");
                      }}
                    />
                  </>
                ) : (
                  <div className="sm:col-span-2 flex flex-col justify-center px-4 py-3 rounded-2xl bg-(--bg-main)/50 border border-(--border-dim)/40 text-xs text-(--text-muted)">
                    <span className="font-bold text-(--text-main)/80 mb-0.5">
                      Fixed Location
                    </span>
                    Academic block and venue are pre-assigned for this venue type.
                  </div>
                )}
              </div>

              {/* Category & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SearchableDropdown
                  label="Work Related To"
                  required
                  placeholder="— Choose Category —"
                  options={EVENT_TYPE_OPTS}
                  value={eventType}
                  disabled={needsBuilding ? !venue : !venueType}
                  error={touched.eventType ? errors.eventType : undefined}
                  onChange={handleEventTypeChange}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide flex items-center gap-1">
                    Brief Details on Work
                    <span className="text-red-400 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={details}
                    onChange={(e) => {
                      setDetails(e.target.value);
                      touch("details");
                    }}
                    onBlur={() => touch("details")}
                    placeholder="e.g. Capstone Project experimentation"
                    className={`w-full h-10 px-3.5 rounded-2xl bg-(--bg-main) border text-sm font-medium text-(--text-main) placeholder:text-(--text-muted)/60 focus:outline-none transition-colors ${
                      touched.details && errors.details
                        ? "border-red-500/70 focus:border-red-500"
                        : "border-(--border-dim) focus:border-(--accent-base)"
                    }`}
                  />
                  {touched.details && errors.details && (
                    <span className="text-[10px] font-bold text-red-400">
                      {errors.details}
                    </span>
                  )}
                </div>
              </div>

              {/* Date and Time Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-(--border-dim)/30">
                {/* From Date & Time */}
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide flex items-center gap-1">
                      From Date
                      <span className="text-red-400 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        min={todayStr}
                        value={fromDate}
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          touch("fromDate");
                          if (toDate && e.target.value > toDate) {
                            setToDate(e.target.value);
                          }
                        }}
                        onBlur={() => touch("fromDate")}
                        className={`w-full h-10 px-3.5 rounded-2xl bg-(--bg-main) border text-sm font-medium font-mono text-(--text-main) focus:outline-none transition-colors ${
                          touched.fromDate && errors.fromDate
                            ? "border-red-500/70 focus:border-red-500"
                            : "border-(--border-dim) focus:border-(--accent-base)"
                        }`}
                      />
                    </div>
                    {touched.fromDate && errors.fromDate && (
                      <span className="text-[10px] font-bold text-red-400">
                        {errors.fromDate}
                      </span>
                    )}
                  </div>

                  <SearchableDropdown
                    label="From Time"
                    required
                    placeholder="— Choose Start Time —"
                    options={fromTimeOpts}
                    value={fromTime}
                    loading={loadingDateBlock}
                    error={touched.fromTime ? errors.fromTime : undefined}
                    onChange={(v) => {
                      setFromTime(v);
                      touch("fromTime");
                    }}
                  />
                </div>

                {/* To Date & Time */}
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide flex items-center gap-1">
                      To Date
                      <span className="text-red-400 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        min={fromDate || todayStr}
                        value={toDate}
                        onChange={(e) => {
                          setToDate(e.target.value);
                          touch("toDate");
                        }}
                        onBlur={() => touch("toDate")}
                        className={`w-full h-10 px-3.5 rounded-2xl bg-(--bg-main) border text-sm font-medium font-mono text-(--text-main) focus:outline-none transition-colors ${
                          touched.toDate && errors.toDate
                            ? "border-red-500/70 focus:border-red-500"
                            : "border-(--border-dim) focus:border-(--accent-base)"
                        }`}
                      />
                    </div>
                    {touched.toDate && errors.toDate && (
                      <span className="text-[10px] font-bold text-red-400">
                        {errors.toDate}
                      </span>
                    )}
                  </div>

                  <SearchableDropdown
                    label="To Time"
                    required
                    placeholder="— Choose End Time —"
                    options={toTimeOpts}
                    value={toTime}
                    loading={loadingDateBlock}
                    error={touched.toTime ? errors.toTime : undefined}
                    onChange={(v) => {
                      setToTime(v);
                      touch("toTime");
                    }}
                  />
                </div>
              </div>

              {/* Status Alert Message */}
              {submitMsg && (
                <div
                  className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 ${
                    submitMsg.ok
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/15 text-red-400 border border-red-500/30"
                  }`}>
                  {submitMsg.ok ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <Warning className="w-4 h-4 shrink-0" />
                  )}
                  <span>{submitMsg.text}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-2 border-0 mt-2 ${
                  canSubmit
                    ? "bg-(--accent-base) text-(--text-inverse) hover:opacity-90 active:scale-[0.99]"
                    : "bg-(--bg-main) text-(--text-muted) border border-(--border-dim) opacity-70"
                }`}>
                <Send className="w-4 h-4" />
                {submitting
                  ? "Submitting to VTOP..."
                  : "Submit Late Hour Request"}
              </button>
            </div>
          )}

          {/* TAB 2: MY REQUESTS (STATUS) */}
          {activeTab === "status" && (
            <div className="flex flex-col gap-3">
              {statusLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-28 bg-(--bg-surface) rounded-3xl animate-pulse border border-(--border-dim)/40"
                    />
                  ))}
                </div>
              ) : statusEntries.length > 0 ? (
                statusEntries.map((e, idx) => (
                  <EntryCard
                    key={idx}
                    entry={e}
                    onCancel={handleCancel}
                    cancelling={cancelling === e.id}
                  />
                ))
              ) : (
                <EmptyState
                  icon={HourglassEmpty}
                  msg="No Active Requests"
                  subMsg="You do not have any pending or active late hour requests."
                />
              )}
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === "history" && (
            <div className="flex flex-col gap-3">
              {historyLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-28 bg-(--bg-surface) rounded-3xl animate-pulse border border-(--border-dim)/40"
                    />
                  ))}
                </div>
              ) : historyEntries.length > 0 ? (
                historyEntries.map((e, idx) => <EntryCard key={idx} entry={e} />)
              ) : (
                <EmptyState
                  icon={History}
                  msg="No Permission History"
                  subMsg="Previous late hour permissions will show up here."
                />
              )}
            </div>
          )}
        </div>

        {/* Right side empty as requested */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-5 pointer-events-none" />
      </div>
    </div>
  );
};

export default LateHourPage;
