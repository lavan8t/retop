import React, { useEffect } from "react";
import { VTOPNetwork } from "../utils/network";
import { useDataStore } from "../store/dataStore";
import { useSettingsStore } from "../utils/settings-store";
import { formatDateStr } from "../utils/formatting";
import { EmptyState } from "../components/EmptyState";
import { OfflineNotSynced } from "../components/ui/OfflineNotSynced";
import { Tooltip } from "../components/ui/Tooltip";
import {
  Event,
  LocationOn,
  Schedule,
  EventSeat,
  Info,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { ExamEntry } from "../parsers/exam-schedule";

interface ExamSchedulePageProps {
  network: VTOPNetwork;
}

export interface AcademicExamDateItem {
  title: string;
  startDateStr: string;
  endDateStr?: string;
  isUpcoming: boolean;
}

export function parseAcademicExamDates(
  calGridData: any[],
  dateFormatPattern: string = "DD Mon YYYY",
): AcademicExamDateItem[] {
  if (!calGridData || calGridData.length === 0) return [];

  const groupMap = new Map<string, Date[]>();

  for (const month of calGridData) {
    if (!month.days) continue;
    for (const day of month.days) {
      if (!day.info || !day.dateObj) continue;
      const text = day.info.trim();
      const lower = text.toLowerCase();

      if (
        lower.includes("cat") ||
        lower.includes("fat") ||
        lower.includes("exam") ||
        lower.includes("assessment") ||
        lower.includes("test")
      ) {
        const cleanTitle = text
          .replace(/starts?|ends?|commence(s|ment)?|schedule/gi, "")
          .replace(/[-_]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const dObj = new Date(day.dateObj);
        if (isNaN(dObj.getTime())) continue;

        if (!groupMap.has(cleanTitle)) {
          groupMap.set(cleanTitle, []);
        }
        groupMap.get(cleanTitle)!.push(dObj);
      }
    }
  }

  const results: AcademicExamDateItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  groupMap.forEach((dates, title) => {
    dates.sort((a, b) => a.getTime() - b.getTime());
    const start = dates[0];
    const end = dates[dates.length - 1];

    const startDateStr = formatDateStr(start.toISOString(), dateFormatPattern);
    const endDateStr =
      start.toDateString() !== end.toDateString()
        ? formatDateStr(end.toISOString(), dateFormatPattern)
        : undefined;

    const isUpcoming = end.getTime() >= today.getTime();

    results.push({
      title: title || "Academic Exam",
      startDateStr,
      endDateStr,
      isUpcoming,
    });
  });

  return results;
}

function parseTimeline(examTimeStr: string, reportingTimeStr: string) {
  let startTime = "";
  let endTime = "";
  let durationText = "";

  if (examTimeStr && examTimeStr.includes("-")) {
    const parts = examTimeStr.split("-").map((s) => s.trim());
    startTime = parts[0];
    endTime = parts[1];
  } else {
    startTime = examTimeStr || "";
  }

  const parseMins = (tStr: string) => {
    if (!tStr) return NaN;
    const clean = tStr.replace(/(AM|PM)/i, "").trim();
    const parts = clean.split(":");
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return NaN;
      if (tStr.toUpperCase().includes("PM") && h < 12) h += 12;
      if (tStr.toUpperCase().includes("AM") && h === 12) h = 0;
      return h * 60 + m;
    }
    return NaN;
  };

  const startMins = parseMins(startTime);
  const endMins = parseMins(endTime);

  if (!isNaN(startMins) && !isNaN(endMins) && endMins > startMins) {
    const diff = endMins - startMins;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hrs > 0 && mins > 0) durationText = `${hrs}h ${mins}m`;
    else if (hrs > 0) durationText = `${hrs} hr${hrs > 1 ? "s" : ""}`;
    else durationText = `${mins} mins`;
  }

  return {
    reportingTime: reportingTimeStr || "N/A",
    startTime: startTime || "TBA",
    endTime: endTime || "",
    durationText,
  };
}

