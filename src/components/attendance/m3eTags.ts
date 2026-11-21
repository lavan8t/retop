/**
 * M3E tag aliases typed as `any`: the shared loose d.ts omits several M3E
 * attributes (name, min/max, checked, hide-selection-indicator, ...). Keeping
 * the mismatch in one place avoids casts at every call site; React still renders
 * the literal custom-element tag and forwards `key` correctly.
 */
export const M3eButton: any = 'm3e-button';
export const M3eButtonGroup: any = 'm3e-button-group';
// No m3e-toggle-button is registered: a toggle M3eButton plays that role.
export const M3eToggleButton: any = 'm3e-toggle-button';
export const M3eIconButton: any = 'm3e-icon-button';
export const M3eTooltip: any = 'm3e-tooltip';
export const M3eSelectionList: any = 'm3e-selection-list';
export const M3eListOption: any = 'm3e-list-option';
export const M3eChip: any = 'm3e-chip';
export const M3eCircularProgressIndicator: any =
  'm3e-circular-progress-indicator';
export const M3eLinearProgressIndicator: any = 'm3e-linear-progress-indicator';
export const M3eSnackbar: any = 'm3e-snackbar';
export const M3eSegmentedButton: any = 'm3e-segmented-button';
export const M3eButtonSegment: any = 'm3e-button-segment';
export const M3eSplitPane: any = 'm3e-split-pane';
export const M3eCard: any = 'm3e-card';
export const M3eNavRail: any = 'm3e-nav-rail';
export const M3eNavItem: any = 'm3e-nav-item';
export const M3eNavRailToggle: any = 'm3e-nav-rail-toggle';
export const M3eNavBar: any = 'm3e-nav-bar';
export const M3eFab: any = 'm3e-fab';
export const M3eIcon: any = 'm3e-icon';
