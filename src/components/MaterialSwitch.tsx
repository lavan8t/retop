import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Close,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

export const MaterialSwitch = ({
  selected = false,
  disabled = false,
  onChange,
}: {
  selected?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // M3 Expressive Switch
  const thumbSize =
    isActive && !disabled ? 28 : selected || isHovered ? 24 : 16;

  let x = 6;
  if (selected) {
    x = isActive && !disabled ? 21 : 23;
  } else {
    x = isActive && !disabled ? 0 : isHovered && !disabled ? 5 : 9;
  }

  return (
    <button
      role="switch"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!selected)}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => !disabled && setIsHovered(false)}
      onMouseDown={() => !disabled && setIsActive(true)}
      onMouseUp={() => !disabled && setIsActive(false)}
      onMouseOut={() => !disabled && setIsActive(false)}
      className={`relative w-[52px] h-[32px] rounded-full border-2 transition-colors duration-fast ease-in flex items-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--md-sys-color-primary) ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${
        selected
          ? "bg-(--md-sys-color-primary) border-(--md-sys-color-primary)"
          : "bg-(--md-sys-color-surface-variant) border-(--md-sys-color-outline) hover:border-(--md-sys-color-on-surface)"
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
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        className={`absolute rounded-full flex items-center justify-center shadow-sm overflow-hidden transition-colors duration-fast ${
          selected
            ? "bg-(--md-sys-color-on-primary) text-(--md-sys-color-primary)"
            : "bg-(--md-sys-color-on-surface-variant) text-(--md-sys-color-surface-variant)"
        }`}
      >
        <motion.div
          initial={false}
          animate={{
            opacity: selected || isHovered ? 1 : 0,
            scale: selected || isHovered ? 1 : 0.5,
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
