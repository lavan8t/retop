import React from "react";

export interface SegmentedControlOption<T extends string> {
  label: React.ReactNode;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T, e: React.MouseEvent) => void;
  className?: string;
  buttonClassName?: string;
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  className = "",
  buttonClassName = "px-2.5 sm:px-3 py-1.5",
}: SegmentedControlProps<T>) => {
  return (
    <div className={`flex items-center gap-0.5 shrink-0 ${className}`}>
      {options.map((option, idx) => {
        const isSelected = value === option.value;
        const isFirst = idx === 0;
        const isLast = idx === options.length - 1;

        let roundedClass = "rounded-md";
        if (isSelected) {
          roundedClass = "rounded-[20px]";
        } else if (isFirst) {
          roundedClass = "rounded-l-[20px] rounded-r-md";
        } else if (isLast) {
          roundedClass = "rounded-l-md rounded-r-[20px]";
        }

        return (
          <button
            key={option.value}
            onClick={(e) => {
              e.stopPropagation();
              onChange(option.value, e);
            }}
            className={`${buttonClassName} text-xs font-bold transition-all duration-fast shadow-none ${roundedClass} ${
              isSelected
                ? "bg-(--text-main) text-(--bg-main)"
                : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main)"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
