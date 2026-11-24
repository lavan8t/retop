import type React from 'react';

/** Home's compact connected rows, expressed as M3E list tokens. */
export const HOME_LIST_STYLE = {
  '--m3e-segmented-list-segment-gap': '2px',
  '--m3e-segmented-list-item-container-color':
    'var(--md-sys-color-surface-container)',
  '--m3e-segmented-list-item-container-shape': '0.25rem',
  '--m3e-list-item-padding-inline': '0.75rem',
  '--m3e-list-item-padding-block': '0.75rem',
  '--m3e-list-item-between-space': '0.75rem',
  '--m3e-list-item-label-text-color': 'var(--md-sys-color-on-surface)',
  '--m3e-list-item-supporting-text-color':
    'var(--md-sys-color-on-surface-variant)',
  '--m3e-list-item-trailing-color': 'var(--md-sys-color-on-surface-variant)',
} as React.CSSProperties;

/** Day-calendar rows own their colour and keep the feed's 1px gaps. */
export const DAY_LIST_STYLE = {
  '--m3e-segmented-list-segment-gap': '1px',
  '--m3e-segmented-list-item-container-color': 'transparent',
  '--m3e-list-item-padding-inline': '0.75rem',
  '--m3e-list-item-padding-block': '0.75rem',
  '--m3e-list-item-between-space': '0.5rem',
  '--m3e-list-item-label-text-color': 'currentColor',
  '--m3e-list-item-supporting-text-color': 'currentColor',
  '--m3e-list-item-trailing-color': 'currentColor',
} as React.CSSProperties;
