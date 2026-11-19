import { describe, expect, it } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '../../..');
const TAG = /m3e-/i;
const IMPORT = /@m3e\//i;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

const files = sourceFiles(resolve(ROOT, 'src'));

describe('M3E stays out of the runtime render path', () => {
  it('scans the runtime source tree', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('has no m3e-* custom elements in runtime source', () => {
    const offenders = files.filter((f) => TAG.test(readFileSync(f, 'utf-8')));
    expect(offenders).toEqual([]);
  });

  it('has no @m3e imports in runtime source', () => {
    const offenders = files.filter((f) =>
      IMPORT.test(readFileSync(f, 'utf-8')),
    );
    expect(offenders).toEqual([]);
  });

  it('does not depend on @m3e/web', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(ROOT, 'package.json'), 'utf-8'),
    );
    expect(pkg.dependencies?.['@m3e/web']).toBeUndefined();
  });
});
