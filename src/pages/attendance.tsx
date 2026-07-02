import { useEffect, useState, useRef } from "react";
import { useDataStore } from "../store/dataStore";
import { VTOPNetwork } from "../utils/network";
import { motion, AnimatePresence } from "framer-motion";
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
} from "@nine-thirty-five/material-symbols-react/rounded";
import { DetailedAttendanceCourse } from "../types/vtop";

const AttendanceCalculator = ({
  course,
}: {
  course: DetailedAttendanceCourse;
}) => {
  const [attendCount, setAttendCount] = useState(0);
  const [bunkCount, setBunkCount] = useState(0);

  useEffect(() => {
    setAttendCount(0);
    setBunkCount(0);
  }, [course]);

  const maxAttend = Math.max(0, course.total - course.attended);
  const maxBunk = course.attended;

  const decreaseAttend = () => setAttendCount((a) => Math.max(0, a - 1));
  const increaseAttend = () =>
    setAttendCount((a) => Math.min(maxAttend, a + 1));
  const decreaseBunk = () => setBunkCount((b) => Math.max(0, b - 1));
  const increaseBunk = () => setBunkCount((b) => Math.min(maxBunk, b + 1));

  const attended = Math.max(
    0,
    Math.min(course.total, course.attended + attendCount - bunkCount),
  );
  const total = course.total;
  const percentage = total === 0 ? 0 : Math.round((attended / total) * 100);
  const isDanger = percentage < 75;

  const handleReset = () => {
    setAttendCount(0);
    setBunkCount(0);
  };

  const calculateStatus = () => {
    if (total === 0) return { status: "safe", text: "No classes held yet." };
    const margin = Math.floor((attended - 0.75 * total) / 0.75);

    if (margin > 0) {
      return {
        status: "safe",
        text: `You can bunk ${margin} more class${margin > 1 ? "es" : ""}`,
      };
    } else if (margin === 0) {
      return { status: "warning", text: "You can't bunk any more classes" };
    } else {
      const need = Math.ceil((0.75 * total - attended) / 0.25);
      return {
        status: "danger",
        text: `You need to attend ${need} more class${need > 1 ? "es" : ""}`,
      };
    }
  };

  const statusInfo = calculateStatus();
  const hasChanged = attendCount > 0 || bunkCount > 0;

  const circleRadius = 60;
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
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 160 160"
          >
            <circle
              cx="80"
              cy="80"
              r="60"
              className="stroke-(--bg-surface)"
              strokeWidth="16"
              fill="none"
            />
            <circle
              cx="80"
              cy="80"
              r="60"
              className={`transition-all duration-500 ease-out ${isDanger ? "stroke-red-500" : "stroke-emerald-500"}`}
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="flex flex-col items-center z-10">
            <span
              className={`font-expanded font-black text-3xl leading-none ${isDanger ? "text-red-500" : "text-emerald-500"}`}
            >
              {percentage}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
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

      <div className="flex items-center justify-center my-1">
        <span className="text-xs font-bold text-(--text-muted) uppercase font-expanded">
          Classes:{" "}
          <span className="text-(--text-main) font-black text-sm ml-1">
            {attended} / {total}
          </span>
        </span>
      </div>

      <div
        className={`text-center font-bold text-sm ${
          statusInfo.status === "safe"
            ? "text-emerald-500"
            : statusInfo.status === "warning"
              ? "text-amber-500"
              : "text-red-500"
        }`}
      >
        {statusInfo.text}
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
  const isDanger = course.percentage < 75;
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const isOw =
          textRef.current.scrollWidth > textRef.current.clientWidth + 5;
        setIsOverflowing(isOw);
        if (isOw) {
          textRef.current.style.setProperty(
            "--scroll-dist",
            `-${textRef.current.scrollWidth - textRef.current.clientWidth}px`,
          );
        }
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [course.courseTitle]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className={`relative flex items-center justify-between p-4 md:p-5 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer border-2 group select-none ${isSelected ? "bg-(--bg-surface) border-(--accent-base) -translate-y-1 shadow-[4px_4px_0px_0px_var(--shadow-main)]" : "bg-(--bg-surface) border-transparent hover:border-(--border-main) hover:shadow-[4px_4px_0px_0px_var(--shadow-main)] hover:-translate-y-1 hover:bg-(--bg-highlight)"}`}
      onClick={onClick}
    >
      <div
        className={`absolute top-0 left-0 h-full ${isDanger ? "bg-red-500" : "bg-emerald-500"} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}
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
          <div
            className="flex-1 min-w-0 overflow-hidden"
            style={{
              maskImage: isOverflowing
                ? "linear-gradient(to right, black 85%, transparent 100%)"
                : "none",
            }}
          >
            <div
              ref={textRef}
              className={`text-base md:text-lg font-black leading-tight font-expanded transition-colors whitespace-nowrap inline-block ${isOverflowing ? "animate-marquee-auto" : ""}`}
            >
              {course.courseTitle}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`relative z-10 shrink-0 font-black font-expanded text-lg md:text-xl leading-none px-4 py-2.5 rounded-xl border-2 ${isDanger ? "bg-red-500 text-white border-red-600" : "bg-emerald-500 text-white border-emerald-600"}`}
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-(--bg-main) font-mono relative z-0">
        <div className="flex flex-col items-center animate-pulse">
          <ProgressActivity className="w-16 h-16 mb-6 animate-spin text-(--accent-base)" />
          <span className="text-xl font-black uppercase font-expanded tracking-widest text-(--text-muted)">
            Syncing Attendance...
          </span>
        </div>
      </div>
    );
  }

  if (!detailedAttendance || detailedAttendance.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-(--bg-main) font-mono relative z-0">
        <div className="flex-1 flex flex-col items-center justify-center border-4 border-(--border-main) rounded-3xl bg-(--bg-card) p-10 max-w-lg w-full text-center">
          <Warning className="w-20 h-20 mb-6 text-(--text-muted) opacity-50" />
          <span className="text-2xl font-black uppercase font-expanded text-(--text-main)">
            No Attendance Data
          </span>
          <p className="mt-2 text-(--text-muted) font-bold text-sm">
            Attendance information is not available for the selected semester.
          </p>
        </div>
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
                <h2 className="text-2xl md:text-3xl font-black font-expanded leading-tight mb-5">
                  {selectedCourseObj.courseTitle}
                </h2>
                <div className="flex flex-col gap-1 text-sm text-(--text-muted) font-bold">
                  <div className="flex items-center gap-1.5">
                    <School className="w-4 h-4" />
                    {selectedCourseObj.faculty}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarMonth className="w-4 h-4" />
                    {selectedCourseObj.classDetail}
                  </div>
                </div>
              </div>

              <AttendanceCalculator course={selectedCourseObj} />

              <div className="mb-24 flex flex-col gap-3">
                <h4 className="text-sm font-black font-expanded uppercase tracking-widest text-(--text-main) mb-2">
                  History
                </h4>

                {attRecordsLoading && !records ? (
                  <div className="flex justify-center p-8">
                    <ProgressActivity className="w-8 h-8 animate-spin text-(--accent-base)" />
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
                        if (isNaN(dateObj.getTime()) && rec.date.includes("-")) {
                          const parts = rec.date.split("-");
                          if (parts.length === 3) {
                            // handle DD-MM-YYYY by converting to MM DD YYYY
                            dateObj = new Date(`${parts[1]} ${parts[0]} ${parts[2]}`);
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
                          <div className="flex flex-col">
                            <span className="text-sm font-bold font-expanded leading-none text-(--text-main) mb-2">
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
                  <div className="text-center p-6 text-(--text-muted) font-bold text-sm">
                    No history records found for this class.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
