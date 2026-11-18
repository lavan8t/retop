import React from 'react';

export const MaterialSwitch = ({
  selected = false,
  disabled = false,
  onChange,
  label,
}: {
  selected?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  /** Accessible name — required because the track has no visible text. */
  label?: string;
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={selected}
      aria-label={label || 'Switch'}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && onChange) onChange(!selected);
      }}
      className={`inline-flex min-w-12 min-h-12 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface) select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span
        style={{
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: selected ? 'var(--accent-base)' : 'var(--border-dim)',
          backgroundColor: selected
            ? 'var(--accent-base)'
            : 'var(--bg-surface)',
        }}
        className="relative inline-flex items-center w-[46px] h-[26px] shrink-0 rounded-full transition-colors duration-150 ease-out"
      >
        <span
          style={{
            transform: selected ? 'translateX(21px)' : 'translateX(3px)',
            backgroundColor: selected
              ? 'var(--text-inverse, #ffffff)'
              : 'var(--text-muted, #94a3b8)',
          }}
          className={`pointer-events-none inline-block ${
            selected ? 'w-[18px] h-[18px]' : 'w-[14px] h-[14px]'
          } rounded-full transition-all duration-150 ease-out shadow-xs`}
        />
      </span>
    </button>
  );
};
