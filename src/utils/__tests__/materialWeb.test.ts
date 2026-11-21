import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

describe('Material Web form foundation', () => {
  it('is a pinned dependency at 2.5.0', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['@material/web']).toBe('2.5.0');
  });

  it('registers the core form tags in the shared module', () => {
    const source = read('src/utils/materialWeb.ts');
    for (const mod of [
      'textfield/filled-text-field.js',
      'textfield/outlined-text-field.js',
      'select/filled-select.js',
      'select/outlined-select.js',
      'select/select-option.js',
      'button/filled-button.js',
    ]) {
      expect(source).toContain(`import '@material/web/${mod}'`);
    }
    // The form foundation must not pull in the M3E components still used by
    // attendance/grades.
    expect(source).not.toMatch(/@m3e\/web/);
  });

  it('bridges the real 2.5.0 token prefix and is imported from input.css', () => {
    const tokens = read('src/styles/material-web-tokens.css');
    expect(tokens).toContain('--md-sys-typescale-body-large-font-size');
    expect(tokens).not.toMatch(/--mat-[a-z-]+\s*:/);
    expect(read('src/input.css')).toContain(
      "@import './styles/material-web-tokens.css';",
    );
  });

  it('declares JSX intrinsics for the registered tags', () => {
    const types = read('src/types/materialWeb.d.ts');
    for (const tag of [
      'md-filled-text-field',
      'md-filled-select',
      'md-select-option',
      'md-filled-button',
    ]) {
      expect(types).toContain(`'${tag}': MaterialWebAttrs;`);
    }
  });
});
