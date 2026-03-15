import { useState } from "react";
import { Semester } from "../../types/vtop";
import { Calendar, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const SemesterDropdown = ({ semesters, selectedId, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected =
    semesters.find((s: Semester) => s.id === selectedId) || semesters[0];

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 md:gap-2 bg-zinc-900 border-2 border-black px-2 md:px-3 py-1.5 rounded-lg md:rounded-xl text-zinc-200 font-bold shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] transition-all active:translate-y-0 active:shadow-none text-[9px] sm:text-[10px] md:text-xs group"
      >
        <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 text-cyan-500 group-hover:text-cyan-400 transition-colors shrink-0" />
        <span className="uppercase tracking-wide truncate max-w-12.5 sm:max-w-20 md:max-w-30 font-expanded">
          {selected?.label || "Select Sem"}
        </span>
        <ChevronDown
          className={`w-3 h-3 md:w-3.5 md:h-3.5 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            ></div>
            {/* Responsive dropdown width to prevent mobile overflow */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              className="absolute top-full right-0 mt-2 w-[60vw] min-w-50 max-w-72 md:w-72 bg-zinc-900 border-2 border-black rounded-xl shadow-[8px_8px_0px_0px_#000] overflow-hidden z-50 origin-top-right"
            >
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
                        ? "bg-cyan-400 text-black border-black"
                        : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-black"
                    }`}
                  >
                    {sem.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
