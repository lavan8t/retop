import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '../../..');

describe('deferred chunk base URL', () => {
  it('build.ts does not rewrite import.meta.url to an empty base', () => {
    // Bun emits `__chunks(import.meta.url, ...)` and resolves every deferred
    // chunk with `new URL(path, base)`. Rewriting that base to "" makes the
    // M3E dynamic imports throw `Invalid base URL` in Chrome.
    const build = readFileSync(resolve(ROOT, 'build.ts'), 'utf-8');
    expect(build).not.toMatch(/import\\\.meta\\\.url\/g/);
    expect(build).not.toContain('"import.meta.url"');
  });

  it('ESM entries keep a resolvable module base', () => {
    for (const entry of [
      'dashboard.js',
      'login.js',
      'offline.js',
      'standalone.js',
    ]) {
      const path = resolve(ROOT, 'dist', entry);
      if (!existsSync(path)) continue; // dist is generated, not committed
      const source = readFileSync(path, 'utf-8');
      expect(source).toContain('__chunks(import.meta.url');
      expect(source).not.toContain('__chunks(""');
    }
  });
});
