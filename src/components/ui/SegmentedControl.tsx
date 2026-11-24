import React from 'react';
import { M3eButtonSegment, M3eSegmentedButton } from '../attendance/m3eTags';

export interface SegmentedControlOption<T extends string> {
  label: React.ReactNode;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T, e: Event) => void;
  className?: string;
  buttonClassName?: string;
  /** Accessible name for the segmented button (the component supplies the group semantics). */
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
  return (
    <div className={`flex items-center gap-0.5 shrink-0 ${className}`}>
      <M3eSegmentedButton
        aria-label={ariaLabel}
        onChange={(e: any) => {
          e.stopPropagation();
          onChange(e.target.value as T, e);
        }}
        style={
          {
            '--m3e-segmented-button-height': '48px',
            '--m3e-segmented-button-font-size': '12px',
            '--m3e-segmented-button-font-weight': '700',
            '--m3e-segmented-button-start-shape': '20px',
            '--m3e-segmented-button-end-shape': '20px',
            '--m3e-segmented-button-selected-container-color':
              'var(--text-main)',
            '--m3e-segmented-button-selected-label-text-color':
              'var(--bg-main)',
            '--m3e-segmented-button-unselected-label-text-color':
              'var(--text-muted)',
            '--m3e-segmented-button-unselected-container-hover-color':
              'var(--bg-highlight)',
          } as React.CSSProperties
        }
      >
        {options.map((option) => (
          <M3eButtonSegment
            key={option.value}
            value={option.value}
            checked={value === option.value}
            className={buttonClassName}
            style={{ minWidth: '3rem' }}
          >
            {option.label}
          </M3eButtonSegment>
        ))}
      </M3eSegmentedButton>
    </div>
  );
};
