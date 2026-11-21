import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('VIT-AP ASCII asset', () => {
  it('contains the campus art and is non-trivial', () => {
    const file = resolve(
      import.meta.dir,
      '../../../public/assets/ascii_ap.txt',
    );
    const art = readFileSync(file, 'utf8');
    expect(art.length).toBeGreaterThan(5000);
    expect(art).toContain('@@@@');
  });
});
