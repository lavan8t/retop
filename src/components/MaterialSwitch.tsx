import React from 'react';

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
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: selected ? 'var(--accent-base)' : 'var(--border-dim)',
        backgroundColor: selected ? 'var(--accent-base)' : 'var(--bg-surface)',
      }}
      className={`relative inline-flex items-center w-[46px] h-[26px] shrink-0 rounded-full transition-colors duration-150 ease-out outline-none select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
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
    </button>
  );
};
