import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Add,
  History,
  CheckCircle,
  HourglassEmpty,
  Warning,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { VTOPNetwork } from "../utils/network";
import { EmptyState } from "../components/EmptyState";
import {
  SearchableDropdown,
  SearchableOption,
} from "../components/ui/SearchableDropdown";
import { EntryCard } from "../components/late-hour/EntryCard";
import { LateHourStatusEntry } from "../types/vtop";
import {
  parseLateHourSelectOpts,
  parseLateHourRows,
  parseLateHourResponseMsg,
} from "../parsers/late-hour";
import { showAlertDialog } from "../components/ui/AlertDialog";
import { formatTimeStr, parseVtopDate } from "../utils/formatting";

interface LateHourPageProps {
  network: VTOPNetwork;
}

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

type Tab = "request" | "status" | "history";

export const LateHourPage: React.FC<LateHourPageProps> = ({ network }) => {
  const isOffline = useMemo(
    () =>
      typeof window !== "undefined" &&
      (!!(window as any).__RETOP_OFFLINE__ ||
        window.location.pathname.includes("offline") ||
        window.location.hostname.includes("web.app") ||
        window.location.protocol === "file:"),
    [],
  );

  const [activeTab, setActiveTab] = useState<Tab>(() =>
    isOffline ? "status" : "request",
  );

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
  const [statusEntries, setStatusEntries] = useState<LateHourStatusEntry[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<LateHourStatusEntry[]>(
    [],
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const needsBuilding = venueType === "1" || venueType === "2";
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Validation errors
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
    if (!fromDate) errs.fromDate = "Please select from date";
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
  const touch = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  // Step 1 & 2 Init: load school options
  useEffect(() => {
    if (isOffline) return;
    setLoadingSchool(true);
    network
      .getLateHourInit()
      .then((html) => {
        const opts = parseLateHourSelectOpts(html, "costCentreId");
        if (opts.length > 0) setSchoolOpts(opts);
      })
      .catch((e) => console.error("Late Hour Init Error:", e))
      .finally(() => setLoadingSchool(false));
  }, [network, isOffline]);

  // Step 3: School → Faculty
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
        setFacultyOpts(parseLateHourSelectOpts(html, "appliedTo"));
      } catch (e) {
        console.error("Fetch Faculty Error:", e);
      } finally {
        setLoadingFaculty(false);
      }
    },
    [network],
  );

  // Step 4: VenueType → Academic Blocks
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
          setBlockOpts(parseLateHourSelectOpts(html, "buildingId"));
        } catch (e) {
          console.error("Fetch Blocks Error:", e);
        } finally {
          setLoadingBlocks(false);
        }
      }
    },
    [network, school, faculty],
  );

  // Step 5: Academic Block → Venues
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
        setVenueOpts(parseLateHourSelectOpts(html, "venue"));
      } catch (e) {
        console.error("Fetch Venues Error:", e);
      } finally {
        setLoadingVenues(false);
      }
    },
    [network, school, faculty, venueType],
  );

  // Step 6: Event Type → Date & Time Slots
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

        const fromOpts = parseLateHourSelectOpts(html, "fromTime");
        const toOpts = parseLateHourSelectOpts(html, "toTime");

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

  // Step 7: From Time → Dynamic To Time Slots
  const handleFromTimeChange = useCallback(
    async (v: string) => {
      setFromTime(v);
      touch("fromTime");
      if (!v) return;

      try {
        const html = await network.getLateHourToTimeOptions({
          costCentreId: school,
          appliedTo: faculty,
          roomTypeId: venueType,
          buildingId: needsBuilding ? block : undefined,
          venue: needsBuilding ? venue : undefined,
          lateHourEventId: eventType,
          details,
          lateHourFromDate: fromDate,
          fromTime: v,
          lateHourToDate: toDate,
        });

        const toOpts = parseLateHourSelectOpts(html, "toTime");
        if (toOpts.length > 0) {
          setToTimeOpts(toOpts);
        }
      } catch (e) {
        console.error("Fetch ToTime Options Error:", e);
      }
    },
    [
      network,
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
    ],
  );

  // Status loader (cached with user-scoped keys)
  const loadStatus = useCallback(
    async (force = false) => {
      setStatusLoading(true);
      try {
        const html = await network.getLateHourStatus(force);
        const entries =
          typeof html === "string" ? parseLateHourRows(html) : html;
        setStatusEntries(Array.isArray(entries) ? entries : []);
      } catch (e) {
        console.error("Fetch Status Error:", e);
      } finally {
        setStatusLoading(false);
      }
    },
    [network],
  );

  // History loader (cached with user-scoped keys)
  const loadHistory = useCallback(
    async (force = false) => {
      setHistoryLoading(true);
      try {
        const html = await network.getLateHourHistory(force);
        const entries =
          typeof html === "string" ? parseLateHourRows(html) : html;
        setHistoryEntries(Array.isArray(entries) ? entries : []);
      } catch (e) {
        console.error("Fetch History Error:", e);
      } finally {
        setHistoryLoading(false);
      }
    },
    [network],
  );

  // Redo / Modify existing request from history or status
  const handleRedo = useCallback(async (entry: LateHourStatusEntry) => {
    setActiveTab("request");
    setSubmitMsg(null);

    if (entry.details) setDetails(entry.details);

    // Match event category
    const matchedEvt = EVENT_TYPE_OPTS.find(
      (opt) =>
        opt.label.toLowerCase() === entry.eventType.toLowerCase() ||
        opt.value.toLowerCase() === entry.eventType.toLowerCase() ||
        entry.eventType.toLowerCase().includes(opt.label.toLowerCase()),
    );
    if (matchedEvt) {
      setEventType(matchedEvt.value);
    }

    // Convert VTOP date like "18-AUG-2026" to YYYY-MM-DD
    if (entry.fromDate) {
      const parsed = parseVtopDate(entry.fromDate);
      if (parsed && !isNaN(parsed.getTime())) {
        setFromDate(`${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`);
      }
    }
    if (entry.toDate) {
      const parsed = parseVtopDate(entry.toDate);
      if (parsed && !isNaN(parsed.getTime())) {
        setToDate(`${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`);
      }
    }

    // Extract time slots
    if (entry.time) {
      const parts = entry.time.split(/to|-/i).map((s) => s.trim());
      if (parts[0]) {
        const formatted = formatTimeStr(parts[0], "12h-ampm");
        if (formatted) setFromTime(formatted);
      }
      if (parts[1]) {
        const formatted = formatTimeStr(parts[1], "12h-ampm");
        if (formatted) setToTime(formatted);
      }
    }
  }, []);

  // Submit request
  const handleSubmit = async () => {
    if (isOffline) {
      setSubmitMsg({
        ok: false,
        text: "Request submission is not available in the offline app.",
      });
      return;
    }

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

      const result = parseLateHourResponseMsg(html);
      setSubmitMsg(result);

      if (result.ok) {
        setDetails("");
        setTouched({});
        setActiveTab("status");
        loadStatus(true);
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

  // Cancel pending request
  const handleCancel = useCallback(
    async (id: string) => {
      if (isOffline) return;
      setCancelling(id);
      try {
        const html = await network.cancelLateHourRequest(id);
        const result = parseLateHourResponseMsg(html);
        if (result.ok) {
          await loadStatus(true);
        } else {
          showAlertDialog({
            title: "Cancellation Failed",
            message: result.text || "Failed to cancel request.",
          });
        }
      } catch (e) {
        showAlertDialog({
          title: "Cancellation Error",
          message: "Failed to cancel request. Please try again.",
        });
      } finally {
        setCancelling(null);
      }
    },
    [network, loadStatus, isOffline],
  );

  useEffect(() => {
    if (activeTab === "status") loadStatus();
    if (activeTab === "history") loadHistory();
  }, [activeTab, loadStatus, loadHistory]);

  // Listen to TopBar sync refresh event
  useEffect(() => {
    const onRefresh = () => {
      if (activeTab === "status") loadStatus(true);
      if (activeTab === "history") loadHistory(true);
    };
    window.addEventListener("retop-refresh-late-hour", onRefresh);
    return () =>
      window.removeEventListener("retop-refresh-late-hour", onRefresh);
  }, [activeTab, loadStatus, loadHistory]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] =
    useMemo(() => {
      if (isOffline) {
        return [
          { id: "status", label: "My Requests", icon: HourglassEmpty },
          { id: "history", label: "History", icon: History },
        ];
      }
      return [
        { id: "request", label: "New Request", icon: Add },
        { id: "status", label: "My Requests", icon: HourglassEmpty },
        { id: "history", label: "History", icon: History },
      ];
    }, [isOffline]);

  const renderContent = () => {
    return (
      <div className="flex flex-col gap-5 max-w-4xl w-full">
        {/* TAB 1: NEW REQUEST (Online only) */}
        {!isOffline && activeTab === "request" && (
          <div className="flex flex-col gap-4 w-full">
            {/* Form hint — the top bar already names the page */}
            <p className="text-xs text-(--text-muted)">
              Fill in your faculty guide, venue, and designated working hours
            </p>

            {/* School & Faculty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SearchableDropdown
                label="School / Centre"
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
                label="Faculty Guide"
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

            {/* Venue & Location */}
            <div
              className={`grid grid-cols-1 ${needsBuilding ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}
            >
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
                    label="Specific Venue"
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
                <div className="flex flex-col justify-center px-4 py-2 rounded-2xl bg-(--bg-surface) border border-(--border-dim)/50 text-xs text-(--text-muted)">
                  <span className="font-semibold text-(--text-main) mb-0.5">
                    Fixed Facility Venue
                  </span>
                  Location is pre-assigned for this category.
                </div>
              )}
            </div>

            {/* Purpose & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SearchableDropdown
                label="Work Category"
                required
                placeholder="— Choose Category —"
                options={EVENT_TYPE_OPTS}
                value={eventType}
                disabled={needsBuilding ? !venue : !venueType}
                error={touched.eventType ? errors.eventType : undefined}
                onChange={handleEventTypeChange}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-1">
                  Brief Work Summary
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
                  placeholder="e.g. Project prototype testing & validation"
                  className={`w-full h-11 px-4 rounded-2xl bg-(--bg-surface) border text-sm font-medium text-(--text-main) placeholder:text-(--text-muted)/50 focus:outline-none transition-all ${
                    touched.details && errors.details
                      ? "border-red-500/70 focus:ring-2 focus:ring-red-500/30"
                      : "border-(--border-dim)/50 focus:border-(--accent-base) focus:ring-2 focus:ring-(--accent-base)/20"
                  }`}
                />
                {touched.details && errors.details && (
                  <span className="text-[10px] font-bold text-red-400">
                    {errors.details}
                  </span>
                )}
              </div>
            </div>

            {/* Date & Time Window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* From Date & Time */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-1">
                    From Date
                    <span className="text-red-400 font-bold">*</span>
                  </label>
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
                    className={`w-full h-11 px-4 rounded-2xl bg-(--bg-surface) border text-sm font-medium text-(--text-main) focus:outline-none transition-all ${
                      touched.fromDate && errors.fromDate
                        ? "border-red-500/70 focus:ring-2 focus:ring-red-500/30"
                        : "border-(--border-dim)/50 focus:border-(--accent-base) focus:ring-2 focus:ring-(--accent-base)/20"
                    }`}
                  />
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
                  onChange={handleFromTimeChange}
                />
              </div>

              {/* To Date & Time */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-1">
                    To Date
                    <span className="text-red-400 font-bold">*</span>
                  </label>
                  <input
                    type="date"
                    min={fromDate || todayStr}
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      touch("toDate");
                    }}
                    onBlur={() => touch("toDate")}
                    className={`w-full h-11 px-4 rounded-2xl bg-(--bg-surface) border text-sm font-medium text-(--text-main) focus:outline-none transition-all ${
                      touched.toDate && errors.toDate
                        ? "border-red-500/70 focus:ring-2 focus:ring-red-500/30"
                        : "border-(--border-dim)/50 focus:border-(--accent-base) focus:ring-2 focus:ring-(--accent-base)/20"
                    }`}
                  />
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

            {submitMsg && (
              <div
                className={`p-3.5 rounded-2xl font-semibold text-xs flex items-center gap-2.5 ${
                  submitMsg.ok
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/15 text-red-400 border border-red-500/30"
                }`}
              >
                {submitMsg.ok ? (
                  <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                ) : (
                  <Warning className="w-4.5 h-4.5 shrink-0" />
                )}
                <span>{submitMsg.text}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className={`w-full h-12 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border-0 shadow-md ${
                canSubmit
                  ? "bg-(--accent-base) text-(--text-inverse) hover:opacity-90 active:scale-[0.99] cursor-pointer"
                  : "bg-(--bg-surface) text-(--text-muted) border border-(--border-dim)/50 opacity-60 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <>
                  Submitting to{" "}
                  <span className="font-vtop font-bold ml-1">VTOP</span>...
                </>
              ) : (
                "Submit Late Hour Request"
              )}
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
                  onRedo={handleRedo}
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
              historyEntries.map((e, idx) => (
                <EntryCard key={idx} entry={e} onRedo={handleRedo} />
              ))
            ) : (
              <EmptyState
                icon={History}
                msg="No Permission History"
                subMsg="Previous late hour requests will show up here."
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-(--bg-main) text-(--text-main) py-0 px-2 md:px-6 lg:px-8 max-w-425 mx-auto overflow-hidden">
      {/* DESKTOP 2-COLUMN VIEW (md:flex) */}
      <div className="hidden md:flex w-full flex-1 flex-row gap-6 md:gap-8 min-h-0 overflow-hidden h-full">
        {/* Left Column: Fixed Tabs Sidebar */}
        <div className="w-52 lg:w-56 shrink-0 flex flex-col gap-1 h-fit pt-20 md:pt-23 lg:pt-25 pb-6">
          <div className="flex flex-col p-1.5 bg-(--bg-surface) rounded-3xl border border-(--border-dim)/50 shadow-sm w-full gap-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-start gap-2.5 cursor-pointer border-0 select-none ${
                    isActive
                      ? "bg-(--accent-base) text-(--text-inverse) shadow-xs"
                      : "text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight)/60"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Scrolling Main View (constrained width) */}
        <div className="flex-1 max-w-2xl xl:max-w-3xl min-w-0 h-full overflow-y-auto custom-scrollbar pt-20 md:pt-23 lg:pt-25 pb-24 pr-1">
          {renderContent()}
        </div>
      </div>

      {/* MOBILE VIEW (md:hidden) */}
      <div className="flex md:hidden flex-col w-full h-full overflow-y-auto custom-scrollbar pt-20 pb-24">
        {/* Sticky Mobile Tabs Bar */}
        <div className="sticky top-0 z-30 bg-(--bg-main)/85 backdrop-blur-md py-2.5 mb-4 flex items-center justify-start shrink-0 -mx-4 px-4">
          <div className="inline-flex items-center p-1 bg-(--bg-surface) rounded-full border border-(--border-dim)/50 shadow-sm">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`py-2 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 select-none ${
                    isActive
                      ? "bg-(--accent-base) text-(--text-inverse) shadow-xs"
                      : "text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight)/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Main Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default LateHourPage;
