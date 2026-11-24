import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../../../..');
const source = readFileSync(
  resolve(root, 'src/components/ui/Dropdown.tsx'),
  'utf-8',
);

describe('semester dropdown styling', () => {
  it('uses a readable compact type scale', () => {
    expect(source).toContain("'--m3e-form-field-font-size': '14px'");
    expect(source).toContain("'--m3e-form-field-line-height': '24px'");
    expect(source).not.toContain("'--m3e-form-field-font-size': '12px'");
    expect(source).not.toContain("'--m3e-form-field-line-height': '20px'");
  });

  it('uses the outlined form-field pill shape token', () => {
    expect(source).toContain(
      "'--m3e-outlined-form-field-container-shape': '9999px'",
    );
    // Filled-variant token does not style the default outlined field.
    expect(source).not.toContain("'--m3e-form-field-container-shape'");
    expect(source).toContain("'--m3e-select-container-shape': '9999px'");
  });

  it('keeps a small top gap from the top bar', () => {
    expect(source).toContain("marginTop: '4px'");
  });

  it('colors the field with Material 3 semantic roles', () => {
    for (const role of [
      'var(--md-sys-color-surface-container)',
      'var(--md-sys-color-outline)',
      'var(--md-sys-color-on-surface)',
    ]) {
      expect(source).toContain(role);
    }
    expect(source).not.toContain('var(--bg-surface)');
    expect(source).not.toContain('var(--border-dim)');
  });

  it('preserves selection behavior and option ids', () => {
    expect(source).toContain('String(o.id) === next');
    expect(source).toContain('onChange(match.id)');
    expect(source).toContain('value={String(opt.id)}');
    expect(source).toContain('formatSemesterShorthand(sem.label || sem.id)');
  });
});
