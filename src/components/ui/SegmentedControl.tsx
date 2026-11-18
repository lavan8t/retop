import React from 'react';
import { Check } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

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
  /** Accessible name for the radiogroup. */
  ariaLabel?: string;
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  className = '',
  buttonClassName = 'px-2.5 sm:px-3 py-3',
  ariaLabel = 'View',
}: SegmentedControlProps<T>) => {
  const selectByArrow = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const next = (idx + delta + options.length) % options.length;
    const group = (e.currentTarget as HTMLElement).parentElement;
    (group?.querySelectorAll('[role="radio"]')[next] as HTMLElement)?.focus();
    onChange(options[next].value, e as any);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`flex items-center gap-0.5 shrink-0 ${className}`}
    >
      {options.map((option, idx) => {
        const isSelected = value === option.value;
        const isFirst = idx === 0;
        const isLast = idx === options.length - 1;

        let roundedClass = 'rounded-md';
        if (isSelected) {
          roundedClass = 'rounded-[20px]';
        } else if (isFirst) {
          roundedClass = 'rounded-l-[20px] rounded-r-md';
        } else if (isLast) {
          roundedClass = 'rounded-l-md rounded-r-[20px]';
        }

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onKeyDown={(e) => selectByArrow(e, idx)}
            onClick={(e) => {
              e.stopPropagation();
              onChange(option.value, e);
            }}
            className={`${buttonClassName} min-h-12 min-w-12 flex items-center justify-center gap-1 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) transition-all duration-fast shadow-none ${roundedClass} ${
              isSelected
                ? 'bg-(--text-main) text-(--bg-main)'
                : 'bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main)'
            }`}
          >
            <span aria-hidden="true" className="inline-flex shrink-0">
              {isSelected && <Check className="w-3.5 h-3.5" />}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
