import { describe, expect, test } from 'bun:test';
import {
  SELECTABLE_ROW_CLASS,
  selectableRowKeyActivation,
  selectableRowProps,
  selectableRowSemantics,
} from '../SelectableRow';

describe('selectable-row seam', () => {
  test('role and state decide the ARIA name/state attributes', () => {
    expect(selectableRowSemantics({ label: 'Open timetable' })).toEqual({
      'aria-label': 'Open timetable',
    });
    expect(
      selectableRowSemantics({ role: 'radio', selected: true, label: 'Grid' }),
    ).toEqual({
      role: 'radio',
      'aria-label': 'Grid',
      'aria-checked': true,
    });
    expect(selectableRowSemantics({ role: 'option', selected: false })).toEqual(
      { role: 'option', 'aria-selected': false },
    );
    expect(selectableRowSemantics({ selected: false })).toEqual({
      'aria-pressed': false,
    });
  });

  test('every adapter gets a target size, focus ring and keyboard activation', () => {
    let activated = 0;
    const props = selectableRowProps({
      onActivate: () => activated++,
      label: 'Pin dashboard',
      className: 'rounded-xl',
    });

    expect(props.tabIndex).toBe(0);
    expect(props.className).toContain(SELECTABLE_ROW_CLASS);
    expect(props.className).toContain('min-h-12');
    expect(props.className).toContain('focus-visible:ring-2');
    expect(props['aria-label']).toBe('Pin dashboard');

    const onKeyDown = selectableRowKeyActivation(() => activated++);
    onKeyDown({
      key: 'Enter',
      preventDefault() {},
      stopPropagation() {},
    } as any);
    onKeyDown({ key: ' ', preventDefault() {}, stopPropagation() {} } as any);
    onKeyDown({ key: 'a', preventDefault() {}, stopPropagation() {} } as any);
    expect(activated).toBe(2);
  });
});
