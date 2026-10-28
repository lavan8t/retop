import React from 'react';

declare global {
  const browser: any;
  namespace React.JSX {
    interface IntrinsicElements {
      'md-switch': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          selected?: boolean;
          disabled?: boolean;
        },
        HTMLElement
      >;
      'md-slider': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          min?: number;
          max?: number;
          value?: number;
        },
        HTMLElement
      >;
    }
  }
}

export {};
