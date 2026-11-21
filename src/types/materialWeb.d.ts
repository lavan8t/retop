import type React from 'react';

/** Loose attribute shape for raw Material Web custom tags in React 19 JSX. */
type MaterialWebAttrs = {
  ref?: React.Ref<HTMLElement>;
  class?: string;
  className?: string;
  slot?: string;
  id?: string;
  children?: React.ReactNode;
  /* Material Web exposes its API as properties; React 19 assigns unknown
     attributes as properties on custom elements, so keep everything loose. */
  [key: string]: any;
};

declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      // Text fields
      'md-filled-text-field': MaterialWebAttrs;
      'md-outlined-text-field': MaterialWebAttrs;

      // Selects
      'md-filled-select': MaterialWebAttrs;
      'md-outlined-select': MaterialWebAttrs;
      'md-select-option': MaterialWebAttrs;

      // Buttons
      'md-filled-button': MaterialWebAttrs;
      'md-outlined-button': MaterialWebAttrs;
      'md-text-button': MaterialWebAttrs;
      'md-elevated-button': MaterialWebAttrs;
      'md-filled-tonal-button': MaterialWebAttrs;
      'md-icon-button': MaterialWebAttrs;
      'md-filled-icon-button': MaterialWebAttrs;
      'md-filled-tonal-icon-button': MaterialWebAttrs;
      'md-outlined-icon-button': MaterialWebAttrs;

      // Selection controls
      'md-switch': MaterialWebAttrs;
      'md-checkbox': MaterialWebAttrs;
      'md-radio': MaterialWebAttrs;

      // Surfaces & supporting controls
      'md-dialog': MaterialWebAttrs;
      'md-assist-chip': MaterialWebAttrs;
      'md-filter-chip': MaterialWebAttrs;
      'md-input-chip': MaterialWebAttrs;
      'md-suggestion-chip': MaterialWebAttrs;
      'md-menu': MaterialWebAttrs;
      'md-menu-item': MaterialWebAttrs;
      'md-list': MaterialWebAttrs;
      'md-list-item': MaterialWebAttrs;
      'md-circular-progress': MaterialWebAttrs;
      'md-linear-progress': MaterialWebAttrs;
    }
  }
}

export {};
