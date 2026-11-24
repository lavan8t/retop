import { describe, expect, it, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DefaultsSection } from '../../settings/DefaultsSection';
import { FilterChips } from '../../home/FilterChips';
import { DEFAULT_SETTINGS } from '../../../utils/settings-store';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const root = resolve(import.meta.dir, '../../../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

describe('M3E shared control wrappers', () => {
  it('MaterialSwitch delegates to m3e-switch without redrawing the track', () => {
    const source = read('src/components/MaterialSwitch.tsx');
    expect(source).toContain('<M3eSwitch');
    expect(source).toContain('checked={selected}');
    expect(source).toContain('disabled={disabled}');
    expect(source).toContain("aria-label={label || 'Switch'}");
    expect(source).toContain('onChange?.(e.target.checked)');
    expect(source).not.toContain('role="switch"');

    // Hit area stays; colors use Material 3 roles, not app-specific variables.
    expect(source).toContain('min-w-12 min-h-12');
    expect(source).toContain('focus-visible:ring-(--accent-base)');
    expect(source).toContain("'--m3e-switch-track-width'");
    for (const token of [
      '--m3e-switch-selected-track-color',
      '--m3e-switch-unselected-track-color',
      '--m3e-switch-track-outline-color',
    ]) {
      expect(source).toContain(token);
    }
    expect(source).not.toContain(
      "'--m3e-switch-selected-track-color': 'var(--accent-base)'",
    );
  });

  it('settings, home and TopBar render connected groups instead of SegmentedControl', () => {
    for (const file of [
      'src/components/settings/DefaultsSection.tsx',
      'src/components/home/FilterChips.tsx',
      'src/components/layout/TopBar.tsx',
    ]) {
      const source = read(file);
      expect(source).not.toContain('SegmentedControl');
      expect(source).toContain('<M3eButtonGroup');
      expect(source).toContain('variant="connected"');
      expect(source).toContain('<M3eButton');
      expect(source).toContain('toggle');
      expect(source).toContain('selected=');
      expect(source).toContain('onClick=');
      expect(source).not.toContain('m3e-segmented-button');
    }
    expect(read('src/pages/calendar.tsx')).not.toContain('SegmentedControl');
  });

  it('TopBar calendar view buttons re-assert selection in both control locations', () => {
    const source = read('src/components/layout/TopBar.tsx');
    expect(source).toContain('aria-label="Calendar view"');
    expect(source).toContain('value={calViewMode}');
    expect(source).toContain('onChange={setCalViewMode}');
    expect(source.match(/<CalendarViewButtons/g)?.length).toBe(2);
    expect(source.match(/reassertSelection\(e\)/g)?.length).toBe(2);
  });

  it('connected buttons forward taps to the original callbacks', async () => {
    const click = async (el: Element) => {
      await act(async () => {
        el.dispatchEvent(
          new MouseEvent('click', { bubbles: true, composed: true }),
        );
      });
    };
    const button = (group: Element, value: string) =>
      Array.from(group.querySelectorAll('m3e-button')).find(
        (b) => b.getAttribute('value') === value,
      )!;
    const render = async (element: React.ReactElement) => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = createRoot(host);
      await act(async () => root.render(element));
      return { host, root };
    };
    const cleanup = async ({
      host,
      root,
    }: {
      host: HTMLElement;
      root: Root;
    }) => {
      await act(async () => root.unmount());
      host.remove();
    };

    const updateSetting = mock((_key: string, _value: unknown) => {});
    const settings = await render(
      React.createElement(DefaultsSection, {
        settings: { ...DEFAULT_SETTINGS, timeFormat: '12h' },
        updateSetting: updateSetting as any,
      }),
    );
    try {
      const timeGroup = settings.host.querySelectorAll('m3e-button-group')[1];
      await click(button(timeGroup, '12h-ampm'));
      expect(updateSetting).toHaveBeenCalledWith('timeFormat', '12h-ampm');
    } finally {
      await cleanup(settings);
    }

    const setEventFilter = mock((_filter: string) => {});
    const filters = await render(
      React.createElement(FilterChips, {
        eventFilter: 'all',
        setEventFilter: setEventFilter as any,
      }),
    );
    try {
      await click(
        button(filters.host.querySelector('m3e-button-group')!, 'classes'),
      );
      expect(setEventFilter).toHaveBeenCalledWith('classes');
    } finally {
      await cleanup(filters);
    }
  });

  it('Dropdown uses m3e-form-field/m3e-select and emits the original option ids', () => {
    const source = read('src/components/ui/Dropdown.tsx');
    expect(source).toContain('<M3eFormField');
    expect(source).toContain('<label slot="label">');
    expect(source).toContain('<M3eSelect');
    expect(source).toContain('<M3eOption');
    expect(source).toContain('String(o.id) === next');
    expect(source).toContain('onChange(match.id)');
    for (const removed of [
      'createPortal',
      'getAppRoot',
      'role="listbox"',
      'handleKeyDown',
      'KeyboardArrowDown',
    ]) {
      expect(source).not.toContain(removed);
    }

    expect(source).toContain('className={className}');
    expect(source).toContain(
      "'--m3e-outlined-form-field-container-shape': '9999px'",
    );
    expect(source).not.toContain("'--m3e-form-field-container-shape'");
    expect(source).toContain('export const SemesterDropdown');
    expect(source).toContain('export const ClassGroupDropdown');
    expect(source).toContain('export function SettingsDropdown');
  });

  it('AlertDialog keeps the promise API and resolves from m3e-dialog returnValue', () => {
    const source = read('src/components/ui/AlertDialog.tsx');
    expect(source).toContain('export function showAlertDialog');
    expect(source).toContain('new Promise<boolean>');
    expect(source).toContain('<M3eDialog');
    expect(source).toContain('slot="header"');
    expect(source).toContain('slot="actions"');
    expect(source).toContain('<M3eButton');
    expect(source).toContain('<M3eDialogAction');
    expect(source).toContain('returnValue="confirm"');
    expect(source).toContain('onClosed={handleClosed}');
    expect(source).toContain("returnValue === 'confirm'");
    for (const removed of [
      'role="dialog"',
      'retop-dialog-zoom-in',
      'cardRef',
    ]) {
      expect(source).not.toContain(removed);
    }
    expect(source).not.toContain('--m3e-dialog-scrim-color');
    expect(source).toContain('zIndex: 100000');
  });

  it('Snackbar delegates timing and action to m3e-snackbar', () => {
    const source = read('src/components/ui/Snackbar.tsx');
    expect(source).toContain('<M3eSnackbar');
    expect(source).toContain('duration={5000}');
    expect(source).toContain('dismissible');
    expect(source).toContain("action={snackbar.action?.label || ''}");
    expect(source).toContain('isActionTaken');
    expect(source).toContain('onToggle');
    expect(source).toContain('snackbar.action?.onClick()');
    expect(source).not.toContain('setTimeout');
    expect(source).toContain('IconComponent');
    expect(source).toContain('animate-in fade-in slide-in-from-bottom-4');
  });

  it('every new tag is aliased and registered in the main world', () => {
    const tags = read('src/components/attendance/m3eTags.ts');
    for (const tag of [
      'm3e-switch',
      'm3e-form-field',
      'm3e-select',
      'm3e-option',
      'm3e-dialog',
      'm3e-dialog-action',
      'm3e-button',
      'm3e-button-group',
      'm3e-snackbar',
    ]) {
      expect(tags).toContain(`'${tag}'`);
    }

    const inject = read('src/m3e-inject.ts');
    for (const mod of [
      'switch',
      'button',
      'button-group',
      'form-field',
      'select',
      'option',
      'dialog',
      'snackbar',
    ]) {
      expect(inject).toContain(`import '@m3e/web/${mod}'`);
    }

    for (const tag of [
      'm3e-switch',
      'm3e-form-field',
      'm3e-select',
      'm3e-option',
      'm3e-dialog',
      'm3e-dialog-action',
    ]) {
      expect(read('src/types/m3e.d.ts')).toContain(`'${tag}': M3eAttrs;`);
    }

    for (const removed of ['M3eSegmentedButton', 'M3eButtonSegment']) {
      expect(tags).not.toContain(removed);
    }
    for (const source of [inject, read('src/m3e-direct.ts')]) {
      expect(source).not.toContain("import '@m3e/web/segmented-button'");
    }
    const types = read('src/types/m3e.d.ts');
    for (const tag of ['m3e-segmented-button', 'm3e-button-segment']) {
      expect(types).not.toContain(`'${tag}': M3eAttrs;`);
    }
  });
});
