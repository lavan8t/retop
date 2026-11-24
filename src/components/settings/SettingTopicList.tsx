import React from 'react';

/** Grouped settings rows: 2px segment gaps, rounded container and item corners. */
const segmentedListStyle = {
  '--m3e-segmented-list-segment-gap': '2px',
  '--m3e-segmented-list-container-shape': '16px',
  '--m3e-segmented-list-item-container-shape': '12px',
  '--m3e-segmented-list-item-container-color':
    'var(--md-sys-color-surface-container)',
  '--m3e-list-item-padding-block': '1rem',
  '--m3e-list-item-padding-inline': '1rem',
  '--m3e-list-item-font-size': '0.875rem',
  '--m3e-list-item-font-weight': '600',
  '--m3e-list-item-supporting-text-font-size': '0.75rem',
  '--m3e-list-item-label-text-color': 'var(--md-sys-color-on-surface)',
  '--m3e-list-item-supporting-text-color':
    'var(--md-sys-color-on-surface-variant)',
} as React.CSSProperties;

export const SettingTopicList = ({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) => (
  <section className="flex flex-col gap-2">
    <h3 className="font-expanded font-semibold text-base text-(--text-main)">
      {title}
    </h3>
    <m3e-list
      variant="segmented"
      className="w-full gap-0.5 overflow-visible"
      style={segmentedListStyle}
    >
      {children}
    </m3e-list>
  </section>
);
