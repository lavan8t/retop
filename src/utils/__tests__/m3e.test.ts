import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) =>
  readFileSync(resolve(import.meta.dir, rel), 'utf-8');

describe('M3E registration stays off the dashboard import path', () => {
  it('has no static @m3e/web imports in the registration module', () => {
    const source = read('../m3e.ts');
    expect(source).not.toMatch(/import\s*['"]@m3e\/web\//);
    expect(source).not.toMatch(/from\s*['"]@m3e\/web\//);
    expect(source).toContain('ensureM3eComponents');
  });

  it('defers registration in both M3E screens instead of importing it for side effects', () => {
    for (const page of [
      '../../pages/attendance.tsx',
      '../../pages/grades.tsx',
    ]) {
      const source = read(page);
      expect(source).not.toMatch(/import\s*['"]\.\.\/utils\/m3e['"]/);
      expect(source).toContain('ensureM3eComponents()');
    }
  });
});
