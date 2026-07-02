import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Close } from '@nine-thirty-five/material-symbols-react/rounded';

export const MaterialSwitch = ({
  selected = false,
  onChange,
}: {
  selected?: boolean;
  onChange?: (checked: boolean) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // M3 Expressive Switch
  const thumbSize = isActive ? 28 : (selected || isHovered ? 24 : 16);
  
  let x = 6;
  if (selected) {
    x = isActive ? 18 : 20;
  } else {
    x = isActive ? 0 : (isHovered ? 2 : 6);
  }

  return (
    <button
      role="switch"
      aria-checked={selected}
      onClick={() => onChange && onChange(!selected)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onMouseOut={() => setIsActive(false)}
      className={`relative w-[52px] h-[32px] rounded-full border-2 transition-colors duration-300 ease-in flex items-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--accent-base) ${
        selected
          ? 'bg-(--accent-base) border-(--accent-base)'
          : 'bg-(--bg-surface) border-(--border-dim) hover:border-(--border-main)'
      }`}
    >
      <motion.div
        initial={false}
        animate={{
          x,
          width: thumbSize,
          height: thumbSize,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
        className={`absolute rounded-full flex items-center justify-center shadow-sm overflow-hidden transition-colors duration-300 ${
          selected ? 'bg-(--bg-main) text-(--accent-base)' : 'bg-(--text-muted) text-(--bg-surface)'
        }`}
      >
        <motion.div
            initial={false}
            animate={{
              opacity: (selected || isHovered) ? 1 : 0,
              scale: (selected || isHovered) ? 1 : 0.5
            }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
        >
            {selected ? (
            <Check className="w-4 h-4 text-inherit" />
            ) : (
            <Close className="w-4 h-4 text-inherit" />
            )}
        </motion.div>
      </motion.div>
    </button>
  );
};
