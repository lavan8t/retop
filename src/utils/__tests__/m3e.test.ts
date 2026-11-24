import { describe, expect, it } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

const sourceFiles = (dir: string): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(resolve(root, dir), {
    withFileTypes: true,
  })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...sourceFiles(rel));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(rel);
  }
  return files;
};

describe('M3E registration stays off the dashboard import path', () => {
  it('has no static @m3e/web imports in the registration module', () => {
    const source = read('src/utils/m3e.ts');
    expect(source).not.toMatch(/import\s*['"]@m3e\/web\//);
    expect(source).not.toMatch(/from\s*['"]@m3e\/web\//);
    expect(source).toContain('ensureM3eComponents');
  });

  it('has no dynamic @m3e imports anywhere in the content-script path', () => {
    for (const file of sourceFiles('src')) {
      expect(read(file)).not.toMatch(/import\s*\(\s*['"]@m3e\/web\//);
    }
    expect(read('src/utils/m3e.ts')).toContain("action: 'INJECT_M3E'");
  });

  it('logs the error stack so a failing deferred chunk is identifiable', () => {
    const source = read('src/utils/m3e.ts');
    expect(source).toContain('err?.stack || err');
  });

  it('defers registration in both M3E screens instead of importing it for side effects', () => {
    for (const page of ['src/pages/attendance.tsx', 'src/pages/grades.tsx']) {
      const source = read(page);
      expect(source).not.toMatch(/import\s*['"]\.\.\/utils\/m3e['"]/);
      expect(source).toContain('ensureM3eComponents()');
    }
  });
});

describe('M3E registers in the main world', () => {
  it('injects a standalone main-world script from the background', () => {
    const source = read('src/background.ts');
    expect(source).toContain("register(['INJECT_M3E'], injectM3eHandler)");
    expect(source).toContain('scripting.executeScript');
    expect(source).toContain("world: 'MAIN'");
    expect(source).toContain("files: ['m3e-inject.js']");
    expect(source).toContain('sender.tab?.id');
    expect(source).toContain('__retopM3eRegistered');
  });

  it('statically imports every M3E module and sets the flag in the main-world entry', () => {
    const source = read('src/m3e-inject.ts');
    for (const mod of [
      'theme',
      'button',
      'button-group',
      'icon-button',
      'icon',
      'list',
      'card',
      'chips',
      'switch',
      'dialog',
      'snackbar',
      'progress-indicator',
      'tabs',
      'nav-rail',
      'nav-bar',
      'fab',
      'form-field',
      'select',
      'option',
      'tooltip',
      'split-pane',
      'paginator',
    ]) {
      expect(source).toContain(`import '@m3e/web/${mod}'`);
    }
    expect(source).toContain('window.__retopM3eRegistered = true');
  });

  it('declares the scripting permission and exposes the script in both manifests', () => {
    for (const manifest of ['manifest.json', 'manifest.firefox.json']) {
      const source = JSON.parse(read(manifest));
      expect(source.permissions).toContain('scripting');
      expect(source.web_accessible_resources[0].resources).toContain(
        'm3e-inject.js',
      );
    }
  });

  it('builds the main-world entry as a non-splitting IIFE', () => {
    const source = read('build.ts');
    expect(source).toContain('src/m3e-inject.ts');
    expect(source).toContain('format: "iife"');
    expect(source).toContain('splitting: false');
  });
});