const ExamCardM3 = ({
  entry,
  groupType,
  dateFormatPattern,
}: {
  entry: ExamEntry;
  groupType: string;
  dateFormatPattern: string;
}) => {
  const timeline = parseTimeline(entry.examTime, entry.reportingTime);
  const formattedDate = formatDateStr(entry.examDate, dateFormatPattern);

  return (
    <div className="bg-(--bg-surface) border-2 border-(--border-dim) rounded-3xl p-5 md:p-6 flex flex-col gap-5 hover:border-(--accent-base)/40 transition-all shadow-xs">
      {/* Top Header: Course Title & Date */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl md:text-2xl font-black font-expanded text-(--text-main) leading-tight tracking-tight">
            {entry.courseTitle}
          </h3>

          {/* Clean Pill Items Below Course Title (Code & Slot only) */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="px-3 py-1 rounded-full bg-(--bg-main) text-(--text-main) text-xs font-black font-mono border border-(--border-dim)">
              {entry.courseCode}
            </span>
            {entry.slot && (
              <span className="px-3 py-1 rounded-full bg-(--bg-main) text-(--text-muted) text-xs font-bold font-mono border border-(--border-dim)">
                {entry.slot.replace(/^SLOT:\s*/i, "")}
              </span>
            )}
          </div>
        </div>

        {/* Exam Date & Session */}
        <div className="flex flex-col items-start md:items-end shrink-0 bg-(--bg-main) px-4 py-2 rounded-2xl border border-(--border-dim)">
          <div className="text-base md:text-lg font-black font-mono text-(--text-main)">
            {formattedDate}
          </div>
          <div className="text-xs font-black text-(--accent-base) uppercase tracking-widest mt-0.5">
            {entry.examSession || "SESSION TBA"}
          </div>
        </div>
      </div>

      {/* Timeline Bar Section */}
      <div className="bg-(--bg-main) p-5 rounded-2xl border border-(--border-dim) flex flex-col gap-4">
        <div className="flex items-center justify-between relative py-1">
          {/* Fully Rounded Connecting Timeline Line */}
          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1.5 bg-(--border-main) rounded-full" />

          {/* Left Column: Repott & Start */}
          <div className="relative z-10 flex items-center gap-6 bg-(--bg-main) pr-3">
            <div className="flex flex-col items-start">
              <span className="font-mono font-black text-sm md:text-base text-(--text-main)">
                {timeline.reportingTime}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted) mt-0.5">
                Report
              </span>
            </div>

            <div className="flex flex-col items-start">
              <span className="font-mono font-black text-sm md:text-base text-(--text-main)">
                {timeline.startTime}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted) mt-0.5">
                Start
              </span>
            </div>
          </div>

          {/* Center: Total Duration */}
          {timeline.durationText && (
            <div className="relative z-10 hidden sm:flex flex-col items-center bg-(--bg-main) px-3">
              <span className="px-3 py-1 rounded-full bg-(--bg-surface) text-(--text-main) text-xs font-black font-mono border border-(--border-dim) shadow-xs flex items-center gap-1">
                <Schedule className="w-3.5 h-3.5 text-(--accent-base)" />
                {timeline.durationText}
              </span>
            </div>
          )}

          {/* Right Column: End Time */}
          <div className="relative z-10 flex flex-col items-end bg-(--bg-main) pl-3 text-right">
            <span className="font-mono font-black text-sm md:text-base text-(--text-main)">
              {timeline.endTime || "TBA"}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted) mt-0.5">
              End
            </span>
          </div>
        </div>

        {/* Venue & Seat Info Below Timeline */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold pt-3 border-t border-(--border-dim)">
          <Tooltip text="Venue">
            <div className="flex items-center gap-2 text-(--text-main)">
              <LocationOn className="w-4 h-4 text-(--accent-base) shrink-0" />
              <span className="font-expanded font-black text-(--text-main)">{entry.venue || "TBA"}</span>
            </div>
          </Tooltip>
          {entry.seatNo && (
            <Tooltip text="Seat Location & Number">
              <div className="flex items-center gap-2 text-(--text-main)">
                <EventSeat className="w-4 h-4 text-(--accent-base) shrink-0" />
                <span className="font-expanded font-black text-(--text-main)">{entry.seatLocation} #{entry.seatNo}</span>
              </div>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};

export const ExamSchedulePage: React.FC<ExamSchedulePageProps> = ({ network }) => {
  const {
    examSemesters,
    examGroups,
    examReportingNote,
    examLoading,
    calGridData,
    status,
    fetchExamSemesters,
  } = useDataStore();

  const { settings } = useSettingsStore();
  const dateFormatPattern = settings.dateFormat || "DD Mon YYYY";

  useEffect(() => {
    if (status !== "Demo Mode Active" && examSemesters.length === 0) {
      fetchExamSemesters(network);
    }
  }, [status, examSemesters.length, fetchExamSemesters, network]);

  const academicExams = parseAcademicExamDates(calGridData, dateFormatPattern);
  const allEntriesWithGroup = examGroups.flatMap((grp) =>
    grp.entries.map((entry) => ({ entry, groupType: grp.examType })),
  );

  if (status === "Offline - Not Synced") {
    return <OfflineNotSynced />;
  }

  return (
    <div className="h-full w-full bg-(--bg-main) text-(--text-main) overflow-hidden relative z-0 flex">
      <div className="flex-1 flex flex-col w-full h-full overflow-y-auto">
        <div className="w-full h-21 md:h-25 shrink-0" />

        <div className="flex-1 pb-20 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {/* Two-Column Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
              
              {/* 1. Exam Reporting Note FIRST at Top */}
              {examReportingNote && (
                <div className="p-5 rounded-3xl bg-(--bg-surface) border-2 border-(--border-dim) text-(--text-main) text-xs flex flex-col gap-2 shadow-xs">
                  <div className="flex items-center gap-2 text-orange-500 font-bold uppercase tracking-wider text-[11px]">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Exam Reporting Notice</span>
                  </div>
                  <p className="font-medium text-(--text-muted) leading-relaxed">
                    {examReportingNote}
                  </p>
                </div>
              )}

              {/* Grouped Exam List */}
              {academicExams.length > 0 ? (
                <div className="flex flex-col rounded-3xl overflow-hidden bg-(--bg-highlight) border-2 border-(--border-dim)">
                  {academicExams.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 bg-(--bg-highlight) hover:bg-(--bg-surface) transition-colors flex flex-col gap-0.5 border-b border-(--border-dim) last:border-b-0"
                    >
                      <span className="text-xs font-black font-expanded uppercase text-(--text-main)">
                        {item.title}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-(--text-muted)">
                        {item.startDateStr} {item.endDateStr ? `to ${item.endDateStr}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : examGroups.length > 0 ? (
                <div className="flex flex-col rounded-3xl overflow-hidden bg-(--bg-highlight) border-2 border-(--border-dim)">
                  {examGroups.map((grp, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 bg-(--bg-highlight) hover:bg-(--bg-surface) transition-colors flex flex-col gap-0.5 border-b border-(--border-dim) last:border-b-0"
                    >
                      <span className="text-xs font-black font-expanded uppercase text-(--text-main)">
                        {grp.examType}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* RIGHT COLUMN: All Exam Cards */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {examLoading && allEntriesWithGroup.length === 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-48 bg-(--bg-surface) rounded-3xl border-2 border-(--border-dim) animate-pulse"
                    />
                  ))}
                </div>
              ) : allEntriesWithGroup.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {allEntriesWithGroup.map(({ entry, groupType }, idx) => (
                    <ExamCardM3
                      key={idx}
                      entry={entry}
                      groupType={groupType}
                      dateFormatPattern={dateFormatPattern}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Event}
                  msg="No Exams Scheduled"
                  subMsg="Could not find any exam schedule entries for the selected semester."
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
