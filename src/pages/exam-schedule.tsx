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

export function parseSeatPosition(seatLocation: string = "", seatNo: string = ""): { row: number; col: number; seatNumber: number } | null {
  const combined = `${seatLocation} ${seatNo}`.trim().toUpperCase();

  // Pattern 1: R<row>C<col> (e.g. R3C4, R1C2, R7C10)
  const rcMatch = combined.match(/R(\d+)\s*C(\d+)/i);
  if (rcMatch) {
    const row = parseInt(rcMatch[1], 10);
    const col = parseInt(rcMatch[2], 10);
    if (row >= 1 && row <= 7 && col >= 1 && col <= 10) {
      const seatNumber = (row - 1) * 10 + col;
      return { row, col, seatNumber };
    }
  }

  // Pattern 2: Explicit seat number 1..70
  const numVal = parseInt(seatNo || seatLocation.replace(/\D/g, ""), 10);
  if (!isNaN(numVal) && numVal >= 1 && numVal <= 70) {
    const row = Math.ceil(numVal / 10);
    const col = ((numVal - 1) % 10) + 1;
    return { row, col, seatNumber: numVal };
  }

  return null;
}

const ClassroomSeatingMapCard = ({ entry }: { entry: ExamEntry | null }) => {
  if (!entry) {
    return (
      <div className="p-5 rounded-3xl bg-(--bg-surface) border-2 border-(--border-dim) flex flex-col items-center justify-center text-center gap-2 min-h-[220px]">
        <EventSeat className="w-8 h-8 text-(--text-muted) opacity-40" />
        <span className="text-xs font-bold text-(--text-muted)">
          Hover an exam to preview your seat position
        </span>
      </div>
    );
  }

  const seatPos = parseSeatPosition(entry.seatLocation, entry.seatNo);
  const rows = [1, 2, 3, 4, 5, 6, 7];
  const colPairs = [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
    [9, 10],
  ];

  return (
    <div className="p-4 md:p-5 rounded-3xl bg-(--bg-surface) border-2 border-(--border-dim) flex flex-col gap-3.5 shadow-xs transition-all">
      <div className="flex items-center justify-between">
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-xs font-black font-expanded uppercase truncate text-(--text-main)">
            {entry.courseCode} Seat Map
          </span>
          <span className="text-[10px] font-mono text-(--text-muted) truncate">
            {entry.venue || "Hall"} • {seatPos ? `Row ${seatPos.row}, Col ${seatPos.col}` : entry.seatLocation || "Assigned Seat"}
          </span>
        </div>
        {seatPos && (
          <span className="px-2.5 py-1 rounded-full bg-(--accent-base) text-(--text-inverse) text-xs font-black font-mono shrink-0">
            #{seatPos.seatNumber}
          </span>
        )}
      </div>

      {/* Screen / Front Indicator */}
      <div className="w-full text-center py-1 rounded-lg bg-(--bg-main) border border-(--border-dim) text-[9px] font-mono font-bold uppercase tracking-widest text-(--text-muted)">
        FRONT / BOARD
      </div>

      {/* 7 Rows x 10 Columns Grid with 2-Column Pairing & Aisle Gaps */}
      <div className="flex flex-col gap-1.5 w-full my-1">
        {rows.map((r) => (
          <div key={r} className="flex items-center justify-between gap-1 w-full">
            <span className="text-[9px] font-mono font-bold text-(--text-muted) w-3 text-center shrink-0">
              R{r}
            </span>
            <div className="flex items-center justify-between flex-1 gap-1 md:gap-1.5">
              {colPairs.map((pair, pIdx) => (
                <div key={pIdx} className="flex items-center gap-0.5 md:gap-1">
                  {pair.map((c) => {
                    const isUserSeat = seatPos?.row === r && seatPos?.col === c;
                    const seatNum = (r - 1) * 10 + c;

                    return (
                      <div
                        key={c}
                        title={`Row ${r}, Col ${c} (Seat #${seatNum})`}
                        className={`w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center text-[9px] md:text-[10px] font-mono font-bold transition-all ${
                          isUserSeat
                            ? "bg-(--accent-base) text-(--text-inverse) scale-110 shadow-xs ring-2 ring-(--accent-base)/50 z-10"
                            : "bg-(--bg-main) border border-(--border-dim)/40 text-transparent"
                        }`}
                      >
                        {isUserSeat ? seatNum : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-(--border-dim) text-[10px] font-mono text-(--text-muted)">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-(--accent-base)" />
          <span>Your Seat ({seatPos ? `#${seatPos.seatNumber}` : "Assigned"})</span>
        </div>
        <span>Capacity: 70</span>
      </div>
    </div>
  );
};

const ExamCardM3 = ({
  entry,
  groupType,
  dateFormatPattern,
  onHover,
}: {
  entry: ExamEntry;
  groupType: string;
  dateFormatPattern: string;
  onHover?: (entry: ExamEntry | null) => void;
}) => {
  const timeline = parseTimeline(entry.examTime, entry.reportingTime);
  const formattedDate = formatDateStr(entry.examDate, dateFormatPattern);

  return (
    <div
      onMouseEnter={() => onHover?.(entry)}
      onMouseLeave={() => onHover?.(null)}
      className="bg-(--bg-surface) hover:bg-(--bg-highlight) border-b border-(--border-dim)/40 last:border-b-0 p-4 md:p-5 transition-colors flex flex-col gap-3.5 cursor-pointer"
    >
      {/* Top Header: Course Info & Exam Date */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-md bg-(--accent-base)/15 text-(--accent-base) text-[10px] font-black font-mono uppercase tracking-wider">
              {groupType || "EXAM"}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-(--bg-main) text-(--text-muted) text-[10px] font-bold font-mono">
              {entry.courseCode}
            </span>
            {entry.slot && (
              <span className="px-2 py-0.5 rounded-md bg-(--bg-main) text-(--text-muted) text-[10px] font-bold font-mono">
                {entry.slot.replace(/^SLOT:\s*/i, "")}
              </span>
            )}
          </div>
          <h3 className="text-base md:text-lg font-black font-expanded text-(--text-main) leading-snug">
            {entry.courseTitle}
          </h3>
        </div>

        {/* Date & Session Pill */}
        <div className="flex flex-col items-start sm:items-end shrink-0">
          <span className="text-sm md:text-base font-black font-mono text-(--text-main)">
            {formattedDate}
          </span>
          <span className="text-[11px] font-bold font-mono text-(--accent-base) uppercase tracking-wider mt-0.5">
            {entry.examSession || "SESSION TBA"}
          </span>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="flex items-center justify-between gap-4 py-2 px-3.5 rounded-xl bg-(--bg-main)/60 border border-(--border-dim)/40 text-xs font-mono">
        <div className="flex items-center gap-5">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-(--text-muted) uppercase tracking-wider">Report</span>
            <span className="font-bold text-(--text-main)">{timeline.reportingTime}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-(--text-muted) uppercase tracking-wider">Start</span>
            <span className="font-bold text-(--text-main)">{timeline.startTime}</span>
          </div>
        </div>

        {timeline.durationText && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--bg-surface) border border-(--border-dim)/40 text-[10px] font-bold text-(--text-main)">
            <Schedule className="w-3.5 h-3.5 text-(--accent-base)" />
            {timeline.durationText}
          </div>
        )}

        <div className="flex flex-col text-right">
          <span className="text-[9px] font-bold text-(--text-muted) uppercase tracking-wider">End</span>
          <span className="font-bold text-(--text-main)">{timeline.endTime || "TBA"}</span>
        </div>
      </div>

      {/* Footer: Venue & Seat */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-(--text-muted)">
          <LocationOn className="w-4 h-4 text-(--accent-base) shrink-0" />
          <span className="font-bold text-(--text-main)">{entry.venue || "Venue TBA"}</span>
        </div>
        {entry.seatNo && (
          <div className="flex items-center gap-1.5 text-(--text-muted)">
            <EventSeat className="w-4 h-4 text-(--accent-base) shrink-0" />
            <span className="font-bold text-(--text-main)">
              {entry.seatLocation} #{entry.seatNo}
            </span>
          </div>
        )}
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

  const [hoveredExam, setHoveredExam] = React.useState<ExamEntry | null>(null);

  useEffect(() => {
    if (status !== "Demo Mode Active" && examSemesters.length === 0) {
      fetchExamSemesters(network);
    }

    const handleRefresh = () => {
      const sem = useDataStore.getState().examSelectedSem;
      if (sem) {
        useDataStore.getState().fetchExamSchedule(network, sem);
      } else {
        useDataStore.getState().fetchExamSemesters(network);
      }
    };
    window.addEventListener("retop-refresh-exams", handleRefresh);
    return () => window.removeEventListener("retop-refresh-exams", handleRefresh);
  }, [status, examSemesters.length, fetchExamSemesters, network]);

  const academicExams = parseAcademicExamDates(calGridData, dateFormatPattern);
  const allEntriesWithGroup = examGroups.flatMap((grp) =>
    grp.entries.map((entry) => ({ entry, groupType: grp.examType })),
  );

  const activeSeatingEntry = hoveredExam || allEntriesWithGroup[0]?.entry || null;

  if (status === "Offline - Not Synced") {
    return <OfflineNotSynced pageName="Exam Schedule" />;
  }

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-6 py-0 pl-4 pr-0 md:py-0 md:pl-6 md:pr-0 lg:py-0 lg:px-8 overflow-y-auto lg:overflow-hidden bg-(--bg-main) text-(--text-main) max-w-425 mx-auto relative">
      <div className="w-full flex-1 flex flex-col w-full h-full overflow-y-auto custom-scrollbar">
        <div className="w-full h-21 md:h-25 shrink-0" />

        <div className="flex-1 pb-20 w-full">
          {/* Two-Column Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start relative">
            
            {/* LEFT COLUMN: Static / Sticky Sidebar with Classroom Seating Map */}
            <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
              
              {/* Classroom Seating Map Card */}
              <ClassroomSeatingMapCard entry={activeSeatingEntry} />

              {/* 1. Exam Reporting Note */}
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

            {/* RIGHT COLUMN: Streamlined Exam List */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {examLoading && allEntriesWithGroup.length === 0 ? (
                <div className="flex flex-col rounded-3xl bg-(--bg-surface) border border-(--border-dim)/40 overflow-hidden divide-y divide-(--border-dim)/40">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-36 bg-(--bg-surface) animate-pulse p-6"
                    />
                  ))}
                </div>
              ) : allEntriesWithGroup.length > 0 ? (
                <div className="flex flex-col rounded-3xl bg-(--bg-surface) border border-(--border-dim)/40 overflow-hidden shadow-xs">
                  {allEntriesWithGroup.map(({ entry, groupType }, idx) => (
                    <ExamCardM3
                      key={idx}
                      entry={entry}
                      groupType={groupType}
                      dateFormatPattern={dateFormatPattern}
                      onHover={setHoveredExam}
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
