import React, { forwardRef } from 'react';
import { Check } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

/**
 * One deep module for every selectable/navigable row.
 *
 * Interface: content + current state + an activation callback.
 * Hidden inside: role, accessible name, 48dp target, focus ring, keyboard
 * activation and a non-color selection cue. Callers supply visuals only.
 */
export type SelectableRowRole = 'button' | 'radio' | 'option' | 'menuitem';

export interface SelectableRowSemantics {
  role?: SelectableRowRole;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  'aria-checked'?: boolean;
  'aria-selected'?: boolean;
}

/** The ARIA half of the seam — shared by the button and the div adapter. */
export function selectableRowSemantics({
  role = 'button',
  selected,
  label,
}: {
  role?: SelectableRowRole;
  selected?: boolean;
  label?: string;
}): SelectableRowSemantics {
  const semantics: SelectableRowSemantics = role === 'button' ? {} : { role };
  if (label) semantics['aria-label'] = label;
  if (selected !== undefined) {
    if (role === 'radio') semantics['aria-checked'] = selected;
    else if (role === 'option') semantics['aria-selected'] = selected;
    else semantics['aria-pressed'] = selected;
  }
  return semantics;
}

/** Target size, focus cue and cursor — never left to each caller. */
export const SELECTABLE_ROW_CLASS =
  'relative min-h-12 w-full text-left outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-(--accent-base) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface) disabled:cursor-not-allowed disabled:opacity-50';

/** Callers may need the originating event (e.g. Shift+Enter navigation). */
export type SelectableRowActivation = (
  event?: React.KeyboardEvent | React.MouseEvent,
) => void;

/** Activation keys for rows that cannot be a native button (nested controls). */
export function selectableRowKeyActivation(
  onActivate: SelectableRowActivation,
) {
  return (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onActivate(e);
    }
  };
}

/** Adapter props for a host element with nested interactive children. */
export function selectableRowProps({
  onActivate,
  selected,
  role = 'button',
  label,
  className = '',
}: {
  onActivate: SelectableRowActivation;
  selected?: boolean;
  role?: SelectableRowRole;
  label?: string;
  className?: string;
}) {
  return {
    ...selectableRowSemantics({ role, selected, label }),
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: selectableRowKeyActivation(onActivate),
    className: `${SELECTABLE_ROW_CLASS} ${className}`,
  };
}

/** Visible, non-color state cue. Layout is stable across both states. */
export const SelectionCheck = ({
  selected,
  className = '',
}: {
  selected: boolean;
  className?: string;
}) => (
  <span
    aria-hidden="true"
    className={`inline-flex items-center justify-center shrink-0 ${
      selected ? 'text-(--accent-base)' : 'text-transparent'
    } ${className}`}
  >
    <Check className="w-4 h-4" />
  </span>
);

export interface SelectableRowProps {
  children: React.ReactNode;
  onActivate: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  selected?: boolean;
  label?: string;
  role?: SelectableRowRole;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  title?: string;
  disabled?: boolean;
  'aria-current'?: React.AriaAttributes['aria-current'];
  'aria-expanded'?: boolean;
  'aria-haspopup'?: React.AriaAttributes['aria-haspopup'];
  'aria-controls'?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLButtonElement>;
  onDragOver?: React.DragEventHandler<HTMLButtonElement>;
  onDragLeave?: React.DragEventHandler<HTMLButtonElement>;
  onDrop?: React.DragEventHandler<HTMLButtonElement>;
  onDragEnd?: React.DragEventHandler<HTMLButtonElement>;
}

/** Native-button implementation. Preferred where there are no nested controls. */
export const SelectableRow = forwardRef<HTMLButtonElement, SelectableRowProps>(
  (
    {
      children,
      onActivate,
      selected,
      label,
      role = 'button',
      className = '',
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      {...selectableRowSemantics({ role, selected, label })}
      onClick={onActivate}
      className={`${SELECTABLE_ROW_CLASS} ${className}`}
      {...rest}
    >
      {selected !== undefined && <SelectionCheck selected={selected} />}
      {children}
    </button>
  ),
);

SelectableRow.displayName = 'SelectableRow';
