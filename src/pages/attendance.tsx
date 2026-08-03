import { useEffect, useState, useRef } from "react";
import { useDataStore } from "../store/dataStore";
import { VTOPNetwork } from "../utils/network";
import { EmptyState } from "../components/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { OfflineNotSynced } from "../components/ui/OfflineNotSynced";
import { MarqueeText } from "../components/common/MarqueeText";
import {
  Warning,
  CalendarMonth,
  School,
  Check,
  Close,
  ArrowBack,
  Add,
  Remove,
  Refresh,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
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
    <div className="flex flex-col gap-5 mb-6 relative bg-(--bg-surface)/40 rounded-3xl p-5 border-0">
      {/* Header & Reset */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-(--text-muted)">
          Attendance Forecast & Simulator
        </h4>
        {hasChanged && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-[10px] uppercase font-mono font-bold bg-(--bg-main) hover:bg-(--bg-highlight) text-(--text-main) px-2.5 py-1 rounded-full transition-colors cursor-pointer border border-(--border-dim)/40"
          >
            <Refresh className="w-3 h-3 text-(--accent-base)" />
            Reset
          </button>
        )}
      </div>

      {/* Ring Gauge & Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
        <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 140 140"
          >
            <circle
              cx="70"
              cy="70"
              r={circleRadius}
              className="stroke-(--bg-main)"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="70"
              cy="70"
              r={circleRadius}
              className={`transition-all duration-normal ease-out ${ringColor}`}
              strokeWidth="10"
              fill="none"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="flex flex-col items-center z-10 text-center">
            <span
              className={`font-mono font-black text-3xl leading-none ${ringColor.replace("stroke-", "text-")}`}
            >
              {percentage}%
            </span>
          </div>
        </div>

        {/* Stats Column */}
        <div className="flex flex-col gap-2 w-full text-xs font-mono">
          <div className="flex justify-between items-center bg-(--bg-main)/50 px-3 py-1.5 rounded-xl border border-(--border-dim)/20">
            <span className="text-(--text-muted)">Conducted So Far</span>
            <span className="font-bold text-(--text-main)">{conductedSoFar}</span>
          </div>
          <div className="flex justify-between items-center bg-(--bg-main)/50 px-3 py-1.5 rounded-xl border border-(--border-dim)/20">
            <span className="text-(--text-muted)">Attended So Far</span>
            <span className="font-bold text-emerald-400">{present}</span>
          </div>
          <div className="flex justify-between items-center bg-(--bg-main)/50 px-3 py-1.5 rounded-xl border border-(--border-dim)/20">
            <span className="text-(--text-muted)">
              Left before {forecast?.examName || "Exams"}
            </span>
            <span className="font-bold text-(--text-main)">{remainingClasses}</span>
          </div>
        </div>
      </div>

      {/* Target Callout Banner */}
      {forecast && (
        <div className="p-3 rounded-2xl bg-(--bg-main)/70 text-xs font-mono flex items-center justify-between gap-2 border border-(--border-dim)/30">
          <span className="text-(--text-muted)">
            {forecast.status === "CRITICAL"
              ? `Need ${
                  forecast.classesNeededBeforeExam || forecast.requiredToPass
                } classes before ${forecast.examName || "exams"} for 75%`
              : `Can skip ${forecast.safeSkips} class${
                  forecast.safeSkips !== 1 ? "es" : ""
                } safely`}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              forecast.status === "SAFE"
                ? "bg-emerald-500/20 text-emerald-300"
                : forecast.status === "WARNING"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-red-500/20 text-red-300"
            }`}
          >
            {forecast.status}
          </span>
        </div>
      )}

      {/* Attend & Bunk Simulator Controls (Word 'more' removed) */}
      <div className="flex gap-3 justify-center pt-1">
        <div className="flex-1 flex flex-col items-center bg-(--bg-main)/60 rounded-2xl p-2.5 border border-(--border-dim)/30">
          <span className="text-[10px] font-mono font-bold uppercase text-(--text-muted) mb-1">
            Attend
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={decreaseAttend}
              className="w-7 h-7 flex items-center justify-center bg-(--bg-surface) rounded-full active:scale-90 transition-transform text-(--text-main) cursor-pointer border-0"
            >
              <Remove className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-black text-base w-5 text-center">
              {attendCount}
            </span>
            <button
              onClick={increaseAttend}
              className="w-7 h-7 flex items-center justify-center bg-(--bg-surface) rounded-full active:scale-90 transition-transform text-(--text-main) cursor-pointer border-0"
            >
              <Add className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center bg-(--bg-main)/60 rounded-2xl p-2.5 border border-(--border-dim)/30">
          <span className="text-[10px] font-mono font-bold uppercase text-(--text-muted) mb-1">
            Bunk
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={decreaseBunk}
              className="w-7 h-7 flex items-center justify-center bg-(--bg-surface) rounded-full active:scale-90 transition-transform text-(--text-main) cursor-pointer border-0"
            >
              <Remove className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-black text-base w-5 text-center">
              {bunkCount}
            </span>
            <button
              onClick={increaseBunk}
              className="w-7 h-7 flex items-center justify-center bg-(--bg-surface) rounded-full active:scale-90 transition-transform text-(--text-main) cursor-pointer border-0"
            >
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
  idx,
}: {
  course: DetailedAttendanceCourse;
  isSelected: boolean;
  onClick: () => void;
  idx: number;
}) => {
  const p = course.percentage;

  let badgeBg =
    "bg-(--attendance-green) text-(--bg-main) border border-(--border-main)";
  let barColor = "bg-(--attendance-green-bg)";

  if (isNaN(p)) {
    badgeBg =
      "bg-(--bg-highlight) text-(--text-muted) border border-(--border-dim)";
    barColor = "bg-(--bg-highlight)";
  } else if (p <= 75) {
    badgeBg =
      "bg-(--attendance-red) text-(--bg-main) border border-(--border-main)";
    barColor = "bg-(--attendance-red-bg)";
  } else if (p < 90) {
    badgeBg =
      "bg-(--attendance-blue) text-(--bg-main) border border-(--border-main)";
    barColor = "bg-(--attendance-blue-bg)";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.02 }}
      className={`relative flex items-center justify-between p-3 md:p-3.5 rounded-xl overflow-hidden transition-colors duration-fast cursor-pointer group select-none border border-(--border-dim)/30 ${
        isSelected
          ? "bg-(--bg-highlight) border-l-4 border-l-(--accent-base)"
          : "bg-(--bg-surface)/50 hover:bg-(--bg-highlight)"
      }`}
      onClick={onClick}
    >
      <div
        className={`absolute top-0 left-0 h-full ${barColor} transition-all duration-fast opacity-60`}
        style={{ width: `${course.percentage}%` }}
      />
      <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1 pr-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="px-2 py-0.5 bg-(--bg-main) text-(--text-main) text-[10px] font-mono font-bold uppercase rounded-md border border-(--border-dim)/40">
              {course.courseCode}
            </span>
            <span className="px-2 py-0.5 bg-(--bg-main) text-(--text-muted) text-[10px] font-mono font-bold uppercase rounded-md border border-(--border-dim)/40">
              {course.classType}
            </span>
            {course.debarStatus !== "-" && (
              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-mono font-bold uppercase rounded-md">
                Debarred
              </span>
            )}
          </div>
          <MarqueeText
            text={course.courseTitle}
            className="text-xs md:text-sm font-bold text-(--text-main) leading-snug"
          />
        </div>
      </div>

      <div
        className={`relative z-10 shrink-0 font-mono font-black text-sm md:text-base leading-none px-2.5 py-1.5 rounded-lg ${badgeBg}`}
      >
        {course.percentage}%
      </div>
    </motion.div>
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

  const handleSelectCourse = (courseId: string, classType: string) => {
    const key = `${courseId}-${classType}`;
    setSelectedCourse(key);
    if (attSelectedSem && network) {
      fetchAttendanceRecords(network, attSelectedSem, courseId, classType);
    }
  };

  if (attLoading) {
    return (
      <div className="h-full w-full bg-(--bg-main) overflow-hidden flex">
        <div className="flex-1 flex w-full max-w-7xl mx-auto h-full">
          <div className="w-full lg:w-1/2 flex flex-col px-4 md:px-6 lg:px-8 space-y-4 pt-25">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-(--bg-surface) rounded-2xl animate-pulse"
              />
            ))}
          </div>
          <div className="w-full lg:w-1/2 hidden lg:flex flex-col px-4 md:px-6 lg:px-8 space-y-6 pt-25 border-l border-(--border-dim)/20">
            <div className="h-10 w-2/3 bg-(--bg-surface) rounded animate-pulse" />
            <div className="h-64 w-full bg-(--bg-surface) rounded-3xl animate-pulse" />
            <div className="h-24 w-full bg-(--bg-surface) rounded-3xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (status === "Offline - Not Synced") {
    return (
      <div className="h-full pt-16 md:pt-20 lg:pt-24 pb-32 md:pb-12">
        <OfflineNotSynced />
      </div>
    );
  }

  if (!detailedAttendance || detailedAttendance.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-(--bg-main) font-mono relative z-0">
        <EmptyState
          msg="No Attendance Data"
          subMsg="Attendance information is not available for the selected semester."
          icon={Warning}
        />
      </div>
    );
  }

  const selectedCourseObj = detailedAttendance.find(
    (c) => `${c.courseId}-${c.classType}` === selectedCourse
  );
  const records = selectedCourse ? attendanceRecords[selectedCourse] : null;

  return (
    <div className="h-full w-full bg-(--bg-main) font-mono text-(--text-main) overflow-hidden relative z-0 flex">
      <div className="flex-1 flex w-full max-w-7xl mx-auto h-full">
        {/* Left Pane: Compact Course Cards */}
        <div
          className={`w-full lg:w-[42%] xl:w-[38%] flex flex-col overflow-y-auto custom-scrollbar px-4 md:px-6 ${
            selectedCourse ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="w-full h-21 md:h-25 shrink-0" />
          <div className="space-y-2.5 pb-24 pt-4">
            {detailedAttendance.map((course, idx) => {
              const courseKey = `${course.courseId}-${course.classType}`;
              const isSelected = selectedCourse === courseKey;

              return (
                <CourseCard
                  key={courseKey}
                  course={course}
                  isSelected={isSelected}
                  idx={idx}
                  onClick={() =>
                    handleSelectCourse(course.courseId, course.classType)
                  }
                />
              );
            })}
          </div>
        </div>

        {/* Right Pane: Course Details & Clean Calculator */}
        <AnimatePresence mode="wait">
          {selectedCourse && selectedCourseObj && (
            <motion.div
              key={selectedCourse}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`w-full lg:w-[58%] xl:w-[62%] shrink-0 bg-(--bg-main) lg:bg-transparent overflow-y-auto custom-scrollbar px-4 md:px-6 lg:px-8 flex flex-col border-l border-(--border-dim)/20 ${
                !selectedCourse
                  ? "hidden lg:flex"
                  : "flex absolute inset-0 lg:static z-20"
              }`}
            >
              <div className="w-full h-21 md:h-25 shrink-0 hidden lg:block" />
              {/* Mobile Back Button */}
              <div className="lg:hidden flex items-center mb-4 pt-21 md:pt-25">
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="flex items-center gap-2 text-(--text-main) bg-(--bg-surface) px-4 py-2 rounded-full font-bold uppercase font-mono text-xs cursor-pointer border border-(--border-dim)/40"
                >
                  <ArrowBack className="w-4 h-4" />
                  Back
                </button>
              </div>

              <div className="mb-4 lg:mt-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-(--bg-highlight) text-(--text-main) text-[10px] font-mono font-bold uppercase rounded-md border border-(--border-dim)/40">
                    {selectedCourseObj.courseCode}
                  </span>
                  <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold uppercase rounded-md">
                    {selectedCourseObj.classType}
                  </span>
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
                historyLength={records ? records.length : null}
              />

              {/* History Log with Dark Material You Color Shades */}
              <div className="mb-24 flex flex-col gap-3">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-(--text-muted)">
                  Attendance History
                </h4>

                {attRecordsLoading && !records ? (
                  <div className="flex flex-col gap-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 bg-(--bg-surface)/40 rounded-2xl animate-pulse"
                      />
                    ))}
                  </div>
                ) : records && records.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {records.map((rec, rIdx) => {
                      const isPresent = rec.status
                        .toLowerCase()
                        .includes("present");
                      const isAbsent = rec.status
                        .toLowerCase()
                        .includes("absent");

                      let historyBg =
                        "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40";
                      let iconColor = "text-emerald-400";

                      if (isAbsent) {
                        historyBg =
                          "bg-red-950/40 text-red-300 border border-red-800/40";
                        iconColor = "text-red-400";
                      } else if (!isPresent) {
                        historyBg =
                          "bg-amber-950/40 text-amber-300 border border-amber-800/40";
                        iconColor = "text-amber-400";
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
                          className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-mono transition-colors ${historyBg}`}
                        >
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
                    className="h-auto min-h-36"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
