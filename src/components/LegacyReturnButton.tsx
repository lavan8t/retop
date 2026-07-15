import React from "react";
import { SubdirectoryArrowLeft } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { motion } from "framer-motion";
import { SPRING_SNAPPY } from "../utils/motion";

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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={SPRING_SNAPPY}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      // "pointer-events-auto" re-enables clicking strictly for this button!
      className="fixed bottom-8 right-8 z-99999 pointer-events-auto flex items-center justify-center gap-2 bg-(--md-sys-color-primary-container) text-(--md-sys-color-on-primary-container) px-5 py-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-transparent"
    >
      <SubdirectoryArrowLeft className="w-6 h-6" />
      <span
        className="font-expanded text-2xl leading-none mt-1 lowercase"
        style={{
          fontVariationSettings: '"slnt" -10, "wdth" 151, "wght" 700',
        }}
      >
        re.
      </span>
    </motion.button>
  );
};
