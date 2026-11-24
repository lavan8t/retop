import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

    // Hit area, focus ring and selected/unselected palette stay in place.
    expect(source).toContain('min-w-12 min-h-12');
    expect(source).toContain('focus-visible:ring-(--accent-base)');
    for (const token of [
      '--m3e-switch-selected-track-color',
      '--m3e-switch-unselected-track-color',
      '--m3e-switch-track-outline-color',
    ]) {
      expect(source).toContain(token);
    }
  });

  it('SegmentedControl uses m3e-segmented-button and keeps its onChange contract', () => {
    const source = read('src/components/ui/SegmentedControl.tsx');
    expect(source).toContain('<M3eSegmentedButton');
    expect(source).toContain('<M3eButtonSegment');
    expect(source).toContain('value={option.value}');
    expect(source).toContain('checked={value === option.value}');
    expect(source).toContain('onChange(e.target.value as T, e)');
    expect(source).toContain('e.stopPropagation()');
    expect(source).not.toContain('role="radiogroup"');
    expect(source).not.toContain('selectByArrow');
    expect(source).not.toContain('ArrowRight');

    expect(source).toContain('flex items-center gap-0.5 shrink-0 ${className}');
    expect(source).toContain("minWidth: '3rem'");
    for (const token of [
      '--m3e-segmented-button-height',
      '--m3e-segmented-button-selected-container-color',
      '--m3e-segmented-button-unselected-label-text-color',
    ]) {
      expect(source).toContain(token);
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
    expect(source).toContain("'--m3e-form-field-container-shape': '9999px'");
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
    expect(source).toContain('--m3e-dialog-scrim-color');
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
      'm3e-segmented-button',
      'm3e-button-segment',
      'm3e-snackbar',
    ]) {
      expect(tags).toContain(`'${tag}'`);
    }

    const inject = read('src/m3e-inject.ts');
    for (const mod of [
      'switch',
      'button',
      'segmented-button',
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
  });
});
