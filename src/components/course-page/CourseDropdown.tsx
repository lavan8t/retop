import React, { useState } from "react";
import { CoursePageOption } from "../../types/vtop";
import { Layers, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CourseDropdownProps {
  options: CoursePageOption[];
  selectedId: string;
  onChange: (id: string) => void;
}

export const CourseDropdown = ({
  options,
  selectedId,
  onChange,
}: CourseDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((o) => o.classId === selectedId);

  return (
    <div className="relative z-50 font-mono">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all active:scale-95 group ${
          isOpen
            ? "bg-cyan-400 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-cyan-400"
        }`}
      >
        <Layers
          className={`w-4 h-4 ${isOpen ? "text-black" : "text-cyan-400"}`}
        />
        <div className="flex flex-col items-start leading-none text-left">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${
              isOpen ? "opacity-60" : "text-zinc-500"
            }`}
          >
            Selected Course
          </span>
          <span className="text-xs font-black uppercase tracking-wide truncate max-w-40">
            {selected ? selected.code : "SELECT COURSE"}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-3 w-80 bg-zinc-950 border-4 border-zinc-800 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-50 flex flex-col"
            >
              <div className="p-3 bg-cyan-400 border-b-4 border-zinc-800 flex justify-between items-center">
                <span className="font-black text-xs uppercase tracking-widest text-black">
                  Available Courses
                </span>
                <span className="bg-black text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {options.length}
                </span>
              </div>
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2 space-y-1">
                {options.map((opt) => (
                  <button
                    key={opt.classId}
                    onClick={() => {
                      onChange(opt.classId);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between group ${
                      opt.classId === selectedId
                        ? "bg-zinc-900 border-zinc-800 text-zinc-200"
                        : "bg-transparent border-transparent hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800"
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-sm leading-none">
                        {opt.code}
                      </span>
                      <span className="text-[10px] font-bold opacity-70 truncate w-56">
                        {opt.title}
                      </span>
                      <div className="flex gap-2 mt-1">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded border ${
                            opt.classId === selectedId
                              ? "border-zinc-700 bg-zinc-800 text-zinc-400"
                              : "border-zinc-800 bg-zinc-950 text-zinc-600"
                          }`}
                        >
                          {opt.type}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded border ${
                            opt.classId === selectedId
                              ? "border-zinc-700 bg-zinc-800 text-zinc-400"
                              : "border-zinc-800 bg-zinc-950 text-zinc-600"
                          }`}
                        >
                          {opt.credits} Cr
                        </span>
                      </div>
                    </div>
                    {opt.classId === selectedId && (
                      <Check className="w-5 h-5 text-cyan-400" />
                    )}
                  </button>
                ))}
                {options.length === 0 && (
                  <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                    No courses found
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
