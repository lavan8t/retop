import { useId, type ReactNode } from 'react';

/**
 * 48dp icon-only action with an accessible name and a native tooltip.
 * Keeps the M3 icon-button states (hover/pressed/focus/disabled) without
 * pulling in a web component.
 */
export const IconAction = ({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => {
  const id = `att-action-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <button
      id={id}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full text-(--accent-base) outline-none cursor-pointer transition-colors hover:bg-(--bg-highlight) active:bg-(--bg-highlight)/70 focus-visible:ring-2 focus-visible:ring-(--accent-base) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {icon}
    </button>
  );
};
