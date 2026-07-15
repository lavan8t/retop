import React, { useState } from "react";
import { useCourseAttendanceForecast } from "../../hooks/useCourseAttendanceForecast";
import { KeyboardArrowDown } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

interface AttendanceMeterProps {
  courseCode: string;
}

export const AttendanceMeter: React.FC<AttendanceMeterProps> = ({ courseCode }) => {
  const forecast = useCourseAttendanceForecast(courseCode);
  const [isOpen, setIsOpen] = useState(false);

  if (!forecast) return null;

  const { status, safeSkips, requiredToPass, futureScheduledClasses } = forecast;

  let accentColor = "text-emerald-500";
  let copy = `You can bunk ${safeSkips} more class${safeSkips !== 1 ? "es" : ""} safely.`;

  if (status === "WARNING") {
    accentColor = "text-amber-500";
    copy = `Caution! Only ${safeSkips} skips remaining.`;
  } else if (status === "CRITICAL") {
    accentColor = "text-red-500";
    copy = safeSkips === 0 
      ? "You can't bunk any more classes." 
      : `You need to attend ${requiredToPass} more class${requiredToPass !== 1 ? "es" : ""} to reach 75%.`;
  }

  return (
    <div className="flex flex-col items-center mt-2 w-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 group outline-none"
      >
        <span className={`text-center font-bold text-sm ${accentColor}`}>
          {copy}
        </span>
        <KeyboardArrowDown className={`w-4 h-4 ${accentColor} transition-transform duration-fast ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="mt-4 p-4 bg-(--bg-surface) rounded-2xl w-full max-w-sm border-2 border-(--border-main)">
          {futureScheduledClasses > 0 && (
            <p className="text-xs text-center text-(--text-muted) font-bold uppercase mb-4 tracking-wider">
              Based on {futureScheduledClasses} upcoming scheduled classes
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-black text-(--text-muted) tracking-widest mb-1">Safe Skips</span>
              <span className="text-2xl font-expanded font-black text-(--text-main)">{safeSkips}</span>
            </div>
            <div className="flex flex-col items-center border-l-2 border-(--border-main)">
              <span className="text-[10px] uppercase font-black text-(--text-muted) tracking-widest mb-1">Required</span>
              <span className="text-2xl font-expanded font-black text-(--text-main)">{requiredToPass}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
