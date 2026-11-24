import React from 'react';
import { M3eFilterChip, M3eFilterChipSet } from '../attendance/m3eTags';

export interface ColorOption {
  id: string;
  hex: string;
  label: string;
}

const circleStyle = (hex: string): React.CSSProperties =>
  ({
    '--m3e-chip-container-shape': '9999px',
    '--m3e-chip-container-height': '32px',
    '--m3e-chip-padding-start': '0px',
    '--m3e-chip-padding-end': '0px',
    '--m3e-chip-label-text-color': 'transparent',
    '--m3e-chip-selected-label-text-color': 'transparent',
    '--m3e-elevated-chip-container-color': hex,
    '--m3e-chip-selected-container-color': hex,
    '--m3e-chip-selected-outline-thickness': '3px',
    '--m3e-chip-selected-outline-color': 'var(--md-sys-color-on-surface)',
  }) as React.CSSProperties;

export const ColorCirclePicker: React.FC<{
  colors: ColorOption[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}> = ({ colors, value, onChange, label }) => (
  <M3eFilterChipSet
    aria-label={label}
    hide-selection-indicator
    className="flex flex-wrap items-center gap-2"
  >
    {colors.map((color) => (
      <M3eFilterChip
        key={color.id}
        value={color.id}
        selected={value === color.id}
        aria-label={color.label}
        title={color.label}
        variant="elevated"
        style={circleStyle(color.hex)}
        className="w-8 h-8"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onChange(color.id);
        }}
      />
    ))}
  </M3eFilterChipSet>
);
