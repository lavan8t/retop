import type React from 'react';

/** Loose attribute shape for raw M3E custom tags in React 19 JSX. */
type M3eAttrs = {
  key?: React.Key;
  class?: string;
  className?: string;
  slot?: string;
  id?: string;
  for?: string;
  value?: string | number | boolean | null;
  selected?: boolean;
  variant?: string;
  size?: string | number;
  open?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  [key: `aria-${string}`]: string | number | boolean | undefined;
  [key: `data-${string}`]: string | number | boolean | undefined;
  [key: `on${string}`]: ((event: any) => void) | undefined;
};

declare global {
  interface Window {
    /** Set by the MAIN-world M3E injection script once registration runs. */
    __retopM3eRegistered?: boolean;
  }

  namespace React.JSX {
    interface IntrinsicElements {
      'm3e-theme': M3eAttrs;
      'm3e-theme-icon': M3eAttrs;
      'm3e-button': M3eAttrs;
      'm3e-icon-button': M3eAttrs;
      'm3e-icon': M3eAttrs;
      'm3e-list': M3eAttrs;
      'm3e-list-item': M3eAttrs;
      'm3e-list-item-button': M3eAttrs;
      'm3e-selection-list': M3eAttrs;
      'm3e-list-option': M3eAttrs;
      'm3e-list-action': M3eAttrs;
      'm3e-action-list': M3eAttrs;
      'm3e-expandable-list-item': M3eAttrs;
      'm3e-card': M3eAttrs;
      'm3e-chip': M3eAttrs;
      'm3e-assist-chip': M3eAttrs;
      'm3e-filter-chip': M3eAttrs;
      'm3e-filter-chip-set': M3eAttrs;
      'm3e-chip-set': M3eAttrs;
      'm3e-input-chip': M3eAttrs;
      'm3e-input-chip-set': M3eAttrs;
      'm3e-suggestion-chip': M3eAttrs;
      'm3e-switch': M3eAttrs;
      'm3e-dialog': M3eAttrs;
      'm3e-dialog-action': M3eAttrs;
      'm3e-dialog-trigger': M3eAttrs;
      'm3e-snackbar': M3eAttrs;
      'm3e-circular-progress-indicator': M3eAttrs;
      'm3e-linear-progress-indicator': M3eAttrs;
      'm3e-tabs': M3eAttrs;
      'm3e-tab': M3eAttrs;
      'm3e-tab-panel': M3eAttrs;
      'm3e-segmented-button': M3eAttrs;
      'm3e-button-segment': M3eAttrs;
      'm3e-form-field': M3eAttrs;
      'm3e-select': M3eAttrs;
      'm3e-option': M3eAttrs;
      'm3e-tooltip': M3eAttrs;
      'm3e-rich-tooltip': M3eAttrs;
      'm3e-rich-tooltip-action': M3eAttrs;
      'm3e-split-pane': M3eAttrs;
      'm3e-paginator': M3eAttrs;
    }
  }
}

export {};
