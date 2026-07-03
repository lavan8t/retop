import { useState } from "react";
import { ClassGroup } from "../../types/vtop";
import {
  Group,
  KeyboardArrowDown,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { motion, AnimatePresence } from "framer-motion";

export const formatShortGroupName = (label: string) => {
  if (!label) return "";
  const lower = label.toLowerCase();
  if (lower.includes("combined")) return "Combined";
  if (lower.includes("general (semester)")) return "Gen Sem";
  if (lower.includes("general (flexible)")) return "Gen Flex";
  if (lower.includes("pg freshers")) return "PG Fresh";
  if (lower.includes("research")) return "Research";
  if (lower.includes("ug freshers")) return "UG Fresh";
  if (lower.includes("ug industry")) return "UG Ind";
  if (lower.includes("ug seniors")) return "UG Snr";
  return label.length > 12 ? label.substring(0, 10) + ".." : label;
};

export const ClassGroupDropdown = ({ groups, selectedId, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected =
    groups.find((g: ClassGroup) => g.id === selectedId) || groups[0];

  if (!groups || groups.length === 0) return null;

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 md:gap-2 bg-(--bg-surface) border-2 border-(--border-main) px-2 md:px-3 py-1.5 rounded-lg md:rounded-xl text-(--text-main) font-bold shadow-none hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_var(--shadow-main)] transition-all active:translate-y-0 active:shadow-none text-[9px] sm:text-[10px] md:text-xs group"
      >
        <Group className="w-3 h-3 md:w-3.5 md:h-3.5 text-(--accent-base) group-hover:text-(--accent-hover) transition-colors shrink-0" />
        <span className="uppercase truncate max-w-16 sm:max-w-24 md:max-w-32 font-expanded">
          {selected ? formatShortGroupName(selected.label) : "Select Group"}
        </span>
        <KeyboardArrowDown
          className={`w-3 h-3 md:w-3.5 md:h-3.5 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
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
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              className="absolute top-full right-0 mt-2 w-[60vw] min-w-50 max-w-72 md:w-72 bg-(--bg-surface) border-2 border-(--border-main) rounded-xl shadow-none overflow-hidden z-50 origin-top-right"
            >
              <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 md:p-2 space-y-1">
                {groups.map((g: ClassGroup) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      onChange(g.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 md:px-3 md:py-2.5 text-[10px] md:text-xs font-bold uppercase transition-all rounded-lg border-2 ${
                      g.id === selectedId
                        ? "bg-(--accent-base) text-(--text-inverse) border-(--border-main)"
                        : "bg-transparent border-transparent text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main) hover:border-(--border-dim)"
                    }`}
                  >
                    {g.label}
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
