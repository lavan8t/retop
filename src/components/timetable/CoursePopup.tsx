import React, { useEffect, useState } from "react";
import { TimetableCourse } from "../../types/vtop";
import { X, MapPin, User, Clock, Layers, GraduationCap } from "lucide-react";

interface CoursePopupProps {
  course: TimetableCourse | null;
  onClose: () => void;
}

export const CoursePopup: React.FC<CoursePopupProps> = ({
  course,
  onClose,
}) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (course) requestAnimationFrame(() => setActive(true));
    else setActive(false);
  }, [course]);

  if (!course) return null;

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
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
            relative w-full max-w-md bg-zinc-900 border-4 ${colors.border} 
            rounded-[2rem] shadow-[0px_20px_60px_rgba(0,0,0,0.8)] overflow-hidden
            transform transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${active ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-8"}
        `}
      >
        <div
          className={`${colors.bg} p-6 border-b-4 border-zinc-800 relative overflow-hidden`}
        >
          <div className="relative z-10 flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded-lg border-2 ${colors.border} bg-black/30 text-[10px] font-black uppercase tracking-widest text-white`}
                >
                  {course.code}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide opacity-80 ${colors.text}`}
                >
                  {course.type}
                </span>
              </div>
              <h2 className="text-xl font-black font-expanded text-white leading-tight">
                {course.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors border-2 border-transparent hover:border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 bg-zinc-900">
          <div className="flex items-center gap-4 p-4 bg-zinc-950 rounded-2xl border-2 border-zinc-800">
            <div
              className={`w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border-2 border-zinc-800 ${colors.icon}`}
            >
              <User className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
                Faculty
              </p>
              <p className="text-white font-bold text-sm truncate">
                {course.faculty}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-zinc-950 rounded-2xl border-2 border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase mb-1">
                <MapPin className="w-3 h-3" /> Venue
              </div>
              <p className="text-white font-black text-lg">{course.venue}</p>
            </div>
            <div className="p-4 bg-zinc-950 rounded-2xl border-2 border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase mb-1">
                <GraduationCap className="w-3 h-3" /> Credits
              </div>
              <p className="text-white font-black text-lg">{course.credits}</p>
            </div>
          </div>

          <div className="p-4 bg-zinc-950 rounded-2xl border-2 border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase mb-3">
              <Clock className="w-3 h-3" /> Registered Slots
            </div>
            <div className="flex flex-wrap gap-2">
              {course.slot.split("+").map((s, i) => (
                <span
                  key={i}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 ${colors.border} bg-black/20 ${colors.text}`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
