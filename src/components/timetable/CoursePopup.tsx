import React, { useEffect, useState, useRef } from "react";
import { TimetableCourse } from "../../types/vtop";
import { X, MapPin, User, Clock, GraduationCap } from "lucide-react";

interface CoursePopupProps {
  course: TimetableCourse | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export const CoursePopup: React.FC<CoursePopupProps> = ({
  course,
  position,
  onClose,
}) => {
  const [active, setActive] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (course && position && popupRef.current) {
      // Calculate position to keep within bounds
      // We assume standard viewport
      // Measure actual height if potential, or fallback
      const popupWidth = 320;
      const popupHeight = popupRef.current.offsetHeight || 300;
      const padding = 16;

      let x = position.x;
      let y = position.y;

      // Horizontal bounds
      if (x + popupWidth > window.innerWidth - padding) {
        x = window.innerWidth - popupWidth - padding;
      }
      if (x < padding) {
        x = padding;
      }

      // Vertical bounds
      // Only constrain if it TRULY overflows.
      // If y is large, it means we clicked near bottom.
      if (y + popupHeight > window.innerHeight - padding) {
        // Only flip if there is space above? Or just clamp?
        // Let's clamp to bottom edge
        y = window.innerHeight - popupHeight - padding;
      }

      // If clamping makes it go too high (negative top), verify
      if (y < padding) {
        // If it's too tall, maybe we should just scroll it or let it be?
        // For now, prioritize top visibility
        y = padding;
      }

      setAdjustedPosition({ x, y });
      requestAnimationFrame(() => setActive(true));
    } else {
      setActive(false);
    }
  }, [course, position]);

  if (!course || !position) return null;

  const isLab = course.type.includes("Lab");
  const colors = isLab
    ? {
        bg: "bg-purple-950",
        border: "border-purple-500",
        text: "text-purple-100",
        icon: "text-purple-400",
      }
    : {
        bg: "bg-blue-950",
        border: "border-blue-500",
        text: "text-blue-100",
        icon: "text-blue-400",
      };

  return (
    <>
      <div
        ref={popupRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          top: adjustedPosition.y,
          left: adjustedPosition.x,
        }}
        className={`
            fixed z-50 w-72 bg-zinc-900 border-2 ${colors.border} 
            rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden
            transform transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-top-left
            ${active ? "scale-100 opacity-100" : "scale-90 opacity-0"}
        `}
      >
        <div
          className={`${colors.bg} p-3 border-b-2 border-zinc-800 relative overflow-hidden`}
        >
          <div className="relative z-10 flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-1.5 py-0.5 rounded border ${colors.border} bg-black/30 text-[9px] font-black uppercase tracking-widest text-white`}
                >
                  {course.code}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wide opacity-80 ${colors.text}`}
                >
                  {course.type}
                </span>
              </div>
              <h2 className="text-sm font-black font-expanded text-white leading-tight wrap-break-word">
                {course.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors border border-transparent hover:border-white/20 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="p-3 space-y-2 bg-zinc-900">
          <div className="flex items-center gap-3 p-2 bg-zinc-950 rounded-xl border border-zinc-800">
            <div
              className={`w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 ${colors.icon}`}
            >
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
                Faculty
              </p>
              <p
                className="text-white font-bold text-xs truncate"
                title={course.faculty}
              >
                {course.faculty}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold uppercase mb-1">
                <MapPin className="w-3 h-3" /> Venue
              </div>
              <p className="text-white font-black text-xs">{course.venue}</p>
            </div>
            <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold uppercase mb-1">
                <GraduationCap className="w-3 h-3" /> Credits
              </div>
              <p className="text-white font-black text-xs">{course.credits}</p>
            </div>
          </div>

          <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold uppercase mb-2">
              <Clock className="w-3 h-3" /> Slots
            </div>
            <div className="flex flex-wrap gap-1">
              {course.slot.split("+").map((s, i) => (
                <span
                  key={i}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${colors.border} bg-black/20 ${colors.text}`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
