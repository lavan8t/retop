import { useEffect, useState, useRef } from "react";
import { useDataStore } from "../store/dataStore";
import { VTOPNetwork } from "../utils/network";
import { EmptyState } from "../components/EmptyState";
import { OfflineNotSynced } from "../components/ui/OfflineNotSynced";
import {
  Refresh,
  ArrowBack,
  Add,
  Remove,
  School,
  CalendarMonth,
  Warning,
  CheckCircle,
  Cancel,
  Check,
  Close,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { Pill } from "../components/ui/Pill";
import { DetailedAttendanceCourse } from "../types/vtop";
import { useCourseAttendanceForecast } from "../hooks/useCourseAttendanceForecast";

const AttendanceCalculator = ({
  course,
}: {
  course: DetailedAttendanceCourse;
  historyLength: number | null;
}) => {
  const forecast = useCourseAttendanceForecast(course.courseCode);
  const [attendCount, setAttendCount] = useState(0);
  const [bunkCount, setBunkCount] = useState(0);

  useEffect(() => {
    setAttendCount(0);
    setBunkCount(0);
  }, [course]);

  const isLab =
    (course.courseType || "").toLowerCase().includes("lab") ||
    (course.courseType || "").toLowerCase() === "ela";
  const weight = isLab ? 2 : 1;

  const present = course.attended || 0;
  const conductedSoFar = course.total || 0;
  const remainingClasses = forecast?.futureScheduledClasses ?? 20;

  const decreaseAttend = () => setAttendCount((a) => Math.max(0, a - 1));
  const increaseAttend = () =>
    setAttendCount((a) => Math.min(remainingClasses, a + 1));

  const decreaseBunk = () => setBunkCount((b) => Math.max(0, b - 1));
  const increaseBunk = () =>
    setBunkCount((b) => Math.min(remainingClasses, b + 1));

  const projectedConducted =
    conductedSoFar + (attendCount + bunkCount) * weight;
  const projectedAttended = present + attendCount * weight;

  const rawPercentage =
    projectedConducted === 0
      ? 0
      : Math.round((projectedAttended / projectedConducted) * 100);
  const isInvalid = rawPercentage > 100;
  const percentage = isInvalid ? 100 : rawPercentage;

  let ringColor = "stroke-(--attendance-green)";
  if (isInvalid) ringColor = "stroke-(--attendance-red)";
  else if (percentage <= 75) ringColor = "stroke-(--attendance-red)";
  else if (percentage < 90) ringColor = "stroke-(--attendance-blue)";

  const handleReset = () => {
    setAttendCount(0);
    setBunkCount(0);
  };

  const hasChanged = attendCount > 0 || bunkCount > 0;

  const circleRadius = 60;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset =
    circleCircumference - (percentage / 100) * circleCircumference;

  return (
    <div className="flex flex-col gap-4 mb-6 relative">
      {hasChanged && (
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-[10px] uppercase font-mono font-bold bg-(--color-surface-container) hover:bg-(--color-surface-container-high) text-(--color-on-surface) px-2.5 py-1 rounded-full transition-colors cursor-pointer border border-(--color-outline-variant)">
            <Refresh className="w-3 h-3 text-(--color-primary)" />
            Reset
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
        <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={circleRadius}
              className="stroke-(--color-surface-container-high)"
              strokeWidth="15"
              fill="none" />
            <circle
              cx="70"
              cy="70"
              r={circleRadius}
              className={`transition-all duration-normal ease-out ${ringColor}`}
              strokeWidth="15"
              fill="none"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" />
          </svg>
          <div className="flex flex-col items-center z-10 text-center">
            <span
              className={`font-mono font-black text-4xl leading-none ${ringColor.replace("stroke-", "text-")}`}>
              {percentage}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full text-xs font-mono">
          <div className="flex justify-between items-center bg-(--color-surface-container-low) px-3.5 py-2 rounded-xl border border-(--color-outline-variant)">
            <span className="text-(--color-on-surface-variant)">Conducted So Far</span>
            <span className="font-bold text-(--color-on-surface)">{conductedSoFar}</span>
          </div>
          <div className="flex justify-between items-center bg-(--color-surface-container-low) px-3.5 py-2 rounded-xl border border-(--color-outline-variant)">
            <span className="text-(--color-on-surface-variant)">Attended So Far</span>
            <span className="font-bold text-(--color-primary)">{present}</span>
          </div>
          <div className="flex justify-between items-center bg-(--color-surface-container-low) px-3.5 py-2 rounded-xl border border-(--color-outline-variant)">
            <span className="text-(--color-on-surface-variant)">
              Left before {forecast?.examName || "Exams"}
            </span>
            <span className="font-bold text-(--color-on-surface)">{remainingClasses}</span>
          </div>
        </div>
      </div>

      {forecast && (
        <div className="p-3 rounded-2xl bg-(--color-surface-container-low) text-xs font-mono flex items-center justify-between gap-2 border border-(--color-outline-variant)">
          <span className="text-(--color-on-surface-variant)">
            {forecast.status === "CRITICAL"
              ? `Need ${
                  forecast.classesNeededBeforeExam || forecast.requiredToPass
                } classes before ${forecast.examName || "exams"} for 75%`
              : `Can skip ${forecast.safeSkips} class${
                  forecast.safeSkips !== 1 ? "es" : ""
                } safely`}
          </span>
          <Pill
            variant={
              forecast.status === "SAFE"
                ? "success"
                : forecast.status === "WARNING"
                  ? "main"
                  : "error"
            }
          >
            {forecast.status}
          </Pill>
        </div>
      )}

      <div className="flex gap-3 justify-center pt-1">
        <div className="flex-1 flex flex-col items-center bg-(--color-surface-container-low) rounded-2xl p-2.5 border border-(--color-outline-variant)">
          <span className="text-[10px] font-mono font-bold uppercase text-(--color-on-surface-variant) mb-1">
            Attend
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={decreaseAttend}
              className="w-7 h-7 flex items-center justify-center bg-(--color-surface) rounded-full active:scale-90 transition-transform text-(--color-on-surface) cursor-pointer border border-(--color-outline)">
              <Remove className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-black text-base w-5 text-center">
              {attendCount}
            </span>
            <button
              onClick={increaseAttend}
              className="w-7 h-7 flex items-center justify-center bg-(--color-surface) rounded-full active:scale-90 transition-transform text-(--color-on-surface) cursor-pointer border border-(--color-outline)">
              <Add className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center bg-(--color-surface-container-low) rounded-2xl p-2.5 border border-(--color-outline-variant)">
          <span className="text-[10px] font-mono font-bold uppercase text-(--color-on-surface-variant) mb-1">
            Bunk
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={decreaseBunk}
              className="w-7 h-7 flex items-center justify-center bg-(--color-surface) rounded-full active:scale-90 transition-transform text-(--color-on-surface) cursor-pointer border border-(--color-outline)">
              <Remove className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-black text-base w-5 text-center">
              {bunkCount}
            </span>
            <button
              onClick={increaseBunk}
              className="w-7 h-7 flex items-center justify-center bg-(--color-surface) rounded-full active:scale-90 transition-transform text-(--color-on-surface) cursor-pointer border border-(--color-outline)">
              <Add className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CourseCard = ({
  course,
  isSelected,
  onClick,
}: {
  course: DetailedAttendanceCourse;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const p = course.percentage;

  let badgeVariant: "success" | "warning" | "error" | "muted" = "success";
  let barColor = "bg-(--attendance-green-bg)";

  if (isNaN(p)) {
    badgeVariant = "muted";
    barColor = "bg-(--bg-highlight)";
  } else if (p <= 75) {
    badgeVariant = "error";
    barColor = "bg-(--attendance-red-bg)";
  } else if (p < 90) {
    badgeVariant = "warning";
    barColor = "bg-(--attendance-blue-bg)";
  }

  return (
    <div
      className={`relative flex items-center justify-between py-2 px-3.5 rounded-2xl overflow-hidden transition-all duration-fast cursor-pointer group select-none border border-(--border-dim)/40 ${
        isSelected
          ? "bg-(--accent-base)/15 border-(--accent-base)/40"
          : "bg-(--bg-surface)/60 hover:bg-(--bg-highlight)"
      }`}
      onClick={onClick}>
      <div
        className={`absolute top-0 left-0 h-full ${barColor} transition-all duration-fast opacity-60`}
        style={{ width: `${course.percentage}%` }} />
      <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1 pr-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <Pill variant="surface">{course.courseCode}</Pill>
            <Pill variant="surface">{course.classType}</Pill>
            {course.debarStatus !== "-" && (
              <Pill variant="error">Debarred</Pill>
            )}
          </div>
          <span className="text-base md:text-lg font-black leading-tight font-expanded transition-colors text-(--color-on-surface) wrap-break-word">
            {course.courseTitle}
          </span>
        </div>
      </div>

      <div
        className={`relative z-10 shrink-0`}>
        <Pill variant={badgeVariant}>{course.percentage}%</Pill>
      </div>
    </div>
  );
};

export const AttendancePage = ({ network }: { network: VTOPNetwork }) => {
  const {
    attSelectedSem,
    detailedAttendance,
    attLoading,
    fetchDetailedAttendance,
    attendanceRecords,
    attRecordsLoading,
    fetchAttendanceRecords,
    status,
  } = useDataStore();

  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (!attSelectedSem || !network) return;
    fetchDetailedAttendance(network, attSelectedSem);
  }, [attSelectedSem, network, fetchDetailedAttendance]);

  useEffect(() => {
    if (detailedAttendance && detailedAttendance.length > 0) {
      const exists = detailedAttendance.some(
        (c) => `${c.courseId}-${c.classType}` === selectedCourse
      );
      if (!exists) {
        const first = detailedAttendance[0];
        const key = `${first.courseId}-${first.classType}`;
        setSelectedCourse(key);
        if (attSelectedSem && network) {
          fetchAttendanceRecords(
            network,
            attSelectedSem,
            first.courseId,
            first.classType
          );
        }
      }
    }
  }, [
    detailedAttendance,
    selectedCourse,
    attSelectedSem,
    network,
    fetchAttendanceRecords,
  ]);

  useEffect(() => {
    const handleRefresh = () => {
      const state = useDataStore.getState();
      const sem = state.attSelectedSem || state.ttSelectedSem;
      if (sem) {
        state.fetchDetailedAttendance(network, sem, true);
      }
    };
    window.addEventListener("retop-refresh-attendance", handleRefresh);
    return () => window.removeEventListener("retop-refresh-attendance", handleRefresh);
  }, [network]);

  const handleSelectCourse = (courseId: string, classType: string) => {
    const key = `${courseId}-${classType}`;
    setSelectedCourse(key);
    if (attSelectedSem && network) {
      fetchAttendanceRecords(network, attSelectedSem, courseId, classType);
    }
  };

  if (attLoading) {
    return (
      <div className="h-full w-full bg-(--color-surface) overflow-hidden flex">
        <div className="flex-1 flex w-full max-w-7xl mx-auto h-full">
          {/* Mirrors the loaded layout: same column width, same top spacer,
              course cards only — the page has no heading of its own. */}
          <div className="w-full lg:w-[420px] shrink-0 flex flex-col px-4 md:px-6 lg:px-8 space-y-4">
            <div className="w-full h-21 md:h-25 shrink-0" />
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-(--color-surface-container) rounded-2xl animate-pulse"
              />
            ))}
          </div>
          <div className="w-full lg:w-1/2 hidden lg:flex flex-col px-4 md:px-6 lg:px-8 space-y-6 pt-25 border-l border-(--color-outline-variant)">
            <div className="h-10 w-2/3 bg-(--color-surface-container) rounded animate-pulse" />
            <div className="h-64 w-full bg-(--color-surface-container) rounded-3xl animate-pulse" />
            <div className="h-24 w-full bg-(--color-surface-container) rounded-3xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (status === "Offline - Not Synced") {
    return (
      <div className="h-full pt-16 md:pt-20 lg:pt-24 pb-32 md:pb-12">
        <OfflineNotSynced pageName="Attendance" />
      </div>
    );
  }

  if (!detailedAttendance || detailedAttendance.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-(--color-surface) font-mono relative z-0">
        <EmptyState
          msg="No Attendance Data"
          subMsg="Attendance information is not available for the selected semester."
          icon={Warning} />
      </div>
    );
  }

  const selectedCourseObj = detailedAttendance.find(
    (c) => `${c.courseId}-${c.classType}` === selectedCourse
  );
  const records = selectedCourse ? attendanceRecords[selectedCourse] : null;

  const sortedRecords = records ? [...records].sort((a, b) => {
    const parseDate = (dStr: string) => {
      let d = new Date(dStr);
      if (isNaN(d.getTime()) && dStr.includes("-")) {
        const parts = dStr.split("-");
        if (parts.length === 3) d = new Date(`${parts[1]} ${parts[0]} ${parts[2]}`);
      }
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };
    const tA = parseDate(a.date);
    const tB = parseDate(b.date);
    return sortOrder === "desc" ? tB - tA : tA - tB;
  }) : null;

  return (
    <div className="h-full w-full bg-(--color-surface) text-(--color-on-surface) overflow-hidden relative z-0 flex">
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-5xl mx-auto h-full overflow-y-auto lg:overflow-hidden">
        {/* Course list — left, narrowed, centered */}
        <div
          className={`w-full lg:w-[420px] shrink-0 flex flex-col border-r-0 lg:border-r border-(--color-outline-variant) h-full overflow-y-auto custom-scrollbar px-4 md:px-6 lg:px-8 pb-32 lg:pb-12 ${
            selectedCourse ? "hidden lg:flex" : "flex"
          }`}>
          <div className="w-full h-21 md:h-25 shrink-0" />

          <div className="flex flex-col gap-1">
            {detailedAttendance.map((course) => {
              const key = `${course.courseId}-${course.classType}`;
              return (
                <CourseCard
                  key={key}
                  course={course}
                  isSelected={key === selectedCourse}
                  onClick={() =>
                    handleSelectCourse(course.courseId, course.classType)
                  }
                />
              );
            })}
          </div>
        </div>

        {selectedCourseObj && (
          <div
            className={`flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar px-4 md:px-6 lg:px-8 pb-32 lg:pb-12 ${
              !selectedCourse
                ? "hidden lg:flex"
                : "flex absolute inset-0 lg:static z-20 bg-(--color-surface)"
            }`}>
            <div className="w-full h-21 md:h-25 shrink-0 hidden lg:block" />
            <div className="lg:hidden flex items-center mb-4 pt-21 md:pt-25">
              <button
                onClick={() => setSelectedCourse(null)}
                className="flex items-center gap-2 text-(--color-on-surface) bg-(--color-surface-container) px-4 py-2 rounded-full font-bold uppercase font-mono text-xs cursor-pointer border border-(--color-outline-variant)">
                <ArrowBack className="w-4 h-4" />
                Back
              </button>
            </div>

            <div className="mb-4 lg:mt-0">
              <div className="flex items-center gap-2 mb-2">
                <Pill variant="surface">{selectedCourseObj.courseCode}</Pill>
                <Pill variant="surface">{selectedCourseObj.classType}</Pill>
              </div>
              <h2 className="text-xl md:text-2xl font-bold font-mono leading-snug mb-3 text-(--text-main)">
                {selectedCourseObj.courseTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-(--text-muted) font-mono">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-(--text-muted)" />
                  <span>{selectedCourseObj.faculty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarMonth className="w-4 h-4 text-(--text-muted)" />
                  <span>{selectedCourseObj.classDetail}</span>
                </div>
              </div>
            </div>

            {/* Single Unified Clean Calculator & Forecast Meter */}
            <AttendanceCalculator
              course={selectedCourseObj}
              historyLength={records ? records.length : null} />

            {/* History Log with Dark Material You Color Shades */}
            <div className="mb-24 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-(--text-muted)">
                  Attendance History
                </h4>
              </div>

              {attRecordsLoading && !records ? (
                <div className="flex flex-col gap-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-(--bg-surface)/40 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : sortedRecords && sortedRecords.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {sortedRecords.map((rec, rIdx) => {
                      const isPresent = rec.status
                        .toLowerCase()
                        .includes("present");
                      const isAbsent = rec.status
                        .toLowerCase()
                        .includes("absent");

                      let historyBg =
                        "bg-(--attendance-green-bg) text-(--text-main) border border-(--attendance-green)/30";
                      let iconColor = "text-(--attendance-green-text)";

                      if (isAbsent) {
                        historyBg =
                          "bg-(--attendance-red-bg) text-(--text-main) border border-(--attendance-red)/30";
                        iconColor = "text-(--attendance-red-text)";
                      } else if (!isPresent) {
                        historyBg =
                          "bg-(--attendance-blue-bg) text-(--text-main) border border-(--attendance-blue)/30";
                        iconColor = "text-(--attendance-blue-text)";
                      }

                      let formattedDate = rec.date;
                      if (rec.date) {
                        let dateObj = new Date(rec.date);
                        if (
                          isNaN(dateObj.getTime()) &&
                          rec.date.includes("-")
                        ) {
                          const parts = rec.date.split("-");
                          if (parts.length === 3) {
                            dateObj = new Date(
                              `${parts[1]} ${parts[0]} ${parts[2]}`
                            );
                          }
                        }
                        if (!isNaN(dateObj.getTime())) {
                          formattedDate = dateObj.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          });
                        }
                      }

                      return (
                        <div
                          key={rIdx}
                          className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-mono transition-colors ${historyBg}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold leading-none">
                              {formattedDate}
                            </span>
                            <span className="text-[10px] font-bold uppercase opacity-75">
                              {rec.dayTime
                                .replace(/\s*(?:-|to)\s*(?:(?!-|to).)*$/i, "")
                                .replace(/\//g, " • ")}
                            </span>
                          </div>
                          {isPresent ? (
                            <Check className={`w-5 h-5 shrink-0 ${iconColor}`} />
                          ) : isAbsent ? (
                            <Close className={`w-5 h-5 shrink-0 ${iconColor}`} />
                          ) : (
                            <span className={`text-xs font-bold ${iconColor}`}>
                              {rec.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    msg="No Records Found"
                    subMsg="No history records found for this class."
                    icon={Warning}
                    className="h-auto min-h-36" />
                )}
              </div>
            </div>
          )}
        
      </div>
    </div>
  );
};
