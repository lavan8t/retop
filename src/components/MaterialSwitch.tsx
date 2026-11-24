import React from 'react';
import { M3eSwitch } from './attendance/m3eTags';

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
    <M3eSwitch
      checked={selected}
      disabled={disabled}
      aria-label={label || 'Switch'}
      onChange={(e: any) => onChange?.(e.target.checked)}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      className={`inline-flex min-w-12 min-h-12 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface) select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={
        {
          '--m3e-switch-track-width': '46px',
          '--m3e-switch-track-height': '26px',
          '--m3e-switch-track-outline-width': '2px',
          '--m3e-switch-track-outline-color': 'var(--border-dim)',
          '--m3e-switch-selected-track-color': 'var(--accent-base)',
          '--m3e-switch-selected-handle-color': 'var(--text-inverse, #ffffff)',
          '--m3e-switch-selected-handle-width': '18px',
          '--m3e-switch-selected-handle-height': '18px',
          '--m3e-switch-unselected-track-color': 'var(--bg-surface)',
          '--m3e-switch-unselected-handle-color': 'var(--text-muted, #94a3b8)',
          '--m3e-switch-unselected-handle-width': '14px',
          '--m3e-switch-unselected-handle-height': '14px',
          '--m3e-switch-state-layer-size': '48px',
        } as React.CSSProperties
      }
    />
  );
};
