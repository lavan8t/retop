import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  NAV_DESTINATIONS,
  NAV_BAR_VIEWS,
  getNavBarDestinations,
} from '../../../utils/routes';

const root = resolve(import.meta.dir, '../../../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

describe('primary navigation destinations', () => {
  test('maps the ten primary views to distinct M3E Material Symbols names', () => {
    expect(NAV_DESTINATIONS).toHaveLength(10);
    expect(NAV_DESTINATIONS.map((d) => d.view)).toEqual([
      'dashboard',
      'timetable',
      'attendance',
      'digitalAssignments',
      'coursePage',
      'marks',
      'grades',
      'calendar',
      'curriculum',
      'profile',
    ]);

    const icons = NAV_DESTINATIONS.map((d) => d.icon);
    expect(new Set(icons).size).toBe(icons.length);
    for (const destination of NAV_DESTINATIONS) {
      expect(destination.label.length).toBeGreaterThan(0);
      expect(destination.icon).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  test('bottom bar uses a compact subset of the rail destinations', () => {
    const bar = getNavBarDestinations();
    expect(bar).toHaveLength(5);
    expect(bar.map((d) => d.view)).toEqual([...NAV_BAR_VIEWS]);
    expect(
      NAV_BAR_VIEWS.every((view) =>
        NAV_DESTINATIONS.some((d) => d.view === view),
      ),
    ).toBe(true);
  });
});

describe('M3E nav source contract', () => {
  test('the rail renders accessible M3E nav items with a search FAB', () => {
    const source = read('src/components/layout/AppNavRail.tsx');
    expect(source).toContain('M3eNavRail');
    expect(source).toContain('M3eNavItem');
    expect(source).toContain('M3eNavBar');
    expect(source).toContain('M3eFab');
    expect(source).toContain('aria-label="Primary navigation"');
    expect(source).toContain('slot="icon"');
    expect(source).toContain('mode="expanded"');
    expect(source).toContain('M3eNavRailToggle');
  });

  test('brand items sit above the search FAB and use M3 selected roles', () => {
    const source = read('src/components/layout/AppNavRail.tsx');
    expect(source).toMatch(/>\s*retop\s*</);
    expect(source).toMatch(/>\s*VTOP\s*</);
    expect(source.indexOf('rail-retop-')).toBeLessThan(
      source.indexOf('size="small"'),
    );
    expect(source).toContain('var(--md-sys-color-secondary-container)');
    expect(source).toContain('var(--md-sys-color-on-secondary-container)');
  });

  test('nav tags are registered in the main world and aliased', () => {
    const inject = read('src/m3e-inject.ts');
    for (const mod of ['nav-rail', 'nav-bar', 'fab']) {
      expect(inject).toContain(`import '@m3e/web/${mod}'`);
    }

    const tags = read('src/components/attendance/m3eTags.ts');
    for (const tag of [
      'm3e-nav-rail',
      'm3e-nav-item',
      'm3e-nav-rail-toggle',
      'm3e-nav-bar',
      'm3e-fab',
      'm3e-icon',
    ]) {
      expect(tags).toContain(`'${tag}'`);
    }
  });
});
