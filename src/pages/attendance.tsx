import { useEffect, useState, useRef } from "react";
import { useDataStore } from "../store/dataStore";
import { VTOPNetwork } from "../utils/network";
import { EmptyState } from "../components/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { MarqueeText } from "../components/common/MarqueeText";
import { AttendanceMeter } from "../components/attendance/AttendanceMeter";
import {
  ProgressActivity,
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

const AttendanceCalculator = ({
  course,
  historyLength,
}: {
  course: DetailedAttendanceCourse;
  historyLength: number | null;
}) => {
  const [attendCount, setAttendCount] = useState(0);
  const [bunkCount, setBunkCount] = useState(0);

  useEffect(() => {
    setAttendCount(0);
    setBunkCount(0);
  }, [course]);

  const isLab =
    course.courseType.toLowerCase().includes("lab") ||
    course.courseType.toLowerCase() === "ela";
  const weight = isLab ? 2 : 1;

  const present = course.attended;
  const absent = course.total - course.attended;
  const remainingClasses = Math.max(0, course.total - (present + absent));

  console.log("CALCULATION_DEBUG:", {
    course: course.courseCode,
    isLab,
    weight,
    rawTotal: course.total,
    rawAttended: course.attended,
    rawPercentage: course.percentage,
    present,
    absent,
    remainingClasses,
  });

  const maxAttend = remainingClasses;
  const maxBunk = remainingClasses;

  const decreaseAttend = () => setAttendCount((a) => Math.max(0, a - 1));
  const increaseAttend = () =>
    setAttendCount((a) => {
      const newA = Math.min(maxAttend, a + 1);
      if (newA + bunkCount > remainingClasses) {
        setBunkCount(remainingClasses - newA);
      }
      return newA;
    });

  const decreaseBunk = () => setBunkCount((b) => Math.max(0, b - 1));
  const increaseBunk = () =>
    setBunkCount((b) => {
      const newB = Math.min(maxBunk, b + 1);
      if (newB + attendCount > remainingClasses) {
        setAttendCount(remainingClasses - newB);
      }
      return newB;
    });

  // VTOP total is classes conducted so far. We just add the hypothetical sessions.
  const projectedConducted = course.total + (attendCount + bunkCount) * weight;
  const projectedAttended = course.attended + attendCount * weight;

  const rawPercentage =
    projectedConducted === 0
      ? 0
      : Math.round((projectedAttended / projectedConducted) * 100);
  const isInvalid = rawPercentage > 100;
  const percentage = isInvalid ? 100 : rawPercentage;
  const isDanger = percentage < 75;

  const handleReset = () => {
    setAttendCount(0);
    setBunkCount(0);
  };

  const hasChanged = attendCount > 0 || bunkCount > 0;

  const circleRadius = 70; // 1.5x bigger visually in the SVG
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset =
    circleCircumference - (percentage / 100) * circleCircumference;

  return (
    <div className="flex flex-col gap-6 mb-8 relative">
      <div className="absolute top-0 right-0 z-20">
        <AnimatePresence>
          {hasChanged && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={handleReset}
              className="flex items-center gap-1 text-[10px] uppercase font-black bg-(--bg-surface) hover:bg-(--border-main) text-(--text-main) px-3 py-1.5 rounded-full transition-colors shadow-sm"
            >
              <Refresh className="w-3.5 h-3.5" />
              Reset
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center pt-6 pb-6">
        <div className="relative w-56 h-56 flex items-center justify-center">
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 160 160"
          >
            <circle
              cx="80"
              cy="80"
              r={circleRadius}
              className="stroke-(--bg-surface)"
              strokeWidth="20"
              fill="none"
              strokeLinecap="butt"
            />
            <circle
              cx="80"
              cy="80"
              r={circleRadius}
              className={`transition-all duration-normal ease-out ${isDanger || isInvalid ? "stroke-red-500" : "stroke-emerald-500"}`}
              strokeWidth="20"
              fill="none"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="flex flex-col items-center z-10 text-center">
            {isInvalid ? (
              <>
                <Warning className="w-10 h-10 text-red-500 mb-2" />
                <span className="font-expanded font-black text-sm leading-tight text-red-500 px-2 uppercase">
                  Something went wrong
                </span>
              </>
            ) : (
              <span
                className={`font-expanded font-black text-4xl leading-none ${isDanger ? "text-red-500" : "text-emerald-500"}`}
              >
                {percentage}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center my-1">
        <span className="text-xs font-bold text-(--text-muted) uppercase font-expanded">
          Remaining Classes:{" "}
          <span className="text-(--text-main) font-black text-sm ml-1">
            {remainingClasses}
          </span>
        </span>
      </div>

      <div className="flex gap-3 justify-center mt-2">
        <div className="flex flex-col items-center bg-(--bg-surface) rounded-2xl p-2 w-32">
          <span className="text-[9px] font-black uppercase text-(--text-muted) mb-1.5">
            Attend
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={decreaseAttend}
              className="w-7 h-7 flex items-center justify-center bg-(--bg-highlight) rounded-full active:scale-90 transition-transform text-(--text-main)"
            >
              <Remove className="w-3.5 h-3.5" />
            </button>
            <span className="font-expanded font-black text-lg w-5 text-center">
              {attendCount}
            </span>
            <button
              onClick={increaseAttend}
              className="w-7 h-7 flex items-center justify-center bg-(--bg-highlight) rounded-full active:scale-90 transition-transform text-(--text-main)"
            >
              <Add className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center bg-(--bg-surface) rounded-2xl p-2 w-32">
          <span className="text-[9px] font-black uppercase text-(--text-muted) mb-1.5">
            Bunk
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={decreaseBunk}
              className="w-7 h-7 flex items-center justify-center bg-(--bg-highlight) rounded-full active:scale-90 transition-transform text-(--text-main)"
            >
              <Remove className="w-3.5 h-3.5" />
            </button>
            <span className="font-expanded font-black text-lg w-5 text-center">
              {bunkCount}
            </span>
            <button
              onClick={increaseBunk}
              className="w-7 h-7 flex items-center justify-center bg-(--bg-highlight) rounded-full active:scale-90 transition-transform text-(--text-main)"
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

  let badgeBg = "bg-(--att-safe) text-white border-(--border-main)";
  let barColor = "bg-(--att-safe)";

  if (isNaN(p)) {
    badgeBg = "bg-(--bg-highlight) text-(--text-muted) border-(--border-dim)";
    barColor = "bg-(--bg-highlight)";
  } else if (p < 75) {
    badgeBg = "bg-(--att-danger) text-white border-(--border-main)";
    barColor = "bg-(--att-danger)";
  } else if (p < 80) {
    badgeBg = "bg-(--att-warn) text-black border-(--border-main)";
    barColor = "bg-(--att-warn)";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className={`relative flex items-center justify-between p-4 md:p-5 rounded-2xl overflow-hidden transition-all duration-fast cursor-pointer border-4 group select-none ${isSelected ? "bg-(--bg-surface) border-(--accent-base) -translate-y-1 shadow-[var(--brutal-shadow-hover)]" : "bg-(--bg-surface) border-(--border-main) hover:shadow-[var(--brutal-shadow-hover)] hover:-translate-y-1 hover:bg-(--bg-highlight)"}`}
      onClick={onClick}
    >
      <div
        className={`absolute top-0 left-0 h-full ${barColor} opacity-10 group-hover:opacity-20 transition-opacity duration-fast`}
        style={{ width: `${course.percentage}%` }}
      />
      <div className="relative z-10 flex items-center gap-4 min-w-0 flex-1 pr-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-(--text-main) text-(--bg-main) text-[10px] font-black uppercase rounded-full whitespace-nowrap">
              {course.courseCode}
            </span>
            <span className="px-2 py-1 bg-(--text-main) text-(--bg-main) text-[10px] font-black uppercase rounded-full whitespace-nowrap">
              {course.classType}
            </span>
            {course.debarStatus !== "-" && (
              <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-black uppercase rounded-full shadow-sm whitespace-nowrap">
                Debarred
              </span>
            )}
          </div>
          <MarqueeText
            text={course.courseTitle}
            className="text-base md:text-lg font-black leading-tight font-expanded transition-colors"
          />
        </div>
      </div>

      <div
        className={`relative z-10 shrink-0 font-black font-expanded text-lg md:text-xl leading-none px-4 py-2.5 rounded-xl border-2 ${badgeBg}`}
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
  } = useDataStore();

  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  useEffect(() => {
    if (!attSelectedSem || !network) return;
    fetchDetailedAttendance(network, attSelectedSem);
  }, [attSelectedSem, network, fetchDetailedAttendance]);

  useEffect(() => {
    if (detailedAttendance && detailedAttendance.length > 0) {
      const exists = detailedAttendance.some(
        (c) => `${c.courseId}-${c.classType}` === selectedCourse,
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
            first.classType,
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
              <div key={i} className="h-24 bg-(--bg-surface) rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="w-full lg:w-1/2 hidden lg:flex flex-col px-4 md:px-6 lg:px-8 space-y-6 pt-25 border-l-4 border-(--border-main)">
             <div className="h-10 w-2/3 bg-(--bg-surface) rounded animate-pulse" />
             <div className="h-64 w-full bg-(--bg-surface) rounded-3xl animate-pulse" />
             <div className="h-24 w-full bg-(--bg-surface) rounded-3xl animate-pulse" />
          </div>
        </div>
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
    (c) => `${c.courseId}-${c.classType}` === selectedCourse,
  );
  const records = selectedCourse ? attendanceRecords[selectedCourse] : null;

  return (
    <div className="h-full w-full bg-(--bg-main) font-mono text-(--text-main) overflow-hidden relative z-0 flex">
      <div className="flex-1 flex w-full max-w-7xl mx-auto h-full">
        {/* Left Pane: Course List */}
        <div
          className={`w-full lg:w-1/2 flex flex-col overflow-y-auto custom-scrollbar px-4 md:px-6 lg:px-8 ${selectedCourse ? "hidden lg:flex" : "flex"}`}
        >
          <div className="w-full h-21 md:h-25 shrink-0" />
          <div className="space-y-4 pb-24 pt-4">
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

        {/* Right Pane: Course Details & Calculator */}
        <AnimatePresence mode="wait">
          {selectedCourse && selectedCourseObj && (
            <motion.div
              key={selectedCourse}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`w-full lg:w-1/2 shrink-0 bg-(--bg-main) lg:bg-transparent lg:border-l-4 border-(--border-main) overflow-y-auto custom-scrollbar px-4 md:px-6 lg:px-8 flex flex-col ${!selectedCourse ? "hidden lg:flex" : "flex absolute inset-0 lg:static z-20"}`}
            >
              <div className="w-full h-21 md:h-25 shrink-0 hidden lg:block" />
              {/* Mobile Back Button */}
              <div className="lg:hidden flex items-center mb-6 pt-21 md:pt-25">
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="flex items-center gap-2 text-(--text-main) bg-(--bg-surface) px-4 py-2 rounded-full font-black uppercase font-expanded text-sm shadow-sm"
                >
                  <ArrowBack className="w-5 h-5" />
                  Back
                </button>
              </div>

              <div className="mb-6 lg:mt-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-(--text-main) text-(--bg-main) text-[10px] font-black uppercase rounded-full">
                    {selectedCourseObj.courseCode}
                  </span>
                  <span className="px-3 py-1 bg-(--text-main) text-(--bg-main) text-[10px] font-black uppercase rounded-full">
                    {selectedCourseObj.classType}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black font-expanded leading-tight mb-4">
                  {selectedCourseObj.courseTitle}
                </h2>
                <div className="flex flex-col gap-4 mt-6 text-sm text-(--text-muted) font-bold">
                  <div className="flex items-center gap-3">
                    <School className="w-5 h-5" />
                    {selectedCourseObj.faculty}
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarMonth className="w-5 h-5" />
                    {selectedCourseObj.classDetail}
                  </div>
                </div>
              </div>

              <AttendanceCalculator
                course={selectedCourseObj}
                historyLength={records ? records.length : null}
              />

              <div className="mb-8">
                <AttendanceMeter courseCode={selectedCourseObj.courseCode} />
              </div>

              <div className="mb-24 flex flex-col gap-3">
                <h4 className="text-sm font-black font-expanded uppercase tracking-widest text-(--text-main) mb-2">
                  History
                </h4>

                {attRecordsLoading && !records ? (
                  <div className="flex flex-col gap-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-14 bg-(--bg-surface) rounded-2xl animate-pulse shadow-sm" />
                    ))}
                  </div>
                ) : records && records.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {records.map((rec, rIdx) => {
                      const isPresent = rec.status
                        .toLowerCase()
                        .includes("present");
                      let formattedDate = rec.date;
                      if (rec.date) {
                        let dateObj = new Date(rec.date);
                        if (
                          isNaN(dateObj.getTime()) &&
                          rec.date.includes("-")
                        ) {
                          const parts = rec.date.split("-");
                          if (parts.length === 3) {
                            // handle DD-MM-YYYY by converting to MM DD YYYY
                            dateObj = new Date(
                              `${parts[1]} ${parts[0]} ${parts[2]}`,
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
                          className="flex items-center justify-between px-4 py-3 bg-(--bg-surface) rounded-2xl shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold font-expanded leading-none text-(--text-main)">
                              {formattedDate}
                            </span>
                            <span className="text-[10px] font-black uppercase opacity-70 text-(--text-muted)">
                              {rec.dayTime
                                .replace(/\s*(?:-|to)\s*(?:(?!-|to).)*$/i, "")
                                .replace(/\//g, " • ")}
                            </span>
                          </div>
                          {isPresent ? (
                            <Check className="w-6 h-6 shrink-0 text-emerald-500" />
                          ) : (
                            <Close className="w-6 h-6 shrink-0 text-red-500" />
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
                    className="h-auto min-h-48"
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
