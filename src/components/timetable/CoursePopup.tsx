import React, { useEffect, useState, useRef } from "react";
import { TimetableCourse } from "../../types/vtop";
import { X, MapPin, User, Clock, GraduationCap, PieChart } from "lucide-react";

interface CoursePopupProps {
  course: TimetableCourse | null;
  position: { x: number; y: number } | null;
  attendance?: string;
  onClose: () => void;
}

export const CoursePopup: React.FC<CoursePopupProps> = ({
  course,
  position,
  attendance,
  onClose,
}) => {
  const [active, setActive] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (course && position && popupRef.current) {
      const popupWidth = 320;
      const popupHeight = popupRef.current.offsetHeight || 300;
      const padding = 16;

      let x = position.x;
      let y = position.y;

      if (x + popupWidth > window.innerWidth - padding)
        x = window.innerWidth - popupWidth - padding;
      if (x < padding) x = padding;

      if (y + popupHeight > window.innerHeight - padding)
        y = window.innerHeight - popupHeight - padding;
      if (y < padding) y = padding;

      setAdjustedPosition({ x, y });
      requestAnimationFrame(() => setActive(true));
    } else {
      setActive(false);
    }
  }, [course, position]);

  if (!course || !position) return null;

  const isLab = course.type.includes("Lab");
  const colors = isLab
    ? { bg: "bg-purple-400", text: "text-black", icon: "text-purple-500" }
    : { bg: "bg-cyan-400", text: "text-black", icon: "text-blue-500" };

  return (
    <>
      <div
        ref={popupRef}
        onClick={(e) => e.stopPropagation()}
        style={{ top: adjustedPosition.y, left: adjustedPosition.x }}
        className={`fixed z-50 w-72 bg-zinc-900 border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_#000] overflow-hidden transform transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-top-left ${active ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
      >
        <div
          className={`${colors.bg} p-3 border-b-2 border-black relative overflow-hidden`}
        >
          <div className="relative z-10 flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-1.5 py-0.5 rounded border-2 border-black bg-white/30 text-[9px] font-black uppercase tracking-widest ${colors.text}`}
                >
                  {course.code}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wide opacity-80 ${colors.text}`}
                >
                  {course.type}
                </span>
              </div>
              <h2
                className={`text-sm font-black font-expanded leading-tight wrap-break-word ${colors.text}`}
              >
                {course.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 bg-black/10 hover:bg-black/20 rounded-full transition-colors border-2 border-transparent hover:border-black shrink-0 ${colors.text}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="p-3 space-y-2 bg-zinc-900">
          <div className="flex items-center gap-3 p-2 bg-zinc-950 rounded-xl border-2 border-black">
            <div
              className={`w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border-2 border-black ${colors.icon}`}
            >
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
                Faculty
              </p>
              <p
                className="text-zinc-200 font-bold text-xs truncate"
                title={course.faculty}
              >
                {course.faculty}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-zinc-950 rounded-xl border-2 border-black">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold uppercase mb-1">
                <MapPin className="w-3 h-3" /> Venue
              </div>
              <p className="text-zinc-200 font-black text-xs truncate">
                {course.venue}
              </p>
            </div>
            <div className="p-2 bg-zinc-950 rounded-xl border-2 border-black">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold uppercase mb-1">
                <GraduationCap className="w-3 h-3" /> Credits
              </div>
              <p className="text-zinc-200 font-black text-xs">
                {course.credits}
              </p>
            </div>

            <div className="p-2 bg-zinc-950 rounded-xl border-2 border-black">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold uppercase mb-2">
                <Clock className="w-3 h-3" /> Slots
              </div>
              <div className="flex flex-wrap gap-1">
                {course.slot.split("+").map((s, i) => (
                  <span
                    key={i}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border-2 border-black ${colors.bg} ${colors.text}`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-2 bg-zinc-950 rounded-xl border-2 border-black">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold uppercase mb-2">
                <PieChart className="w-3 h-3" /> Attendance
              </div>
              <p
                className={`font-black text-sm ${attendance && parseFloat(attendance) < 75 ? "text-red-500" : "text-emerald-400"}`}
              >
                {attendance || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
