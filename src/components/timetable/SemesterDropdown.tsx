import { useState } from "react";
import { Semester } from "../../types/vtop";
import { Calendar, ChevronDown } from "lucide-react";

export const SemesterDropdown = ({ semesters, selectedId, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected =
    semesters.find((s: Semester) => s.id === selectedId) || semesters[0];

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 md:gap-2 bg-zinc-900 border-2 border-zinc-700 px-2 md:px-3 py-1.5 rounded-lg md:rounded-xl text-zinc-300 font-bold hover:border-blue-500 hover:text-white transition-all active:scale-95 text-[9px] sm:text-[10px] md:text-xs group"
      >
        <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-500 group-hover:text-white transition-colors shrink-0" />
        <span className="uppercase tracking-wide truncate max-w-12.5 sm:max-w-20 md:max-w-30 font-expanded">
          {selected?.label || "Select Sem"}
        </span>
        <ChevronDown
          className={`w-3 h-3 md:w-3.5 md:h-3.5 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
          {/* Responsive dropdown width to prevent mobile overflow */}
          <div className="absolute top-full right-0 mt-2 w-[60vw] min-w-50 max-w-72 md:w-72 bg-zinc-900 border-2 border-zinc-800 rounded-xl shadow-[0px_10px_30px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
            <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 md:p-2 space-y-1">
              {semesters.map((sem: Semester) => (
                <button
                  key={sem.id}
                  onClick={() => {
                    onChange(sem.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 md:px-3 md:py-2.5 text-[10px] md:text-xs font-bold uppercase transition-all rounded-lg border-2 ${
                    sem.id === selectedId
                      ? "bg-blue-500 text-white border-blue-600 shadow-md"
                      : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  {sem.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
