import React from "react";
import { SubdirectoryArrowLeft } from '@nine-thirty-five/material-symbols-react/rounded';
import { motion } from "framer-motion";

interface LegacyReturnButtonProps {
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const LegacyReturnButton: React.FC<LegacyReturnButtonProps> = ({
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      whileHover={{ scale: 1.05, rotate: -2 }}
      whileTap={{ scale: 0.95, rotate: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      // "pointer-events-auto" re-enables clicking strictly for this button!
      className="fixed bottom-8 right-8 z-99999 pointer-events-auto flex items-center justify-center gap-3 bg-yellow-400 text-black px-6 py-4 border-4 border-(--border-main) rounded-3xl shadow-none hover:shadow-[4px_4px_0px_0px_var(--shadow-main)] cursor-pointer"
    >
      <SubdirectoryArrowLeft className="w-6 h-6 stroke-3" />
      <span className="font-expanded font-black text-2xl leading-none mt-1  lowercase">
        re.
      </span>
    </motion.button>
  );
};
