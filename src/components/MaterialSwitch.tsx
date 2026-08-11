import React from "react";

export const MaterialSwitch = ({
  selected = false,
  disabled = false,
  onChange,
}: {
  selected?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={selected}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && onChange) onChange(!selected);
      }}
      style={{
        borderWidth: "2px",
        borderStyle: "solid",
        borderColor: selected ? "var(--accent-base)" : "var(--border-main)",
        backgroundColor: selected ? "var(--accent-base)" : "var(--bg-surface)",
      }}
      className={`relative inline-flex items-center w-[50px] h-[28px] shrink-0 rounded-full transition-colors duration-150 ease-out outline-none select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span
        style={{
          transform: selected ? "translateX(24px)" : "translateX(2px)",
        }}
        className="pointer-events-none inline-block w-[20px] h-[20px] rounded-full bg-white dark:bg-black transition-transform duration-150 ease-out"
      />
    </button>
  );
};
